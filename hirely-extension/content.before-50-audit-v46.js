/* Hirely Capture v4.6 — complete content.js replacement.
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
  const employment = /^(?:permanent |temporary )?(full[- ]time|part[- ]time|contract|permanent|freelance|self[- ]employed|internship|apprenticeship|seasonal|on[- ]site|hybrid|remote)$/i;
  const current = /\b(present|current|aujourd’hui|aujourd'hui|actualidad|heute)\b|現在|至今/i;
  const date = s => /\b(?:19|20)\d{2}\b/.test(s) && /[–—-]|\bto\b|\bà\b|\bau\b|\bbis\b|至/.test(s);
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
    return clean(s).replace(/\s*[·•]\s*(?:1st|2nd|3rd)\+?.*$/i, '').replace(/\s*,\s*(?:MBA|PhD|CPA|PMP|CHRP|CHRL)\s*$/i, '').trim();
  }
  function isPronounOrDegree(s) { return /^(?:(?:she\/her|he\/him|they\/them)\s*[·•]?\s*)?(?:1st|2nd|3rd)\+?$|^(she\/her|he\/him|they\/them)$/i.test(clean(s)); }
  function validLabel(s) { return !!clean(s) && clean(s).length <= 180 && !noise.test(clean(s)) && !isPronounOrDegree(s) && !employment.test(clean(s)) && !date(s); }
  function stripEmployment(s) { return clean(s).split(/\s*[·•]\s*/).filter(p => !employment.test(p) && !date(p) && !/^\d+\s*(yrs?|mos?|years?|months?)\b/i.test(p)).join(' · '); }
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
        if (dates && rows.indexOf(dates) >= 2 && validLabel(title) && validLabel(company) && !same(title,company)) result.push({title,company,dates,present:current.test(dates),source:'experience'});
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
    if (section.querySelector('[componentkey^="entity-collection-item-"]')) return modernExperience(section);
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
    const seen = new Set();
    return records.filter(r => { const k = JSON.stringify([r.title, r.company, r.dates]); if (seen.has(k)) return false; seen.add(k); return true; });
  }
  function splitTitleAndCompany(headline, knownCompany = '') {
    const h = clean(headline);
    // Headline is freeform; infer a role only when an explicit role phrase exists.
    const first = h.split(/\s*\|\s*/)[0];
    const match = first.match(/^(.{2,140}?)\s+(?:at|@)\s+(.{1,160})$/i) || first.match(/^(.{2,140}?)\s+[—–]\s+(.{1,160})$/);
    if (match && roleHint.test(match[1]) && !/\b(former|previous|ex[- ]|aspiring|seeking|looking|helping)\b/i.test(match[1])) {
      const company = stripEmployment(match[2]);
      if (validLabel(company)) return {title: clean(match[1]), company};
    }
    return {title: roleHint.test(first) && !/^(helping|building|seeking|looking|former|aspiring)\b/i.test(first) ? first : '', company: knownCompany};
  }
  function emptyResult() { return {name:'', firstName:'', lastName:'', title:'', company:'', headline:'', photo:'', location:'', url:'', sources:{}, trace:[], confidence:0, experiences:[]}; }
  function scrapeProfile(doc, pageUrl) {
    const result = emptyResult();
    result.url = pageUrl || doc.location?.href || '';
    const main = doc.querySelector('main, [role="main"]');
    const h1 = findProfileHeading(doc);
    if (!h1) { result.trace.push('Waiting for profile heading'); return result; }
    result.name = stripDegree(textOf(h1));
    const parts = result.name.split(/\s+/);
    result.firstName = parts.shift() || ''; result.lastName = parts.join(' ');
    result.sources.name = 'profile-h1';
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
    const active = positions.filter(p => p.present);
    const matching = badge ? active.filter(p => same(p.company, badge)) : [];
    const selected = active.length === 1 ? active[0] : matching.length === 1 ? matching[0] : null;
    if (selected) {
      result.title = selected.title; result.company = selected.company; result.confidence = 3;
      result.sources.title = result.sources.company = 'current-experience';
    } else if (active.length > 1) {
      result.trace.push('Multiple current roles: select the intended role manually');
    } else {
      const split = splitTitleAndCompany(result.headline);
      // Explicit headline pairs are fallback evidence, unless the loaded
      // experience section explicitly dates the same pair as a past job.
      const ended = positions.some(p => !p.present && same(p.title, split.title) && same(p.company, split.company));
      if (split.title && split.company && !ended) {
        result.title = split.title; result.company = split.company; result.confidence = 2;
        result.sources.title = result.sources.company = 'explicit-headline';
      } else if (validLabel(badge)) {
        if (split.title && !split.company && !result.headline.includes('|')) { result.title = split.title; result.sources.title = 'headline-title'; }
        result.company = badge; result.confidence = 1; result.sources.company = 'current-company-badge';
      }
    }
    const img = card.querySelector('img.pv-top-card-profile-picture__image, img.profile-photo-edit__preview, img[class*="profile-picture"], a[aria-label="Profile photo"] img');
    result.photo = img?.getAttribute('src') || '';
    result.trace.push(result.title && result.company ? `Selected ${result.sources.company}` : 'Current role uncertain; review empty fields');
    return result;
  }
  function fieldsPass(got, expected) { const r = {}; for (const k of ['name','title','company']) r[k] = same(got[k], expected[k]); r.all = r.name && r.title && r.company; return r; }
  return {findProfileHeading, findExperience, scrapeProfile, parseExperience, splitTitleAndCompany, stripDegree, isPronounOrDegree, textOf, emptyResult, fieldsPass, companyQuality: s => validLabel(s) ? 3 : 0, version:'4.6'};
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
    .hirely-overlay.open { display: block; }
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
  tab.innerHTML = '<div class="hirely-tab-logo">H</div><div class="hirely-tab-label">Hirely 4.6</div>';
  root.appendChild(tab);

  const overlay = document.createElement("div");
  overlay.className = "hirely-overlay";
  root.appendChild(overlay);

  const panel = document.createElement("div");
  panel.className = "hirely-panel";
  root.appendChild(panel);

  overlay.addEventListener("click", closeHirely);

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
    if (main) state.observer.observe(main, {childList:true, subtree:true, characterData:true});
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
      '<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely v4.6</span></div>'+
      '<button class="hirely-close" id="hcb0">&#x2715;</button></div>'+
      '<div class="hirely-body"><div class="hirely-loading">Loading...</div></div>';
    panel.querySelector("#hcb0").addEventListener("click",closeHirely);
    try {
      const result=await sendMsg({type:"HIRELY_GET_SESSION"});
      if (renderGen !== hirelyScrapeGen || renderUrl !== canonicalUrl(location.href) || !panel.classList.contains('open')) return;
      const session=result?.session||null;
      if(!session) renderLogin();
      else if(/linkedin\.com\/company\/[^/?#]+/.test(window.location.href)) await renderCompany(session);
      else await renderProfile(session);
    } catch(e) {
      if (renderGen !== hirelyScrapeGen || !panel.classList.contains('open')) return;
      panel.innerHTML='<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely v4.6</span></div>'+
        '<button class="hirely-close" id="hcbe">&#x2715;</button></div>'+
        '<div class="hirely-body"><div class="hirely-status show error">Something went wrong. Reload the page.</div></div>';
      panel.querySelector("#hcbe").addEventListener("click",closeHirely);
    }
  }

  function renderLogin() {
    panel.innerHTML=
      '<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely v4.6</span></div>'+
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
      '<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely v4.6</span></div>'+
      '<div style="display:flex;gap:8px;align-items:center;"><a class="hirely-open-app" href="'+HIRELY_CONFIG.API_BASE+'" target="_blank">Open app &#x2197;</a>'+
      '<button class="hirely-close" id="hrpcb">&#x2715;</button></div></div>'+
      '<div class="hirely-tabs"><button class="hirely-tab-btn active" id="hts">Save</button><button class="hirely-tab-btn" id="hth">History</button></div>'+
      '<div class="hirely-body" id="htb"><div class="hirely-loading">Loading profile...</div></div>'+
      '<div class="hirely-footer"><button class="hirely-text-btn" id="hlob">Sign out</button></div>';

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
        if (field === 'firstName' || field === 'lastName') state.data.name = [state.data.firstName,state.data.lastName].filter(Boolean).join(' ');
        const sub = tabBody.querySelector('.hirely-profile-sub');
        const co = tabBody.querySelector('.hirely-profile-company');
        const name = tabBody.querySelector('.hirely-profile-name');
        if (sub) sub.textContent = state.data.title || '';
        if (co) co.textContent = state.data.company || '';
        if (name) name.textContent = state.data.name || '';
      }
    });
    Promise.all([enrichFromBackend(slug), sendMsg({type:'HIRELY_CHECK_CONTACT', url})]).then(([enriched, check]) => {
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

  async function renderSaveTab(container,session,data,existing) {
    const state = activeProfile;
    const valid = () => liveProfile(state) && state.data === data && state.tab === 'save';
    if (!valid()) return;
    const initials=((data.firstName?.[0]||"")+(data.lastName?.[0]||"")).toUpperCase();
    const avatarHtml=data.photo
      ?'<img class="hirely-avatar" src="'+escapeAttr(data.photo)+'" />'
      :'<div class="hirely-avatar-fallback">'+(initials||"?")+"</div>";
    const COLUMN_LABELS={follow_up_today:"Follow Up Today",upcoming:"Coming Up",done:"Done"};
    const sourceTag=data.enriched
      ?'<div class="hirely-source-tag enriched">&#10003; Enriched via Hunter.io</div>'
      :'<div class="hirely-source-tag">Scraped from LinkedIn · v4.6</div>';

    if(existing){
      const columnLabel=COLUMN_LABELS[existing.column_name]||existing.column_name||"Pipeline";
      const conf=existing.email_confidence;
      const confClass=conf>=80?"hirely-confidence-high":conf>=50?"hirely-confidence-med":"hirely-confidence-low";
      const confLabel=conf?'<span class="hirely-confidence-pill '+confClass+'">'+conf+"%</span>":"";
      const emailDisplay=existing.email
        ?'<div class="hirely-email-row">&#x2709; <span class="hirely-email-val">'+escapeHtml(existing.email)+"</span>"+confLabel+'<button class="hirely-copy-btn" data-copy="'+escapeAttr(existing.email)+'">Copy</button></div>'
        :(data.email?'<div class="hirely-email-row">&#x2709; <span class="hirely-email-val">'+escapeHtml(data.email)+'</span><button class="hirely-copy-btn" data-copy="'+escapeAttr(data.email)+'">Copy</button></div>'
        :'<button class="hirely-find-email-btn" id="hfeb">&#x2726; Find Email</button>');

      container.innerHTML=sourceTag+
        '<div class="hirely-pipeline-badge in-pipeline"><span class="hirely-badge-dot"></span>Already in your pipeline</div>'+
        '<div class="hirely-profile-card">'+avatarHtml+
        '<div class="hirely-profile-info"><div class="hirely-profile-name">'+escapeHtml(data.name||(existing.first_name+" "+existing.last_name))+"</div>"+
        '<div class="hirely-profile-sub">'+escapeHtml(existing.job_title||data.title||"")+"</div>"+
        '<div class="hirely-profile-company">'+escapeHtml(data.company||existing.company||"")+"</div></div></div>"+
        '<div class="hirely-pipeline-status"><div class="hirely-status-item"><span class="hirely-status-label">Pipeline</span><span class="hirely-status-val">'+escapeHtml(columnLabel)+"</span></div>"+
        '<div class="hirely-status-divider"></div><div class="hirely-status-item"><span class="hirely-status-label">Status</span><span class="hirely-status-val">'+escapeHtml(existing.status_label||"Active")+"</span></div></div>"+
        emailDisplay+'<a class="hirely-btn hirely-btn-outline" href="'+HIRELY_CONFIG.API_BASE+'" target="_blank">View in Pipeline &#x2197;</a>';

      container.querySelectorAll(".hirely-copy-btn").forEach(btn=>{
        btn.addEventListener("click",()=>{navigator.clipboard.writeText(btn.dataset.copy).then(()=>{btn.textContent="Copied!";setTimeout(()=>{btn.textContent="Copy";},1500);});});
      });
      const feb=container.querySelector("#hfeb");
      if(feb) feb.addEventListener("click",async()=>{
        feb.disabled=true;feb.textContent="Searching...";
        const res=await sendMsg({type:"HIRELY_FIND_EMAIL",contactId:existing.id,firstName:existing.first_name,lastName:existing.last_name,company:existing.company||data.company||"",domain:existing.email_domain||""});
        if (!valid() || !feb.isConnected) return;
        if(res.ok&&res.email){existing.email=res.email;existing.email_confidence=res.confidence||null;await renderSaveTab(container,session,data,existing);}
        else{feb.disabled=false;feb.textContent="&#x2726; Find Email";}
      });

    } else {
      const displayTitle=(data.title||"").trim();
      container.innerHTML=sourceTag+
        '<div class="hirely-pipeline-badge new-contact"><span class="hirely-badge-dot"></span>Not in your pipeline</div>'+
        '<div class="hirely-profile-card">'+avatarHtml+
        '<div class="hirely-profile-info"><div class="hirely-profile-name">'+escapeHtml(data.name||"Unknown")+"</div>"+
        '<div class="hirely-profile-sub">'+escapeHtml(displayTitle)+"</div>"+
        '<div class="hirely-profile-company">'+escapeHtml(data.company||"")+"</div></div></div>"+
        (data.email?'<div class="hirely-email-row">&#x2709; <span class="hirely-email-val">'+escapeHtml(data.email)+'</span><button class="hirely-copy-btn" data-copy="'+escapeAttr(data.email)+'">Copy</button></div>':"")+
        '<div class="hirely-fields-edit">'+
        '<div class="hirely-row-2"><div class="hirely-field"><label>First name</label><input id="hfi" value="'+escapeAttr(data.firstName)+'" /></div>'+
        '<div class="hirely-field"><label>Last name</label><input id="hli" value="'+escapeAttr(data.lastName)+'" /></div></div>'+
        '<div class="hirely-field"><label>Job title</label><input id="hti" value="'+escapeAttr(displayTitle)+'" /></div>'+
        '<div class="hirely-field"><label>Company</label><input id="hci" value="'+escapeAttr(data.company)+'" /></div>'+
        (data.email?"":'<div class="hirely-field"><label>Email (optional)</label><input id="hei" placeholder="Find via Hunter.io below" /></div>')+
        "</div>"+
        '<button class="hirely-text-btn" id="hirely-read-role" style="margin-bottom:10px">Read current role from Experience</button>'+
        '<button class="hirely-btn" id="hsb">Save to Pipeline</button>'+
        '<div class="hirely-status" id="hss"></div>'+
        (!data.email?'<button class="hirely-find-email-btn" id="hfeb2" style="margin-top:8px;">&#x2726; Find Email with Hunter.io</button>':"");

      container.querySelectorAll(".hirely-copy-btn").forEach(btn=>{
        btn.addEventListener("click",()=>{navigator.clipboard.writeText(btn.dataset.copy).then(()=>{btn.textContent="Copied!";setTimeout(()=>{btn.textContent="Copy";},1500);});});
      });

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
          email:data.email||container.querySelector("#hei")?.value.trim()||"",
          url:data.url
        };
        if (!valid()) return;
        if(!payload.firstName){showStatus(statusEl,"First name is required.","error");return;}
        state.saving = true;
        btn.disabled=true;btn.textContent="Saving...";
        const res=await sendMsg({type:"HIRELY_SAVE_CONTACT",payload});
        state.saving = false;
        if (!valid() || !btn.isConnected) return;
        btn.disabled=false;
        if(res.ok){const cr=await sendMsg({type:"HIRELY_CHECK_CONTACT",url:data.url}); if (!valid()) return; state.existing = cr.contact || null; await renderSaveTab(container,session,data,state.existing);}
        else if(res.error==="ALREADY_EXISTS") showStatus(statusEl,"Already in your pipeline.","info");
        else if(res.error==="NOT_LOGGED_IN") renderLogin();
        else{btn.textContent="Save to Pipeline";showStatus(statusEl,res.error||"Something went wrong.","error");}
      });

      const feb2=container.querySelector("#hfeb2");
      if(feb2) feb2.addEventListener("click",async()=>{
        feb2.disabled=true;feb2.textContent="Searching...";
        const res=await sendMsg({type:"HIRELY_FIND_EMAIL",contactId:null,firstName:container.querySelector("#hfi").value.trim(),lastName:container.querySelector("#hli").value.trim(),company:container.querySelector("#hci").value.trim(),domain:""});
        if (!valid() || !feb2.isConnected) return;
        if(res.ok&&res.email){
          if (state.dirty.has('email')) { feb2.disabled=false; feb2.textContent='Email edited manually'; return; }
          state.data.email = res.email;
          const ei=container.querySelector("#hei");if(ei) ei.value=res.email;
          feb2.textContent="Email found";feb2.style.color="#047857";
        } else{feb2.disabled=false;feb2.textContent="&#x2726; Find Email with Hunter.io";}
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
      panel.innerHTML='<div class="hirely-header"><div class="hirely-header-title"><div class="hirely-header-logo">H</div><span>Hirely v4.6</span></div>'+
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
    if(hirely_panel_open&&(PROFILE_RE.test(window.location.href)||COMPANY_RE.test(window.location.href))) openHirely();
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
    if(!PROFILE_RE.test(cur)&&!COMPANY_RE.test(cur)){closeHirely();return;}
    if(panel.classList.contains("open")){
      if(renderTimer) clearTimeout(renderTimer);
      renderTimer=setTimeout(()=>{renderTimer=null;render();},400);
    }
  },250);

  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",hirely_init);
  else hirely_init();
})();
