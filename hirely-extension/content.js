(() => {
  function hirely_init() {
    if (window.__hirelyInjected) return;
    if (!document.body) { setTimeout(hirely_init, 150); return; }
    window.__hirelyInjected = true;

  const STYLES = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

    .hirely-tab {
      position: fixed; top: 50%; right: 0; transform: translateY(-50%);
      background: #2563EB; color: #fff; padding: 10px 7px;
      border-radius: 10px 0 0 10px; cursor: pointer; z-index: 2147483000;
      box-shadow: -2px 2px 10px rgba(0,0,0,0.18);
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      transition: padding 0.15s ease;
    }
    .hirely-tab:hover { padding-right: 10px; }
    .hirely-tab-logo {
      width: 20px; height: 20px; background: #fff; color: #2563EB;
      border-radius: 5px; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 11px;
    }
    .hirely-tab-label {
      writing-mode: vertical-rl; text-orientation: mixed;
      font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
    }

    .hirely-panel {
      position: fixed; top: 0; right: -310px; width: 300px; height: 100%;
      background: #fff; z-index: 2147483002;
      box-shadow: -6px 0 24px rgba(0,0,0,0.15); transition: right 0.22s ease;
      display: flex; flex-direction: column; overflow: hidden;
    }
    .hirely-panel.open { right: 0; }

    .hirely-header {
      background: linear-gradient(135deg, #2563EB, #1E3A5F);
      color: #fff; padding: 10px 14px;
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .hirely-header-title { display: flex; align-items: center; gap: 7px; font-weight: 700; font-size: 13px; }
    .hirely-header-logo {
      width: 22px; height: 22px; background: #fff; color: #2563EB;
      border-radius: 5px; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 10px; letter-spacing: -0.5px;
    }
    .hirely-open-app {
      font-size: 10px; color: rgba(255,255,255,0.8); text-decoration: none;
      font-weight: 500; white-space: nowrap;
    }
    .hirely-open-app:hover { color: #fff; }
    .hirely-close {
      cursor: pointer; background: rgba(255,255,255,0.15); border: none;
      color: #fff; width: 20px; height: 20px; border-radius: 4px; font-size: 11px;
      display: flex; align-items: center; justify-content: center; padding: 0;
    }
    .hirely-close:hover { background: rgba(255,255,255,0.28); }

    .hirely-body { padding: 12px 14px; overflow-y: auto; flex: 1; }
    .hirely-loading { color: #94A3B8; font-size: 12px; text-align: center; padding: 24px 0; }

    .hirely-pipeline-badge {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 600; padding: 5px 9px;
      border-radius: 20px; margin-bottom: 12px; width: fit-content;
    }
    .hirely-pipeline-badge.in-pipeline { background: #ECFDF5; color: #047857; }
    .hirely-pipeline-badge.new-contact { background: #EFF6FF; color: #1D4ED8; }
    .hirely-badge-dot { width: 6px; height: 6px; border-radius: 50%; }
    .in-pipeline .hirely-badge-dot { background: #047857; }
    .new-contact .hirely-badge-dot { background: #2563EB; }

    .hirely-profile-card { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; }
    .hirely-avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .hirely-avatar-fallback {
      width: 38px; height: 38px; border-radius: 50%; background: #2563EB; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px; flex-shrink: 0;
    }
    .hirely-profile-info { min-width: 0; }
    .hirely-profile-name { font-size: 13px; font-weight: 700; color: #0F172A; line-height: 1.3; }
    .hirely-profile-sub { font-size: 11px; color: #475569; margin-top: 1px; line-height: 1.3; }
    .hirely-profile-company { font-size: 11px; color: #64748B; margin-top: 1px; font-weight: 500; }

    .hirely-pipeline-status {
      display: flex; align-items: center;
      background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;
      padding: 8px 12px; margin-bottom: 12px;
    }
    .hirely-status-item { flex: 1; text-align: center; }
    .hirely-status-label { display: block; font-size: 10px; color: #94A3B8; font-weight: 500; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.4px; }
    .hirely-status-val { display: block; font-size: 12px; font-weight: 700; color: #0F172A; }
    .hirely-status-divider { width: 1px; background: #E2E8F0; height: 28px; margin: 0 8px; }

    .hirely-email-row {
      display: flex; align-items: center; gap: 6px;
      background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 7px;
      padding: 7px 10px; margin-bottom: 10px; font-size: 11.5px; color: #065F46;
    }
    .hirely-email-val { flex: 1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hirely-copy-btn {
      font-size: 10px; padding: 3px 7px; border: 1px solid #34D399; border-radius: 4px;
      background: #fff; color: #047857; cursor: pointer; font-weight: 600; white-space: nowrap;
    }
    .hirely-copy-btn:hover { background: #ECFDF5; }
    .hirely-email-missing {
      font-size: 11px; color: #94A3B8; margin-bottom: 10px; padding: 7px 10px;
      background: #F8FAFC; border-radius: 7px; border: 1px dashed #E2E8F0;
    }
    .hirely-email-hint { font-size: 10.5px; color: #94A3B8; margin-bottom: 10px; }
    .hirely-confidence-pill {
      font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 10px;
      margin-left: 4px; flex-shrink: 0;
    }
    .hirely-confidence-high { background: #DCFCE7; color: #15803D; }
    .hirely-confidence-med  { background: #FEF9C3; color: #854D0E; }
    .hirely-confidence-low  { background: #FEE2E2; color: #991B1B; }
    .hirely-find-email-btn {
      width: 100%; padding: 8px; border: 1.5px solid #2563EB; border-radius: 8px;
      background: #EFF6FF; color: #2563EB; font-weight: 700; font-size: 12px;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
      margin-bottom: 10px; transition: all 0.15s;
    }
    .hirely-find-email-btn:hover { background: #2563EB; color: #fff; }
    .hirely-find-email-btn:disabled { background: #F1F5F9; color: #94A3B8; border-color: #E2E8F0; cursor: not-allowed; }

    .hirely-fields-edit { margin-bottom: 10px; }
    .hirely-field { margin-bottom: 8px; }
    .hirely-field label { display: block; font-size: 10px; font-weight: 600; color: #64748B; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.4px; }
    .hirely-field input {
      width: 100%; padding: 6px 8px; border: 1.5px solid #E2E8F0; border-radius: 6px;
      font-size: 12px; color: #0F172A; outline: none; background: #fff;
    }
    .hirely-field input:focus { border-color: #2563EB; }
    .hirely-row-2 { display: flex; gap: 8px; }
    .hirely-row-2 .hirely-field { flex: 1; }

    .hirely-btn {
      width: 100%; padding: 9px; border: none; border-radius: 8px;
      background: #2563EB; color: #fff; font-weight: 700; font-size: 12.5px;
      cursor: pointer; transition: background 0.15s ease; display: block;
      text-align: center; text-decoration: none; margin-bottom: 0;
    }
    .hirely-btn:hover { background: #1D4ED8; }
    .hirely-btn:disabled { background: #94A3B8; cursor: not-allowed; }
    .hirely-btn-outline {
      width: 100%; padding: 8px; border: 1.5px solid #2563EB; border-radius: 8px;
      background: #fff; color: #2563EB; font-weight: 700; font-size: 12px;
      cursor: pointer; display: block; text-align: center; text-decoration: none;
      transition: background 0.15s ease;
    }
    .hirely-btn-outline:hover { background: #EFF6FF; }

    .hirely-status { font-size: 11px; margin-top: 8px; padding: 6px 9px; border-radius: 6px; display: none; }
    .hirely-status.show { display: block; }
    .hirely-status.success { background: #ECFDF5; color: #047857; }
    .hirely-status.error { background: #FEF2F2; color: #B91C1C; }
    .hirely-status.info { background: #EFF6FF; color: #1D4ED8; }

    .hirely-login-hint { font-size: 11.5px; color: #64748B; margin-bottom: 14px; line-height: 1.5; }
    .hirely-link { color: #2563EB; text-decoration: none; font-weight: 600; }

    .hirely-footer {
      padding: 8px 14px; border-top: 1px solid #F1F5F9;
      font-size: 10.5px; color: #94A3B8; text-align: center; flex-shrink: 0;
    }
    .hirely-text-btn {
      background: none; border: none; color: #94A3B8; font-size: 10.5px;
      cursor: pointer; padding: 0; text-decoration: underline;
    }
    .hirely-text-btn:hover { color: #64748B; }

    /* COMPANY PAGE */
    .hirely-company-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .hirely-company-logo { width: 38px; height: 38px; border-radius: 7px; object-fit: cover; flex-shrink: 0; border: 1px solid #E2E8F0; background: #F1F5F9; }
    .hirely-company-logo-fallback { width: 38px; height: 38px; border-radius: 7px; background: #1E3A5F; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; flex-shrink: 0; }
    .hirely-company-name { font-size: 13px; font-weight: 700; color: #0F172A; line-height: 1.3; }
    .hirely-company-meta { font-size: 11px; color: #64748B; margin-top: 2px; }
    .hirely-section-label { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; margin-top: 4px; }
    .hirely-person-card { border: 1px solid #E2E8F0; border-radius: 8px; padding: 9px 10px; margin-bottom: 8px; background: #fff; }
    .hirely-person-card:hover { border-color: #BFDBFE; background: #F8FAFC; }
    .hirely-person-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .hirely-person-name { font-size: 12px; font-weight: 700; color: #0F172A; }
    .hirely-person-title { font-size: 10.5px; color: #64748B; margin-top: 1px; }
    .hirely-person-save {
      font-size: 10px; padding: 4px 10px; border: 1.5px solid #2563EB; border-radius: 6px;
      background: #fff; color: #2563EB; cursor: pointer; font-weight: 700;
      white-space: nowrap; flex-shrink: 0; transition: all 0.15s;
    }
    .hirely-person-save:hover { background: #2563EB; color: #fff; }
    .hirely-person-save.saved { border-color: #047857; color: #047857; background: #ECFDF5; cursor: default; }
    .hirely-person-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .hirely-no-results { text-align: center; padding: 16px 0; color: #94A3B8; font-size: 12px; line-height: 1.6; }

    /* HISTORY TAB */
    .hirely-tabs {
      display: flex; border-bottom: 1px solid #E2E8F0; margin-bottom: 12px;
      flex-shrink: 0;
    }
    .hirely-tab-btn {
      flex: 1; padding: 8px 4px; font-size: 11px; font-weight: 600;
      color: #94A3B8; background: none; border: none; cursor: pointer;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      transition: all 0.15s;
    }
    .hirely-tab-btn.active { color: #2563EB; border-bottom-color: #2563EB; }
    .hirely-tab-btn:hover:not(.active) { color: #475569; }

    .hirely-history-item {
      display: flex; align-items: center; gap: 9px;
      padding: 8px 0; border-bottom: 1px solid #F1F5F9; cursor: pointer;
    }
    .hirely-history-item:last-child { border-bottom: none; }
    .hirely-history-item:hover { opacity: 0.8; }
    .hirely-history-avatar {
      width: 32px; height: 32px; border-radius: 50%; object-fit: cover;
      flex-shrink: 0; background: #E5E7EB;
    }
    .hirely-history-avatar-fallback {
      width: 32px; height: 32px; border-radius: 50%; background: #1E3A5F;
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 11px; flex-shrink: 0;
    }
    .hirely-history-info { flex: 1; min-width: 0; }
    .hirely-history-name { font-size: 12px; font-weight: 700; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hirely-history-sub { font-size: 10.5px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
    .hirely-history-time { font-size: 10px; color: #94A3B8; flex-shrink: 0; }
    .hirely-history-saved { font-size: 9.5px; color: #047857; background: #ECFDF5; padding: 1px 5px; border-radius: 3px; font-weight: 600; flex-shrink: 0; }
    .hirely-history-empty { text-align: center; padding: 24px 0; color: #94A3B8; font-size: 12px; }
  `

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
    if (/^(play|pause|mute|unmute|play video|stop|rewind|fullscreen|skip|replay|volume|subtitles|captions|settings|speed|quality|cc)$/i.test(t)) return true; // media player controls
    if (/^(like|comment|share|react|repost|send|report|hide|block|remove|unfollow|following|view profile|see more|show more|read more)$/i.test(t)) return true; // ui button labels
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

      // Company link detection handled separately below — not in this loop

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
    // ── COMPANY DETECTION: DOM structure pass, no pixel positions ──────────
    // LinkedIn renders the intro card inside the first <section> in <main>.
    // We query /company/ links ONLY within that section — so we never pick
    // up Experience/Education links further down the page.
    // This is completely zoom/viewport independent.
    if (!companyFromLink) {
      // Strategy 1: first /company/ link inside the intro section
      const introSection =
        document.querySelector('main section:first-of-type') ||
        document.querySelector('section.artdeco-card') ||
        document.querySelector('[data-member-id]')?.closest('section') ||
        document.querySelector('main');

      if (introSection) {
        const links = introSection.querySelectorAll('a[href*="/company/"]');
        for (const a of links) {
          const label = cleanCompanyLabel(a.innerText || a.textContent || '');
          if (label && label.length > 1 && label.length < 80 && !isJunkLine(label, name)) {
            companyFromLink = label;
            console.log('[Hirely] company from intro section link:', label);
            break;
          }
        }
      }
    }

    // Strategy 2: ANY /company/ link on page — take the FIRST one
    // (on a profile page, first /company/ link is always current employer)
    if (!companyFromLink) {
      const allLinks = document.querySelectorAll('a[href*="/company/"]');
      for (const a of allLinks) {
        const label = cleanCompanyLabel(a.innerText || a.textContent || '');
        if (label && label.length > 1 && label.length < 80 && !isJunkLine(label, name)) {
          companyFromLink = label;
          console.log('[Hirely] company from first page link:', label);
          break;
        }
      }
    }

    // Strategy 3: og:description "Experience: Company Name" meta tag
    if (!companyFromLink) {
      const desc = getMeta('og:description') || getMeta('description');
      const m = desc.match(/Experience:\s*([^·|\n]+)/i);
      if (m) {
        const label = m[1].trim();
        if (label && !isJunkLine(label, name)) {
          companyFromLink = label;
          console.log('[Hirely] company from og:description:', label);
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
  // Direct CSS query for the company badge in the intro card.
  // LinkedIn always renders the current company as a /company/ link
  // right below the name — this is the most reliable signal on profiles
  // where the company is NOT embedded in the headline text.
  function findIntroCardCompany(name) {
    // Try multiple selectors that cover LinkedIn's intro card layout variants
    const selectors = [
      // Classic: intro card company link
      '.pv-text-details__left-panel a[href*="/company/"]',
      '.ph5 a[href*="/company/"]',
      // Newer layout: top card section
      '[data-generated-suggestion-target] a[href*="/company/"]',
      // Any /company/ link in the first 500px of the page
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const label = cleanCompanyLabel(el.innerText);
        if (label && label.length < 80 && !isJunkLine(label, name)) return label;
      }
    }
    // Fallback: scan ALL /company/ links in the top portion of the page
    // (before any section headings like About, Experience)
    const allCompanyLinks = Array.from(document.querySelectorAll('a[href*="/company/"]'));
    for (const el of allCompanyLinks) {
      // Only look at links in the top part of the page (intro card area)
      const rect = el.getBoundingClientRect();
      if (rect.top > 500) break; // stop scanning once we're past the intro card
      const label = cleanCompanyLabel(el.innerText);
      if (label && label.length > 1 && label.length < 80 && !isJunkLine(label, name)) {
        return label;
      }
    }
    return '';
  }

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
    // og:title is server-rendered and always correct regardless of viewport/zoom/device mode.
    // Format: "Name - Headline | LinkedIn" or "Name - Headline - Company | LinkedIn"
    // NEVER fall back to document.title or DOM h1 — those change in responsive mode.
    const ogTitle = getMeta("og:title");
    const parsed = parseTitleSource(ogTitle);

    let name = cleanName(parsed?.name || "");
    let headline = parsed?.headline || "";
    let company = "";

    // If og:title didn't give us a name (very rare — means og:title is missing),
    // try h1 but validate it doesn't look like a UI label
    if (!name) {
      const nameEl = findNameEl();
      const h1text = nameEl ? nameEl.innerText.trim() : "";
      // Reject h1 values that are clearly UI labels, not a person's name
      const UI_LABELS = /^(profile|search|home|jobs|messaging|notifications|me|sign in|sign up|share|connect|message|follow)$/i;
      if (h1text && !UI_LABELS.test(h1text) && h1text.length < 80) {
        name = cleanName(h1text);
      }
    }

    console.log('[Hirely] og:title:', ogTitle, '→ parsed:', parsed);

    // Scan for badge image and photo only (company detection moved to separate pass below)
    const { textCandidates, companyFromLink, companyFromBadge, photo: scannedPhoto } = findIntroCandidates(name, 10);

    // Headline fallback: when og:title is null (mobile/responsive/no-meta mode).
    // LinkedIn's mobile DOM nests h1 and the headline in separate divs under
    // a common ancestor. We walk UP from h1 to find all text in that block,
    // then pick the first line that isn't the name and isn't junk.
    if (!headline) {
      const h1 = document.querySelector('h1');
      if (h1) {
        // Collect all short text strings from h1's ancestor (up to 4 levels up)
        // that could be the job title
        const UI_JUNK = /^(share via.*|private message|connect|message|more|follow|pending|open to work|hiring|she\/her|he\/him|they\/them|\d+\s*connections?|\d+\s*followers?|contact info|mississauga|ontario|canada|united states|greater toronto)/i;
        
        let ancestor = h1.parentElement;
        for (let depth = 0; depth < 5 && ancestor; depth++) {
          // Grab all leaf text nodes in this ancestor
          const walker = document.createTreeWalker(ancestor, NodeFilter.SHOW_TEXT);
          const texts = [];
          let node = walker.nextNode();
          while (node) {
            const t = node.textContent.trim();
            if (t.length > 2) texts.push(t);
            node = walker.nextNode();
          }
          
          // Find the first text that is not the name and not junk
          for (const t of texts) {
            if (t === name || t.startsWith(name) || UI_JUNK.test(t) || isJunkLine(t, name)) continue;
            if (t.length > 3 && t.length < 120) {
              headline = t;
              console.log('[Hirely] headline from ancestor depth', depth, ':', headline);
              break;
            }
          }
          if (headline) break;
          ancestor = ancestor.parentElement;
        }
      }
    }

    // Final validation — reject anything that still looks like UI chrome
    const UI_HEADLINE_JUNK = /^(share via|private message|connect|message|more|follow|pending|open to work|hiring|she\/her|he\/him|they\/them)/i;
    if (headline && UI_HEADLINE_JUNK.test(headline)) {
      console.log('[Hirely] rejected junk headline:', headline);
      headline = '';
    }

    // Company priority: the visible logo badge is the most reliable signal
    // (present on almost every profile, regardless of whether it's a real
    // link) — then the og:description meta, then the /company/ link, then
    // the bullet-separated intro line, then the headline text itself, and
    // finally the Experience section as a last resort.
    company =
      companyFromBadge ||
      companyFromLink ||
      findIntroCardCompany(name) ||
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

    console.log('[Hirely] scraped:', { name, headline, company, url });
    return { name, firstName, lastName, headline, company, photo, url };
  }


  // ── RENDER ────────────────────────────────────────────────────────────
  function sendMsg(msg, timeoutMs = 5000) {
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) { done = true; resolve({ ok: false, error: 'timeout' }); }
      }, timeoutMs);
      try {
        chrome.runtime.sendMessage(msg, (res) => {
          if (!done) {
            done = true;
            clearTimeout(timer);
            resolve(res || { ok: false, error: 'no_response' });
          }
        });
      } catch(e) {
        if (!done) { done = true; clearTimeout(timer); resolve({ ok: false, error: e.message }); }
      }
    });
  }


  async function render() {
    // Always paint a loading shell immediately so panel is never blank
    panel.innerHTML =
      '<div class="hirely-header">' +
        '<div class="hirely-header-title"><div class="hirely-header-logo">H→</div><span>Hirely</span></div>' +
        '<button class="hirely-close" id="hirely-close-btn-loading">✕</button>' +
      '</div>' +
      '<div class="hirely-body"><div class="hirely-loading">Loading…</div></div>';
    panel.querySelector('#hirely-close-btn-loading').addEventListener('click', closeHirely);

    try {
      const result = await sendMsg({ type: "HIRELY_GET_SESSION" });
      const session = result?.session || null;
      if (!session) {
        renderLogin();
      } else if (/linkedin\.com\/company\/[^/?#]+/.test(window.location.href)) {
        await renderCompany(session);
      } else {
        await renderProfile(session);
      }
    } catch(e) {
      panel.innerHTML =
        '<div class="hirely-header">' +
          '<div class="hirely-header-title"><div class="hirely-header-logo">H→</div><span>Hirely</span></div>' +
          '<button class="hirely-close" id="hirely-close-btn-err">✕</button>' +
        '</div>' +
        '<div class="hirely-body"><div class="hirely-status show error">Something went wrong. Reload the page.</div></div>';
      panel.querySelector('#hirely-close-btn-err').addEventListener('click', closeHirely);
    }
  }

  // ── LOGIN VIEW ────────────────────────────────────────────────────────
  function renderLogin() {
    panel.innerHTML = `
      <div class="hirely-header">
        <div class="hirely-header-title">
          <div class="hirely-header-logo">H→</div>
          <span>Hirely</span>
        </div>
        <button class="hirely-close" id="hirely-close-btn">✕</button>
      </div>
      <div class="hirely-body">
        <p class="hirely-login-hint">Sign in to see pipeline status and save contacts directly from LinkedIn.</p>
        <div class="hirely-field"><label>Email</label><input type="email" id="hirely-email" placeholder="you@company.com" /></div>
        <div class="hirely-field"><label>Password</label><input type="password" id="hirely-password" placeholder="••••••••" /></div>
        <button class="hirely-btn" id="hirely-login-btn">Sign In</button>
        <div class="hirely-status" id="hirely-login-status"></div>
      </div>
      <div class="hirely-footer">No account? <a class="hirely-link" href="${HIRELY_CONFIG.API_BASE}/signup" target="_blank">Sign up free</a></div>
    `;
    panel.querySelector("#hirely-close-btn").addEventListener("click", closeHirely);
    panel.querySelector("#hirely-login-btn").addEventListener("click", async () => {
      const email = panel.querySelector("#hirely-email").value.trim();
      const password = panel.querySelector("#hirely-password").value;
      const statusEl = panel.querySelector("#hirely-login-status");
      const btn = panel.querySelector("#hirely-login-btn");
      if (!email || !password) { showStatus(statusEl, "Enter your email and password.", "error"); return; }
      btn.disabled = true; btn.textContent = "Signing in…";
      const res = await sendMsg({ type: "HIRELY_LOGIN", email, password });
      btn.disabled = false; btn.textContent = "Sign In";
      if (res.ok) { render(); } else { showStatus(statusEl, res.error || "Login failed.", "error"); }
    });
  }


  function titleCase(str) {
    if (!str) return '';
    return str.replace(/\b\w/g, c => c.toUpperCase());
  }

  // ── RENDER SAVE TAB ──────────────────────────────────────────────────────
  async function renderSaveTab(container, session, data, existing) {
    const initials = ((data.firstName[0] || '') + (data.lastName[0] || '')).toUpperCase();
    const avatarHtml = data.photo
      ? '<img class="hirely-avatar" src="' + escapeAttr(data.photo) + '" />'
      : '<div class="hirely-avatar-fallback">' + (initials || '?') + '</div>';

    const COLUMN_LABELS = {
      follow_up_today: 'Follow Up Today',
      upcoming: 'Coming Up',
      done: 'Done'
    };

    if (existing) {
      const columnLabel = COLUMN_LABELS[existing.column_name] || existing.column_name || 'Pipeline';
      const statusLabel = existing.status_label || 'Active';
      const conf = existing.email_confidence;
      const confClass = conf >= 80 ? 'hirely-confidence-high' : conf >= 50 ? 'hirely-confidence-med' : 'hirely-confidence-low';
      const confLabel = conf ? '<span class="hirely-confidence-pill ' + confClass + '">' + conf + '%</span>' : '';
      const emailDisplay = existing.email
        ? '<div class="hirely-email-row">✉ <span class="hirely-email-val">' + escapeHtml(existing.email) + '</span>' + confLabel + '<button class="hirely-copy-btn" data-copy="' + escapeAttr(existing.email) + '">Copy</button></div>'
        : '<button class="hirely-find-email-btn" id="hirely-find-email-btn">✦ Find Email</button>';

      container.innerHTML =
        '<div class="hirely-pipeline-badge in-pipeline"><span class="hirely-badge-dot"></span>Already in your pipeline</div>' +
        '<div class="hirely-profile-card">' + avatarHtml +
          '<div class="hirely-profile-info">' +
            '<div class="hirely-profile-name">' + escapeHtml(data.name || existing.first_name + ' ' + existing.last_name) + '</div>' +
            '<div class="hirely-profile-sub">' + escapeHtml(data.headline || existing.job_title || '') + '</div>' +
            '<div class="hirely-profile-company">' + escapeHtml(data.company || existing.company || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="hirely-pipeline-status">' +
          '<div class="hirely-status-item"><span class="hirely-status-label">Pipeline</span><span class="hirely-status-val">' + escapeHtml(columnLabel) + '</span></div>' +
          '<div class="hirely-status-divider"></div>' +
          '<div class="hirely-status-item"><span class="hirely-status-label">Status</span><span class="hirely-status-val">' + escapeHtml(statusLabel) + '</span></div>' +
        '</div>' +
        emailDisplay +
        '<a class="hirely-btn hirely-btn-outline" href="' + HIRELY_CONFIG.API_BASE + '" target="_blank">View in Pipeline ↗</a>';

      const copyBtn = container.querySelector('.hirely-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(copyBtn.dataset.copy).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
          });
        });
      }

      // Find Email button (shown when contact has no email yet)
      const findEmailBtn = container.querySelector('#hirely-find-email-btn');
      if (findEmailBtn) {
        findEmailBtn.addEventListener('click', async () => {
          findEmailBtn.disabled = true;
          findEmailBtn.textContent = 'Searching…';
          const res = await sendMsg({
            type: 'HIRELY_FIND_EMAIL',
            contactId: existing.id,
            firstName: existing.first_name,
            lastName: existing.last_name,
            company: existing.company || data.company || '',
            domain: existing.email_domain || ''
          });
          if (res.ok && res.email) {
            // Re-render the save tab to show the found email
            existing.email = res.email;
            existing.email_confidence = res.confidence || null;
            await renderSaveTab(container, session, data, existing);
          } else {
            findEmailBtn.disabled = false;
            findEmailBtn.textContent = '✦ Find Email';
            findEmailBtn.insertAdjacentHTML('afterend',
              '<div class="hirely-status show error" style="margin-top:6px">' +
              (res.message || 'No email found for this contact.') + '</div>'
            );
            setTimeout(() => {
              const err = container.querySelector('.hirely-status.error');
              if (err) err.remove();
            }, 3000);
          }
        });
      }
    } else {
      container.innerHTML =
        '<div class="hirely-pipeline-badge new-contact"><span class="hirely-badge-dot"></span>Not in your pipeline</div>' +
        '<div class="hirely-profile-card">' + avatarHtml +
          '<div class="hirely-profile-info">' +
            '<div class="hirely-profile-name">' + escapeHtml(data.name || 'Unknown') + '</div>' +
            '<div class="hirely-profile-sub">' + escapeHtml(data.headline || '') + '</div>' +
            '<div class="hirely-profile-company">' + escapeHtml(data.company || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="hirely-fields-edit">' +
          '<div class="hirely-row-2">' +
            '<div class="hirely-field"><label>First name</label><input id="hirely-first" value="' + escapeAttr(data.firstName) + '" /></div>' +
            '<div class="hirely-field"><label>Last name</label><input id="hirely-last" value="' + escapeAttr(data.lastName) + '" /></div>' +
          '</div>' +
          '<div class="hirely-field"><label>Job title</label><input id="hirely-title" value="' + escapeAttr(data.headline) + '" /></div>' +
          '<div class="hirely-field"><label>Company</label><input id="hirely-company" value="' + escapeAttr(data.company) + '" /></div>' +
        '</div>' +
        '<button class="hirely-btn" id="hirely-save-btn">Save to Pipeline</button>' +
        '<div class="hirely-status" id="hirely-save-status"></div>';

      container.querySelector('#hirely-save-btn').addEventListener('click', async () => {
        const statusEl = container.querySelector('#hirely-save-status');
        const btn = container.querySelector('#hirely-save-btn');
        const payload = {
          firstName: container.querySelector('#hirely-first').value.trim(),
          lastName: container.querySelector('#hirely-last').value.trim(),
          headline: container.querySelector('#hirely-title').value.trim(),
          company: container.querySelector('#hirely-company').value.trim(),
          url: data.url
        };
        if (!payload.firstName) { showStatus(statusEl, 'First name is required.', 'error'); return; }
        btn.disabled = true; btn.textContent = 'Saving…';
        const res = await sendMsg({ type: 'HIRELY_SAVE_CONTACT', payload });
        btn.disabled = false;
        if (res.ok) {
          // Re-check and re-render save tab as in-pipeline
          const checkRes = await sendMsg({ type: 'HIRELY_CHECK_CONTACT', url: data.url });
          await renderSaveTab(container, session, data, checkRes.contact || null);
        } else if (res.error === 'ALREADY_EXISTS') {
          showStatus(statusEl, 'Already in your pipeline.', 'info');
        } else if (res.error === 'NOT_LOGGED_IN') {
          renderLogin();
        } else {
          btn.textContent = 'Save to Pipeline';
          showStatus(statusEl, res.error || 'Something went wrong.', 'error');
        }
      });
    }
  }

  // ── PROFILE VIEW ──────────────────────────────────────────────────────
  async function renderProfile(session) {
    panel.innerHTML =
      '<div class="hirely-header">' +
        '<div class="hirely-header-title"><div class="hirely-header-logo">H→</div><span>Hirely</span></div>' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
          '<a class="hirely-open-app" href="' + HIRELY_CONFIG.API_BASE + '" target="_blank">Open app ↗</a>' +
          '<button class="hirely-close" id="hirely-close-btn">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="hirely-tabs">' +
        '<button class="hirely-tab-btn active" id="hirely-tab-save">Save</button>' +
        '<button class="hirely-tab-btn" id="hirely-tab-history">History</button>' +
      '</div>' +
      '<div class="hirely-body" id="hirely-tab-body"><div class="hirely-loading">Checking pipeline…</div></div>' +
      '<div class="hirely-footer"><button class="hirely-text-btn" id="hirely-logout-btn-shell">Sign out</button></div>';

    panel.querySelector('#hirely-close-btn').addEventListener('click', closeHirely);
    panel.querySelector('#hirely-logout-btn-shell').addEventListener('click', async () => {
      await sendMsg({ type: 'HIRELY_LOGOUT' }); render();
    });

    const tabBody = panel.querySelector('#hirely-tab-body');
    const tabSave = panel.querySelector('#hirely-tab-save');
    const tabHistory = panel.querySelector('#hirely-tab-history');

    const data = scrapeProfile();
    logProfileView(data);

    // Check pipeline status
    const checkRes = await sendMsg({ type: 'HIRELY_CHECK_CONTACT', url: data.url });
    const existing = checkRes.contact || null;

    // Render save tab by default
    await renderSaveTab(tabBody, session, data, existing);

    // Wire tab switching
    tabSave.addEventListener('click', () => {
      tabSave.classList.add('active'); tabHistory.classList.remove('active');
      renderSaveTab(tabBody, session, data, existing);
    });
    tabHistory.addEventListener('click', () => {
      tabHistory.classList.add('active'); tabSave.classList.remove('active');
      renderHistoryTab(tabBody, session);
    });
  }


  function showStatus(el, msg, kind) {
    el.textContent = msg;
    el.className = `hirely-status show ${kind}`;
  }
  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(str) { return escapeHtml(str); }





  // ── HISTORY TRACKING ─────────────────────────────────────────────────────
  const HISTORY_KEY = 'hirely_history';
  const HISTORY_MAX = 50;
  const HISTORY_DAYS = 7;

  async function logProfileView(data) {
    if (!data.name || !data.url) return;
    const stored = await chrome.storage.local.get(HISTORY_KEY);
    let history = stored[HISTORY_KEY] || [];
    // Remove existing entry for same URL
    history = history.filter(h => h.url !== data.url);
    // Add to front
    history.unshift({
      name: data.name,
      headline: data.headline || '',
      company: data.company || '',
      photo: data.photo || '',
      url: data.url,
      viewedAt: Date.now()
    });
    // Keep max entries
    history = history.slice(0, HISTORY_MAX);
    await chrome.storage.local.set({ [HISTORY_KEY]: history });
  }

  async function getHistory() {
    const stored = await chrome.storage.local.get(HISTORY_KEY);
    const history = stored[HISTORY_KEY] || [];
    const cutoff = Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000;
    return history.filter(h => h.viewedAt > cutoff);
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    if (hrs < 24) return hrs + 'h ago';
    return days + 'd ago';
  }

  // ── RENDER HISTORY TAB ────────────────────────────────────────────────────
  async function renderHistoryTab(container, session) {
    container.innerHTML = '<div class="hirely-loading">Loading history…</div>';
    const history = await getHistory();

    // Check which ones are saved in pipeline
    let savedUrls = new Set();
    if (session) {
      // We check locally — only mark as saved if we know from current session
      // Full check would require too many API calls
    }

    if (history.length === 0) {
      container.innerHTML = '<div class="hirely-history-empty">No profiles viewed in the last 7 days.<br/>Browse LinkedIn profiles to build your history.</div>';
      return;
    }

    container.innerHTML = history.map((h, i) => {
      const initials = h.name.split(' ').map(p => p[0] || '').join('').slice(0, 2).toUpperCase();
      const avatarHtml = h.photo
        ? '<img class="hirely-history-avatar" src="' + escapeAttr(h.photo) + '" />'
        : '<div class="hirely-history-avatar-fallback">' + initials + '</div>';
      return '<div class="hirely-history-item" data-url="' + escapeAttr(h.url) + '" data-index="' + i + '">' +
        avatarHtml +
        '<div class="hirely-history-info">' +
          '<div class="hirely-history-name">' + escapeHtml(h.name) + '</div>' +
          '<div class="hirely-history-sub">' + escapeHtml(h.company || h.headline || '') + '</div>' +
        '</div>' +
        '<span class="hirely-history-time">' + timeAgo(h.viewedAt) + '</span>' +
      '</div>';
    }).join('');

    // Click to open profile in new tab
    container.querySelectorAll('.hirely-history-item').forEach(item => {
      item.addEventListener('click', () => {
        window.open(item.dataset.url, '_blank');
      });
    });
  }


  // ── SCRAPE COMPANY PAGE ──────────────────────────────────────────────────
  function scrapeCompany() {
    const url = window.location.href;
    const slugMatch = url.match(/linkedin\.com\/company\/([^/?#]+)/);
    const slug = slugMatch ? slugMatch[1].replace(/-\d+$/, '') : '';
    // h1 on company pages can render lowercase via CSS — always titleCase it
    const rawName =
      document.querySelector('h1')?.innerText?.trim() ||
      getMeta('og:title')?.replace(/\s*\|\s*LinkedIn\s*$/i, '').trim() ||
      slug;
    const name = titleCase(rawName);

    // Get logo from actual DOM img element
    const logo = (() => {
      try {
        const selectors = [
          'img[class*="org-top-card-primary-content__logo"]',
          'img[class*="company-logo"]',
          'img[class*="EntityPhoto"]',
          'img[class*="evi-image"]',
          '.org-top-card-summary-info-list img',
        ];
        for (const sel of selectors) {
          try {
            const el = document.querySelector(sel);
            if (el && el.src && !el.src.includes('ghost') && el.width > 30) return el.src;
          } catch(e) {}
        }
        const imgs = document.querySelectorAll('main img, header img');
        for (const img of imgs) {
          if (img.src && img.naturalWidth > 40 && img.naturalWidth < 300 &&
              Math.abs(img.naturalWidth - img.naturalHeight) < 20) {
            return img.src;
          }
        }
      } catch(e) {}
      return '';
    })();

    const tagline = getMeta('og:description')?.split('.')[0]?.trim() || '';
    return { name, slug, logo, tagline, url };
  }

  // ── RENDER COMPANY PAGE ──────────────────────────────────────────────────
  async function renderCompany(session) {
    const company = scrapeCompany();
    const initial = (company.name || 'C')[0].toUpperCase();
    const logoHtml = company.logo
      ? '<img class="hirely-company-logo" src="' + escapeAttr(company.logo) + '" />'
      : '<div class="hirely-company-logo-fallback">' + escapeHtml(initial) + '</div>';

    function buildPanel(bodyHtml) {
      panel.innerHTML =
        '<div class="hirely-header">' +
          '<div class="hirely-header-title">' +
            '<div class="hirely-header-logo">H→</div>' +
            '<span>Hirely</span>' +
          '</div>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<a class="hirely-open-app" href="' + HIRELY_CONFIG.API_BASE + '" target="_blank">Open app ↗</a>' +
            '<button class="hirely-close" id="hirely-close-btn">✕</button>' +
          '</div>' +
        '</div>' +
        '<div class="hirely-body">' + bodyHtml + '</div>' +
        '<div class="hirely-footer"><button class="hirely-text-btn" id="hirely-logout-co">Sign out</button></div>';

      panel.querySelector('#hirely-close-btn').addEventListener('click', closeHirely);
      panel.querySelector('#hirely-logout-co').addEventListener('click', async () => {
        await sendMsg({ type: 'HIRELY_LOGOUT' }); render();
      });
    }

    // Loading state
    buildPanel(
      '<div class="hirely-company-header">' +
        logoHtml +
        '<div>' +
          '<div class="hirely-company-name">' + escapeHtml(company.name) + '</div>' +
          '<div class="hirely-company-meta">Loading…</div>' +
        '</div>' +
      '</div>' +
      '<div class="hirely-loading">Fetching company details…</div>'
    );

    let res = await sendMsg({ type: 'HIRELY_ENRICH_COMPANY', companyName: company.name, linkedinSlug: company.slug });
    // Retry once if PDL returned nothing — slug may have been scraped before DOM settled
    if (!res.info) {
      await new Promise(r => setTimeout(r, 1200));
      const freshCompany = scrapeCompany();
      res = await sendMsg({ type: 'HIRELY_ENRICH_COMPANY', companyName: freshCompany.name, linkedinSlug: freshCompany.slug });
    }
    const info = res.info || null;
    const people = res.people || [];

    function dmCardsHtml(ppl) {
      if (!ppl.length) return '';
      return '<div class="hirely-section-label">Decision Makers <span style="font-weight:400;color:#94A3B8;">(' + ppl.length + ' found)</span></div>' +
        ppl.map((p, i) => {
          const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
          const linkedinLink = p.linkedin
            ? '<a href="' + escapeAttr(p.linkedin) + '" target="_blank" class="hirely-link" style="font-size:10px;margin-top:3px;display:inline-block;">View profile ↗</a>'
            : '';
          return '<div class="hirely-person-card" id="hirely-person-' + i + '">' +
            '<div class="hirely-person-top">' +
              '<div style="min-width:0;">' +
                '<div class="hirely-person-name">' + escapeHtml(name) + '</div>' +
                '<div class="hirely-person-title">' + escapeHtml(p.position || '') + '</div>' +
                linkedinLink +
              '</div>' +
              '<button class="hirely-person-save" data-index="' + i + '">Save</button>' +
            '</div>' +
            '<div class="hirely-person-email" id="hirely-person-email-' + i + '">' +
              '<button class="hirely-find-email-btn" data-person-index="' + i + '" style="margin-bottom:0;">✦ Find Email</button>' +
            '</div>' +
          '</div>';
        }).join('');
    }

    function fullBodyHtml(ppl) {
      const name = info?.name || company.name;
      const rows = [
        info?.location ? ['📍', titleCase(info.location)] : null,
        info?.industry ? ['🏭', titleCase(info.industry)] : null,
        info?.size     ? ['👥', info.size + ' employees'] : null,
        (info?.revenue && typeof info.revenue === 'string') ? ['💰', info.revenue] : null,
        info?.founded  ? ['📅', 'Founded ' + info.founded] : null,
        info?.website  ? ['🌍', info.website] : null,
      ].filter(Boolean);

      return (
        // Company header
        '<div class="hirely-company-header">' +
          logoHtml +
          '<div>' +
            '<div class="hirely-company-name">' + escapeHtml(name) + '</div>' +
            (info?.industry ? '<div class="hirely-company-meta">' + escapeHtml(titleCase(info.industry)) + '</div>' : '') +
          '</div>' +
        '</div>' +

        // Description
        (info?.summary
          ? '<div style="font-size:11px;color:#475569;line-height:1.55;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #F1F5F9;">' +
              escapeHtml(info.summary.slice(0,1).toUpperCase() + info.summary.slice(1, 160)) + (info.summary.length > 160 ? '…' : '') +
            '</div>'
          : '') +

        // Info rows card
        (rows.length
          ? '<div class="hirely-pipeline-status" style="flex-direction:column;align-items:flex-start;gap:6px;margin-bottom:12px;">' +
              rows.map(([icon, val]) =>
                '<div style="display:flex;align-items:center;gap:8px;width:100%;">' +
                  '<span style="font-size:13px;width:18px;text-align:center;flex-shrink:0;">' + icon + '</span>' +
                  '<span style="font-size:11.5px;color:#334155;font-weight:500;">' + escapeHtml(val) + '</span>' +
                '</div>'
              ).join('') +
            '</div>'
          : '') +

        // Decision makers or find button
        (ppl.length > 0
          ? dmCardsHtml(ppl)
          : '<button class="hirely-btn" id="hirely-find-dm">Find Decision Makers</button>' +
            '<div style="font-size:10px;color:#94A3B8;text-align:center;margin-top:6px;">Save contact → Find Email right here</div>'
        )
      );
    }

    buildPanel(fullBodyHtml(people));
    wireSaveButtons(people);

    const findBtn = panel.querySelector('#hirely-find-dm');
    if (findBtn) {
      findBtn.addEventListener('click', async () => {
        findBtn.textContent = 'Searching…';
        findBtn.disabled = true;
        const dmRes = await sendMsg({ type: 'HIRELY_HUNTER_SEARCH', domain: info?.domain || '' });
        const newPeople = dmRes.people || [];
        buildPanel(fullBodyHtml(newPeople));
        wireSaveButtons(newPeople);
        if (!newPeople.length) {
          const body = panel.querySelector('.hirely-body');
          if (body) body.innerHTML += '<div class="hirely-no-results">No contacts found for this company.<br/><a class="hirely-link" href="' + escapeAttr(window.location.href.split('?')[0].replace(/\/$/, '') + '/people/') + '" target="_blank">Browse employees on LinkedIn ↗</a></div>';
        }
      });
    }

    function wireSaveButtons(ppl) {
      // Wire Save buttons
      panel.querySelectorAll('.hirely-person-save').forEach(btn => {
        btn.addEventListener('click', async () => {
          const i = parseInt(btn.dataset.index);
          const p = ppl[i];
          if (!p) return;
          btn.textContent = 'Saving…'; btn.disabled = true;
          const saveRes = await sendMsg({ type: 'HIRELY_SAVE_CONTACT', payload: {
            firstName: p.first_name || '',
            lastName: p.last_name || '',
            headline: p.position || '',
            company: info?.name || company.name,
            email: null,
            url: p.linkedin || ''
          }});
          if (saveRes.ok || saveRes.error === 'ALREADY_EXISTS') {
            btn.textContent = saveRes.error === 'ALREADY_EXISTS' ? 'In Pipeline' : 'Saved ✓';
            btn.classList.add('saved');
            // Store saved contact id so Find Email can use it
            if (saveRes.ok && saveRes.contact) {
              p._savedId = saveRes.contact.id;
            }
            // Show Find Email button now that they're saved
            const emailDiv = panel.querySelector('#hirely-person-email-' + i);
            if (emailDiv) wirePersonFindEmail(emailDiv, p, i);
          } else {
            btn.textContent = 'Error'; btn.disabled = false;
          }
        });
      });

      // Wire Find Email buttons on all cards
      panel.querySelectorAll('.hirely-find-email-btn[data-person-index]').forEach(btn => {
        const i = parseInt(btn.dataset.personIndex);
        const emailDiv = panel.querySelector('#hirely-person-email-' + i);
        if (emailDiv) wirePersonFindEmail(emailDiv, ppl[i], i);
      });
    }

    function wirePersonFindEmail(emailDiv, p, i) {
      const btn = emailDiv.querySelector('.hirely-find-email-btn');
      if (!btn) return;
      btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = 'Searching…';
        const res = await sendMsg({
          type: 'HIRELY_FIND_EMAIL',
          contactId: p._savedId || null,
          firstName: p.first_name || '',
          lastName: p.last_name || '',
          company: info?.name || company.name,
          domain: info?.domain || ''
        });
        if (res.ok && res.email) {
          const conf = res.confidence;
          const confClass = conf >= 80 ? 'hirely-confidence-high' : conf >= 50 ? 'hirely-confidence-med' : 'hirely-confidence-low';
          const confPill = conf ? '<span class="hirely-confidence-pill ' + confClass + '">' + conf + '%</span>' : '';
          emailDiv.innerHTML =
            '<div class="hirely-email-row" style="margin-top:6px;">✉ ' +
              '<span class="hirely-email-val">' + escapeHtml(res.email) + '</span>' +
              confPill +
              '<button class="hirely-copy-btn" data-copy="' + escapeAttr(res.email) + '">Copy</button>' +
            '</div>';
          const copyBtn = emailDiv.querySelector('.hirely-copy-btn');
          if (copyBtn) {
            copyBtn.addEventListener('click', () => {
              navigator.clipboard.writeText(copyBtn.dataset.copy).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
              });
            });
          }
          p.email = res.email;
        } else {
          btn.disabled = false;
          btn.textContent = '✦ Find Email';
          const err = document.createElement('div');
          err.className = 'hirely-status show error';
          err.style.marginTop = '4px';
          err.textContent = res.message || 'No email found.';
          emailDiv.appendChild(err);
          setTimeout(() => err.remove(), 3000);
        }
      };
    }
  }


  // ── OPEN / CLOSE (with storage persistence) ──────────────────────────
  const PROFILE_URL_RE = /linkedin\.com\/in\/[^/?#]+/;

  function openHirely() {
    panel.classList.add("open");
    chrome.storage.local.set({ hirely_panel_open: true });
    renderAndPatchClose();
  }
  function closeHirely() {
    panel.classList.remove("open");
    chrome.storage.local.set({ hirely_panel_open: false });
  }
  async function renderAndPatchClose() {
    await render();
    // close buttons are now wired inside renderLogin/renderProfile directly
  }

  tab.addEventListener("click", openHirely);

  chrome.storage.local.get("hirely_panel_open", ({ hirely_panel_open }) => {
    if (hirely_panel_open && (PROFILE_URL_RE.test(window.location.href) || /linkedin\.com\/company\/[^/?#]+/.test(window.location.href))) {
      openHirely();
    }
  });

  // ── SPA URL WATCHER ───────────────────────────────────────────────────
  let lastUrl = window.location.href;
  let renderTimer = null;
  setInterval(() => {
    const cur = window.location.href;
    if (cur === lastUrl) return;
    lastUrl = cur;
    if (!PROFILE_URL_RE.test(cur) && !/linkedin\.com\/company\/[^/?#]+/.test(cur)) { closeHirely(); return; }
    if (panel.classList.contains("open")) {
      // Cancel any previous pending render — only fire once after URL settles
      if (renderTimer) { clearTimeout(renderTimer); renderTimer = null; }
      renderTimer = setTimeout(() => { renderTimer = null; render(); }, 2500);
    }
  }, 600);

  } // end hirely_init

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hirely_init);
  } else {
    hirely_init();
  }
})();