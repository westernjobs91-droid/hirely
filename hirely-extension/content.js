(() => {
  function hirely_init() {
    if (window.__hirelyInjected) return;
    if (!document.body) { setTimeout(hirely_init, 150); return; }
    window.__hirelyInjected = true;

  const STYLES = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .hirely-tab { position: fixed; top: 50%; right: 0; transform: translateY(-50%); background: #2563EB; color: #fff; padding: 10px 7px; border-radius: 10px 0 0 10px; cursor: pointer; z-index: 2147483000; box-shadow: -2px 2px 10px rgba(0,0,0,0.18); display: flex; flex-direction: column; align-items: center; gap: 6px; transition: padding 0.15s ease; }
    .hirely-tab:hover { padding-right: 10px; }
    .hirely-tab-logo { width: 20px; height: 20px; background: #fff; color: #2563EB; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; }
    .hirely-tab-label { writing-mode: vertical-rl; text-orientation: mixed; font-size: 10px; font-weight: 600; letter-spacing: 0.3px; }
    .hirely-panel { position: fixed; top: 0; right: -310px; width: 300px; height: 100%; background: #fff; z-index: 2147483002; box-shadow: -6px 0 24px rgba(0,0,0,0.15); transition: right 0.22s ease; display: flex; flex-direction: column; overflow: hidden; }
    .hirely-panel.open { right: 0; }
    .hirely-header { background: linear-gradient(135deg, #2563EB, #1E3A5F); color: #fff; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .hirely-header-title { display: flex; align-items: center; gap: 7px; font-weight: 700; font-size: 13px; }
    .hirely-header-logo { width: 22px; height: 22px; background: #fff; color: #2563EB; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 10px; }
    .hirely-open-app { font-size: 10px; color: rgba(255,255,255,0.8); text-decoration: none; font-weight: 500; white-space: nowrap; }
    .hirely-open-app:hover { color: #fff; }
    .hirely-close { cursor: pointer; background: rgba(255,255,255,0.15); border: none; color: #fff; width: 20px; height: 20px; border-radius: 4px; font-size: 11px; display: flex; align-items: center; justify-content: center; padding: 0; }
    .hirely-close:hover { background: rgba(255,255,255,0.28); }
    .hirely-body { padding: 12px 14px; overflow-y: auto; flex: 1; }
    .hirely-loading { color: #94A3B8; font-size: 12px; text-align: center; padding: 24px 0; }
    .hirely-pipeline-badge { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; padding: 5px 9px; border-radius: 20px; margin-bottom: 12px; width: fit-content; }
    .hirely-pipeline-badge.in-pipeline { background: #ECFDF5; color: #047857; }
    .hirely-pipeline-badge.new-contact { background: #EFF6FF; color: #1D4ED8; }
    .hirely-badge-dot { width: 6px; height: 6px; border-radius: 50%; }
    .in-pipeline .hirely-badge-dot { background: #047857; }
    .new-contact .hirely-badge-dot { background: #2563EB; }
    .hirely-profile-card { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; }
    .hirely-avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .hirely-avatar-fallback { width: 38px; height: 38px; border-radius: 50%; background: #2563EB; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
    .hirely-profile-info { min-width: 0; }
    .hirely-profile-name { font-size: 13px; font-weight: 700; color: #0F172A; line-height: 1.3; }
    .hirely-profile-sub { font-size: 11px; color: #475569; margin-top: 1px; line-height: 1.3; }
    .hirely-profile-company { font-size: 11px; color: #64748B; margin-top: 1px; font-weight: 500; }
    .hirely-pipeline-status { display: flex; align-items: center; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; }
    .hirely-status-item { flex: 1; text-align: center; }
    .hirely-status-label { display: block; font-size: 10px; color: #94A3B8; font-weight: 500; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.4px; }
    .hirely-status-val { display: block; font-size: 12px; font-weight: 700; color: #0F172A; }
    .hirely-status-divider { width: 1px; background: #E2E8F0; height: 28px; margin: 0 8px; }
    .hirely-email-row { display: flex; align-items: center; gap: 6px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 7px; padding: 7px 10px; margin-bottom: 10px; font-size: 11.5px; color: #065F46; }
    .hirely-email-val { flex: 1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hirely-copy-btn { font-size: 10px; padding: 3px 7px; border: 1px solid #34D399; border-radius: 4px; background: #fff; color: #047857; cursor: pointer; font-weight: 600; white-space: nowrap; }
    .hirely-copy-btn:hover { background: #ECFDF5; }
    .hirely-confidence-pill { font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 10px; margin-left: 4px; flex-shrink: 0; }
    .hirely-confidence-high { background: #DCFCE7; color: #15803D; }
    .hirely-confidence-med { background: #FEF9C3; color: #854D0E; }
    .hirely-confidence-low { background: #FEE2E2; color: #991B1B; }
    .hirely-find-email-btn { width: 100%; padding: 8px; border: 1.5px solid #2563EB; border-radius: 8px; background: #EFF6FF; color: #2563EB; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 10px; transition: all 0.15s; }
    .hirely-find-email-btn:hover { background: #2563EB; color: #fff; }
    .hirely-find-email-btn:disabled { background: #F1F5F9; color: #94A3B8; border-color: #E2E8F0; cursor: not-allowed; }
    .hirely-fields-edit { margin-bottom: 10px; }
    .hirely-field { margin-bottom: 8px; }
    .hirely-field label { display: block; font-size: 10px; font-weight: 600; color: #64748B; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.4px; }
    .hirely-field input { width: 100%; padding: 6px 8px; border: 1.5px solid #E2E8F0; border-radius: 6px; font-size: 12px; color: #0F172A; outline: none; background: #fff; }
    .hirely-field input:focus { border-color: #2563EB; }
    .hirely-row-2 { display: flex; gap: 8px; }
    .hirely-row-2 .hirely-field { flex: 1; }
    .hirely-btn { width: 100%; padding: 9px; border: none; border-radius: 8px; background: #2563EB; color: #fff; font-weight: 700; font-size: 12.5px; cursor: pointer; transition: background 0.15s ease; display: block; text-align: center; text-decoration: none; margin-bottom: 0; }
    .hirely-btn:hover { background: #1D4ED8; }
    .hirely-btn:disabled { background: #94A3B8; cursor: not-allowed; }
    .hirely-btn-outline { width: 100%; padding: 8px; border: 1.5px solid #2563EB; border-radius: 8px; background: #fff; color: #2563EB; font-weight: 700; font-size: 12px; cursor: pointer; display: block; text-align: center; text-decoration: none; transition: background 0.15s ease; }
    .hirely-btn-outline:hover { background: #EFF6FF; }
    .hirely-status { font-size: 11px; margin-top: 8px; padding: 6px 9px; border-radius: 6px; display: none; }
    .hirely-status.show { display: block; }
    .hirely-status.success { background: #ECFDF5; color: #047857; }
    .hirely-status.error { background: #FEF2F2; color: #B91C1C; }
    .hirely-status.info { background: #EFF6FF; color: #1D4ED8; }
    .hirely-source-tag { font-size: 9.5px; color: #94A3B8; text-align: right; margin-bottom: 8px; }
    .hirely-source-tag.enriched { color: #059669; }
    .hirely-login-hint { font-size: 11.5px; color: #64748B; margin-bottom: 14px; line-height: 1.5; }
    .hirely-link { color: #2563EB; text-decoration: none; font-weight: 600; }
    .hirely-footer { padding: 8px 14px; border-top: 1px solid #F1F5F9; font-size: 10.5px; color: #94A3B8; text-align: center; flex-shrink: 0; }
    .hirely-text-btn { background: none; border: none; color: #94A3B8; font-size: 10.5px; cursor: pointer; padding: 0; text-decoration: underline; }
    .hirely-text-btn:hover { color: #64748B; }
    .hirely-tabs { display: flex; border-bottom: 1px solid #E2E8F0; margin-bottom: 12px; flex-shrink: 0; }
    .hirely-tab-btn { flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 600; color: #94A3B8; background: none; border: none; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s; }
    .hirely-tab-btn.active { color: #2563EB; border-bottom-color: #2563EB; }
    .hirely-history-item { display: flex; align-items: center; gap: 9px; padding: 8px 0; border-bottom: 1px solid #F1F5F9; cursor: pointer; }
    .hirely-history-item:last-child { border-bottom: none; }
    .hirely-history-item:hover { opacity: 0.8; }
    .hirely-history-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .hirely-history-avatar-fallback { width: 32px; height: 32px; border-radius: 50%; background: #1E3A5F; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0; }
    .hirely-history-info { flex: 1; min-width: 0; }
    .hirely-history-name { font-size: 12px; font-weight: 700; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hirely-history-sub { font-size: 10.5px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
    .hirely-history-time { font-size: 10px; color: #94A3B8; flex-shrink: 0; }
    .hirely-history-empty { text-align: center; padding: 24px 0; color: #94A3B8; font-size: 12px; }
  `

  const host = document.createElement("div");
  host.id = "hirely-extension-host";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  const styleEl = document.createElement("style");
  styleEl.textContent = STYLES;
  root.appendChild(styleEl);

  const tab = document.createElement("div");
  tab.className = "hirely-tab";
  tab.innerHTML = '<div class="hirely-tab-logo">H</div><div class="hirely-tab-label">Save to Hirely</div>';
  root.appendChild(tab);

  const overlay = document.createElement("div");
  overlay.className = "hirely-overlay";
  root.appendChild(overlay);

  const panel = document.createElement("div");
  panel.className = "hirely-panel";
  root.appendChild(panel);

  function openPanel() { overlay.classList.add("open"); panel.classList.add("open"); render(); }
  function closePanel() { overlay.classList.remove("open"); panel.classList.remove("open"); }
  tab.addEventListener("click", openPanel);
  overlay.addEventListener("click", closePanel);

  function escapeHtml(str) { return (str || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function escapeAttr(str) { return escapeHtml(str); }
  function showStatus(el, msg, kind) { el.textContent = msg; el.className = "hirely-status show " + kind; }
  function titleCase(str) { return (str || "").replace(/\b\w/g, c => c.toUpperCase()); }
  function getMeta(prop) {
    const el = document.querySelector('meta[property="' + prop + '"]') || document.querySelector('meta[name="' + prop + '"]');
    return el ? (el.getAttribute("content") || "").trim() : "";
  }
  function getLinkedInSlug() {
    const m = window.location.href.match(/linkedin\.com\/in\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  async function enrichFromBackend(slug) {
    try {
      const res = await fetch(HIRELY_CONFIG.API_BASE + "/api/enrich?linkedin=" + encodeURIComponent(slug));
      if (!res.ok) return null;
      const data = await res.json();
      return data.found ? data : null;
    } catch(e) { return null; }
  }

  // ── SCRAPE: reads document.title + full page text near h1 ─────────────────
  function scrapeProfile() {
    // NAME + HEADLINE from document.title (server-rendered, always present)
    // Format: "Sarah Powers - Human Resources Generalist at Flex-N-Gate | LinkedIn"
    // Format: "Heather Wardia - HR Generalist, Magna Powertrain of America, INC | LinkedIn"
    function parseTitle(raw) {
      if (!raw) return null;
      const cleaned = raw.replace(/\s*\|.*LinkedIn.*$/i, "").replace(/\s*-\s*LinkedIn\s*$/i, "").trim();
      const segs = cleaned.split(/\s+[-\u2013\u2014]\s+/).map(s => s.trim()).filter(Boolean);
      if (!segs[0] || segs[0].length < 2) return null;
      if (/^(profile|search|home|feed|linkedin|sign in|sign up)$/i.test(segs[0])) return null;
      return { name: segs[0].split(",")[0].trim(), headline: segs[1] || "" };
    }

    const titleData = parseTitle(getMeta("og:title")) || parseTitle(document.title);
    let name = titleData?.name || "";
    let headline = titleData?.headline || "";

    // h1 fallback for name
    if (!name) {
      for (const h1 of document.querySelectorAll("h1")) {
        const t = (h1.innerText || "").trim();
        if (t && t.length > 1 && t.length < 80 && !/^(profile|search|home|jobs|messaging|notifications|me|feed|linkedin)$/i.test(t)) {
          name = t.split(",")[0].trim(); break;
        }
      }
    }

    // HEADLINE from page text if document.title had no headline
    // Strategy: collect all visible text lines from the intro area,
    // pick the first one that looks like a job title
    if (!headline && name) {
      const SKIP = new Set([
        name, name.toLowerCase(), name.toUpperCase(),
      ]);
      const JUNK = /^(\d+(st|nd|rd|th)\s*(connection|degree)?|connect|message|follow|pending|she\/her|he\/him|they\/them|\d+\s*(connections?|followers?)|contact info|share via|profile enhanced|open to work|hiring|save in sales navigator|more|activity|about|experience|education|skills|recommendations|500\+|1st|2nd|3rd)/i;
      const LOCATION = /^(macomb|detroit|toronto|greater|united states|canada|michigan|ontario|california|texas|florida|ohio|washington|new york|los angeles|london|vietnam|germany|france|australia|india)\b/i;

      // Walk main content area collecting text lines
      const main = document.querySelector("main") || document.querySelector('[role="main"]') || document.body;
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      const candidates = [];
      let node = walker.nextNode();

      while (node && candidates.length < 30) {
        const t = (node.textContent || "").trim();
        if (t.length > 5 && t.length < 250 && !seen.has(t) && !SKIP.has(t) && !JUNK.test(t) && !LOCATION.test(t)) {
          seen.add(t);
          candidates.push(t);
        }
        node = walker.nextNode();
      }

      // Pick first candidate that looks like a headline
      // Good signals: contains "at", contains job-related words, reasonable length
      for (const c of candidates) {
        if (c.length > 5 && c.length < 200 && /[a-zA-Z]{3}/.test(c)) {
          headline = c;
          break;
        }
      }
    }

    // EXTRACT COMPANY from headline — handles all formats
    let company = "";
    let displayTitle = headline;

    if (headline) {
      // "Title at Company" — most common LinkedIn format
      const atMatch = headline.match(/^(.+?)\s+at\s+(.+)$/i);
      if (atMatch) {
        displayTitle = atMatch[1].trim();
        company = atMatch[2].trim().split("|")[0].trim();
      }
      // "Title, Company" — comma format
      if (!company && headline.includes(",")) {
        const ci = headline.indexOf(",");
        const tp = headline.slice(0, ci).trim();
        const cp = headline.slice(ci + 1).trim();
        const LOC = /^(west |east |north |south |greater |detroit|toronto|macomb|new york|los angeles|ontario|michigan)/i;
        if (tp.length > 3 && tp.length < 80 && !LOC.test(tp) && cp.length > 2 && cp.length < 150) {
          displayTitle = tp; company = cp;
        }
      }
      // "Title | Company" — pipe format
      if (!company && headline.includes(" | ")) {
        const pp = headline.split(" | ");
        if (pp.length >= 2 && pp[1].length > 2) { displayTitle = pp[0].trim(); company = pp[1].trim(); }
      }
    }

    // COMPANY from /company/ link near h1 as final fallback
    if (!company) {
      const h1 = document.querySelector("h1");
      const area = h1?.closest("section") || h1?.parentElement?.parentElement?.parentElement || document.querySelector("main");
      if (area) {
        for (const a of area.querySelectorAll('a[href*="/company/"]')) {
          // Skip promoted content
          let skip = false;
          let n = a;
          for (let i = 0; i < 6 && n; i++) {
            if (/promoted|sponsor|pymk|people-also/i.test((n.className || "").toString())) { skip = true; break; }
            n = n.parentElement;
          }
          if (skip || a.closest("aside")) continue;
          // Stop at Experience section
          const sec = a.closest("section");
          if (sec && /^experience$/i.test(sec.querySelector("h2")?.innerText?.trim() || "")) break;
          const lbl = (a.innerText || "").split("\n")[0].split(" | ")[0].trim();
          if (lbl && lbl.length > 1 && lbl.length < 80) { company = lbl; break; }
        }
      }
    }

    const photo = getMeta("og:image") || getMeta("twitter:image") || "";
    const parts = name.split(" ");
    console.log("[Hirely] scraped:", { name, title: displayTitle, company });

    return {
      found: false, name,
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      title: displayTitle, headline: displayTitle,
      company, email: "", photo,
    };
  }

  function sendMsg(msg, timeoutMs = 5000) {
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => { if (!done) { done = true; resolve({ ok: false, error: "timeout" }); } }, timeoutMs);
      try {
        chrome.runtime.sendMessage(msg, (res) => {
          if (!done) { done = true; clearTimeout(timer); resolve(res || { ok: false, error: "no_response" }); }
        });
      } catch(e) { if (!done) { done = true; clearTimeout(timer); resolve({ ok: false, error: e.message }); } }
    });
  }

  async function render() {
    panel.innerHTML =
      '<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely</span></div>' +
      '<button class="hirely-close" id="hcb0">&#x2715;</button></div>' +
      '<div class="hirely-body"><div class="hirely-loading">Loading...</div></div>';
    panel.querySelector("#hcb0").addEventListener("click", closeHirely);
    try {
      const result = await sendMsg({ type: "HIRELY_GET_SESSION" });
      const session = result?.session || null;
      if (!session) renderLogin();
      else if (/linkedin\.com\/company\/[^/?#]+/.test(window.location.href)) await renderCompany(session);
      else await renderProfile(session);
    } catch(e) {
      panel.innerHTML = '<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely</span></div>' +
        '<button class="hirely-close" id="hcbe">&#x2715;</button></div>' +
        '<div class="hirely-body"><div class="hirely-status show error">Something went wrong. Reload the page.</div></div>';
      panel.querySelector("#hcbe").addEventListener("click", closeHirely);
    }
  }

  function renderLogin() {
    panel.innerHTML =
      '<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely</span></div>' +
      '<button class="hirely-close" id="hlcb">&#x2715;</button></div>' +
      '<div class="hirely-body">' +
      '<p class="hirely-login-hint">Sign in to save contacts directly from LinkedIn.</p>' +
      '<div class="hirely-field"><label>Email</label><input type="email" id="hirely-email" placeholder="you@company.com" /></div>' +
      '<div class="hirely-field"><label>Password</label><input type="password" id="hirely-password" placeholder="Enter password" /></div>' +
      '<button class="hirely-btn" id="hirely-login-btn">Sign In</button>' +
      '<div class="hirely-status" id="hirely-login-status"></div></div>' +
      '<div class="hirely-footer">No account? <a class="hirely-link" href="' + HIRELY_CONFIG.API_BASE + '/signup" target="_blank">Sign up free</a></div>';
    panel.querySelector("#hlcb").addEventListener("click", closeHirely);
    panel.querySelector("#hirely-login-btn").addEventListener("click", async () => {
      const email = panel.querySelector("#hirely-email").value.trim();
      const password = panel.querySelector("#hirely-password").value;
      const statusEl = panel.querySelector("#hirely-login-status");
      const btn = panel.querySelector("#hirely-login-btn");
      if (!email || !password) { showStatus(statusEl, "Enter your email and password.", "error"); return; }
      btn.disabled = true; btn.textContent = "Signing in...";
      const res = await sendMsg({ type: "HIRELY_LOGIN", email, password });
      btn.disabled = false; btn.textContent = "Sign In";
      if (res.ok) render(); else showStatus(statusEl, res.error || "Login failed.", "error");
    });
  }

  async function renderProfile(session) {
    panel.innerHTML =
      '<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely</span></div>' +
      '<div style="display:flex;gap:8px;align-items:center;"><a class="hirely-open-app" href="' + HIRELY_CONFIG.API_BASE + '" target="_blank">Open app &#x2197;</a>' +
      '<button class="hirely-close" id="hrpcb">&#x2715;</button></div></div>' +
      '<div class="hirely-tabs"><button class="hirely-tab-btn active" id="hts">Save</button><button class="hirely-tab-btn" id="hth">History</button></div>' +
      '<div class="hirely-body" id="htb"><div class="hirely-loading">Loading profile...</div></div>' +
      '<div class="hirely-footer"><button class="hirely-text-btn" id="hlob">Sign out</button></div>';

    panel.querySelector("#hrpcb").addEventListener("click", closeHirely);
    panel.querySelector("#hlob").addEventListener("click", async () => { await sendMsg({ type: "HIRELY_LOGOUT" }); render(); });

    const tabBody = panel.querySelector("#htb");
    const tabSave = panel.querySelector("#hts");
    const tabHist = panel.querySelector("#hth");
    const slug = getLinkedInSlug();
    const url = window.location.href.split("?")[0].replace(/\/$/, "");
    let profileData;

    if (slug) {
      const [enriched, checkRes] = await Promise.all([
        enrichFromBackend(slug),
        sendMsg({ type: "HIRELY_CHECK_CONTACT", url })
      ]);

      if (enriched && enriched.found) {
        profileData = {
          name: enriched.name, firstName: enriched.firstName, lastName: enriched.lastName,
          headline: enriched.title, company: enriched.company, email: enriched.email,
          photo: enriched.photo || getMeta("og:image") || "", url, enriched: true,
        };
      } else {
        profileData = { ...scrapeProfile(), url };
      }

      console.log("[Hirely] profile:", { name: profileData.name, title: profileData.headline, company: profileData.company, enriched: !!profileData.enriched });
      logProfileView(profileData);
      const existing = checkRes.contact || null;
      await renderSaveTab(tabBody, session, profileData, existing);
    } else {
      tabBody.innerHTML = '<div class="hirely-status show error">Could not read LinkedIn profile URL.</div>';
    }

    tabSave.addEventListener("click", () => { tabSave.classList.add("active"); tabHist.classList.remove("active"); renderSaveTab(tabBody, session, profileData, null); });
    tabHist.addEventListener("click", () => { tabHist.classList.add("active"); tabSave.classList.remove("active"); renderHistoryTab(tabBody); });
  }

  async function renderSaveTab(container, session, data, existing) {
    const initials = ((data.firstName?.[0] || "") + (data.lastName?.[0] || "")).toUpperCase();
    const avatarHtml = data.photo
      ? '<img class="hirely-avatar" src="' + escapeAttr(data.photo) + '" />'
      : '<div class="hirely-avatar-fallback">' + (initials || "?") + "</div>";
    const COLUMN_LABELS = { follow_up_today: "Follow Up Today", upcoming: "Coming Up", done: "Done" };
    const sourceTag = data.enriched
      ? '<div class="hirely-source-tag enriched">&#10003; Enriched via Hunter.io</div>'
      : '<div class="hirely-source-tag">Scraped from LinkedIn</div>';

    if (existing) {
      const columnLabel = COLUMN_LABELS[existing.column_name] || existing.column_name || "Pipeline";
      const conf = existing.email_confidence;
      const confClass = conf >= 80 ? "hirely-confidence-high" : conf >= 50 ? "hirely-confidence-med" : "hirely-confidence-low";
      const confLabel = conf ? '<span class="hirely-confidence-pill ' + confClass + '">' + conf + "%</span>" : "";
      const emailDisplay = existing.email
        ? '<div class="hirely-email-row">&#x2709; <span class="hirely-email-val">' + escapeHtml(existing.email) + "</span>" + confLabel + '<button class="hirely-copy-btn" data-copy="' + escapeAttr(existing.email) + '">Copy</button></div>'
        : (data.email ? '<div class="hirely-email-row">&#x2709; <span class="hirely-email-val">' + escapeHtml(data.email) + '</span><button class="hirely-copy-btn" data-copy="' + escapeAttr(data.email) + '">Copy</button></div>' : '<button class="hirely-find-email-btn" id="hfeb">&#x2726; Find Email</button>');

      container.innerHTML = sourceTag +
        '<div class="hirely-pipeline-badge in-pipeline"><span class="hirely-badge-dot"></span>Already in your pipeline</div>' +
        '<div class="hirely-profile-card">' + avatarHtml +
        '<div class="hirely-profile-info"><div class="hirely-profile-name">' + escapeHtml(data.name || (existing.first_name + " " + existing.last_name)) + "</div>" +
        '<div class="hirely-profile-sub">' + escapeHtml(data.headline || existing.job_title || "") + "</div>" +
        '<div class="hirely-profile-company">' + escapeHtml(data.company || existing.company || "") + "</div></div></div>" +
        '<div class="hirely-pipeline-status"><div class="hirely-status-item"><span class="hirely-status-label">Pipeline</span><span class="hirely-status-val">' + escapeHtml(columnLabel) + "</span></div>" +
        '<div class="hirely-status-divider"></div><div class="hirely-status-item"><span class="hirely-status-label">Status</span><span class="hirely-status-val">' + escapeHtml(existing.status_label || "Active") + "</span></div></div>" +
        emailDisplay + '<a class="hirely-btn hirely-btn-outline" href="' + HIRELY_CONFIG.API_BASE + '" target="_blank">View in Pipeline &#x2197;</a>';

      container.querySelectorAll(".hirely-copy-btn").forEach(btn => {
        btn.addEventListener("click", () => { navigator.clipboard.writeText(btn.dataset.copy).then(() => { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "Copy"; }, 1500); }); });
      });
      const feb = container.querySelector("#hfeb");
      if (feb) feb.addEventListener("click", async () => {
        feb.disabled = true; feb.textContent = "Searching...";
        const res = await sendMsg({ type: "HIRELY_FIND_EMAIL", contactId: existing.id, firstName: existing.first_name, lastName: existing.last_name, company: existing.company || data.company || "", domain: existing.email_domain || "" });
        if (res.ok && res.email) { existing.email = res.email; existing.email_confidence = res.confidence || null; await renderSaveTab(container, session, data, existing); }
        else { feb.disabled = false; feb.textContent = "&#x2726; Find Email"; }
      });

    } else {
      const displayTitle = (data.headline || "").split("|")[0].trim();
      container.innerHTML = sourceTag +
        '<div class="hirely-pipeline-badge new-contact"><span class="hirely-badge-dot"></span>Not in your pipeline</div>' +
        '<div class="hirely-profile-card">' + avatarHtml +
        '<div class="hirely-profile-info"><div class="hirely-profile-name">' + escapeHtml(data.name || "Unknown") + "</div>" +
        '<div class="hirely-profile-sub">' + escapeHtml(displayTitle) + "</div>" +
        '<div class="hirely-profile-company">' + escapeHtml(data.company || "") + "</div></div></div>" +
        (data.email ? '<div class="hirely-email-row">&#x2709; <span class="hirely-email-val">' + escapeHtml(data.email) + '</span><button class="hirely-copy-btn" data-copy="' + escapeAttr(data.email) + '">Copy</button></div>' : "") +
        '<div class="hirely-fields-edit">' +
        '<div class="hirely-row-2"><div class="hirely-field"><label>First name</label><input id="hfi" value="' + escapeAttr(data.firstName) + '" /></div>' +
        '<div class="hirely-field"><label>Last name</label><input id="hli" value="' + escapeAttr(data.lastName) + '" /></div></div>' +
        '<div class="hirely-field"><label>Job title</label><input id="hti" value="' + escapeAttr(displayTitle) + '" /></div>' +
        '<div class="hirely-field"><label>Company</label><input id="hci" value="' + escapeAttr(data.company) + '" /></div>' +
        (data.email ? "" : '<div class="hirely-field"><label>Email (optional)</label><input id="hei" placeholder="Find via Hunter.io below" /></div>') +
        "</div>" +
        '<button class="hirely-btn" id="hsb">Save to Pipeline</button>' +
        '<div class="hirely-status" id="hss"></div>' +
        (!data.email ? '<button class="hirely-find-email-btn" id="hfeb2" style="margin-top:8px;">&#x2726; Find Email with Hunter.io</button>' : "");

      container.querySelectorAll(".hirely-copy-btn").forEach(btn => {
        btn.addEventListener("click", () => { navigator.clipboard.writeText(btn.dataset.copy).then(() => { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "Copy"; }, 1500); }); });
      });

      container.querySelector("#hsb").addEventListener("click", async () => {
        const statusEl = container.querySelector("#hss");
        const btn = container.querySelector("#hsb");
        const payload = {
          firstName: container.querySelector("#hfi").value.trim(),
          lastName: container.querySelector("#hli").value.trim(),
          headline: container.querySelector("#hti").value.trim(),
          company: container.querySelector("#hci").value.trim(),
          email: data.email || container.querySelector("#hei")?.value.trim() || "",
          url: data.url
        };
        if (!payload.firstName) { showStatus(statusEl, "First name is required.", "error"); return; }
        btn.disabled = true; btn.textContent = "Saving...";
        const res = await sendMsg({ type: "HIRELY_SAVE_CONTACT", payload });
        btn.disabled = false;
        if (res.ok) { const cr = await sendMsg({ type: "HIRELY_CHECK_CONTACT", url: data.url }); await renderSaveTab(container, session, data, cr.contact || null); }
        else if (res.error === "ALREADY_EXISTS") showStatus(statusEl, "Already in your pipeline.", "info");
        else if (res.error === "NOT_LOGGED_IN") renderLogin();
        else { btn.textContent = "Save to Pipeline"; showStatus(statusEl, res.error || "Something went wrong.", "error"); }
      });

      const feb2 = container.querySelector("#hfeb2");
      if (feb2) feb2.addEventListener("click", async () => {
        feb2.disabled = true; feb2.textContent = "Searching...";
        const res = await sendMsg({ type: "HIRELY_FIND_EMAIL", contactId: null, firstName: container.querySelector("#hfi").value.trim(), lastName: container.querySelector("#hli").value.trim(), company: container.querySelector("#hci").value.trim(), domain: "" });
        if (res.ok && res.email) {
          const ei = container.querySelector("#hei"); if (ei) ei.value = res.email;
          feb2.textContent = "Email found"; feb2.style.color = "#047857";
        } else { feb2.disabled = false; feb2.textContent = "&#x2726; Find Email with Hunter.io"; }
      });
    }
  }

  const HISTORY_KEY = "hirely_history";
  async function logProfileView(data) {
    if (!data.name || !data.url) return;
    const stored = await chrome.storage.local.get(HISTORY_KEY);
    let h = stored[HISTORY_KEY] || [];
    h = h.filter(x => x.url !== data.url);
    h.unshift({ name: data.name, headline: data.headline || "", company: data.company || "", photo: data.photo || "", url: data.url, viewedAt: Date.now() });
    await chrome.storage.local.set({ [HISTORY_KEY]: h.slice(0, 50) });
  }

  function timeAgo(ts) {
    const d = Date.now() - ts, m = Math.floor(d/60000), hr = Math.floor(d/3600000), dy = Math.floor(d/86400000);
    return m < 1 ? "just now" : m < 60 ? m + "m ago" : hr < 24 ? hr + "h ago" : dy + "d ago";
  }

  async function renderHistoryTab(container) {
    container.innerHTML = '<div class="hirely-loading">Loading...</div>';
    const stored = await chrome.storage.local.get(HISTORY_KEY);
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const history = (stored[HISTORY_KEY] || []).filter(h => h.viewedAt > cutoff);
    if (!history.length) { container.innerHTML = '<div class="hirely-history-empty">No profiles viewed in the last 7 days.</div>'; return; }
    container.innerHTML = history.map(h => {
      const initials = h.name.split(" ").map(p => p[0] || "").join("").slice(0, 2).toUpperCase();
      const av = h.photo ? '<img class="hirely-history-avatar" src="' + escapeAttr(h.photo) + '" />' : '<div class="hirely-history-avatar-fallback">' + initials + "</div>";
      return '<div class="hirely-history-item" data-url="' + escapeAttr(h.url) + '">' + av +
        '<div class="hirely-history-info"><div class="hirely-history-name">' + escapeHtml(h.name) + "</div>" +
        '<div class="hirely-history-sub">' + escapeHtml(h.company || h.headline?.split("|")[0] || "") + "</div></div>" +
        '<span class="hirely-history-time">' + timeAgo(h.viewedAt) + "</span></div>";
    }).join("");
    container.querySelectorAll(".hirely-history-item").forEach(el => el.addEventListener("click", () => window.open(el.dataset.url, "_blank")));
  }

  async function renderCompany(session) {
    const url = window.location.href;
    const slug = (url.match(/linkedin\.com\/company\/([^/?#]+)/) || [])[1]?.replace(/-\d+$/, "") || "";
    const name = titleCase(document.querySelector("h1")?.innerText?.trim() || slug);

    function buildPanel(body) {
      panel.innerHTML = '<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely</span></div>' +
        '<div style="display:flex;gap:8px;align-items:center;"><a class="hirely-open-app" href="' + HIRELY_CONFIG.API_BASE + '" target="_blank">Open app &#x2197;</a>' +
        '<button class="hirely-close" id="hcocb">&#x2715;</button></div></div>' +
        '<div class="hirely-body">' + body + "</div>" +
        '<div class="hirely-footer"><button class="hirely-text-btn" id="hcolo">Sign out</button></div>';
      panel.querySelector("#hcocb").addEventListener("click", closeHirely);
      panel.querySelector("#hcolo").addEventListener("click", async () => { await sendMsg({ type: "HIRELY_LOGOUT" }); render(); });
    }

    buildPanel('<div class="hirely-loading">Loading company...</div>');
    let res = await sendMsg({ type: "HIRELY_ENRICH_COMPANY", companyName: name, linkedinSlug: slug });
    if (!res.info) { await new Promise(r => setTimeout(r, 1000)); res = await sendMsg({ type: "HIRELY_ENRICH_COMPANY", companyName: name, linkedinSlug: slug }); }
    const info = res.info || null;
    const people = res.people || [];
    const rows = [
      info?.location ? ["Location", titleCase(info.location)] : null,
      info?.industry ? ["Industry", titleCase(info.industry)] : null,
      info?.size ? ["Size", info.size + " employees"] : null,
      info?.founded ? ["Founded", String(info.founded)] : null,
    ].filter(Boolean);

    buildPanel(
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">' +
      '<div style="width:38px;height:38px;border-radius:7px;background:#1E3A5F;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;">' + escapeHtml((name || "C")[0].toUpperCase()) + "</div>" +
      '<div><div style="font-size:13px;font-weight:700;color:#0F172A;">' + escapeHtml(info?.name || name) + "</div>" +
      (info?.industry ? '<div style="font-size:11px;color:#64748B;">' + escapeHtml(titleCase(info.industry)) + "</div>" : "") + "</div></div>" +
      (rows.length ? '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:8px 12px;margin-bottom:12px;">' +
        rows.map(([lbl, val]) => '<div style="display:flex;gap:8px;padding:2px 0;"><span style="font-size:11px;color:#94A3B8;width:60px;flex-shrink:0;">' + lbl + '</span><span style="font-size:11.5px;color:#334155;font-weight:500;">' + escapeHtml(val) + "</span></div>").join("") + "</div>" : "") +
      (people.length
        ? '<div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Decision Makers</div>' +
          people.map((p, i) => '<div style="border:1px solid #E2E8F0;border-radius:8px;padding:9px 10px;margin-bottom:8px;">' +
            '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">' +
            '<div><div style="font-size:12px;font-weight:700;color:#0F172A;">' + escapeHtml([p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown") + "</div>" +
            '<div style="font-size:10.5px;color:#64748B;">' + escapeHtml(p.position || "") + "</div></div>" +
            '<button class="hirely-btn" style="width:auto;padding:4px 10px;font-size:10px;" data-index="' + i + '">Save</button></div></div>').join("")
        : '<button class="hirely-btn" id="hfdm">Find Decision Makers</button>')
    );

    panel.querySelectorAll("[data-index]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const p = people[parseInt(btn.dataset.index)]; if (!p) return;
        btn.textContent = "Saving..."; btn.disabled = true;
        const r = await sendMsg({ type: "HIRELY_SAVE_CONTACT", payload: { firstName: p.first_name || "", lastName: p.last_name || "", headline: p.position || "", company: info?.name || name, email: null, url: p.linkedin || "" }});
        btn.textContent = (r.ok || r.error === "ALREADY_EXISTS") ? "Saved &#x2713;" : "Error";
        if (!(r.ok || r.error === "ALREADY_EXISTS")) btn.disabled = false;
      });
    });
    const fdm = panel.querySelector("#hfdm");
    if (fdm) fdm.addEventListener("click", async () => { fdm.textContent = "Searching..."; fdm.disabled = true; await sendMsg({ type: "HIRELY_HUNTER_SEARCH", domain: info?.domain || "" }); });
  }

  const PROFILE_RE = /linkedin\.com\/in\/[^/?#]+/;
  const COMPANY_RE = /linkedin\.com\/company\/[^/?#]+/;

  function openHirely() { panel.classList.add("open"); chrome.storage.local.set({ hirely_panel_open: true }); render(); }
  function closeHirely() { panel.classList.remove("open"); chrome.storage.local.set({ hirely_panel_open: false }); }

  tab.addEventListener("click", openHirely);
  chrome.storage.local.get("hirely_panel_open", ({ hirely_panel_open }) => {
    if (hirely_panel_open && (PROFILE_RE.test(window.location.href) || COMPANY_RE.test(window.location.href))) openHirely();
  });

  let lastUrl = window.location.href, renderTimer = null;
  setInterval(() => {
    const cur = window.location.href;
    if (cur === lastUrl) return;
    lastUrl = cur;
    if (!PROFILE_RE.test(cur) && !COMPANY_RE.test(cur)) { closeHirely(); return; }
    if (panel.classList.contains("open")) {
      if (renderTimer) clearTimeout(renderTimer);
      renderTimer = setTimeout(() => { renderTimer = null; render(); }, 600);
    }
  }, 300);

  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hirely_init);
  else hirely_init();
})();
