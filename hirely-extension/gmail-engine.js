(function (root) {
  "use strict";

  const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

  function normalizeEmail(value) {
    const raw = String(value || "").trim();
    const bracketed = raw.match(/<([^<>]+@[^<>]+)>/);
    return (bracketed ? bracketed[1] : raw).replace(/^mailto:/i, "").trim().toLowerCase();
  }

  function validEmail(value) {
    return EMAIL.test(normalizeEmail(value));
  }

  function splitName(value, email) {
    let name = String(value || "").replace(/[<>]/g, "").trim();
    if (!name || validEmail(name)) name = normalizeEmail(email).split("@")[0].replace(/[._-]+/g, " ");
    const parts = name.split(/\s+/).filter(Boolean);
    return { firstName: parts.shift() || "", lastName: parts.join(" ") };
  }

  function nodeEmail(node) {
    return normalizeEmail(node && (node.getAttribute("email") || node.getAttribute("data-hovercard-id") || node.getAttribute("href") || ""));
  }

  function nodeName(node, email) {
    return String(node && (node.getAttribute("name") || node.getAttribute("data-name") || node.textContent) || "")
      .replace(email, "").replace(/[<>]/g, "").trim();
  }

  function messageRoots(doc) {
    const expanded = Array.from(doc.querySelectorAll('[data-message-id][aria-expanded="true"], [data-legacy-message-id][aria-expanded="true"]'));
    if (expanded.length) return expanded.reverse();
    const messages = Array.from(doc.querySelectorAll("[data-message-id], [data-legacy-message-id]"));
    return messages.reverse();
  }

  function chooseContact(doc, ownEmail) {
    const own = normalizeEmail(ownEmail);
    const roots = messageRoots(doc);
    if (!roots.length) return null;

    for (const message of roots) {
      const nodes = Array.from(message.querySelectorAll("[email], [data-hovercard-id]"));
      const candidates = nodes.map((node, index) => {
        const email = nodeEmail(node);
        if (!validEmail(email)) return null;
        let score = 0;
        if (node.matches(".gD[email]")) score += 30;
        if (node.matches(".g2[email], .hb[email]")) score += 20;
        if (!own || email !== own) score += 100;
        return { node, email, score, index };
      }).filter(Boolean).sort((a, b) => b.score - a.score || a.index - b.index);

      const best = candidates[0];
      if (!best) continue;
      const name = splitName(nodeName(best.node, best.email), best.email);
      return { firstName: name.firstName, lastName: name.lastName, email: best.email };
    }
    return null;
  }

  root.HirelyGmailEngine = { normalizeEmail, validEmail, splitName, chooseContact };
})(typeof globalThis !== "undefined" ? globalThis : this);
