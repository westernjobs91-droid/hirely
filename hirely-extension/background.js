importScripts("config.js");

// ── SESSION HELPERS ──────────────────────────────────────────────────────
async function getSession() {
  const { hirely_session } = await chrome.storage.local.get("hirely_session");
  return hirely_session || null;
}

async function setSession(session) {
  await chrome.storage.local.set({ hirely_session: session });
}

async function clearSession() {
  await chrome.storage.local.remove("hirely_session");
}

async function login(email, password) {
  const res = await fetch(
    `${HIRELY_CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: HIRELY_CONFIG.SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[Hirely] login failed", res.status, data);
    const message =
      data.error_description ||
      data.msg ||
      data.message ||
      data.error?.message ||
      (typeof data.error === "string" ? data.error : "") ||
      `Login failed (HTTP ${res.status}). Check your email and password.`;
    throw new Error(message);
  }
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    user: data.user
  };
  await setSession(session);
  return session;
}

async function refreshIfNeeded(session) {
  if (!session) return null;
  if (Date.now() < session.expires_at - 60000) return session; // still valid (1 min buffer)

  const res = await fetch(
    `${HIRELY_CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: HIRELY_CONFIG.SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    }
  );
  const data = await res.json();
  if (!res.ok) {
    await clearSession();
    return null;
  }
  const newSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    user: data.user || session.user
  };
  await setSession(newSession);
  return newSession;
}

function pickColor(seed) {
  const colors = ["#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#059669", "#0891B2"];
  let h = 0;
  for (const c of seed || "") h += c.charCodeAt(0);
  return colors[h % colors.length];
}

async function findExisting(session, url) {
  const res = await fetch(
    `${HIRELY_CONFIG.SUPABASE_URL}/rest/v1/contacts?select=id,first_name,last_name&user_id=eq.${session.user.id}&linkedin_url=eq.${encodeURIComponent(url)}`,
    {
      headers: {
        apikey: HIRELY_CONFIG.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`
      }
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function saveContact(payload) {
  let session = await getSession();
  session = await refreshIfNeeded(session);
  if (!session) throw new Error("NOT_LOGGED_IN");

  const existing = await findExisting(session, payload.url);
  if (existing) {
    const err = new Error("ALREADY_EXISTS");
    err.contact = existing;
    throw err;
  }

  const body = {
    user_id: session.user.id,
    first_name: payload.firstName,
    last_name: payload.lastName,
    email: payload.email || null,
    phone: null,
    company: payload.company || null,
    job_title: payload.headline || null,
    linkedin_url: payload.url,
    avatar_color: pickColor(payload.firstName),
    status: "active",
    column_name: "upcoming",
    status_label: "New",
    sent_date: null,
    original_email: null,
    enriched: false,
    notes: "",
    activity: [
      { type: "created", source: "LinkedIn Extension", date: new Date().toISOString() }
    ]
  };

  const res = await fetch(`${HIRELY_CONFIG.SUPABASE_URL}/rest/v1/contacts`, {
    method: "POST",
    headers: {
      apikey: HIRELY_CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to save contact to Hirely.");
  }
  const contact = Array.isArray(data) ? data[0] : data;

  // No automatic enrichment call here on purpose — Apollo/Hunter credits are
  // limited, and firing a lookup on every single save (before the recruiter
  // has had a chance to fix a mis-scraped company name) wastes them. The
  // "Find email" button on the dashboard is the deliberate place enrichment
  // happens, once the contact's info is confirmed correct.
  return contact;
}






// ── COMPANY ENRICHMENT + HUNTER (proxied through backend - keys never in extension) ──
async function enrichCompany(companyName, linkedinSlug) {
  const session = await getSession();
  if (!session) return { info: null, people: [] };
  try {
    const res = await fetch(`${HIRELY_CONFIG.API_BASE}/api/extension/enrich-company`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ companyName, linkedinSlug })
    });
    if (!res.ok) return { info: null, people: [] };
    return await res.json();
  } catch(e) {
    console.log('[Hirely BG] enrich-company error:', e.message);
    return { info: null, people: [] };
  }
}

async function hunterDomainSearch(domain) {
  if (!domain) return [];
  const session = await getSession();
  if (!session) return [];
  try {
    const res = await fetch(`${HIRELY_CONFIG.API_BASE}/api/extension/hunter-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ domain })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.people || [];
  } catch(e) {
    console.log('[Hirely BG] hunter-search error:', e.message);
    return [];
  }
}


