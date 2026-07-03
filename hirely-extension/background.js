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
    email: null,
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

  // Fire-and-forget enrichment call — contact is already saved either way.
  fetch(`${HIRELY_CONFIG.API_BASE}/api/enrich`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contactId: contact.id,
      firstName: payload.firstName,
      lastName: payload.lastName,
      company: payload.company
    })
  }).catch(() => {});

  return contact;
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
