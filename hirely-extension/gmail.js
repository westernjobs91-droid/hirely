(function () {
  "use strict";
  if (window.top !== window || window.__hirelyGmailLoaded) return;
  window.__hirelyGmailLoaded = true;

  const engine = globalThis.HirelyGmailEngine;
  const ROOT_ID = "hirely-gmail-root";
  const STYLE_ID = "hirely-gmail-style";

  function send(message) {
    return new Promise(resolve => chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) resolve({ ok: false, error: "Hirely could not connect. Reload Gmail and try again." });
      else resolve(response || { ok: false, error: "Hirely did not respond." });
    }));
  }

  function escape(value) {
    return String(value || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function ownEmail() {
    const account = document.querySelector('[aria-label*="Google Account"]');
    const label = account && account.getAttribute("aria-label") || "";
    const match = label.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
    return match ? match[0] : "";
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID}{position:fixed;right:0;top:32%;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a}
      #${ROOT_ID} *{box-sizing:border-box}
      #${ROOT_ID} .hg-tab{border:0;border-radius:12px 0 0 12px;background:#2563eb;color:#fff;padding:12px 8px;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(15,23,42,.2);writing-mode:vertical-rl;letter-spacing:.03em}
      #${ROOT_ID} .hg-panel{display:none;width:min(360px,calc(100vw - 20px));max-height:calc(100vh - 32px);overflow:auto;margin-right:12px;border:1px solid #dbeafe;border-radius:20px;background:#fff;box-shadow:0 24px 60px rgba(15,23,42,.24)}
      #${ROOT_ID}.hg-open .hg-tab{display:none} #${ROOT_ID}.hg-open .hg-panel{display:block}
      #${ROOT_ID} .hg-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:linear-gradient(135deg,#2563eb,#1e3a5f);color:#fff;border-radius:19px 19px 0 0}
      #${ROOT_ID} .hg-brand{font-size:15px;font-weight:800} #${ROOT_ID} .hg-close{border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}
      #${ROOT_ID} .hg-body{padding:18px} #${ROOT_ID} .hg-kicker{margin:0 0 5px;color:#2563eb;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
      #${ROOT_ID} .hg-copy{margin:0 0 16px;color:#64748b;font-size:12px;line-height:1.5}
      #${ROOT_ID} .hg-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px} #${ROOT_ID} .hg-field{margin-bottom:11px}
      #${ROOT_ID} label{display:block;margin-bottom:5px;color:#475569;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
      #${ROOT_ID} input{width:100%;min-height:39px;border:1px solid #cbd5e1;border-radius:9px;padding:8px 10px;color:#0f172a;background:#fff;font-size:13px;outline:none}
      #${ROOT_ID} input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
      #${ROOT_ID} .hg-save{width:100%;min-height:43px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-size:13px;font-weight:800;cursor:pointer}
      #${ROOT_ID} .hg-save:disabled{background:#94a3b8;cursor:not-allowed} #${ROOT_ID} .hg-status{display:none;margin-top:11px;border-radius:9px;padding:9px 10px;font-size:12px;line-height:1.4}
      #${ROOT_ID} .hg-status.show{display:block} #${ROOT_ID} .hg-status.ok{background:#ecfdf5;color:#047857} #${ROOT_ID} .hg-status.error{background:#fef2f2;color:#b91c1c} #${ROOT_ID} .hg-status.info{background:#eff6ff;color:#1d4ed8}
      #${ROOT_ID} .hg-link{color:#2563eb;font-weight:700;text-decoration:none}
      @media(max-width:640px){#${ROOT_ID}{top:auto;bottom:12px}#${ROOT_ID} .hg-panel{margin-right:10px;max-height:80vh}}
    `;
    document.documentElement.appendChild(style);
  }

  function createRoot() {
    injectStyle();
    let root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML = `<button class="hg-tab" type="button" aria-label="Open Hirely">Hirely</button><section class="hg-panel" aria-label="Save Gmail contact to Hirely"><header class="hg-head"><span class="hg-brand">Save to Hirely</span><button class="hg-close" type="button" aria-label="Close Hirely">×</button></header><div class="hg-body"></div></section>`;
    document.body.appendChild(root);
    root.querySelector(".hg-tab").addEventListener("click", () => { root.classList.add("hg-open"); render(root); });
    root.querySelector(".hg-close").addEventListener("click", () => root.classList.remove("hg-open"));
    return root;
  }

  function status(el, text, kind) {
    el.textContent = text;
    el.className = `hg-status show ${kind}`;
  }

  async function render(root) {
    const body = root.querySelector(".hg-body");
    const sessionResult = await send({ type: "HIRELY_GET_SESSION" });
    if (!sessionResult.ok || !sessionResult.session) {
      body.innerHTML = `<p class="hg-kicker">Gmail capture</p><p class="hg-copy">Sign in to Hirely from the extension toolbar, then reopen this panel.</p><a class="hg-link" href="https://app.hirelypro.com/login" target="_blank" rel="noopener">Open Hirely sign in →</a>`;
      return;
    }

    const found = engine && engine.chooseContact(document, ownEmail());
    if (!found) {
      body.innerHTML = `<p class="hg-kicker">Open-message capture</p><p class="hg-copy">Open an individual email first. Hirely reads only the visible message header and never the message body.</p><div class="hg-status show info">No open sender or recipient was found.</div>`;
      return;
    }

    body.innerHTML = `<p class="hg-kicker">Open-message capture</p><p class="hg-copy">Review the visible sender or recipient before saving. Message content is not collected.</p><div class="hg-grid"><div class="hg-field"><label for="hg-first">First name</label><input id="hg-first" maxlength="100" value="${escape(found.firstName)}"></div><div class="hg-field"><label for="hg-last">Last name</label><input id="hg-last" maxlength="100" value="${escape(found.lastName)}"></div></div><div class="hg-field"><label for="hg-email">Email</label><input id="hg-email" type="email" maxlength="254" value="${escape(found.email)}"></div><div class="hg-field"><label for="hg-company">Company (optional)</label><input id="hg-company" maxlength="200"></div><div class="hg-field"><label for="hg-title">Job title (optional)</label><input id="hg-title" maxlength="200"></div><button class="hg-save" type="button">Save contact</button><div class="hg-status" role="status"></div>`;
    const save = body.querySelector(".hg-save");
    const statusEl = body.querySelector(".hg-status");
    save.addEventListener("click", async () => {
      const payload = {
        firstName: body.querySelector("#hg-first").value.trim(),
        lastName: body.querySelector("#hg-last").value.trim(),
        email: body.querySelector("#hg-email").value.trim(),
        company: body.querySelector("#hg-company").value.trim(),
        jobTitle: body.querySelector("#hg-title").value.trim()
      };
      if (!payload.firstName || !engine.validEmail(payload.email)) return status(statusEl, "Enter a first name and valid email address.", "error");
      save.disabled = true;
      save.textContent = "Saving…";
      const result = await send({ type: "HIRELY_SAVE_GMAIL_CONTACT", payload });
      save.disabled = false;
      save.textContent = "Save contact";
      if (result.ok) status(statusEl, `${payload.firstName} was saved to Coming up.`, "ok");
      else if (result.error === "ALREADY_EXISTS") status(statusEl, "This email is already in your Hirely contacts.", "info");
      else if (result.error === "CONTACT_IN_TRASH") status(statusEl, "This email is in Trash. Restore the contact in Hirely before saving again.", "error");
      else status(statusEl, result.error || "The contact could not be saved.", "error");
    });
  }

  createRoot();
  const observer = new MutationObserver(() => { if (!document.getElementById(ROOT_ID) && document.body) createRoot(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