async function findEmailForContact(contactId, firstName, lastName, company, domain) {
  const session = await getSession();
  if (!session) throw new Error('NOT_LOGGED_IN');
  try {
    const res = await fetch(`${HIRELY_CONFIG.API_BASE}/api/extension/find-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ contactId, firstName, lastName, company, domain })
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.error || 'Email lookup failed' };
    return data; // { ok, email, confidence, type, source }
  } catch(e) {
    console.log('[Hirely BG] find-email error:', e.message);
    return { ok: false, message: 'Email lookup failed' };
  }
}



async function enrichProfile(linkedinUrl) {
  const session = await getSession();
  if (!session) return { ok: false };
  try {
    const res = await fetch(`${HIRELY_CONFIG.API_BASE}/api/extension/enrich-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ linkedinUrl })
    });
    const data = await res.json();
    return data.ok ? data : { ok: false };
  } catch(e) { return { ok: false }; }
}

// ── MESSAGE ROUTER ───────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "HIRELY_GET_SESSION") {
        let session = await getSession();
        session = await refreshIfNeeded(session);
        sendResponse({ ok: true, session });
      } else if (msg.type === "HIRELY_LOGIN") {
        const session = await login(msg.email, msg.password);
        sendResponse({ ok: true, session });
      } else if (msg.type === "HIRELY_LOGOUT") {
        await clearSession();
        sendResponse({ ok: true });
      } else if (msg.type === "HIRELY_SAVE_CONTACT") {
        const contact = await saveContact(msg.payload);
        sendResponse({ ok: true, contact });
      } else if (msg.type === "HIRELY_CHECK_CONTACT") {
        const contact = await checkContact(msg.url);
        sendResponse({ ok: true, contact });
      } else if (msg.type === "HIRELY_HUNTER_SEARCH") {
        const people = await hunterDomainSearch(msg.domain);
        sendResponse({ ok: true, people });
      } else if (msg.type === "HIRELY_ENRICH_PROFILE") {
        const result = await enrichProfile(msg.linkedinUrl);
        sendResponse(result);
      } else if (msg.type === "HIRELY_FIND_EMAIL") {
        const result = await findEmailForContact(msg.contactId, msg.firstName, msg.lastName, msg.company, msg.domain);
        sendResponse(result);
      } else if (msg.type === "HIRELY_ENRICH_COMPANY") {
        const { companyName, linkedinSlug } = msg;
        const result = await enrichCompany(companyName, linkedinSlug);
        sendResponse({ ok: true, info: result.info, people: result.people });
      } else {
        sendResponse({ ok: false, error: "Unknown message type" });
      }
    } catch (e) {
      sendResponse({
        ok: false,
        error: e.message,
        contact: e.contact || null
      });
    }
  })();
  return true; // keep the message channel open for async response
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: `${HIRELY_CONFIG.API_BASE}/login` });
  }
});

// ── CHECK CONTACT (for pipeline status in extension panel) ───────────────
async function checkContact(url) {
  let session = await getSession();
  session = await refreshIfNeeded(session);
  if (!session) return null;

  const res = await fetch(
    `${HIRELY_CONFIG.SUPABASE_URL}/rest/v1/contacts?select=id,first_name,last_name,email,email_confidence,job_title,company,column_name,status_label&user_id=eq.${session.user.id}&linkedin_url=eq.${encodeURIComponent(url)}&limit=1`,
    {
      headers: {
        apikey: HIRELY_CONFIG.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`
      }
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}
