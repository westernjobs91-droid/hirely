/* Hirely Capture v4.8: complete content.js replacement.
 * Requires your existing HIRELY_CONFIG and background message handlers.
 * This file includes the scraper; do not also load the old scraper/content.js.
 * Conservative extraction: title/company stay paired; past jobs are never
 * silently treated as current. Uncertain fields remain editable and empty.
 */
"use strict";
var HirelyEngine = (() => {
  const clean = s => String(s || "").replace(/\s+/g, " ").trim();
  const same = (a, b) => clean(a).normalize("NFKC").toLocaleLowerCase() === clean(b).normalize("NFKC").toLocaleLowerCase();
  const excluded = 'aside, nav, [role="dialog"], #hirely-extension-host, .scaffold-layout__aside';
  const noise = /^(experience|education|show all.*|show more.*|see more.*|see all.*|skills[:：]?.*|\d+ skills|.*\+\d+ skills|connect|message|follow|contact info|1st|2nd|3rd\+?)$/i;
  const employment = /^(?:(?:permanent|temporary|contract) )?(full[- ]time|part[- ]time|contract|permanent|freelance|self[- ]employed|internship|apprenticeship|seasonal|on[- ]call|co[- ]op|on[- ]site|hybrid|remote)$/i;
  const current = /\b(present|current|aujourd’hui|aujourd'hui|actualidad|heute)\b|現在|至今/i;
  const date = s => /\b(?:19|20)\d{2}\b/.test(s) && /[–\u2014-]|\bto\b|\bà\b|\bau\b|\bbis\b|至/.test(s);
  const roleHint = /\b(engineer|developer|manager|director|founder|owner|partner|lead|head|officer|president|ceo|cto|cfo|coo|vp|consultant|analyst|designer|specialist|recruiter|coordinator|assistant|associate|professor|teacher|researcher|scientist|nurse|physician|lawyer|accountant|intern|administrator|executive)\b/i;
  function hidden(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (n.matches('script, style, template, noscript, [hidden], .visually-hidden, .artdeco-visually-hidden, .sr-only')) return true;
      if (n.style?.display === 'none' || n.style?.visibility === 'hidden') return true;
      // aria-hidden="true" is often LinkedIn's visible duplicate text.
    }
    return false;
  }
  function textOf(el) {
    if (!el || hidden(el)) return "";
    const copy = el.cloneNode(true);
    copy.querySelectorAll('script, style, template, noscript, [hidden], .visually-hidden, .artdeco-visually-hidden, .sr-only, [style*="display: none"]').forEach(n => n.remove());
    return clean(copy.textContent);
  }
  function linesOf(el) {
    if (!el) return [];
    const lines = [];
    const walk = n => {
      if (n.nodeType === 3) { const t = clean(n.textContent); if (t) lines.push(t); return; }
      if (n.nodeType !== 1 || hidden(n)) return;
      // Preserve inline fragments of one display label as a single line.
      if (n.matches('span[aria-hidden="true"], .t-bold, .t-14.t-normal, time')) {
        const t = textOf(n); if (t) lines.push(t); return;
      }
      Array.from(n.childNodes).forEach(walk);
    };
    walk(el);
    return lines.filter((s, i) => i === 0 || !same(s, lines[i - 1]));
  }
  function stripDegree(s) {
    const credentials = new Set(['MBA','PHD','CPA','PMP','CHRP','CHRL','CPHR','CPCC','ACC','PCC','MCC','CQE','MHRM','MENG','CSM','CSBA','CPM']);
    const credential = value => credentials.has(value.replace(/[.®™\uFE0F]/g, '').toUpperCase());
    let value = clean(s).replace(/\s*[·•]\s*(?:1st|2nd|3rd)\+?.*$/i, '');
    const parenthetical = value.match(/\s*\(([^()]*)\)\s*$/);
    if (parenthetical && parenthetical[1].split(/\s*,\s*/).every(credential)) value = value.slice(0, parenthetical.index).trim();
    for (;;) {
      const match = value.match(/^(.*?)(,\s*|\s+[-–\u2014]\s+|\s+)([A-Za-z][A-Za-z.®™\uFE0F]*)$/);
      if (!match || !credential(match[3])) break;
      // A bare suffix must be uppercase and follow an existing full name.
      if (!/[,–\u2014-]/.test(match[2]) && (match[1].trim().split(/\s+/).length < 2 || match[3] !== match[3].toUpperCase())) break;
      value = match[1].trim();
    }
    return value;
  }
  function splitName(value) {
    const parts = stripDegree(value).replace(/^(\S+)\s+\([^)]*\)\s+(?=\S)/, '$1 ').split(/\s+/);
    return {firstName: parts.shift() || '', lastName: parts.join(' ')};
  }
  function selectCurrentRole(active, badge, headline) {
    if (active.length === 1) return active[0];
    const matching = badge ? active.filter(p => same(p.company, badge)) : [];
    const pool = matching.length ? matching : active;
    if (!pool.length) return null;
    if (pool.length === 1) return pool[0];
    // Resolve overlapping promotions only within one employer.
    if (!pool[0].company || !pool.every(p => same(p.company, pool[0].company))) return null;
    const headTitle = splitTitleAndCompany(headline).title;
    const exact = pool.filter(p => same(p.title, headTitle));
    if (exact.length === 1) return exact[0];
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const ranked = pool.map(role => {
      const m = clean(role.dates).match(/^(?:([A-Za-z]+)\s+)?((?:19|20)\d{2})\s*[–\u2014-]/);
      const month = m?.[1] ? months.indexOf(m[1].slice(0,3).toLowerCase()) : 0;
      return {role, start: m && month >= 0 ? Number(m[2]) * 12 + month : null};
    });
    if (ranked.some(p => p.start === null)) return null;
    ranked.sort((a,b) => b.start - a.start);
    return ranked[0].start > ranked[1].start ? ranked[0].role : null;
  }
  function isPronounOrDegree(s) { return /^(?:(?:she\/her|he\/him|they\/them)\s*[·•]?\s*)?(?:1st|2nd|3rd)\+?$|^(she\/her|he\/him|they\/them)$/i.test(clean(s)); }
  function validLabel(s) { return !!clean(s) && clean(s).length <= 180 && !noise.test(clean(s)) && !isPronounOrDegree(s) && !employment.test(clean(s)) && !date(s); }
  function stripEmployment(s) {
    const parts = clean(s).split(/(\s*[·•]\s*)/);
    const metadata = p => employment.test(p) || date(p) || /^\d+\s*(yrs?|mos?|years?|months?)\b/i.test(p);
    while (parts.length && metadata(parts[parts.length - 1])) { parts.pop(); if (parts.length) parts.pop(); }
    return parts.join('').trim();
  }
  const unnamedEmployer = s => /^(self[- ]employed|freelance)(?:\s*[·•]\s*(?:self[- ]employed|freelance|full[- ]time|part[- ]time))*$/i.test(clean(s));
  function uniqueRoles(roles) {
    const seen = new Set();
    return roles.filter(r => {
      const key = JSON.stringify([r.title,r.company,r.dates,r.employerLabel || ''].map(s => clean(s).normalize('NFKC').toLocaleLowerCase()));
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  function orgLink(el) { return Array.from(el?.querySelectorAll('a[href]') || []).find(a => /\/(company|school)\/[^/?#]+/.test(a.getAttribute('href') || '')); }
  function orgLabel(a) {
    if (!a) return '';
    const label = textOf(a.querySelector('.t-bold')) || textOf(a) || clean(a.querySelector('img')?.getAttribute('alt')).replace(/\s+logo$/i, '');
    return validLabel(stripEmployment(label)) ? stripEmployment(label) : '';
  }
  function ownBlock(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('ul, ol, .pvs-list__outer-container, .pvs-entity__sub-components, .inline-show-more-text').forEach(n => n.remove());
    return clone;
  }

  function findProfileHeading(doc) {
    const main = doc.querySelector('main, [role="main"]');
    if (!main) return null;
    const modern = main.querySelector('section[componentkey$="Topcard"]');
    return Array.from((modern || main).querySelectorAll(modern ? 'h1, h2' : 'h1')).find(n => !n.closest(excluded) && !hidden(n) && textOf(n)) || null;
  }
  function modernExperience(section) {
    const items = Array.from(section.querySelectorAll('[componentkey^="entity-collection-item-"]'));
    const top = items.filter(n => !items.some(p => p !== n && p.contains(n)));
    const result = [];
    const paragraphs = node => Array.from(node.querySelectorAll('p')).filter(p => !p.closest('[data-testid="expandable-text-box"]') && !p.querySelector('[data-testid="expandable-text-box"]')).map(textOf).filter(Boolean);
    for (const item of top) {
      const children = Array.from(item.querySelectorAll('ul > li')).filter(n => !n.parentElement.closest('li'));
      if (children.length) {
        const header = item.cloneNode(true);
        header.querySelectorAll('ul, ol, [data-testid="expandable-text-box"]').forEach(n => n.remove());
        const company = stripEmployment(paragraphs(header)[0]);
        if (!validLabel(company)) continue;
        for (const child of children) {
          const rows = paragraphs(child), dates = rows.find(date);
          const title = rows[0];
          if (dates && validLabel(title) && !same(title, company)) result.push({title, company, dates, present:current.test(dates),source:'experience'});
        }
      } else {
        const rows = paragraphs(item), dates = rows.find(date);
        const title = rows[0], company = stripEmployment(rows[1]);
        const employerLabel = !company && unnamedEmployer(rows[1]) ? clean(rows[1]).split(/[·•]/)[0].trim() : '';
        if (dates && rows.indexOf(dates) >= 2 && validLabel(title) && (validLabel(company) || employerLabel) && !same(title,company)) result.push({title,company,employerLabel,dates,present:current.test(dates),source:'experience'});
      }
    }
    return result;
  }

  function findExperience(doc) {
    const main = doc.querySelector('main, [role="main"]');
    if (!main) return null;
    const anchor = main.querySelector('section[componentkey$="ExperienceTopLevelSection"], #experience, section[id*="experience" i]');
    if (anchor && !anchor.closest(excluded)) return anchor.closest('section') || anchor;
    const h = Array.from(main.querySelectorAll('h2, h3')).find(n => /^(experience|expérience|experiencia|berufserfahrung)$/i.test(textOf(n)) && !n.closest(excluded));
    return h?.closest('section') || null;
  }
  function parseExperience(doc) {
    const section = findExperience(doc);
    if (!section) return [];
    if (section.querySelector('[componentkey^="entity-collection-item-"]')) return uniqueRoles(modernExperience(section));
    const itemSelector = 'li, [data-view-name="profile-component-entity"]';
    const candidates = Array.from(section.querySelectorAll(itemSelector));
    const top = candidates.filter(n => !candidates.some(p => p !== n && p.contains(n)));
    const records = [];
    function parse(item, inheritedCompany = '') {
      const own = ownBlock(item);
      const rows = linesOf(own);
      const bold = textOf(own.querySelector('.t-bold, [data-anonymize="job-title"]'));
      const link = orgLink(own);
      const children = Array.from(item.querySelectorAll(itemSelector)).filter(n => n !== item && !Array.from(item.querySelectorAll(itemSelector)).some(p => p !== n && p !== item && p.contains(n)));
      // A grouped employer has a company header and separate nested roles.
      // Only treat it as grouped if its own header has no role date range.
      if (children.length && !rows.some(date)) {
        const employer = orgLabel(link) || stripEmployment(bold);
        if (validLabel(employer)) children.forEach(child => parse(child, employer));
        return;
      }
      const dateLine = rows.find(date) || '';
      if (!dateLine) return;
      const fields = rows.filter(s => validLabel(s) && !/^\d+\s*(yrs?|mos?|years?|months?)\b/i.test(s));
      const title = bold || fields[0] || '';
      let company = inheritedCompany;
      // Single-role anchors may wrap the whole card, so prefer the dedicated
      // non-muted subtitle directly after the title over anchor text.
      if (!company) {
        const subtitles = Array.from(own.querySelectorAll('.t-14.t-normal:not(.t-black--light), [data-anonymize="company-name"]')).map(textOf);
        company = subtitles.map(stripEmployment).find(s => validLabel(s) && !same(s, title)) || '';
        if (!company) {
          const index = fields.findIndex(s => same(s, title));
          const next = fields[index + 1];
          if (index >= 0 && next && rows.indexOf(next) < rows.indexOf(dateLine)) company = stripEmployment(next);
        }
        if (!company) { const label = orgLabel(link); if (label && !same(label, title) && !label.includes(dateLine)) company = label; }
      }
      if (validLabel(title) && validLabel(company) && !same(title, company)) {
        records.push({title, company, dates: dateLine, present: current.test(dateLine), source: 'experience'});
      }
    }
    top.forEach(item => parse(item));
    return uniqueRoles(records);
  }
  function splitTitleAndCompany(headline, knownCompany = '') {
    const h = clean(headline);
    // Headline is freeform; infer a role only when an explicit role phrase exists.
    const first = h.split(/\s*\|\s*/)[0];
    const match = first.match(/^(.{2,140}?)\s+(?:at|@)\s+(.{1,160})$/i) || first.match(/^(.{2,140}?)\s+[\u2014–]\s+(.{1,160})$/);
    if (match && roleHint.test(match[1]) && !/\b(former|previous|ex[- ]|aspiring|seeking|looking|helping)\b/i.test(match[1])) {
      const company = stripEmployment(match[2]);
      if (validLabel(company)) return {title: clean(match[1]), company};
    }
    return {title: roleHint.test(first) && !/^(helping|building|seeking|looking|former|aspiring)\b/i.test(first) ? first : '', company: knownCompany};
  }
  function resolveRole(positions, badge, headline) {
    const result = {title:'', company:'', confidence:0, sources:{}, trace:[], reviewReason:''};
    const active = uniqueRoles(positions.filter(p => p.present));
    const selected = selectCurrentRole(active, badge, headline);
    if (selected) {
      result.title = selected.title; result.company = selected.company; result.confidence = 3;
      result.sources.title = result.sources.company = 'current-experience';
      if (!selected.company) result.reviewReason = 'Current title found. The profile does not name an employer; enter one only if known.';
    } else if (active.length > 1) {
      result.reviewReason = 'Several roles are listed as current. Choose the role you want to save.';
    } else if (positions.length) {
      // Loaded, dated Experience overrides a potentially stale headline.
      result.reviewReason = 'No current job is listed in the loaded Experience section. Review before saving.';
    } else {
      const split = splitTitleAndCompany(headline);
      if (split.title && split.company) {
        result.title = split.title; result.company = split.company; result.confidence = 2;
        result.sources.title = result.sources.company = 'explicit-headline';
      } else if (validLabel(badge)) {
        if (split.title && !split.company && !headline.includes('|')) { result.title = split.title; result.sources.title = 'headline-title'; }
        result.company = badge; result.confidence = 1; result.sources.company = 'current-company-badge';
      }
      result.reviewReason = result.title || result.company ? 'Based on the profile introduction. Confirm against Experience before saving.' : 'Current role not available yet. Review the profile or enter details below.';
    }
    return result;
  }
  function extractProfilePhoto(scope, name) {
    if (!scope) return '';
    // The new top card labels a DIV around an empty-alt IMG, not the link.
    const selector = '[componentkey="topcard-logo-image-referencekey"] img, [aria-label="Profile photo" i] img, button[aria-label*="profile photo" i] img, img.pv-top-card-profile-picture__image, img.profile-photo-edit__preview, img[class*="profile-picture"]';
    const explicit = Array.from(scope.querySelectorAll(selector));
    const named = name ? Array.from(scope.querySelectorAll('img')).filter(i => same(i.alt, name)) : [];
    for (const img of [...new Set([...explicit, ...named])]) {
      if (hidden(img)) continue;
      const sources = [img.currentSrc, img.getAttribute('src'), img.getAttribute('data-delayed-url'), img.getAttribute('data-src')];
      const responsive = (img.getAttribute('srcset') || '').split(',').map(s => s.trim().split(/\s+/)).sort((a,b) => parseFloat(b[1]||'0')-parseFloat(a[1]||'0'));
      sources.push(...responsive.map(s => s[0]));
      const url = sources.find(s => /^https:\/\//i.test(s || ''));
      if (url) return url;
    }
    return '';
  }
  function emptyResult() { return {name:'', firstName:'', lastName:'', title:'', company:'', headline:'', photo:'', location:'', url:'', sources:{}, trace:[], confidence:0, experiences:[]}; }
  function scrapeProfile(doc, pageUrl) {
    const result = emptyResult();
    result.url = pageUrl || doc.location?.href || '';
    const main = doc.querySelector('main, [role="main"]');
    const h1 = findProfileHeading(doc);
    if (!h1) { result.trace.push('Waiting for profile heading'); return result; }
    result.name = stripDegree(textOf(h1));
    Object.assign(result, splitName(result.name));
    result.sources.name = 'profile-heading';
    if (h1.matches('.top-card-layout__title')) {
      result.publicProfile = true;
      result.reviewReason = 'Sign in to LinkedIn to read this profile’s current Experience.';
      return result;
    }
    // Bound the intro to the smallest enclosing section; never scan all main
    // text for company guesses or use stale document titles after SPA navigation.
    const card = h1.closest('section') || h1.parentElement;
    const headlineEl = card.querySelector('[data-anonymize="headline"], .pv-text-details__left-panel .text-body-medium, .text-body-medium.break-words, .text-body-medium');
    result.headline = textOf(headlineEl);
    if (!result.headline && card.matches('section[componentkey$="Topcard"]')) {
      const p = Array.from(card.querySelectorAll('p')).find(n => (h1.compareDocumentPosition(n) & 4) && !n.closest('a,button,[role="button"]') && !/^[·•\s]*(?:(?:1st|2nd|3rd)\+?|she\/her|he\/him|they\/them)[·•\s]*$/i.test(textOf(n)) && textOf(n));
      result.headline = textOf(p);
    }
    let badge = '';
    const badgeEl = card.querySelector('button[aria-label^="Current company" i], [data-anonymize="company-name"]');
    if (badgeEl) badge = textOf(badgeEl) || clean(badgeEl.getAttribute('aria-label')).replace(/^current company\s*[:：]?\s*/i, '').replace(/\.\s*click.*$/i, '');
    if (!badge) {
      const employer = Array.from(card.querySelectorAll('[role="button"]')).find(n => n.querySelector('svg[id^="company-accent"]') && !n.querySelector('svg[id^="school-accent"]'));
      badge = textOf(employer?.querySelector('p'));
    }
    const positions = parseExperience(doc);
    result.experiences = positions;
    const role = resolveRole(positions, badge, result.headline);
    Object.assign(result, role, {sources:{...result.sources,...role.sources}});
    result.photo = extractProfilePhoto(main?.querySelector('section[componentkey$="Topcard"]') || card, result.name);
    result.trace.push(result.title && result.company ? `Selected ${result.sources.company}` : 'Current role uncertain; review empty fields');
    return result;
  }
  function fieldsPass(got, expected) { const r = {}; for (const k of ['name','title','company']) r[k] = same(got[k], expected[k]); r.all = r.name && r.title && r.company; return r; }
  return {extractProfilePhoto, findProfileHeading, findExperience, scrapeProfile, parseExperience, splitTitleAndCompany, stripDegree, splitName, selectCurrentRole, resolveRole, stripEmployment, uniqueRoles, isPronounOrDegree, textOf, emptyResult, fieldsPass, companyQuality: s => validLabel(s) ? 3 : 0, version:'4.8'};
})();
var HirelyScrape = HirelyEngine;
if (typeof window !== 'undefined') { window.HirelyEngine = HirelyEngine; window.HirelyScrape = HirelyScrape; }

(() => {
  function hirely_init() {
    if (window.__hirelyInjected) return;
    if (!document.body) { setTimeout(hirely_init, 150); return; }
    window.__hirelyInjected = true;
    let hirelyScrapeGen = 0;
    let activeProfile = null, navigationIdentity = null;
    const fieldMap = {hfi:'firstName', hli:'lastName', hti:'title', hci:'company', hei:'email'};
    const canonicalUrl = value => { try { const u = new URL(value); return u.origin + u.pathname.replace(/\/$/, ''); } catch { return ''; } };
    const profileIdentity = () => HirelyEngine.textOf(HirelyEngine.findProfileHeading(document));
    const liveProfile = state => !!state && state === activeProfile && state.gen === hirelyScrapeGen && state.url === canonicalUrl(location.href) && panel.classList.contains('open');

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
    .hirely-overlay { position: fixed; inset: 0; background: transparent; z-index: 2147483001; display: none; }
    .hirely-overlay.open { display: none; pointer-events: none; }
    [hidden] { display:none!important; }
    /* Capture workspace */
    .hirely-panel { width:360px; max-width:calc(100vw - 32px); right:-380px; background:#f7f9fc; box-shadow:-12px 0 40px #10213b20; }
    .hirely-header { background:#fff; color:#14243d; padding:18px 20px; border-bottom:1px solid #e8edf5; }
    .hirely-header-title { font-size:17px; letter-spacing:-.5px; }
    .hirely-header-logo { background:#2563eb; color:white; width:28px; height:28px; border-radius:9px; font-size:15px; }
    .hirely-open-app { color:#52637b; font-size:11px; }
    .hirely-close { color:#52637b; background:#f0f3f9; width:28px; height:28px; border-radius:8px; }
    .hirely-close:hover { background:#e2e8f0; }
    .hirely-tabs { background:#fff; margin:0; padding:0 20px; gap:24px; }
    .hirely-tab-btn { flex:initial; font-size:12px; padding:13px 0; color:#65758c; }
    .hirely-body { padding:20px; }
    #htb { display:flex; flex-direction:column; gap:16px; }
    .hirely-pipeline-badge { font-size:10px; margin:0; padding:5px 9px; }
    .hirely-profile-card { display:flex; gap:12px; padding:0 0 18px; margin:0; border-bottom:1px solid #e2e8f0; }
    .hirely-avatar,.hirely-avatar-fallback { width:56px; height:56px; border-radius:16px; font-size:18px; }
    .hirely-profile-name { font-size:18px; line-height:1.3; letter-spacing:-.4px; white-space:normal; }
    .hirely-profile-sub { font-size:12px; line-height:1.5; margin-top:5px; white-space:normal; color:#52637b; }
    .hirely-profile-company { color:#2563eb; font-size:12px; line-height:1.5; margin-top:4px; white-space:normal; }
    .hirely-email-section { background:#fff; border:1px solid #e4eaf3; border-radius:14px; padding:16px; }
    .hirely-section-heading { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12px; font-weight:700; color:#243650; margin-bottom:12px; }
    .hirely-status-label-chip { font-size:10px; padding:4px 7px; border-radius:6px; background:#f1f5f9; color:#64748b; font-weight:600; }
    .hirely-email-help { font-size:11px; color:#64748b; line-height:1.6; margin:0 0 12px; }
    .hirely-email-row { display:flex; flex-wrap:wrap; background:transparent; border:0; color:#20324e; padding:0; margin:0 0 12px; gap:8px; }
    .hirely-email-val { white-space:normal; overflow-wrap:anywhere; font-weight:600; font-size:12px; min-width:0; }
    .hirely-copy-btn { color:#2563eb; border:1px solid #dbe4f2; border-radius:6px; padding:5px 8px; }
    .hirely-confidence-pill { display:none; }
    .hirely-find-email-btn { font-size:12px; padding:11px; border:1px solid #dbe7ff; color:#2563eb; background:#eff5ff; border-radius:9px; margin:0; }
    .hirely-edit-details { padding:0; }
    .hirely-edit-details summary { cursor:pointer; color:#52637b; font-size:11px; font-weight:600; padding:4px 0; }
    .hirely-edit-details[open] summary { margin-bottom:12px; }
    .hirely-manual { margin-top:12px; padding-top:12px; border-top:1px solid #edf1f6; }
    .hirely-field label { text-transform:none; font-size:11px; letter-spacing:0; margin-bottom:6px; }
    .hirely-field input { border:1px solid #d9e2ef; padding:10px; border-radius:8px; font-size:12px; }
    .hirely-field small { display:block; font-size:10px; color:#718096; line-height:1.5; margin-top:6px; }
    .hirely-fields-edit { margin:0; padding-top:4px; }
    .hirely-row-2 .hirely-field { min-width:0; }
    .hirely-role-options:empty,.hirely-role-note[hidden] { display:none; }
    .hirely-save-zone { margin-top:auto; padding-top:14px; position:sticky; bottom:-20px; background:linear-gradient(#f7f9fc00,#f7f9fc 12px); padding-bottom:4px; }
    .hirely-btn { padding:13px; border-radius:10px; font-size:13px; }
    .hirely-save-hint { text-align:center; font-size:10px; color:#718096; margin:9px 0 0; line-height:1.5; }
    .hirely-btn-outline { border:1px solid #d9e2ef; padding:11px; background:#fff; }
    .hirely-footer { background:white; border-top:1px solid #e8edf5; padding:12px 20px; display:flex; align-items:center; justify-content:space-between; }
    .hirely-text-btn { color:#64748b; font-size:11px; text-decoration:none; }
    .hirely-footer-label { font-size:10px; color:#718096; }
    .hirely-status { font-size:11px; line-height:1.5; margin:0; }
    .hirely-history-item { padding:13px 0; }
    button:focus-visible,summary:focus-visible,a:focus-visible { outline:2px solid #2563eb; outline-offset:3px; }
    @media (prefers-reduced-motion:reduce) { * { transition:none!important; } }

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
  tab.innerHTML = '<div class="hirely-tab-logo">H</div><div class="hirely-tab-label">Hirely</div>';
  root.appendChild(tab);

  const overlay = document.createElement("div");
  overlay.className = "hirely-overlay";
  root.appendChild(overlay);

  const panel = document.createElement("div");
  panel.className = "hirely-panel";
  root.appendChild(panel);

  // The panel is non-modal: LinkedIn remains clickable while it stays open.

  function escapeHtml(str) { return String(str ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function escapeAttr(str) { return escapeHtml(str); }
  function showStatus(el,msg,kind) { el.textContent=msg; el.className="hirely-status show "+kind; }
  function titleCase(str) { return (str||"").replace(/\b\w/g,c=>c.toUpperCase()); }
  function getMeta(prop) {
    const el=document.querySelector('meta[property="'+prop+'"]')||document.querySelector('meta[name="'+prop+'"]');
    return el?(el.getAttribute("content")||"").trim():"";
  }
  function getLinkedInSlug() {
    const m=window.location.href.match(/linkedin\.com\/in\/([^/?#]+)/);
    return m?m[1]:null;
  }

  async function enrichFromBackend(slug) {
    try {
      const res=await fetch(HIRELY_CONFIG.API_BASE+"/api/enrich?linkedin="+encodeURIComponent(slug));
      if(!res.ok) return null;
      const data=await res.json();
      return data.found?data:null;
    } catch(e) { return null; }
  }

  const textOfHeading = n => (n.textContent || '').trim().toLowerCase();
  function scrapeProfile() {
    return {...HirelyEngine.scrapeProfile(document, canonicalUrl(location.href)), email: ''};
  }
  function syncDraft(state) {
    if (!liveProfile(state)) return;
    for (const [id, field] of Object.entries(fieldMap)) {
      const input = panel.querySelector('#' + id);
      if (input && state.dirty.has(field)) state.data[field] = input.value.trim();
    }
    if (state.dirty.has('firstName') || state.dirty.has('lastName')) {
      state.data.name = [state.data.firstName, state.data.lastName].filter(Boolean).join(' ');
    }
  }
  function applyScrapeToForm(better, state) {
    if (state?.saving || !liveProfile(state) || !better?.name || canonicalUrl(better.url) !== state.url) return;
    if (navigationIdentity !== null) {
      if (profileIdentity() === navigationIdentity) return;
      navigationIdentity = null;
    }
    syncDraft(state);
    for (const field of ['name','firstName','lastName','headline','photo']) {
      if (field === 'name' && (state.dirty.has('firstName') || state.dirty.has('lastName'))) continue;
      if (!state.dirty.has(field) && better[field]) state.data[field] = better[field];
    }
    if (!state.dirty.has('title') && !state.dirty.has('company')) {
      state.data.title = better.title || '';
      state.data.company = better.company || '';
    }
    state.data.publicProfile = !!better.publicProfile;
    state.data.reviewReason = better.reviewReason;
    state.data.experiences = better.experiences;
    state.data.trace = better.trace;
    state.data.sources = better.sources;
    for (const [id, field] of Object.entries(fieldMap)) {
      const input = panel.querySelector('#' + id);
      if (input && !state.dirty.has(field) && root.activeElement !== input) input.value = state.data[field] || '';
    }
    const name = panel.querySelector('.hirely-profile-name');
    const sub = panel.querySelector('.hirely-profile-sub');
    const company = panel.querySelector('.hirely-profile-company');
    if (name) name.textContent = [state.data.firstName, state.data.lastName].filter(Boolean).join(' ') || state.data.name;
    if (sub) sub.textContent = state.data.title || 'Review current job title';
    if (company) company.textContent = state.data.company || 'Review current company';
    const avatar = panel.querySelector('.hirely-avatar, .hirely-avatar-fallback');
    if (state.data.photo && avatar && avatar.getAttribute('src') !== state.data.photo) {
      const img=document.createElement('img'); img.className='hirely-avatar'; img.alt='Profile photo'; img.src=state.data.photo;
      img.addEventListener('error',()=>{img.replaceWith(document.createTextNode('Photo unavailable'));}); avatar.replaceWith(img);
    }
    renderRoleOptions(state);
  }

  function experienceScrollTarget() {
    const experience = HirelyEngine.findExperience(document);
    if (experience) return experience;
    const activity = Array.from(document.querySelectorAll('main h2')).find(n => textOfHeading(n) === 'activity')?.closest('section');
    return activity && Array.from(document.querySelectorAll('main section')).find(n => !activity.contains(n) && (activity.compareDocumentPosition(n) & 4) && !n.closest('aside') && !n.querySelector('h2,h3'));
  }
  async function readCurrentExperience(state) {
    if (!liveProfile(state) || state.data.sources?.title === 'current-experience') return;
    // Scroll the actual LinkedIn container to hydrate the lazy section, then
    // restore its position. A user's interaction always takes precedence.
    let interrupted = false;
    const cancel = () => { interrupted = true; };
    const events = ['wheel','touchstart','pointerdown','keydown'];
    events.forEach(type => window.addEventListener(type,cancel,{capture:true,passive:true}));
    const positions = [];
    try {
      let target = experienceScrollTarget();
      for (let i=0; !target && i<8 && liveProfile(state) && !interrupted; i++) {
        await new Promise(r=>setTimeout(r,200)); target=experienceScrollTarget();
      }
      if (!target || !liveProfile(state) || interrupted) return;
      for (let n=target.parentElement;n;n=n.parentElement) positions.push({node:n,top:n.scrollTop,left:n.scrollLeft});
      target.scrollIntoView({block:'start',behavior:'instant'});
      for (let i=0;i<10 && liveProfile(state) && !interrupted;i++) {
        await new Promise(r=>setTimeout(r,200));
        const result = scrapeProfile();
        applyScrapeToForm(result,state);
        if (result.sources?.title === 'current-experience') break;
      }
    } finally {
      if (liveProfile(state) && !interrupted) positions.forEach(p=>{p.node.scrollTop=p.top;p.node.scrollLeft=p.left;});
      events.forEach(type => window.removeEventListener(type,cancel,true));
    }
  }

  async function keepImprovingScrape(state) {
    let pending = null;
    state.observer = new MutationObserver(() => {
      if (!liveProfile(state)) { state.observer.disconnect(); return; }
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => { pending = null; if (liveProfile(state)) applyScrapeToForm(scrapeProfile(), state); }, 250);
    });
    const main = document.querySelector('main, [role="main"]');
    if (main) state.observer.observe(main, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['src','srcset','data-src','data-delayed-url']});
    for (let i = 0; i < 30 && liveProfile(state); i++) {
      applyScrapeToForm(scrapeProfile(), state);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (liveProfile(state)) logProfileView(state.data);
  }

  function sendMsg(msg, timeoutMs=5000) {
    return new Promise((resolve)=>{
      let done=false;
      const timer=setTimeout(()=>{if(!done){done=true;resolve({ok:false,error:"timeout"});}},timeoutMs);
      try {
        chrome.runtime.sendMessage(msg,(res)=>{
          const error = chrome.runtime.lastError;
          if (error) res = {ok:false,error:error.message};
          if(!done){done=true;clearTimeout(timer);resolve(res||{ok:false,error:"no_response"});}
        });
      } catch(e){if(!done){done=true;clearTimeout(timer);resolve({ok:false,error:e.message});}}
    });
  }

  async function render() {
    const renderGen = ++hirelyScrapeGen;
    activeProfile?.observer?.disconnect();
    activeProfile = null;
    const renderUrl = canonicalUrl(location.href);
    panel.innerHTML=
      '<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely</span></div>'+
      '<button class="hirely-close" id="hcb0">&#x2715;</button></div>'+
      '<div class="hirely-body"><div class="hirely-loading">Loading...</div></div>';
    panel.querySelector("#hcb0").addEventListener("click",closeHirely);
    try {
      const result=await sendMsg({type:"HIRELY_GET_SESSION"});
      if (renderGen !== hirelyScrapeGen || renderUrl !== canonicalUrl(location.href) || !panel.classList.contains('open')) return;
      const session=result?.session||null;
      if(!session) renderLogin();
      else if(/linkedin\.com\/company\/[^/?#]+/.test(window.location.href)) await renderCompany(session);
      else if(PROFILE_RE.test(location.href)) await renderProfile(session);
      else { const body=panel.querySelector('.hirely-body'); body.textContent='Open a LinkedIn profile to view and save it. Hirely will stay open as you browse.'; }
    } catch(e) {
      if (renderGen !== hirelyScrapeGen || !panel.classList.contains('open')) return;
      panel.innerHTML='<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely</span></div>'+
        '<button class="hirely-close" id="hcbe">&#x2715;</button></div>'+
        '<div class="hirely-body"><div class="hirely-status show error">Something went wrong. Reload the page.</div></div>';
      panel.querySelector("#hcbe").addEventListener("click",closeHirely);
    }
  }

  function renderLogin() {
    panel.innerHTML=
      '<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely</span></div>'+
      '<button class="hirely-close" id="hlcb">&#x2715;</button></div>'+
      '<div class="hirely-body">'+
      '<p class="hirely-login-hint">Sign in to save contacts directly from LinkedIn.</p>'+
      '<div class="hirely-field"><label>Email</label><input type="email" id="hirely-email" placeholder="you@company.com" /></div>'+
      '<div class="hirely-field"><label>Password</label><input type="password" id="hirely-password" placeholder="Enter password" /></div>'+
      '<button class="hirely-btn" id="hirely-login-btn">Sign In</button>'+
      '<div class="hirely-status" id="hirely-login-status"></div></div>'+
      '<div class="hirely-footer">No account? <a class="hirely-link" href="'+HIRELY_CONFIG.API_BASE+'/signup" target="_blank">Sign up free</a></div>';
    panel.querySelector("#hlcb").addEventListener("click",closeHirely);
    panel.querySelector("#hirely-login-btn").addEventListener("click",async()=>{
      const email=panel.querySelector("#hirely-email").value.trim();
      const password=panel.querySelector("#hirely-password").value;
      const statusEl=panel.querySelector("#hirely-login-status");
      const btn=panel.querySelector("#hirely-login-btn");
      if(!email||!password){showStatus(statusEl,"Enter your email and password.","error");return;}
      btn.disabled=true;btn.textContent="Signing in...";
      const res=await sendMsg({type:"HIRELY_LOGIN",email,password});
      btn.disabled=false;btn.textContent="Sign In";
      if(res.ok) render(); else showStatus(statusEl,res.error||"Login failed.","error");
    });
  }

  async function renderProfile(session) {
    panel.innerHTML=
      '<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely</span></div>'+
      '<div style="display:flex;gap:8px;align-items:center;"><a class="hirely-open-app" href="'+HIRELY_CONFIG.API_BASE+'" target="_blank">Open app &#x2197;</a>'+
      '<button class="hirely-close" id="hrpcb">&#x2715;</button></div></div>'+
      '<div class="hirely-tabs"><button class="hirely-tab-btn active" id="hts">Contact</button><button class="hirely-tab-btn" id="hth">Recently viewed</button></div>'+
      '<div class="hirely-body" id="htb"><div class="hirely-loading">Loading profile...</div></div>'+
      '<div class="hirely-footer"><span class="hirely-footer-label">Your recruiting workspace</span><button class="hirely-text-btn" id="hlob">Sign out</button></div>';

    panel.querySelector("#hrpcb").setAttribute("aria-label","Close Hirely");
    panel.querySelector("#hrpcb").addEventListener("click",closeHirely);
    panel.querySelector("#hlob").addEventListener("click",async()=>{await sendMsg({type:"HIRELY_LOGOUT"});render();});

    const tabBody=panel.querySelector("#htb");
    const tabSave=panel.querySelector("#hts");
    const tabHist=panel.querySelector("#hth");
    const slug = getLinkedInSlug();
    const url = canonicalUrl(location.href);
    const state = {gen: hirelyScrapeGen, url, data: {...HirelyEngine.emptyResult(), url}, dirty: new Set(), existing: null, tab: 'save'};
    activeProfile = state;
    if (!slug) { tabBody.textContent = 'Could not read LinkedIn profile URL.'; return; }
    const redraw = () => {
      if (!liveProfile(state) || state.tab !== 'save' || state.saving) return;
      syncDraft(state);
      renderSaveTab(tabBody, session, state.data, state.existing);
    };
    applyScrapeToForm(scrapeProfile(), state);
    redraw();
    keepImprovingScrape(state);
    readCurrentExperience(state).catch(error => console.warn("[Hirely] Experience is not loaded yet:", error));
    tabBody.addEventListener('input', event => {
      const field = fieldMap[event.target.id];
      if (field && liveProfile(state)) {
        state.dirty.add(field);
        state.data[field] = event.target.value;
        const feedback=tabBody.querySelector('#hss');if(feedback){feedback.textContent='';feedback.className='hirely-status';}

        if(field==='email'){state.data.emailStatus='unverified';state.data.emailEvidence='Manually entered; inbox not checked.';}
        if(['firstName','lastName','company'].includes(field)&&state.data.emailStatus==='predicted'){
          state.data.email='';state.data.emailStatus='unverified';state.data.emailEvidence='';
          const emailInput=tabBody.querySelector('#hei');if(emailInput)emailInput.value='';
          const emailRow=tabBody.querySelector('.hirely-email-row');if(emailRow)emailRow.remove();
          const chip=tabBody.querySelector('.hirely-status-label-chip');if(chip)chip.textContent='Find again after editing';
          const find=tabBody.querySelector('#hfeb2');if(find){find.hidden=false;find.disabled=false;}
        }
        if(field==='email'){
          const chip=tabBody.querySelector('.hirely-status-label-chip');if(chip)chip.textContent=state.data.email?'Not verified':'Not found';
          const row=tabBody.querySelector('.hirely-email-row');if(row){const value=row.querySelector('.hirely-email-val');if(value)value.textContent=state.data.email;const copy=row.querySelector('.hirely-copy-btn');if(copy)copy.dataset.copy=state.data.email;row.hidden=!state.data.email;}
          const find=tabBody.querySelector('#hfeb2');if(find){find.hidden=!!state.data.email;find.disabled=false;}
        }

        if (field === 'firstName' || field === 'lastName') state.data.name = [state.data.firstName,state.data.lastName].filter(Boolean).join(' ');
        const sub = tabBody.querySelector('.hirely-profile-sub');
        const co = tabBody.querySelector('.hirely-profile-company');
        const name = tabBody.querySelector('.hirely-profile-name');
        if (sub) sub.textContent = state.data.title || '';
        if (co) co.textContent = state.data.company || '';
        if (name) name.textContent = state.data.name || '';
      }
    });
    Promise.all([Promise.resolve(null), sendMsg({type:'HIRELY_CHECK_CONTACT', url})]).then(([enriched, check]) => {
      if (!liveProfile(state)) return;
      syncDraft(state);
      state.existing = check?.contact || null;
      if (enriched?.found && enriched.email && !state.dirty.has('email')) {
        state.data.email = enriched.email;
        state.data.enriched = true;
      }
      redraw();
    }).catch(error => console.warn('[Hirely] Enrichment unavailable:', error));
    tabSave.addEventListener('click', () => {
      if (!liveProfile(state) || state.saving) return;
      state.tab = 'save'; tabSave.classList.add('active'); tabHist.classList.remove('active'); redraw();
    });
    tabHist.addEventListener('click', () => {
      if (!liveProfile(state) || state.saving) return;
      syncDraft(state); state.tab = 'history'; tabHist.classList.add('active'); tabSave.classList.remove('active'); renderHistoryTab(tabBody);
    });
  }

  function renderRoleOptions(state) {
    if (!liveProfile(state) || state.tab !== 'save') return;
    const note = panel.querySelector('.hirely-role-note');
    if (note) {
      const message = !state.data.publicProfile && (state.dirty.has('title') || state.dirty.has('company')) ? 'Using your selected or edited role. Review the details before saving.' : state.data.reviewReason || '';
      note.textContent = message; note.hidden = !message;
    }
    const save = panel.querySelector('#hsb');
    if (save && !state.saving) save.disabled = !!state.data.publicProfile;
    const slot = panel.querySelector('.hirely-role-options');
    if (!slot) return;
    const roles = (state.data.experiences || []).filter(r => r.present);
    const signature = JSON.stringify(roles);
    if (roles.length < 2) { slot.replaceChildren(); delete slot.dataset.roles; return; }
    if (slot.dataset.roles !== signature) {
      slot.dataset.roles = signature;
      slot.innerHTML = '<div class="hirely-field"><label for="hirely-current-role">Current role: choose if needed</label><select id="hirely-current-role" style="width:100%;padding:8px;border:1px solid #CBD5E1;border-radius:6px;background:white;color:#111827"></select></div>';
      const select = slot.querySelector('select');
      select.appendChild(new Option('Choose a current role or enter details below', ''));
      roles.forEach((r,i) => select.appendChild(new Option(r.title + ': ' + (r.company || r.employerLabel || 'Employer not listed') + ' (' + r.dates + ')', String(i))));
      select.addEventListener('change', () => {
        if (!liveProfile(state) || state.saving || select.value === '') return;
        const role = roles[Number(select.value)];
        state.dirty.add('title'); state.dirty.add('company');
        state.data.title = role.title; state.data.company = role.company;
        panel.querySelector('#hti').value = role.title;
        panel.querySelector('#hci').value = role.company;
        panel.querySelector('.hirely-profile-sub').textContent = role.title;
        panel.querySelector('.hirely-profile-company').textContent = role.company;
        renderRoleOptions(state);
      });
    }
    const index = roles.findIndex(r => r.title === state.data.title && r.company === state.data.company);
    slot.querySelector('select').value = index < 0 ? '' : String(index);
  }

  function enhanceCapture(container, data, existing, state) {
    container.querySelectorAll('input').forEach(input=>{const label=input.parentElement.querySelector('label');if(label&&input.id)label.htmlFor=input.id;});
    const disclosure=(title,cls='')=>{const d=document.createElement('details');d.className='hirely-edit-details '+cls;const s=document.createElement('summary');s.textContent=title;d.appendChild(s);return d;};
    const fields=container.querySelector('.hirely-fields-edit');
    const manual=container.querySelector('#hei')?.closest('.hirely-field');
    if(fields){
      const edit=disclosure('Edit profile details');edit.open=!!state.editing;
      fields.before(edit);edit.appendChild(fields);
      const read=container.querySelector('#hirely-read-role');if(read)edit.appendChild(read);
      edit.addEventListener('toggle',()=>{state.editing=edit.open;});
    }
    const section=document.createElement('section');section.className='hirely-email-section';section.setAttribute('aria-label','Work email');
    const email=existing?.email||data.email;
    const status=existing?.email_status||data.emailStatus||'unverified';
    const checked=Date.parse(existing?.email_checked_at||'');
    const fresh=Number.isFinite(checked)&&checked<=Date.now()&&Date.now()-checked<90*86400000;
    const labels={predicted:'Predicted',valid:fresh?'Mailbox verified':'Recheck email',invalid:'Invalid',accept_all:'Catch-all',unknown:'Not verified',unverified:'Not verified'};
    section.innerHTML='<div class="hirely-section-heading"><span>Work email</span><span class="hirely-status-label-chip">'+escapeHtml(email?(labels[status]||'Not verified'):'Not found')+'</span></div>';
    const row=container.querySelector('.hirely-email-row');if(row)section.appendChild(row);
    const help=document.createElement('p');help.className='hirely-email-help';
    help.textContent=email?(status==='predicted'?'This address has not been verified.':'Review or verify this address in Hirely before outreach.'):'1 Hirely credit per email found.';
    section.appendChild(help);
    const lookupFeedback=document.createElement('div');lookupFeedback.id='hlookup';lookupFeedback.className='hirely-status';lookupFeedback.setAttribute('role','status');lookupFeedback.setAttribute('aria-live','polite');

    const find=container.querySelector('#hfeb, #hfeb2');if(find){find.textContent='Find email (1 credit)';find.style.marginTop='0';find.hidden=!!email;section.appendChild(find);}
    if(manual){const entry=disclosure(email?'Edit email address':'Enter an email you already know','hirely-manual');entry.open=!!state.emailEditing;entry.appendChild(manual);entry.addEventListener('toggle',()=>{state.emailEditing=entry.open;});section.appendChild(entry);}
    section.appendChild(lookupFeedback);
    container.querySelector('.hirely-profile-card')?.after(section);
    let statusEl=container.querySelector('#hss');if(!statusEl){statusEl=document.createElement('div');statusEl.id='hss';statusEl.className='hirely-status';section.appendChild(statusEl);}
    statusEl.setAttribute('role','status');statusEl.setAttribute('aria-live','polite');
    const save=container.querySelector('#hsb');
    if(save){const zone=document.createElement('div');zone.className='hirely-save-zone';zone.appendChild(save);zone.appendChild(statusEl);const hint=document.createElement('p');hint.className='hirely-save-hint';hint.textContent='Photo and profile included · Email can be added later';zone.appendChild(hint);container.appendChild(zone);}
    const photo=container.querySelector('#hsphoto');if(photo){const more=disclosure('Photo options');photo.before(more);more.appendChild(photo);const status=container.querySelector('#hphoto-status');if(status)more.appendChild(status);}
    container.querySelectorAll('.hirely-close').forEach(b=>b.setAttribute('aria-label','Close Hirely'));
  }

  function emailLookupResult(container, button, res) {
    button.disabled=false;
    button.textContent='Find email (1 credit)';
    const message=res.message||res.error||'Could not search. Please try again.';
    showStatus(container.querySelector('#hlookup'),message,'info');
  }

  async function renderSaveTab(container,session,data,existing) {
    const state = activeProfile;
    const valid = () => liveProfile(state) && state.data === data && state.tab === 'save';
    if (!valid()) return;
    const initials=((data.firstName?.[0]||"")+(data.lastName?.[0]||"")).toUpperCase();
    const avatarHtml=(data.photo || existing?.photo_url)
      ?'<img class="hirely-avatar" src="'+escapeAttr(data.photo || existing?.photo_url)+'" alt="Profile photo" />'
      :'<div class="hirely-avatar-fallback">'+(initials||"?")+"</div>";
    const COLUMN_LABELS={follow_up_today:"Follow Up Today",upcoming:"Coming Up",done:"Done"};
    const sourceTag='';

    if(existing){
      const columnLabel=COLUMN_LABELS[existing.column_name]||existing.column_name||"Pipeline";
      const statusLabel=existing.email_status==="predicted"?"Predicted: inbox not checked":"Check email status in Hirely";
      const emailDisplay=existing.email
        ?'<div class="hirely-email-row">&#x2709; <span class="hirely-email-val">'+escapeHtml(existing.email)+"</span>"+'<span class="hirely-confidence-pill hirely-confidence-med">'+escapeHtml(statusLabel)+'</span>'+'<button class="hirely-copy-btn" data-copy="'+escapeAttr(existing.email)+'">Copy</button></div>'
        :(data.email?'<p class="hirely-source-tag">Predicted or entered email: inbox not checked</p><div class="hirely-email-row">&#x2709; <span class="hirely-email-val">'+escapeHtml(data.email)+'</span><button class="hirely-copy-btn" data-copy="'+escapeAttr(data.email)+'">Copy</button></div>'
        :'<button class="hirely-find-email-btn" id="hfeb">&#x2726; Find email (1 credit)</button>');

      container.innerHTML=sourceTag+
        '<div class="hirely-pipeline-badge in-pipeline"><span class="hirely-badge-dot"></span>Saved to your CRM</div>'+
        '<div class="hirely-profile-card">'+avatarHtml+
        '<div class="hirely-profile-info"><div class="hirely-profile-name">'+escapeHtml(data.name||(existing.first_name+" "+existing.last_name))+"</div>"+
        '<div class="hirely-profile-sub">'+escapeHtml(existing.job_title||data.title||"")+"</div>"+
        '<div class="hirely-profile-company">'+escapeHtml(data.company||existing.company||"")+"</div></div></div>"+
        '<div class="hirely-pipeline-status"><div class="hirely-status-item"><span class="hirely-status-label">Pipeline</span><span class="hirely-status-val">'+escapeHtml(columnLabel)+"</span></div>"+
        '<div class="hirely-status-divider"></div><div class="hirely-status-item"><span class="hirely-status-label">Status</span><span class="hirely-status-val">'+escapeHtml(existing.status_label||"Active")+"</span></div></div>"+
        emailDisplay+(data.photo?'<button class="hirely-btn hirely-btn-outline" id="hsphoto">Save profile photo</button><div class="hirely-status" id="hphoto-status"></div>':'')+'<a class="hirely-btn hirely-btn-outline" href="'+HIRELY_CONFIG.API_BASE+'" target="_blank">Open Hirely CRM &#x2197;</a>';

      enhanceCapture(container, data, existing, state);
      container.querySelectorAll(".hirely-copy-btn").forEach(btn=>{
        btn.addEventListener("click",()=>{navigator.clipboard.writeText(btn.dataset.copy).then(()=>{btn.textContent="Copied!";setTimeout(()=>{btn.textContent="Copy";},1500);});});
      });
      container.querySelector('#hsphoto')?.addEventListener('click',async()=>{
        const btn=container.querySelector('#hsphoto');btn.disabled=true;
        const res=await sendMsg({type:'HIRELY_SAVE_PHOTO',contactId:existing.id,photo:data.photo});
        if(!valid()||!btn.isConnected)return;
        btn.disabled=false;showStatus(container.querySelector('#hphoto-status'),res.ok?'Profile photo saved.':res.error||'Could not save photo.',res.ok?'info':'error');
      });
      const feb=container.querySelector("#hfeb");
      if(feb) feb.addEventListener("click",async()=>{
        if (feb.disabled) return;
        feb.disabled=true;feb.textContent="Searching...";
        const res=await sendMsg({type:"HIRELY_FIND_EMAIL",contactId:existing.id,firstName:existing.first_name,lastName:existing.last_name,company:existing.company||data.company||"",domain:existing.email_domain||"",action:"find",allowPaid:true},30000);
        if (!valid() || !feb.isConnected) return;
        if(res.ok&&res.email){existing.email=res.email;existing.email_status=res.emailStatus;existing.email_evidence=res.emailEvidence;await renderSaveTab(container,session,data,existing);}
        else{emailLookupResult(container,feb,res);}
      });

    } else {
      const displayTitle=(data.title||"").trim();
      container.innerHTML=sourceTag+
        '<div class="hirely-pipeline-badge new-contact"><span class="hirely-badge-dot"></span>New contact</div>'+
        '<div class="hirely-profile-card">'+avatarHtml+
        '<div class="hirely-profile-info"><div class="hirely-profile-name">'+escapeHtml(data.name||"Unknown")+"</div>"+
        '<div class="hirely-profile-sub">'+escapeHtml(displayTitle)+"</div>"+
        '<div class="hirely-profile-company">'+escapeHtml(data.company||"")+"</div></div></div>"+
        (data.email?'<div class="hirely-email-row">&#x2709; <span class="hirely-email-val">'+escapeHtml(data.email)+'</span><button class="hirely-copy-btn" data-copy="'+escapeAttr(data.email)+'">Copy</button></div>':"")+
        '<p class="hirely-role-note" style="font-size:11px;line-height:1.4;color:#92400e;background:#fffbeb;padding:8px;border-radius:6px" hidden></p><div class="hirely-role-options"></div>'+
        '<div class="hirely-fields-edit">'+
        '<div class="hirely-row-2"><div class="hirely-field"><label>First name</label><input id="hfi" value="'+escapeAttr(data.firstName)+'" /></div>'+
        '<div class="hirely-field"><label>Last name</label><input id="hli" value="'+escapeAttr(data.lastName)+'" /></div></div>'+
        '<div class="hirely-field"><label>Job title</label><input id="hti" value="'+escapeAttr(displayTitle)+'" /></div>'+
        '<div class="hirely-field"><label>Company</label><input id="hci" value="'+escapeAttr(data.company)+'" /></div>'+
        '<div class="hirely-field"><label>Work email: enter if known</label><input type="email" id="hei" value="'+escapeAttr(data.email||'')+'" placeholder="name@company.com" /><small>Leave blank to save without an email, or use the email search above.</small></div>'+
        "</div>"+
        '<button class="hirely-text-btn" id="hirely-read-role" style="margin-bottom:10px">Read current role from Experience</button>'+
        '<button class="hirely-btn" id="hsb">Save contact</button>'+
        '<div class="hirely-status" id="hss"></div>'+
        '<button class="hirely-find-email-btn" id="hfeb2">Find email (1 credit)</button>';

      enhanceCapture(container, data, existing, state);
      container.querySelectorAll(".hirely-copy-btn").forEach(btn=>{
        btn.addEventListener("click",()=>{navigator.clipboard.writeText(btn.dataset.copy).then(()=>{btn.textContent="Copied!";setTimeout(()=>{btn.textContent="Copy";},1500);});});
      });

      renderRoleOptions(state);
      container.querySelector('#hirely-read-role')?.addEventListener('click', () => {
        experienceScrollTarget()?.scrollIntoView({block:'start',behavior:'smooth'});
        applyScrapeToForm(scrapeProfile(), state);
      });
      container.querySelector("#hsb").addEventListener("click",async()=>{
        const statusEl=container.querySelector("#hss");
        const btn=container.querySelector("#hsb");
        syncDraft(state);
        const payload={
          firstName:container.querySelector("#hfi").value.trim(),
          lastName:container.querySelector("#hli").value.trim(),
          headline:container.querySelector("#hti").value.trim(),
          company:container.querySelector("#hci").value.trim(),
          email:container.querySelector("#hei")?.value.trim()||"",
          emailStatus:data.emailStatus||"unverified",emailEvidence:data.emailEvidence||"",
          url:data.url, photo:data.photo||''
        };
        if (!valid()) return;
        if (state.data.publicProfile) { showStatus(statusEl,'Sign in to LinkedIn before saving this profile.','error'); return; }
        if(payload.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)){showStatus(statusEl,"Enter a valid email or leave it blank.","error");return;}
        if(!payload.firstName){showStatus(statusEl,"First name is required.","error");return;}
        state.saving = true;
        btn.disabled=true;btn.textContent="Saving...";
        const res=await sendMsg({type:"HIRELY_SAVE_CONTACT",payload});
        state.saving = false;
        if (!valid() || !btn.isConnected) return;
        btn.disabled=false;
        if(res.ok){state.existing=res.contact; if(!state.existing){showStatus(statusEl,"Saved. Open Hirely to view your contact.","success");btn.textContent="Saved";btn.disabled=true;return;} await renderSaveTab(container,session,data,state.existing);}
        else if(res.error==="ALREADY_EXISTS") showStatus(statusEl,"Saved to your CRM.","info");
        else if(res.error==="NOT_LOGGED_IN") renderLogin();
        else{btn.textContent="Save contact";showStatus(statusEl,res.error||"Something went wrong.","error");}
      });

      const feb2=container.querySelector("#hfeb2");
      if(feb2) feb2.addEventListener("click",async()=>{
        syncDraft(state);
        const feedback=container.querySelector('#hlookup');feedback.textContent='';feedback.className='hirely-status';
        if (feb2.disabled) return;
        feb2.disabled=true;feb2.textContent="Searching...";
        const res=await sendMsg({type:"HIRELY_FIND_EMAIL",contactId:null,firstName:container.querySelector("#hfi").value.trim(),lastName:container.querySelector("#hli").value.trim(),company:container.querySelector("#hci").value.trim(),domain:"",action:"find",allowPaid:true},30000);
        if (!valid() || !feb2.isConnected) return;
        if(res.ok&&res.email){
          if (state.dirty.has('email') && state.data.email) { feb2.disabled=false; feb2.textContent='Email edited manually'; return; }
          state.data.email = res.email;
          state.data.emailStatus = res.emailStatus; state.data.emailEvidence = res.emailEvidence;
          const ei=container.querySelector("#hei");if(ei) ei.value=res.email;
          state.dirty.delete('email'); await renderSaveTab(container,session,data,null);
        } else{emailLookupResult(container,feb2,res);}
      });
    }
  }

  const HISTORY_KEY="hirely_history";
  async function logProfileView(data) {
    if(!data.name||!data.url) return;
    const stored=await chrome.storage.local.get(HISTORY_KEY);
    let h=stored[HISTORY_KEY]||[];
    h=h.filter(x=>x.url!==data.url);
    h.unshift({name:data.name,headline:data.headline||"",company:data.company||"",photo:data.photo||"",url:data.url,viewedAt:Date.now()});
    await chrome.storage.local.set({[HISTORY_KEY]:h.slice(0,50)});
  }

  function timeAgo(ts) {
    const d=Date.now()-ts,m=Math.floor(d/60000),hr=Math.floor(d/3600000),dy=Math.floor(d/86400000);
    return m<1?"just now":m<60?m+"m ago":hr<24?hr+"h ago":dy+"d ago";
  }

  async function renderHistoryTab(container) {
    const state = activeProfile;
    container.innerHTML='<div class="hirely-loading">Loading...</div>';
    const stored=await chrome.storage.local.get(HISTORY_KEY);
    if (!liveProfile(state) || state.tab !== 'history' || !container.isConnected) return;
    const cutoff=Date.now()-7*24*60*60*1000;
    const history=(stored[HISTORY_KEY]||[]).filter(h=>h.viewedAt>cutoff);
    if(!history.length){container.innerHTML='<div class="hirely-history-empty">No profiles viewed in the last 7 days.</div>';return;}
    if (!container.isConnected || activeProfile?.tab !== 'history') return;
    container.innerHTML=history.map(h=>{
      const initials=h.name.split(" ").map(p=>p[0]||"").join("").slice(0,2).toUpperCase();
      const av=h.photo?'<img class="hirely-history-avatar" src="'+escapeAttr(h.photo)+'" />'
        :'<div class="hirely-history-avatar-fallback">'+initials+"</div>";
      return '<div class="hirely-history-item" data-url="'+escapeAttr(h.url)+'">'+av+
        '<div class="hirely-history-info"><div class="hirely-history-name">'+escapeHtml(h.name)+"</div>"+
        '<div class="hirely-history-sub">'+escapeHtml(h.company||h.headline?.split("|")[0]||"")+"</div></div>"+
        '<span class="hirely-history-time">'+timeAgo(h.viewedAt)+"</span></div>";
    }).join("");
    container.querySelectorAll(".hirely-history-item").forEach(el=>el.addEventListener("click",()=>window.open(el.dataset.url,"_blank")));
  }

  async function renderCompany(session) {
    const companyGen = hirelyScrapeGen;
    const companyUrl = canonicalUrl(location.href);
    const validCompany = () => companyGen === hirelyScrapeGen && canonicalUrl(location.href) === companyUrl && panel.classList.contains('open');
    const url=window.location.href;
    const slug=(url.match(/linkedin\.com\/company\/([^/?#]+)/)||[])[1]?.replace(/-\d+$/,"")||"";
    const name=titleCase(document.querySelector("h1")?.innerText?.trim()||slug);

    function buildPanel(body) {
      if (!validCompany()) return;
      panel.innerHTML='<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely</span></div>'+
        '<div style="display:flex;gap:8px;align-items:center;"><a class="hirely-open-app" href="'+HIRELY_CONFIG.API_BASE+'" target="_blank">Open app &#x2197;</a>'+
        '<button class="hirely-close" id="hcocb">&#x2715;</button></div></div>'+
        '<div class="hirely-body">'+body+"</div>"+
        '<div class="hirely-footer"><button class="hirely-text-btn" id="hcolo">Sign out</button></div>';
      panel.querySelector("#hcocb").addEventListener("click",closeHirely);
      panel.querySelector("#hcolo").addEventListener("click",async()=>{await sendMsg({type:"HIRELY_LOGOUT"});render();});
    }

    buildPanel('<div class="hirely-loading">Loading company...</div>');
    let res=await sendMsg({type:"HIRELY_ENRICH_COMPANY",companyName:name,linkedinSlug:slug});
    if(!res.info){await new Promise(r=>setTimeout(r,1000));res=await sendMsg({type:"HIRELY_ENRICH_COMPANY",companyName:name,linkedinSlug:slug});}
    if (!validCompany()) return;
    const info=res.info||null;
    const people=res.people||[];
    const rows=[
      info?.location?["Location",titleCase(info.location)]:null,
      info?.industry?["Industry",titleCase(info.industry)]:null,
      info?.size?["Size",info.size+" employees"]:null,
      info?.founded?["Founded",String(info.founded)]:null,
    ].filter(Boolean);

    buildPanel(
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'+
      '<div style="width:38px;height:38px;border-radius:7px;background:#1E3A5F;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;">'+escapeHtml((name||"C")[0].toUpperCase())+"</div>"+
      '<div><div style="font-size:13px;font-weight:700;color:#0F172A;">'+escapeHtml(info?.name||name)+"</div>"+
      (info?.industry?'<div style="font-size:11px;color:#64748B;">'+escapeHtml(titleCase(info.industry))+"</div>":"")+"</div></div>"+
      (rows.length?'<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:8px 12px;margin-bottom:12px;">'+
        rows.map(([lbl,val])=>'<div style="display:flex;gap:8px;padding:2px 0;"><span style="font-size:11px;color:#94A3B8;width:60px;flex-shrink:0;">'+lbl+'</span><span style="font-size:11.5px;color:#334155;font-weight:500;">'+escapeHtml(val)+"</span></div>").join("")+"</div>":"")+
      (people.length
        ?'<div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Decision Makers</div>'+
          people.map((p,i)=>'<div style="border:1px solid #E2E8F0;border-radius:8px;padding:9px 10px;margin-bottom:8px;">'+
            '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">'+
            '<div><div style="font-size:12px;font-weight:700;color:#0F172A;">'+escapeHtml([p.first_name,p.last_name].filter(Boolean).join(" ")||"Unknown")+"</div>"+
            '<div style="font-size:10.5px;color:#64748B;">'+escapeHtml(p.position||"")+"</div></div>"+
            '<button class="hirely-btn" style="width:auto;padding:4px 10px;font-size:10px;" data-index="'+i+'">Save</button></div></div>').join("")
        :'<button class="hirely-btn" id="hfdm">Find Decision Makers</button>')
    );

    panel.querySelectorAll("[data-index]").forEach(btn=>{
      btn.addEventListener("click",async()=>{
        const p=people[parseInt(btn.dataset.index)];if(!p) return;
        btn.textContent="Saving...";btn.disabled=true;
        const r=await sendMsg({type:"HIRELY_SAVE_CONTACT",payload:{firstName:p.first_name||"",lastName:p.last_name||"",headline:p.position||"",company:info?.name||name,email:null,url:p.linkedin||""}});
        btn.textContent=(r.ok||r.error==="ALREADY_EXISTS")?"Saved &#10003;":"Error";
        if(!(r.ok||r.error==="ALREADY_EXISTS")) btn.disabled=false;
      });
    });
    const fdm=panel.querySelector("#hfdm");
    if(fdm) fdm.addEventListener("click",async()=>{fdm.textContent="Searching...";fdm.disabled=true;await sendMsg({type:"HIRELY_HUNTER_SEARCH",domain:info?.domain||""});});
  }

  const PROFILE_RE=/linkedin\.com\/in\/[^/?#]+/;
  const COMPANY_RE=/linkedin\.com\/company\/[^/?#]+/;

  function openHirely(){overlay.classList.add("open");panel.classList.add("open");chrome.storage.local.set({hirely_panel_open:true});render();}
  function closeHirely(){hirelyScrapeGen++; activeProfile?.observer?.disconnect(); activeProfile=null; overlay.classList.remove("open");panel.classList.remove("open");chrome.storage.local.set({hirely_panel_open:false});}

  tab.addEventListener("click",openHirely);
  chrome.storage.local.get("hirely_panel_open",({hirely_panel_open})=>{
    if(hirely_panel_open) openHirely();
  });

  let lastUrl=canonicalUrl(window.location.href),renderTimer=null, lastIdentity=profileIdentity();
  setInterval(()=>{
    const cur=canonicalUrl(window.location.href);
    if(cur===lastUrl) { lastIdentity=profileIdentity(); return; }
    navigationIdentity = lastIdentity;
    lastUrl=cur;
    hirelyScrapeGen++;
    activeProfile?.observer?.disconnect();
    activeProfile=null;
    // Keep the panel open on search and feed pages between profiles.
    if(panel.classList.contains("open")){
      if(renderTimer) clearTimeout(renderTimer);
      renderTimer=setTimeout(()=>{renderTimer=null;render();},400);
    }
  },250);

  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",hirely_init);
  else hirely_init();
})();
