(() => {
  if (window.__hirelyInjected) return;
  window.__hirelyInjected = true;

  const STYLES = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }

    .hirely-tab {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      background: #2563EB;
      color: #fff;
      padding: 14px 10px;
      border-radius: 10px 0 0 10px;
      cursor: pointer;
      z-index: 2147483000;
      box-shadow: -2px 2px 10px rgba(0,0,0,0.18);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      transition: padding 0.15s ease, right 0.15s ease;
    }
    .hirely-tab:hover { padding-right: 14px; }
    .hirely-tab-logo {
      width: 22px; height: 22px;
      background: #fff;
      color: #2563EB;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 13px;
    }
    .hirely-tab-label {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .hirely-overlay {
      position: fixed; inset: 0;
      background: rgba(15, 23, 42, 0.35);
      z-index: 2147483001;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.18s ease;
    }
    .hirely-overlay.open { opacity: 1; pointer-events: auto; }

    .hirely-panel {
      position: fixed;
      top: 0; right: -380px;
      width: 360px;
      height: 100%;
      background: #fff;
      z-index: 2147483002;
      box-shadow: -8px 0 30px rgba(0,0,0,0.2);
      transition: right 0.22s ease;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .hirely-panel.open { right: 0; }

    .hirely-header {
      background: linear-gradient(135deg, #2563EB, #1E3A5F);
      color: #fff;
      padding: 18px 20px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .hirely-header-title {
      display: flex; align-items: center; gap: 10px;
      font-weight: 700; font-size: 15px;
    }
    .hirely-header-logo {
      width: 26px; height: 26px; background: #fff; color: #2563EB;
      border-radius: 7px; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 14px;
    }
    .hirely-close {
      cursor: pointer; background: rgba(255,255,255,0.15); border: none;
      color: #fff; width: 26px; height: 26px; border-radius: 6px; font-size: 15px;
      display: flex; align-items: center; justify-content: center;
    }
    .hirely-close:hover { background: rgba(255,255,255,0.28); }

    .hirely-body { padding: 20px; overflow-y: auto; flex: 1; }

    .hirely-profile-row { display: flex; gap: 12px; align-items: center; margin-bottom: 18px; }
    .hirely-avatar { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; background: #E5E7EB; flex-shrink: 0; }
    .hirely-avatar-fallback {
      width: 52px; height: 52px; border-radius: 50%; background: #2563EB; color: #fff;
      display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; flex-shrink: 0;
    }
    .hirely-profile-name { font-size: 15px; font-weight: 700; color: #0F172A; }
    .hirely-profile-sub { font-size: 12.5px; color: #64748B; margin-top: 2px; }

    .hirely-field { margin-bottom: 14px; }
    .hirely-field label { display: block; font-size: 11.5px; font-weight: 600; color: #475569; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.4px; }
    .hirely-field input {
      width: 100%; padding: 9px 11px; border: 1.5px solid #E2E8F0; border-radius: 8px;
      font-size: 13.5px; color: #0F172A; outline: none;
    }
    .hirely-field input:focus { border-color: #2563EB; }
    .hirely-field input[readonly] { background: #F8FAFC; color: #64748B; }

    .hirely-row-2 { display: flex; gap: 10px; }
    .hirely-row-2 .hirely-field { flex: 1; }

    .hirely-btn {
      width: 100%; padding: 11px; border: none; border-radius: 9px;
      background: #2563EB; color: #fff; font-weight: 700; font-size: 13.5px;
      cursor: pointer; transition: background 0.15s ease;
    }
    .hirely-btn:hover { background: #1D4ED8; }
    .hirely-btn:disabled { background: #94A3B8; cursor: not-allowed; }
    .hirely-btn-secondary {
      width: 100%; padding: 11px; border: 1.5px solid #E2E8F0; border-radius: 9px;
      background: #fff; color: #334155; font-weight: 600; font-size: 13.5px; cursor: pointer; margin-top: 8px;
    }
    .hirely-btn-secondary:hover { background: #F8FAFC; }

    .hirely-status { font-size: 12.5px; margin-top: 10px; padding: 9px 11px; border-radius: 8px; display: none; }
    .hirely-status.show { display: block; }
    .hirely-status.success { background: #ECFDF5; color: #047857; }
    .hirely-status.error { background: #FEF2F2; color: #B91C1C; }
    .hirely-status.info { background: #EFF6FF; color: #1D4ED8; }

    .hirely-login-hint { font-size: 12.5px; color: #64748B; margin-bottom: 16px; line-height: 1.5; }
    .hirely-link { color: #2563EB; text-decoration: none; font-weight: 600; }

    .hirely-footer { padding: 12px 20px; border-top: 1px solid #F1F5F9; font-size: 11.5px; color: #94A3B8; text-align: center; }
  `;

  // ── HOST + SHADOW ROOT ──────────────────────────────────────────────────
  const host = document.createElement("div");
  host.id = "hirely-extension-host";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  const styleEl = document.createElement("style");
  styleEl.textContent = STYLES;
  root.appendChild(styleEl);

  const tab = document.createElement("div");
  tab.className = "hirely-tab";
  tab.innerHTML = `<div class="hirely-tab-logo">H</div><div class="hirely-tab-label">Save to Hirely</div>`;
  root.appendChild(tab);

  const overlay = document.createElement("div");
  overlay.className = "hirely-overlay";
  root.appendChild(overlay);

  const panel = document.createElement("div");
  panel.className = "hirely-panel";
  root.appendChild(panel);

  function openPanel() {
    overlay.classList.add("open");
    panel.classList.add("open");
    render();
  }
  function closePanel() {
    overlay.classList.remove("open");
    panel.classList.remove("open");
  }
  tab.addEventListener("click", openPanel);
  overlay.addEventListener("click", closePanel);

  // ── SCRAPE LINKEDIN PROFILE ──────────────────────────────────────────────
  // LinkedIn's class names are obfuscated/rotated, so instead of hardcoded
  // selectors we walk the DOM structurally, relative to the <h1> (the name),
  // which is the one element LinkedIn reliably marks up semantically.
  const NAV_JUNK = /^(notifications?|search|messaging|home|jobs|my network|for business|advertise|me|\d+\s*notifications?)$/i;

  function isJunkLine(t, name) {
    if (!t) return true;
    if (t === name) return true;
    if (/^[·•]?\s*\d+(st|nd|rd|th)$/i.test(t)) return true;
    if (/connections?$/i.test(t)) return true;
    if (/mutual connection/i.test(t)) return true;
    if (/^(connect|message|more|follow|pending|verified)$/i.test(t)) return true;
    if (/^(she\/her|he\/him|they\/them)$/i.test(t)) return true;
    if (/contact info/i.test(t)) return true;
    if (/,\s*(Ontario|Alberta|British Columbia|Quebec|Canada|United States|Metropolitan Area)/i.test(t)) return true;
    if (NAV_JUNK.test(t)) return true;
    if (/^\d+\s*(mo|yr|d|w|h|min)s?$/i.test(t)) return true; // post timestamps: "2mo", "3yr"
    if (/^\d+([,.]\d+)?[km]?\s*(followers?|posts?|comments?)$/i.test(t)) return true;
    if (/^you (both|two)\s/i.test(t)) return true; // "You both studied at X" highlight callout
    if (/video player|is loading\.?$|loading\.\.\.$|please wait\.?$/i.test(t)) return true; // embedded media widget placeholder text
    if (t.length > 220) return true; // paragraph, not a headline
    return false;
  }

  function getMeta(prop) {
    const el =
      document.querySelector(`meta[property="${prop}"]`) ||
      document.querySelector(`meta[name="${prop}"]`);
    return el ? (el.getAttribute("content") || "").trim() : "";
  }

  // LinkedIn reliably renders <title> and og:title server-side as:
  // "Name - Headline - Company | LinkedIn" (or a subset of those parts).
  // This is far more stable than the obfuscated CSS classes in the DOM.
  function parseTitleSource(raw) {
    if (!raw) return null;
    const cleaned = raw.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
    const segments = cleaned.split(" - ").map((s) => s.trim()).filter(Boolean);
    if (!segments.length) return null;
    const name = segments[0];
    let headline = segments[1] || "";
    let company = segments[2] || "";
    if (!company && headline.includes(" at ")) {
      company = headline.split(" at ").slice(1).join(" at ").trim();
    }
    return { name, headline, company };
  }

  function findNameEl() {
    const h1s = Array.from(document.querySelectorAll("h1"));
    for (const h1 of h1s) {
      const text = h1.innerText.trim();
      if (text && text.length < 100) return h1;
    }
    return null;
  }

  function directText(el) {
    let text = "";
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
    }
    return text.trim();
  }

  const STOP_MARKERS = [
    "More profiles for you",
    "People also viewed",
    "People you may know",
    "Explore Premium profiles"
  ];

  const SECTION_HEADINGS = new Set([
    "About",
    "Experience",
    "Education",
    "Licenses & certifications",
    "Skills",
    "Activity",
    "Recommendations",
    "Interests",
    "Featured",
    "Volunteering",
    "Projects",
    "Publications",
    "Highlights",
    "Find Contact Info",
    "Connect an Integration"
  ]);

  function isStopPoint(text) {
    return SECTION_HEADINGS.has(text.trim()) || STOP_MARKERS.some((m) => text.includes(m));
  }

  function findIntroCandidates(name, maxTextCount) {
    const textCandidates = [];
    let companyFromLink = "";
    let companyFromBadge = "";
    let photo = "";
    // Skip past the sticky top nav so its junk text never even enters the pool.
    const startEl =
      document.querySelector("main") ||
      document.querySelector('[role="main"]') ||
      document.body;
    const els = startEl.querySelectorAll("*");
    const badgeImgs = []; // remember which images were claimed as logo badges

    for (const el of els) {
      const ownText = directText(el);
      if (ownText) {
        if (isStopPoint(ownText)) break;
        if (!isJunkLine(ownText, name) && !textCandidates.includes(ownText)) {
          textCandidates.push(ownText);
        }
      }

      // The company badge is a link to a /company/ page when LinkedIn makes
      // it clickable — an exact signal when present.
      if (!companyFromLink && el.tagName === "A" && /\/company\//.test(el.getAttribute("href") || "")) {
        const label = cleanCompanyLabel(el.innerText);
        if (label && !isJunkLine(label, name)) companyFromLink = label;
      }

      if (el.tagName === "IMG") {
        const rect = el.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        if (!w || !h) continue;
        const aspect = w / h;

        // Company/school badge: a small square logo icon next to short text.
        // LinkedIn doesn't always make this a real <a href> — sometimes it's
        // a div/button with a click handler instead — so we can't rely on
        // href alone. This is scoped to the intro card (scan stops at the
        // first section heading) so it can't pick up unrelated logos further
        // down the page.
        if (!companyFromBadge && w >= 14 && w <= 56 && aspect > 0.75 && aspect < 1.35) {
          const wrap = el.closest("a") || el.parentElement?.parentElement || el.parentElement;
          const label = wrap ? cleanCompanyLabel(wrap.innerText) : "";
          if (label && label.length < 60 && !isJunkLine(label, name)) {
            companyFromBadge = label;
            badgeImgs.push(el);
          }
        }

        // Profile photo: bigger and roughly square. Exclude anything inside
        // a /company/ or /school/ link, and anything already claimed above
        // as a logo badge — never the profile photo either way.
        const inBadgeLink = el.closest('a[href*="/company/"], a[href*="/school/"], a[href*="/edu/"]');
        if (inBadgeLink || badgeImgs.includes(el)) continue;
        if (!photo && w >= 80 && w <= 400 && aspect > 0.8 && aspect < 1.25 && el.src && !el.src.includes("data:image")) {
          photo = el.src;
        }
      }
    }
    return { textCandidates, companyFromLink, companyFromBadge, photo };
  }

  // Credentials like ", M.B.A., CHRL" after the name break a naive first/last
  // split — LinkedIn always puts the actual name before the first comma.
  function cleanName(raw) {
    return (raw || "").split(",")[0].trim();
  }

  // Some company badges show bilingual text on one line, e.g.
  // "Kruger Products | Produits Kruger" — take just the first segment.
  function cleanCompanyLabel(raw) {
    return (raw || "")
      .split("\n")[0]
      .split(" | ")[0]
      .trim();
  }

  // Company wasn't in the headline or intro card — look at the Experience
  // section's first (i.e. current) entry specifically. Scoped tightly to
  // just that section so it can't pick up unrelated links from Education,
  // Certifications, or elsewhere further down the page.
  function findExperienceCompany(name) {
    const heading = Array.from(document.querySelectorAll("h2, h3")).find(
      (el) => el.innerText.trim() === "Experience"
    );
    if (!heading) return "";

    const section =
      heading.closest("section") ||
      heading.parentElement?.parentElement?.parentElement ||
      heading.parentElement;
    if (!section) return "";

    // The current/most recent role's company is almost always a link to a
    // /company/ page within the first entry of this section.
    const companyLink = section.querySelector('a[href*="/company/"]');
    if (companyLink) {
      const label = cleanCompanyLabel(companyLink.innerText);
      if (label && !isJunkLine(label, name)) return label;
    }

    // Fallback: some employers (small businesses, nonprofits) don't have a
    // LinkedIn company page — grab text from the entry instead. LinkedIn
    // renders the job title first and the company name second within each
    // entry, so the second candidate is the better guess for company.
    const candidates = [];
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node && candidates.length < 5) {
      const t = directText(node);
      if (t && t !== "Experience" && !isJunkLine(t, name) && !candidates.includes(t)) {
        candidates.push(t);
      }
      node = walker.nextNode();
    }
    return candidates[1] || candidates[0] || "";
  }

  function extractCompanyFromHeadline(headline) {
    // "Senior Accountant at KPMG, CFE Honour Roll Recipient" -> "KPMG"
    // "Founder & CEO of 1Thing" -> "1Thing"
    // Stop at the next comma/pipe/bullet so trailing accolades don't get
    // swept in along with the actual company name.
    const match = headline.match(/\b(?:at|of)\s+([^,|•\n]+)/i);
    return match ? match[1].trim() : "";
  }

  function scrapeProfile() {
    // 1) Try the reliable server-rendered sources first.
    let parsed = parseTitleSource(getMeta("og:title")) || parseTitleSource(document.title);

    let name = cleanName(parsed?.name || "");
    let headline = parsed?.headline || "";
    let company = "";

    const nameEl = findNameEl();
    const rawNameText = nameEl ? nameEl.innerText.trim() : parsed?.name || "";
    if (!name && nameEl) name = cleanName(rawNameText);

    // 2) Scan the intro area of the document (skipping the top nav, and
    // stopping at the first profile section heading like "About" or
    // "Experience" so we never cross into unrelated company links/logos
    // further down the page) for text candidates, the badge, and the link.
    const { textCandidates, companyFromLink, companyFromBadge, photo: scannedPhoto } = findIntroCandidates(name, 10);

    if (!headline) {
      const headlineCandidate = textCandidates.find(
        (c) => c !== name && c !== rawNameText && !c.startsWith(rawNameText) && !c.includes(" • ")
      );
      if (headlineCandidate) headline = headlineCandidate;
    }

    // Company priority: the visible logo badge is the most reliable signal
    // (present on almost every profile, regardless of whether it's a real
    // link) — then the og:description meta, then the /company/ link, then
    // the bullet-separated intro line, then the headline text itself, and
    // finally the Experience section as a last resort.
    company =
      companyFromBadge ||
      (() => {
        const desc = getMeta("og:description") || getMeta("description");
        const expMatch = desc.match(/Experience:\s*([^·|]+)/i);
        return expMatch ? expMatch[1].trim() : "";
      })() ||
      companyFromLink ||
      (() => {
        const bulletLine = textCandidates.find((c) => c.includes(" • "));
        return bulletLine ? bulletLine.split(" • ")[0].trim() : "";
      })() ||
      extractCompanyFromHeadline(headline) ||
      findExperienceCompany(name);

    // Photo: og:image is the exact profile photo URL LinkedIn renders for
    // social sharing — far more reliable than guessing between the profile
    // photo and nearby company/school logos in the DOM.
    let photo = getMeta("og:image") || getMeta("twitter:image") || scannedPhoto || "";
    if (!photo) {
      const imgs = Array.from(document.querySelectorAll("img")).filter((img) => {
        const rect = img.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        const aspect = h ? w / h : 0;
        const inBadgeLink = img.closest('a[href*="/company/"], a[href*="/school/"], a[href*="/edu/"]');
        return !inBadgeLink && w >= 80 && aspect > 0.8 && aspect < 1.25 && img.src && !img.src.includes("data:image");
      });
      if (imgs.length) {
        imgs.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width);
        photo = imgs[0].src;
      }
    }

    const url = window.location.href.split("?")[0].replace(/\/$/, "");

    const parts = name.split(" ");
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";

    return { name, firstName, lastName, headline, company, photo, url };
  }

  // ── RENDER ────────────────────────────────────────────────────────────
  function sendMsg(msg) {
    return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
  }

  async function render() {
    if (window.HIRELY_DEBUG !== false) {
      console.log("[Hirely] scraped profile:", scrapeProfile());
    }
    const { session } = await sendMsg({ type: "HIRELY_GET_SESSION" });
    if (!session) {
      renderLogin();
    } else {
      renderProfile(session);
    }
  }

  function renderLogin() {
    panel.innerHTML = `
      <div class="hirely-header">
        <div class="hirely-header-title"><div class="hirely-header-logo">H</div> Hirely</div>
        <button class="hirely-close" id="hirely-close-btn">✕</button>
      </div>
      <div class="hirely-body">
        <p class="hirely-login-hint">Log in with your Hirely account to save this contact directly to your pipeline.</p>
        <div class="hirely-field"><label>Email</label><input type="email" id="hirely-email" placeholder="you@company.com" /></div>
        <div class="hirely-field"><label>Password</label><input type="password" id="hirely-password" placeholder="••••••••" /></div>
        <button class="hirely-btn" id="hirely-login-btn">Log In</button>
        <div class="hirely-status" id="hirely-login-status"></div>
      </div>
      <div class="hirely-footer">Don't have an account? <a class="hirely-link" href="${HIRELY_CONFIG.API_BASE}/signup" target="_blank">Sign up</a></div>
    `;
    panel.querySelector("#hirely-close-btn").addEventListener("click", closePanel);
    panel.querySelector("#hirely-login-btn").addEventListener("click", async () => {
      const email = panel.querySelector("#hirely-email").value.trim();
      const password = panel.querySelector("#hirely-password").value;
      const statusEl = panel.querySelector("#hirely-login-status");
      const btn = panel.querySelector("#hirely-login-btn");
      if (!email || !password) {
        showStatus(statusEl, "Enter your email and password.", "error");
        return;
      }
      btn.disabled = true;
      btn.textContent = "Logging in…";
      const res = await sendMsg({ type: "HIRELY_LOGIN", email, password });
      btn.disabled = false;
      btn.textContent = "Log In";
      if (res.ok) {
        render();
      } else {
        showStatus(statusEl, res.error || "Login failed.", "error");
      }
    });
  }

  function renderProfile(session) {
    const data = scrapeProfile();
    const initials = ((data.firstName[0] || "") + (data.lastName[0] || "")).toUpperCase();

    panel.innerHTML = `
      <div class="hirely-header">
        <div class="hirely-header-title"><div class="hirely-header-logo">H</div> Save Contact</div>
        <button class="hirely-close" id="hirely-close-btn">✕</button>
      </div>
      <div class="hirely-body">
        <div class="hirely-profile-row">
          ${data.photo
            ? `<img class="hirely-avatar" src="${escapeAttr(data.photo)}" />`
            : `<div class="hirely-avatar-fallback">${initials || "?"}</div>`
          }
          <div>
            <div class="hirely-profile-name">${escapeHtml(data.name || "Unknown")}</div>
            <div class="hirely-profile-sub">Signed in as ${escapeHtml(session.user.email)}</div>
          </div>
        </div>

        <div class="hirely-row-2">
          <div class="hirely-field"><label>First name</label><input id="hirely-first" value="${escapeAttr(data.firstName)}" /></div>
          <div class="hirely-field"><label>Last name</label><input id="hirely-last" value="${escapeAttr(data.lastName)}" /></div>
        </div>
        <div class="hirely-field"><label>Job title</label><input id="hirely-title" value="${escapeAttr(data.headline)}" /></div>
        <div class="hirely-field"><label>Company</label><input id="hirely-company" value="${escapeAttr(data.company)}" /></div>
        <div class="hirely-field"><label>LinkedIn URL</label><input readonly value="${escapeAttr(data.url)}" /></div>

        <button class="hirely-btn" id="hirely-save-btn">Save to Hirely</button>
        <button class="hirely-btn-secondary" id="hirely-logout-btn">Log out</button>
        <div class="hirely-status" id="hirely-save-status"></div>
      </div>
      <div class="hirely-footer">Use "Find email" on the contact's card in Hirely to look up a verified email.</div>
    `;

    panel.querySelector("#hirely-close-btn").addEventListener("click", closePanel);
    panel.querySelector("#hirely-logout-btn").addEventListener("click", async () => {
      await sendMsg({ type: "HIRELY_LOGOUT" });
      render();
    });
    panel.querySelector("#hirely-save-btn").addEventListener("click", async () => {
      const statusEl = panel.querySelector("#hirely-save-status");
      const btn = panel.querySelector("#hirely-save-btn");
      const payload = {
        firstName: panel.querySelector("#hirely-first").value.trim(),
        lastName: panel.querySelector("#hirely-last").value.trim(),
        headline: panel.querySelector("#hirely-title").value.trim(),
        company: panel.querySelector("#hirely-company").value.trim(),
        url: data.url
      };
      if (!payload.firstName) {
        showStatus(statusEl, "First name is required.", "error");
        return;
      }
      btn.disabled = true;
      btn.textContent = "Saving…";
      const res = await sendMsg({ type: "HIRELY_SAVE_CONTACT", payload });
      btn.disabled = false;
      btn.textContent = "Save to Hirely";

      if (res.ok) {
        showStatus(statusEl, "✓ Saved to Hirely.", "success");
        btn.textContent = "Saved ✓";
        btn.disabled = true;
      } else if (res.error === "ALREADY_EXISTS") {
        showStatus(statusEl, "This contact is already in Hirely.", "info");
      } else if (res.error === "NOT_LOGGED_IN") {
        renderLogin();
      } else {
        showStatus(statusEl, res.error || "Something went wrong. Try again.", "error");
      }
    });
  }

  function showStatus(el, msg, kind) {
    el.textContent = msg;
    el.className = `hirely-status show ${kind}`;
  }

  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(str) {
    return escapeHtml(str);
  }

  // Re-close panel if the user navigates to a different LinkedIn profile via SPA routing.
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      closePanel();
    }
  }, 1000);
})();
