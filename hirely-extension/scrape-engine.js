/* Hirely Capture: LinkedIn profile scraper v2
   Load this BEFORE content.js. Exposes window.HirelyScrape.scrapeProfile(doc, url). */
(function (root) {
  "use strict";

  function classNameOf(el) {
    var c = el.className;
    if (typeof c === "string") return c;
    if (c && typeof c === "object" && c.baseVal) return String(c.baseVal);
    return String(c || "");
  }
  function attr(el, name) {
    return (el && el.getAttribute && el.getAttribute(name)) || "";
  }
  function hrefOf(el) {
    return attr(el, "href") || "";
  }
  function isA11yHidden(el) {
    return /\b(visually-hidden|artdeco-visually-hidden|sr-only|v-hidden)\b/i.test(classNameOf(el));
  }
  function collectVisibleText(el) {
    var parts = [];
    function walk(n) {
      if (n.nodeType === 3) {
        var t = n.textContent || "";
        if (t.trim()) parts.push(t);
        return;
      }
      if (n.nodeType !== 1) return;
      if (isA11yHidden(n)) return;
      for (var i = 0; i < n.childNodes.length; i++) walk(n.childNodes[i]);
    }
    walk(el);
    return parts.join(" ");
  }
  function textOf(el) {
    if (!el) return "";
    var raw = "";
    try { raw = (el.innerText || "").trim(); } catch (e) { raw = ""; }
    if (!raw) raw = collectVisibleText(el).replace(/\s+/g, " ").trim();
    return raw.replace(/\s+/g, " ").trim();
  }
  function uniqueLines(text) {
    var lines = String(text || "").split(/\n+/).map(function (s) {
      return s.replace(/\s+/g, " ").trim();
    }).filter(Boolean);
    var out = [], seen = {};
    for (var i = 0; i < lines.length; i++) {
      var key = lines[i].toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push(lines[i]);
    }
    return out;
  }
  function leafLines(root) {
    var lines = [], seen = {};
    function push(raw) {
      var t = String(raw || "").replace(/\s+/g, " ").trim();
      if (!t || t.length < 2) return;
      var key = t.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      lines.push(t);
    }
    function walk(el) {
      if (isA11yHidden(el)) return;
      var kids = el.children || [];
      for (var i = 0; i < el.childNodes.length; i++) {
        var n = el.childNodes[i];
        if (n.nodeType === 3) push(n.textContent || "");
      }
      if (!kids.length) {
        push(collectVisibleText(el));
        return;
      }
      for (var k = 0; k < kids.length; k++) walk(kids[k]);
    }
    walk(root);
    return lines;
  }
  function linesOf(el) {
    if (!el) return [];
    var leaves = leafLines(el);
    var raw = "";
    try { raw = el.innerText || ""; } catch (e) { raw = ""; }
    if (!raw.trim()) raw = collectVisibleText(el);
    var fromText = uniqueLines(raw);
    if (leaves.length >= fromText.length) return leaves;
    var seen = {};
    var merged = leaves.slice();
    for (var i = 0; i < leaves.length; i++) seen[leaves[i].toLowerCase()] = true;
    for (var j = 0; j < fromText.length; j++) {
      if (!seen[fromText[j].toLowerCase()]) merged.push(fromText[j]);
    }
    return merged;
  }
  function getMeta(doc, prop) {
    var el = doc.querySelector('meta[property="' + prop + '"]') ||
      doc.querySelector('meta[name="' + prop + '"]');
    return el ? (el.getAttribute("content") || "").trim() : "";
  }

  var GENERIC_NAME = /^(profile|search|home|jobs|messaging|notifications|me|feed|linkedin|sign in|sign up|about|experience|education|skills|activity)$/i;
  var JUNK_LINE = /^(connect|message|follow|following|pending|contact info|share|more|open to work|hiring|save|saved|add (section|profile|custom button|custom)|profile language|public profile(& URL)?|analytics|private to you|post impressions|search appearances|profile views|open to|show all|see all|show more|see more|activity|about|featured|resources|digital creator|talks about|followers?|connections?|\d[\d,]*\+?\s*(followers?|connections?)|1st|2nd|3rd\+?|•|·|edit|add|open|premium|try premium for \$0|enhance profile|profile enhanced|english|public profile & url)$/i;
  var PRONOUN_OR_DEGREE = /^(she\/her|he\/him|they\/them|she\/they|he\/they|xe\/xem)(\s*[·•|,].*)?$/i;
  var SECTION_HEADING = /^(experience|education|skills|about|activity|featured|interests|licenses|honors|volunteer|recommendations|languages|publications|courses|projects|people also viewed|people you may know|explore|analytics)$/i;
  var NOT_A_COMPANY = /^(scale|heart|work|play|ease|night|last|least|all|it|this|that|home|you|me|us|them|once|first)$/i;

  function isPronounOrDegree(t) {
    if (PRONOUN_OR_DEGREE.test(t)) return true;
    if (/^(1st|2nd|3rd\+?)$/i.test(t)) return true;
    if (/\b(she\/her|he\/him|they\/them)\b/i.test(t) && /\b(1st|2nd|3rd)/i.test(t) && t.length < 40) return true;
    return false;
  }
  function isLocationLine(t) {
    if (/\d+\s*(connections?|followers?)/i.test(t)) return false;
    if (/,\s*(united states|canada|uk|united kingdom|india|germany|australia|france|brazil|mexico|singapore|uae|netherlands|ireland|spain|italy|sweden|japan|south korea|new zealand|vietnam|philippines|pakistan|nigeria|south africa)\b/i.test(t)) return true;
    if (/^(greater|metropolitan)\b/i.test(t) && t.length < 80) return true;
    if (/,\s*[A-Z]{2}$/.test(t) && t.length < 60) return true;
    if (/\b(michigan|ontario|california|texas|florida|ohio|washington|illinois|pennsylvania|georgia|arizona|north carolina|new jersey|virginia|massachusetts|colorado|minnesota|wisconsin|missouri|alabama|tennessee|kentucky|indiana|maryland|oregon|nevada|utah|connecticut|iowa|kansas|oklahoma|arkansas|mississippi|nebraska|new mexico|idaho|hawaii|alaska|vermont|maine|rhode island|delaware|montana|wyoming|north dakota|south dakota|west virginia|new hampshire|quebec|alberta|british columbia)\b/i.test(t) && t.length < 90) return true;
    return false;
  }
  function isJunkLine(t) {
    var s = (t || "").trim();
    if (!s || s.length < 2) return true;
    if (JUNK_LINE.test(s) || isPronounOrDegree(s) || SECTION_HEADING.test(s)) return true;
    if (/^talks about\b/i.test(s) || /^\d[\d,]*\+?$/.test(s) || /^promoted$/i.test(s)) return true;
    return false;
  }
  function looksLikePersonName(t) {
    var s = t.split(",")[0].trim();
    if (s.length < 2 || s.length > 80) return false;
    if (GENERIC_NAME.test(s) || /\d{3,}/.test(s)) return false;
    return s.split(/\s+/).length <= 6;
  }
  function splitName(name) {
    var parts = name.trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
  }
  function findProfileH1(doc) {
    var scoped = doc.querySelectorAll("main h1, [role='main'] h1");
    var all = scoped.length ? scoped : doc.querySelectorAll("h1");
    for (var i = 0; i < all.length; i++) {
      var t = uniqueLines(textOf(all[i]))[0] || "";
      if (looksLikePersonName(t)) return all[i];
    }
    return null;
  }
  function parseTitleName(raw) {
    if (!raw) return null;
    var cleaned = raw.replace(/\s*\|.*LinkedIn.*$/i, "").replace(/\s*-\s*LinkedIn\s*$/i, "").trim();
    var segs = cleaned.split(/\s+[-\u2013\u2014]\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!segs[0] || !looksLikePersonName(segs[0])) return null;
    return { name: segs[0].split(",")[0].trim(), headline: segs[1] || "" };
  }
  function introRoot(h1) {
    return h1.closest("section") ||
      h1.closest("[data-view-name*='profile-card']") ||
      h1.closest("[data-view-name*='profile-top-card']") ||
      h1.closest("main") ||
      h1.parentElement || h1;
  }
  function isNoiseContainer(el) {
    if (el.closest("aside, nav, footer, [role='navigation']")) return true;
    var n = el;
    for (var i = 0; i < 10 && n; i++) {
      var cls = classNameOf(n).toLowerCase();
      var view = (n.getAttribute("data-view-name") || "").toLowerCase();
      if (
        cls.indexOf("promoted") >= 0 || cls.indexOf("sponsor") >= 0 ||
        cls.indexOf("pymk") >= 0 || cls.indexOf("people-also") >= 0 ||
        cls.indexOf("similar-profile") >= 0 || cls.indexOf("ad-banner") >= 0 ||
        cls.indexOf("ads-container") >= 0 || view.indexOf("promoted") >= 0 ||
        n.hasAttribute("data-ad-banner")
      ) return true;
      n = n.parentElement;
    }
    return false;
  }
  function isCompanyHref(href) {
    return /\/company\/[A-Za-z0-9._%-]+/.test(href) && !/\/company\/(setup|premium|people)\b/.test(href);
  }
  function companyLabelFromAnchor(a) {
    var img = a.querySelector("img");
    var alt = ((img && img.getAttribute("alt")) || "").replace(/\s*logo$/i, "").trim();
    var txt = uniqueLines(textOf(a))[0] || "";
    var label = (txt || alt).split("|")[0].split("·")[0].trim();
    if (label.length > 1 && label.length < 80 && !isJunkLine(label) && !isLocationLine(label)) return label;
    return "";
  }
  function findSectionByHeading(root, heading) {
    var want = heading.toLowerCase();
    var hs = root.querySelectorAll("h2, h3");
    for (var i = 0; i < hs.length; i++) {
      var t = uniqueLines(textOf(hs[i]))[0] || "";
      if (t.toLowerCase().replace(/\s+/g, " ") === want) return hs[i].closest("section") || hs[i].parentElement;
    }
    return null;
  }
  function companyFromIntroBadge(h1, name) {
    var card = introRoot(h1);
    var anchors = card.querySelectorAll("a[href]");
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      if (!isCompanyHref(hrefOf(a))) continue;
      if (isNoiseContainer(a)) continue;
      var sec = a.closest("section");
      if (sec) {
        var h2 = sec.querySelector("h2");
        var heading = uniqueLines(textOf(h2))[0] || "";
        if (/^experience$/i.test(heading)) continue;
      }
      var hitExp = false;
      var heads = card.querySelectorAll("h2");
      for (var h = 0; h < heads.length; h++) {
        var ht = uniqueLines(textOf(heads[h]))[0] || "";
        if (!/^experience$/i.test(ht)) continue;
        try {
          if (heads[h].compareDocumentPosition(a) & 4) hitExp = true;
        } catch (e) { hitExp = true; }
      }
      if (hitExp) continue;
      var lbl = companyLabelFromAnchor(a);
      if (lbl && lbl.toLowerCase() !== name.toLowerCase()) return lbl;
    }
    return "";
  }
  function unescapeJson(s) {
    return s.replace(/\\"/g, '"').replace(/\\n/g, " ").replace(/\\\\/g, "\\");
  }
  function walkJsonForPerson(data, name) {
    var out = { headline: "", company: "" };
    function visit(node, depth) {
      if (!node || depth > 8) return;
      if (Array.isArray(node)) { for (var i = 0; i < node.length; i++) visit(node[i], depth + 1); return; }
      if (typeof node !== "object") return;
      var type = String(node["@type"] || node.type || "");
      var nodeName = String(node.name || node.fullName || "").trim();
      var headline = String(node.headline || node.jobTitle || "").trim();
      var company = "";
      if (node.worksFor && typeof node.worksFor === "object") company = String(node.worksFor.name || "").trim();
      if (!company && typeof node.companyName === "string") company = node.companyName;
      var nameMatch = !name || !nodeName || nodeName.toLowerCase() === name.toLowerCase() || type.toLowerCase() === "person";
      if (nameMatch && headline && headline.length < 300 && !out.headline) out.headline = headline;
      if (nameMatch && company && company.length < 80 && !out.company) out.company = company;
      var keys = Object.keys(node);
      for (var k = 0; k < keys.length; k++) visit(node[keys[k]], depth + 1);
    }
    visit(data, 0);
    return out;
  }
  function headlineFromJson(doc, name) {
    var empty = { headline: "", company: "", strategy: "" };
    var blobs = [];
    var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i++) blobs.push({ raw: scripts[i].textContent || "", source: "json-ld" });
    var codes = doc.querySelectorAll('code[id^="bpr-guid"], code[id^="datalet"]');
    for (var c = 0; c < codes.length; c++) blobs.push({ raw: codes[c].textContent || "", source: "bpr-guid" });
    for (var b = 0; b < blobs.length; b++) {
      var raw = blobs[b].raw.trim();
      if (!raw) continue;
      raw = raw.replace(/^\s*<!--/, "").replace(/-->\s*$/, "");
      try {
        var data = JSON.parse(raw);
        var found = walkJsonForPerson(data, name);
        if (found.headline || found.company) return { headline: found.headline, company: found.company, strategy: blobs[b].source };
      } catch (e) {
        var hm = raw.match(/"headline"\s*:\s*"((?:\\.|[^"\\]){3,280})"/);
        var jm = raw.match(/"jobTitle"\s*:\s*"((?:\\.|[^"\\]){3,280})"/);
        var headline = unescapeJson((hm && hm[1]) || (jm && jm[1]) || "");
        if (headline && headline.toLowerCase() !== name.toLowerCase()) {
          return { headline: headline, company: "", strategy: blobs[b].source };
        }
      }
    }
    return empty;
  }
  function isGoodHeadline(line, name, company) {
    if (!line || line.length < 3 || line.length > 280) return false;
    if (isJunkLine(line) || isLocationLine(line) || isPronounOrDegree(line)) return false;
    if (line === name || line.toLowerCase() === name.toLowerCase()) return false;
    if (company && line.toLowerCase() === company.toLowerCase()) return false;
    var first = name.split(" ")[0];
    var last = name.split(" ").slice(-1)[0];
    if (line === first || line === last) return false;
    return true;
  }
  function headlineFromStableSelectors(card, name, company) {
    var selectors = [
      "[data-anonymize='headline']",
      ".pv-text-details__left-panel .text-body-medium",
      ".text-body-medium.break-words",
      ".text-body-medium"
    ];
    for (var s = 0; s < selectors.length; s++) {
      var nodes = card.querySelectorAll(selectors[s]);
      for (var i = 0; i < nodes.length; i++) {
        if (isNoiseContainer(nodes[i])) continue;
        var line = uniqueLines(textOf(nodes[i]))[0] || "";
        if (isGoodHeadline(line, name, company)) return line;
      }
    }
    return "";
  }
  function headlineFromTopCardLines(card, name, company) {
    var lines = linesOf(card);
    var sawName = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!sawName) {
        if (line === name || line.indexOf(name) === 0 || name.indexOf(line.split(",")[0].trim()) === 0) sawName = true;
        continue;
      }
      if (SECTION_HEADING.test(line)) break;
      if (isGoodHeadline(line, name, company)) return line;
    }
    return "";
  }
  function parseExperience(root) {
    var section = findSectionByHeading(root, "Experience");
    if (!section) return [];
    var items = section.querySelectorAll("[data-view-name*='profile-component-entity'], li.pvs-list__paged-list-item, li.pvs-list__item--line-separated, .pvs-entity, .pvs-list > li, ul > li");
    var blocks = items.length ? items : [section];
    var out = [];
    for (var i = 0; i < blocks.length && out.length < 3; i++) {
      var item = blocks[i];
      var company = "";
      var links = item.querySelectorAll("a[href]");
      for (var a = 0; a < links.length; a++) {
        if (isCompanyHref(hrefOf(links[a]))) { company = companyLabelFromAnchor(links[a]); break; }
      }
      var lines = linesOf(item).filter(function (l) {
        return !isJunkLine(l) && !isLocationLine(l) && !/^present$/i.test(l) &&
          !/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|yrs?|mos?)\b/i.test(l);
      });
      var title = "";
      for (var L = 0; L < lines.length; L++) {
        if (company && lines[L].toLowerCase() === company.toLowerCase()) continue;
        if (lines[L].length >= 3 && lines[L].length < 140) { title = lines[L]; break; }
      }
      if (title || company) out.push({ title: title, company: company });
    }
    return out;
  }
  function splitTitleAndCompany(headline, knownCompany) {
    knownCompany = knownCompany || "";
    if (!headline) return { title: "", company: knownCompany };
    var at = headline.match(/^(.{2,120}?)\s+(?:at|@)\s+(.{2,80})$/i);
    if (at) {
      var title = at[1].trim();
      var company = at[2].split("|")[0].split("·")[0].split(",")[0].trim();
      if (company && !NOT_A_COMPANY.test(company) && company.split(/\s+/).length <= 8) {
        return { title: title, company: knownCompany || company };
      }
    }
    if (headline.indexOf(" | ") >= 0) return { title: headline.split(" | ")[0].trim(), company: knownCompany };
    if (headline.indexOf(",") >= 0 && knownCompany) {
      var ci = headline.indexOf(",");
      var left = headline.slice(0, ci).trim();
      var right = headline.slice(ci + 1).trim();
      if (left.length > 3 && left.length < 100 && right.toLowerCase().indexOf(knownCompany.toLowerCase().slice(0, 12)) >= 0) {
        return { title: left, company: knownCompany };
      }
    }
    return { title: headline, company: knownCompany };
  }
  function photoFrom(doc, h1) {
    var meta = getMeta(doc, "og:image") || getMeta(doc, "twitter:image");
    if (meta) return meta;
    if (h1) {
      var card = introRoot(h1);
      var img = card.querySelector("img[alt], img.profile-photo, img.avatar, img");
      var src = img ? img.getAttribute("src") || "" : "";
      if (src.indexOf("http") === 0 || src.indexOf("data:") === 0) return src;
    }
    return "";
  }

  function scrapeProfile(doc, pageUrl) {
    doc = doc || document;
    var trace = [];
    var url = pageUrl || (doc.location && doc.location.href) || "";
    var titleData = parseTitleName(getMeta(doc, "og:title")) || parseTitleName(doc.title || "");
    var h1 = findProfileH1(doc);
    var h1Name = h1 ? (uniqueLines(textOf(h1))[0] || "").split(",")[0].trim() : "";
    var name = "", nameSource = "";
    if (h1Name && looksLikePersonName(h1Name)) {
      name = h1Name; nameSource = "h1"; trace.push('name ← h1 "' + name + '"');
    } else if (titleData && titleData.name) {
      name = titleData.name; nameSource = "og:title"; trace.push("name ← og:title \"" + name + "\"");
    }
    var json = headlineFromJson(doc, name);
    var card = h1 ? introRoot(h1) : (doc.querySelector("main") || doc.body || doc.documentElement);
    var company = "", companySource = "";
    if (h1) {
      company = companyFromIntroBadge(h1, name);
      if (company) { companySource = "intro-badge"; trace.push('company ← intro-badge "' + company + '"'); }
    }
    if (!company && json.company) {
      company = json.company; companySource = json.strategy + ":company";
      trace.push("company ← " + companySource + " \"" + company + "\"");
    }
    var anonCompany = card ? textOf(card.querySelector("[data-anonymize='company-name']")) : "";
    if (!company && anonCompany && anonCompany.length < 80) {
      company = anonCompany.split("\n")[0].trim(); companySource = "data-anonymize";
      trace.push('company ← data-anonymize "' + company + '"');
    }
    var rawHeadline = "", headlineSource = "";
    if (titleData && titleData.headline) {
      rawHeadline = titleData.headline; headlineSource = "document-title";
    }
    if (!rawHeadline && json.headline) {
      rawHeadline = json.headline; headlineSource = json.strategy;
      trace.push("headline ← " + headlineSource + " \"" + rawHeadline + "\"");
    }
    if (!rawHeadline && card) {
      var anon = textOf(card.querySelector("[data-anonymize='headline']"));
      if (isGoodHeadline(anon, name, company)) {
        rawHeadline = uniqueLines(anon)[0]; headlineSource = "data-anonymize";
        trace.push('headline ← data-anonymize "' + rawHeadline + '"');
      }
    }
    if (!rawHeadline && card) {
      var fromCss = headlineFromStableSelectors(card, name, company);
      if (fromCss) { rawHeadline = fromCss; headlineSource = "text-body-medium"; trace.push('headline ← text-body-medium "' + rawHeadline + '"'); }
    }
    if (!rawHeadline && card) {
      var fromLines = headlineFromTopCardLines(card, name, company);
      if (fromLines) { rawHeadline = fromLines; headlineSource = "top-card-lines"; trace.push('headline ← top-card-lines "' + rawHeadline + '"'); }
    }
    var experience = parseExperience(doc);
    var currentExp = experience[0];
    if (!rawHeadline && currentExp && currentExp.title) {
      rawHeadline = currentExp.title; headlineSource = "experience-title";
      trace.push('headline ← experience-title "' + rawHeadline + '"');
    }
    if (!company && currentExp && currentExp.company) {
      company = currentExp.company; companySource = "experience-company";
      trace.push('company ← experience-company "' + company + '"');
    }
    var split = splitTitleAndCompany(rawHeadline, company);
    var title = split.title;
    if (!company && split.company) {
      company = split.company; companySource = companySource || "headline-at";
      trace.push('company ← headline-at "' + company + '"');
    }
    if (!title && currentExp && currentExp.title) title = currentExp.title;
    var locationLine = card ? (linesOf(card).filter(isLocationLine)[0] || "") : "";
    var names = splitName(name);
    return {
      name: name,
      firstName: names.firstName,
      lastName: names.lastName,
      headline: rawHeadline || title,
      title: title,
      company: company,
      location: locationLine,
      photo: photoFrom(doc, h1),
      url: url,
      sources: {
        name: nameSource || "none",
        headline: headlineSource || "none",
        title: headlineSource || "none",
        company: companySource || "none"
      },
      trace: trace
    };
  }

  root.HirelyScrape = { scrapeProfile: scrapeProfile, splitTitleAndCompany: splitTitleAndCompany };
})(typeof window !== "undefined" ? window : self);
