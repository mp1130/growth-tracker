/* app.js: Growth Tracker UI */
(function () {
  'use strict';
  var G = window.Growth, C = window.Charts, Store = window.Store;
  var VERSION = '1.0.0';
  var SERIES = { wfa: 'var(--s1)', lhfa: 'var(--s2)', hcfa: 'var(--s3)', wfl: 'var(--s4)', bfa: 'var(--s5)', acfa: 'var(--s6)', tsfa: 'var(--s7)', ssfa: 'var(--s8)' };
  var DPM = G.DPM;

  /* ---------- small helpers ---------- */
  function $(sel, el) { return (el || document).querySelector(sel); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v; // only used with constant strings (icons)
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (k === 'value') e.value = v;
      else if (v === true) e.setAttribute(k, '');
      else e.setAttribute(k, v);
    });
    (Array.isArray(kids) ? kids : kids == null ? [] : [kids]).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return e;
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function nowIso() { return new Date().toISOString(); }
  function todayStr() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  // withYear: true/undefined shows the year, false hides it, 'auto' shows it only for other years
  function fmtDate(s, withYear) {
    var d = new Date(G.parseDate(s));
    if (withYear === false || withYear === 'auto') withYear = withYear === 'auto' ? d.getUTCFullYear() !== new Date().getFullYear() : false;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: withYear === false ? undefined : 'numeric', timeZone: 'UTC' });
  }
  function num(v) { if (v == null) return null; var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; }
  var ICON = {
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 19H7a5 5 0 1 1 1.2-9.9A6 6 0 0 1 19.4 11 4 4 0 0 1 17.5 19Z"/></svg>',
    alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    ruler: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z"/><path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2"/></svg>',
    baby: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="M3 21a9 9 0 0 1 18 0"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z"/></svg>',
    qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>',
    camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
  };
  function icon(name, cls) { return h('span', { class: 'ic ' + (cls || ''), html: ICON[name] }); }

  /* ---------- preferences (this device only) ---------- */
  var prefs = { units: 'us', std: 'auto', theme: 'auto', childId: null, chartInd: 'wfa', chartRange: 'auto' };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem('gt.prefs') || '{}')); } catch (e) { /* defaults */ }
  function savePrefs() { try { localStorage.setItem('gt.prefs', JSON.stringify(prefs)); } catch (e) { /* ignore */ } }
  function applyTheme() {
    if (prefs.theme === 'light' || prefs.theme === 'dark') document.documentElement.setAttribute('data-theme', prefs.theme);
    else document.documentElement.removeAttribute('data-theme');
  }

  /* ---------- data access ---------- */
  function children() {
    return Store.doc.children.filter(function (c) { return !c.deleted; }).sort(function (a, b) { return (a.createdAt || '') < (b.createdAt || '') ? -1 : 1; });
  }
  function child() {
    var cs = children();
    return cs.filter(function (c) { return c.id === prefs.childId; })[0] || cs[0] || null;
  }
  function rowsFor(c) {
    if (!c) return [];
    return Store.doc.measurements.filter(function (m) { return !m.deleted && m.childId === c.id; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : ((a.createdAt || '') < (b.createdAt || '') ? -1 : 1); })
      .map(function (m) { return { m: m, a: G.analyze(m, c) }; });
  }
  function milestoneFor(c, key) {
    return Store.doc.milestones.filter(function (r) { return !r.deleted && r.childId === c.id && r.key === key; })[0] || null;
  }
  function pr(c) {
    return c && c.sex === 'F' ? { he: 'she', He: 'She', his: 'her', His: 'Her', him: 'her', kids: 'girls', kid: 'girl' } : { he: 'he', He: 'He', his: 'his', His: 'His', him: 'him', kids: 'boys', kid: 'boy' };
  }
  function cname(c) { return (c && c.name) || (c && c.sex === 'F' ? 'Your daughter' : 'Your son'); }
  function stdFor(ind, ageDays) {
    var s = G.autoStd(prefs.std, ageDays);
    return G.hasStd(s, ind) ? s : 'who';
  }
  function stdName(s) { return s === 'cdc' ? 'CDC' : 'WHO'; }
  function otherStd(s) { return s === 'cdc' ? 'who' : 'cdc'; }
  function kindOf(ind) { return G.IND[ind].kind; }
  function fmtV(ind, v) { return G.fmtValue(kindOf(ind), v, prefs.units); }
  function fmtHeightLong(cm) {
    if (prefs.units === 'metric') return Math.round(cm) + ' cm';
    var inches = Math.round(cm / G.CM_PER_IN), ft = Math.floor(inches / 12);
    return ft + ' ft ' + (inches - ft * 12) + ' in (' + Math.round(cm) + ' cm)';
  }

  /* ---------- toast & sheet ---------- */
  var toastTimer;
  function toast(msg, ms) {
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, ms || 2600);
  }
  var sheetOnClose = null;
  function openSheet(title, body, opts) {
    var sh = $('#sheet');
    sh.textContent = '';
    var panel = h('div', { class: 'sheet-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
      h('div', { class: 'sheet-head' }, [
        h('h2', { text: title }),
        h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: closeSheet }, icon('close'))
      ]),
      h('div', { class: 'sheet-body' }, body)
    ]);
    sh.appendChild(h('div', { class: 'sheet-backdrop', onclick: closeSheet }));
    sh.appendChild(panel);
    sh.hidden = false;
    document.body.classList.add('noscroll');
    sheetOnClose = opts && opts.onClose;
    var first = panel.querySelector('input, select, button.primary');
    if (first && !(opts && opts.noFocus)) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 60);
  }
  function closeSheet() {
    var sh = $('#sheet');
    sh.hidden = true; sh.textContent = '';
    document.body.classList.remove('noscroll');
    if (sheetOnClose) { var f = sheetOnClose; sheetOnClose = null; f(); }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });

  /* ---------- header & sync badge ---------- */
  function renderHeader() {
    var c = child();
    var btn = $('#childBtn');
    btn.textContent = '';
    if (c) {
      btn.appendChild(h('span', { class: 'child-name', text: cname(c) }));
      btn.appendChild(h('span', { class: 'child-age', text: G.fmtAge(c.dob, todayStr()) }));
    } else {
      btn.appendChild(h('span', { class: 'child-name', text: 'Growth Tracker' }));
    }
    renderBadge();
  }
  function renderBadge() {
    var b = $('#syncBadge'), st = Store.status;
    var map = {
      local: ['alert', 'This device only', 'warn'], pending: ['cloud', 'Saving soon', ''], syncing: ['cloud', 'Saving…', 'busy'],
      synced: ['check', 'Saved', 'ok'], offline: ['cloud', 'Offline', 'warn'], error: ['alert', 'Sync problem', 'bad']
    };
    var x = map[st] || map.local;
    b.textContent = '';
    b.className = 'sync ' + x[2];
    b.appendChild(icon(x[0]));
    b.appendChild(h('span', { text: x[1] }));
    b.title = Store.error || (st === 'synced' ? 'Saved to your private GitHub repo' : st === 'local' ? 'Not connected to GitHub yet' : '');
  }

  /* ---------- routing ---------- */
  var VIEWS = ['overview', 'charts', 'log', 'milestones'];
  function currentView() {
    var v = (location.hash || '').replace('#', '').split('?')[0];
    return VIEWS.indexOf(v) >= 0 ? v : 'overview';
  }
  function go(v) { if (location.hash !== '#' + v) location.hash = v; else render(); }
  window.addEventListener('hashchange', function () { if (!/connect=/.test(location.hash)) { render(); window.scrollTo(0, 0); } });

  function render() {
    applyTheme();
    renderHeader();
    var view = $('#view');
    view.textContent = '';
    var c = child();
    document.querySelectorAll('.tabs a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + currentView()); });
    $('#addBtn').hidden = !c;
    document.querySelector('.tabs').hidden = !c;
    if (!c) { view.appendChild(renderWelcome()); return; }
    var v = currentView();
    if (v === 'charts') renderCharts(view, c);
    else if (v === 'log') renderLog(view, c);
    else if (v === 'milestones') renderMilestones(view, c);
    else renderOverview(view, c);
  }

  /* ---------- welcome / first child ---------- */
  function renderWelcome() {
    var wrap = h('div', { class: 'welcome' });
    wrap.appendChild(h('div', { class: 'card hero' }, [
      h('h1', { text: 'Track growth on real growth charts' }),
      h('p', { class: 'muted', text: 'Weight, length, head size and more, compared with the WHO and CDC charts your pediatrician uses. Your data is kept in your own private GitHub repo.' })
    ]));
    wrap.appendChild(h('div', { class: 'card' }, [
      h('h2', { text: 'Already set up on another phone?' }),
      h('p', { class: 'muted', text: 'Connect this device to your data and everything shows up here.' }),
      h('div', { class: 'row-btns' }, [
        h('button', { class: 'btn', onclick: openScanner }, [icon('camera'), 'Scan code']),
        h('button', { class: 'btn', onclick: function () { openSettings('storage'); } }, 'Enter key')
      ])
    ]));
    wrap.appendChild(h('div', { class: 'card' }, [h('h2', { text: 'Or start fresh' }), childForm(null, true)]));
    return wrap;
  }

  /* ---------- child form ---------- */
  function childForm(c, withBirth) {
    var f = h('form', { class: 'form', onsubmit: function (e) { e.preventDefault(); saveChild(); } });
    var name = h('input', { type: 'text', id: 'cf-name', autocomplete: 'off', placeholder: 'First name', value: c ? c.name || '' : '' });
    var dob = h('input', { type: 'date', id: 'cf-dob', required: true, max: todayStr(), value: c ? c.dob : '' });
    var sex = c ? c.sex : 'M';
    var sexSeg = segmented([['M', 'Boy'], ['F', 'Girl']], sex, function (v) { sex = v; });
    var gaw = h('input', { type: 'number', inputmode: 'numeric', min: 22, max: 44, step: 1, placeholder: 'weeks', value: c && c.gaWeeks != null ? c.gaWeeks : '' });
    var gad = h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 6, step: 1, placeholder: 'days', value: c && c.gaDays != null ? c.gaDays : '' });
    var fH = heightInput(c && c.fatherCm), mH = heightInput(c && c.motherCm);
    f.appendChild(field('Name', name));
    f.appendChild(field('Birth date', dob));
    f.appendChild(field('Sex (the charts are different for boys and girls)', sexSeg));
    f.appendChild(field('Born at (from the hospital records, leave blank if not known)', h('div', { class: 'inline' }, [gaw, h('span', { class: 'muted', text: 'weeks' }), gad, h('span', { class: 'muted', text: 'days' })])));
    var bw, bl, bh;
    if (withBirth) {
      bw = weightInput(null); bl = lengthInput(null, 'length'); bh = lengthInput(null, 'head');
      f.appendChild(h('h3', { text: 'Birth measurements (optional)' }));
      f.appendChild(field('Birth weight', bw.el));
      f.appendChild(field('Birth length', bl.el));
      f.appendChild(field('Head circumference at birth', bh.el));
    }
    var more = h('details', { class: 'more' }, [
      h('summary', { text: 'Parents’ heights (for a target adult height)' }),
      field('Father’s height', fH.el), field('Mother’s height', mH.el)
    ]);
    if (c && (c.fatherCm || c.motherCm)) more.open = true;
    f.appendChild(more);
    var err = h('p', { class: 'error', hidden: true });
    f.appendChild(err);
    f.appendChild(h('div', { class: 'row-btns' }, [h('button', { class: 'btn primary', type: 'submit', text: c ? 'Save' : 'Start tracking' })]));

    function saveChild() {
      err.hidden = true;
      if (!dob.value) { err.textContent = 'Please enter the birth date.'; err.hidden = false; return; }
      var w = num(gaw.value), d = num(gad.value);
      if (w != null && (w < 22 || w > 44)) { err.textContent = 'Weeks at birth should be between 22 and 44.'; err.hidden = false; return; }
      var rec = c ? Object.assign({}, c) : { id: uid(), createdAt: nowIso() };
      rec.name = name.value.trim();
      rec.dob = dob.value;
      rec.sex = sex;
      rec.gaWeeks = w; rec.gaDays = w != null ? (d || 0) : null;
      rec.fatherCm = fH.get(); rec.motherCm = mH.get();
      rec.updatedAt = nowIso();
      var birth = null;
      if (withBirth) {
        var wk = bw.get(), lc = bl.get(), hc = bh.get();
        if (wk || lc || hc) birth = { id: uid(), childId: rec.id, date: rec.dob, weightKg: wk, lengthCm: lc, headCm: hc, position: 'lying', note: 'Birth', createdAt: nowIso(), updatedAt: nowIso() };
      }
      Store.change(function (doc) {
        if (c) doc.children = doc.children.map(function (x) { return x.id === rec.id ? rec : x; });
        else doc.children.push(rec);
        if (birth) doc.measurements.push(birth);
      }, c ? 'Update profile for ' + (rec.name || 'child') : 'Add ' + (rec.name || 'child'));
      prefs.childId = rec.id; savePrefs();
      if (c) { closeSheet(); toast('Saved'); }
      go('overview'); render();
    }
    return f;
  }
  function field(label, input, hint) {
    return h('label', { class: 'field' }, [h('span', { class: 'label', text: label }), input, hint ? h('span', { class: 'hint', text: hint }) : null]);
  }
  function segmented(opts, value, onchange) {
    var wrap = h('div', { class: 'seg', role: 'radiogroup' });
    opts.forEach(function (o) {
      var b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(o[0] === value), class: o[0] === value ? 'on' : '', text: o[1] });
      b.addEventListener('click', function () {
        wrap.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
        b.classList.add('on'); b.setAttribute('aria-checked', 'true');
        onchange(o[0]);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function unitSelect(opts, value, onchange) {
    var s = h('select', { class: 'unit', onchange: function () { onchange(s.value); } });
    opts.forEach(function (o) { s.appendChild(h('option', { value: o, text: o })); });
    s.value = value;
    return s;
  }

  /* ---------- unit-aware inputs ---------- */
  function weightInput(kg, onInput) {
    var mode = prefs.units === 'metric' ? 'kg' : 'lb';
    var el = h('div', { class: 'inline' });
    var lb = h('input', { type: 'number', inputmode: 'decimal', step: 'any', min: 0, placeholder: 'lb', 'aria-label': 'pounds' });
    var oz = h('input', { type: 'number', inputmode: 'decimal', step: 'any', min: 0, max: 15.99, placeholder: 'oz', 'aria-label': 'ounces' });
    var kgI = h('input', { type: 'number', inputmode: 'decimal', step: 'any', min: 0, placeholder: 'kg', 'aria-label': 'kilograms' });
    function fill(v) {
      if (v == null) { lb.value = oz.value = kgI.value = ''; return; }
      var p = G.lbOz(v); lb.value = p.lb; oz.value = p.oz; kgI.value = (Math.round(v * 1000) / 1000);
    }
    function get() {
      if (mode === 'kg') { var k = num(kgI.value); return k > 0 ? k : null; }
      var a = num(lb.value) || 0, b = num(oz.value) || 0;
      var t = (a + b / 16) * G.KG_PER_LB;
      return t > 0 ? Math.round(t * 10000) / 10000 : null;
    }
    function draw() {
      el.textContent = '';
      if (mode === 'kg') el.appendChild(kgI); else { el.appendChild(lb); el.appendChild(h('span', { class: 'muted', text: 'lb' })); el.appendChild(oz); el.appendChild(h('span', { class: 'muted', text: 'oz' })); }
      el.appendChild(unitSelect(['lb', 'kg'], mode, function (v) { var cur = get(); mode = v; fill(cur); draw(); if (onInput) onInput(); }));
    }
    [lb, oz, kgI].forEach(function (i) { i.addEventListener('input', function () { if (onInput) onInput(); }); });
    fill(kg); draw();
    return { el: el, get: get, set: function (v) { fill(v); } };
  }
  function lengthInput(cm, kind, onInput) {
    var mode = prefs.units === 'metric' ? 'cm' : 'in';
    var inp = h('input', { type: 'number', inputmode: 'decimal', step: 'any', min: 0, placeholder: mode, 'aria-label': kind });
    var el = h('div', { class: 'inline' });
    function fill(v) { inp.value = v == null ? '' : (mode === 'cm' ? Math.round(v * 10) / 10 : Math.round(v / G.CM_PER_IN * 100) / 100); }
    function get() { var v = num(inp.value); if (!(v > 0)) return null; return mode === 'cm' ? v : Math.round(v * G.CM_PER_IN * 1000) / 1000; }
    el.appendChild(inp);
    el.appendChild(unitSelect(['in', 'cm'], mode, function (v) { var cur = get(); mode = v; inp.placeholder = v; fill(cur); if (onInput) onInput(); }));
    inp.addEventListener('input', function () { if (onInput) onInput(); });
    fill(cm);
    return { el: el, get: get };
  }
  function heightInput(cm) {
    var mode = prefs.units === 'metric' ? 'cm' : 'ft';
    var el = h('div', { class: 'inline' });
    var ft = h('input', { type: 'number', inputmode: 'numeric', min: 3, max: 8, placeholder: 'ft' });
    var inch = h('input', { type: 'number', inputmode: 'decimal', min: 0, max: 11.9, step: 'any', placeholder: 'in' });
    var cmI = h('input', { type: 'number', inputmode: 'decimal', min: 100, max: 230, step: 'any', placeholder: 'cm' });
    function fill(v) {
      if (!v) { ft.value = inch.value = cmI.value = ''; return; }
      var t = v / G.CM_PER_IN, f = Math.floor(t / 12); ft.value = f; inch.value = Math.round((t - f * 12) * 10) / 10; cmI.value = Math.round(v * 10) / 10;
    }
    function get() {
      if (mode === 'cm') { var c = num(cmI.value); return c > 0 ? c : null; }
      var a = num(ft.value), b = num(inch.value) || 0;
      return a > 0 ? Math.round((a * 12 + b) * G.CM_PER_IN * 10) / 10 : null;
    }
    function draw() {
      el.textContent = '';
      if (mode === 'cm') el.appendChild(cmI); else { el.appendChild(ft); el.appendChild(h('span', { class: 'muted', text: 'ft' })); el.appendChild(inch); el.appendChild(h('span', { class: 'muted', text: 'in' })); }
      el.appendChild(unitSelect(['ft', 'cm'], mode, function (v) { var cur = get(); mode = v; fill(cur); draw(); }));
    }
    fill(cm); draw();
    return { el: el, get: get };
  }

  /* ---------- insights ---------- */
  function latestRow(rows, ind) {
    for (var i = rows.length - 1; i >= 0; i--) if (rows[i].a.v && rows[i].a.v[ind] > 0 && !rows[i].a.beforeTerm) return rows[i];
    return null;
  }
  function zOf(row, std, ind) { return row && row.a.z[std] && row.a.z[std][ind] ? row.a.z[std][ind] : null; }
  function bandPhrase(ind, z, P) {
    var b = G.zBand(z);
    if (ind === 'wfl') {
      return { low: 'lean for ' + P.his + ' length (below the 2.3rd percentile)', lowish: 'on the lean side for ' + P.his + ' length, still in the usual range', mid: 'in proportion to ' + P.his + ' length', highish: 'on the heavier side for ' + P.his + ' length, still in the usual range', high: 'heavy for ' + P.his + ' length (above the 97.7th percentile)' }[b];
    }
    return { low: 'below the usual range', lowish: 'on the smaller side of typical', mid: 'right in the middle range', highish: 'on the bigger side of typical', high: 'above the usual range' }[b];
  }
  // Growth rate in the unit parents and pediatricians use at that age
  function rateText(ind, perDay, ageDays) {
    var us = prefs.units !== 'metric';
    if (ind === 'wfa') {
      if (ageDays < 365) return us ? G.trim(perDay * 1000 / 28.3495, 2) + ' oz a day' : Math.round(perDay * 1000) + ' g a day';
      if (ageDays < 3 * 365) { var mo = perDay * DPM; return us ? G.trim(mo / G.KG_PER_LB * 16, 1) + ' oz a month' : Math.round(mo * 1000) + ' g a month'; }
      var yr = perDay * 365.25;
      return us ? G.trim(yr / G.KG_PER_LB, 1) + ' lb a year' : G.trim(yr, 1) + ' kg a year';
    }
    if (ageDays < 3 * 365) { var cmMo = perDay * DPM; return us ? G.trim(cmMo / G.CM_PER_IN, 2) + ' in a month' : G.trim(cmMo, 1) + ' cm a month'; }
    var cmYr = perDay * 365.25;
    return us ? G.trim(cmYr / G.CM_PER_IN, 1) + ' in a year' : G.trim(cmYr, 1) + ' cm a year';
  }
  function deltaText(ind, d) { return ind === 'wfa' ? G.fmtWeightDelta(d, prefs.units) : G.fmtLenDelta(d, prefs.units); }

  function insights(c, rows) {
    var P = pr(c), out = [], today = todayStr();
    var name = c.name || (c.sex === 'F' ? 'She' : 'He');
    ['wfa', 'lhfa', 'hcfa'].forEach(function (ind) {
      var cur = latestRow(rows, ind);
      if (!cur) return;
      var std = stdFor(ind, cur.a.age), zc = zOf(cur, std, ind);
      if (!zc) return;
      var label = { wfa: 'Weight', lhfa: cur.a.age < 731 ? 'Length' : 'Height', hcfa: 'Head' }[ind];
      var parts = [];
      var cmp = { wfa: 'Heavier than about ', lhfa: 'Longer than about ', hcfa: P.His + ' head is bigger than about ' }[ind];
      if (ind === 'lhfa' && cur.a.age >= 731) cmp = 'Taller than about ';
      var share = Math.max(1, Math.min(99, Math.round(zc.pct)));
      var zo = zOf(cur, otherStd(std), ind);
      var srcTxt = '(' + stdName(std) + (zo ? '; ' + stdName(otherStd(std)) + ' says ' + G.pctText(zo.pct) : '') + ')';
      if (zc.pct >= 1 && zc.pct <= 99) parts.push(fmtV(ind, cur.a.v[ind]) + ' on ' + fmtDate(cur.m.date, 'auto') + '. ' + cmp + share + ' of every 100 ' + P.kids + ' ' + P.his + ' age ' + srcTxt + '.');
      else parts.push(fmtV(ind, cur.a.v[ind]) + ' on ' + fmtDate(cur.m.date, 'auto') + ', ' + pctPhrase(zc.pct) + ' for ' + P.kids + ' ' + P.his + ' age ' + srcTxt + '.');
      // change since previous
      var withV = rows.filter(function (r) { return r.a.v[ind] > 0 && !r.a.beforeTerm; });
      var prev = null;
      for (var i = withV.length - 2; i >= 0; i--) { if (cur.a.chrono - withV[i].a.chrono >= 7) { prev = withV[i]; break; } }
      var level = 'info';
      if (prev) {
        var zp = zOf(prev, std, ind);
        var days = cur.a.chrono - prev.a.chrono, dv = cur.a.v[ind] - prev.a.v[ind];
        if (zp) {
          var expEnd = G.valueAt(std, ind, c.sex, cur.a.age, zp.z);
          var exp = expEnd != null ? expEnd - prev.a.v[ind] : null;
          var dz = zc.z - zp.z;
          if (ind === 'lhfa' && dv < 0) {
            parts.push('This came out ' + deltaText(ind, dv).replace('−', '') + ' shorter than on ' + fmtDate(prev.m.date, 'auto') + ', which usually means the two were measured differently.');
          } else {
            var s = 'Since ' + fmtDate(prev.m.date, 'auto') + ': ' + deltaText(ind, dv) + ' in ' + days + ' days (' + rateText(ind, Math.abs(dv) / days, cur.a.chrono) + ')';
            if (exp != null) {
              if (Math.abs(dz) < 0.15) s += ', right on ' + P.his + ' curve.';
              else { var p1 = pctPhrase(zp.pct), p2 = pctPhrase(zc.pct), dir = dz > 0 ? 'up' : 'down'; s += '. Staying on ' + P.his + ' curve would have been ' + deltaText(ind, exp) + ', so ' + P.he + (p1 === p2 ? ' moved slightly ' + dir + ' but is still ' + p2 + '.' : ' moved ' + dir + ' from ' + p1 + ' to ' + p2 + '.'); }
            } else s += '.';
            parts.push(s);
          }
        }
      }
      // crossing two or more major percentile lines over the longer run
      var ref = null;
      for (var j = 0; j < withV.length - 1; j++) {
        var r = withV[j];
        if (r.a.chrono >= 14 && cur.a.chrono - r.a.chrono >= 56 && cur.a.chrono - r.a.chrono <= 274) { ref = r; break; }
      }
      if (ref) {
        var zr = zOf(ref, std, ind);
        if (zr) {
          var n = G.linesBetween(zr.z, zc.z);
          if (n >= 2) {
            var down = zc.z < zr.z;
            parts.push('Moved ' + (down ? 'down' : 'up') + ' from ' + pctPhrase(zr.pct) + ' to ' + pctPhrase(zc.pct) + ' since ' + fmtDate(ref.m.date, 'auto') + ', crossing ' + n + ' major percentile lines. Shifts are common in the first months' + (ind === 'lhfa' && !down ? '.' : ', but ' + (down ? 'a steady drop' : 'a steady climb') + ' is worth bringing up at the next checkup.'));
            if (!(ind === 'lhfa' && !down)) level = 'watch';
          }
        }
      }
      if (zc.z > 2 || zc.z < -2) {
        var streak = 0;
        for (var q = withV.length - 1; q >= 0; q--) { var zq = zOf(withV[q], stdFor(ind, withV[q].a.age), ind); if (zq && (zc.z > 2 ? zq.z > 2 : zq.z < -2)) streak++; else break; }
        parts.push(streak >= 2 ? 'The last ' + streak + ' readings are all ' + (zc.z > 2 ? 'above the 97.7th' : 'below the 2.3rd') + ' percentile, outside the usual range. Keep sharing them with your pediatrician.' : (zc.z > 2 ? 'Above the 97.7th' : 'Below the 2.3rd') + ' percentile, outside the usual range. One reading can be off, so measure again or mention it at the next checkup.');
        level = 'watch';
      }
      out.push({ ind: ind, level: level, title: label + ': ' + G.pctText(zc.pct) + ' percentile', text: parts.join(' ') });
    });
    // body proportion
    var lw = null, lr = null;
    for (var k = rows.length - 1; k >= 0; k--) { if (rows[k].a.v.wfa && rows[k].a.lenAdj && !rows[k].a.beforeTerm) { lr = rows[k]; break; } }
    if (lr) {
      if (lr.a.age < 731) {
        lw = zOf(lr, 'who', 'wfl');
        if (lw) out.push({ ind: 'wfl', level: (lw.z > 2 || lw.z < -2) ? 'watch' : 'info', title: 'Weight for length: ' + G.pctText(lw.pct) + ' percentile', text: name + ' is ' + bandPhrase('wfl', lw.z, P) + '. This compares weight with length instead of age, so it shows body proportion (WHO).' + ((lw.z > 2 || lw.z < -2) ? ' Worth mentioning at the next checkup.' : '') });
      } else {
        var bstd = stdFor('bfa', lr.a.age), bz = zOf(lr, bstd, 'bfa');
        if (bz) {
          var bmi = lr.a.v.bfa, cat, lvl = 'info';
          if (bstd === 'cdc') {
            cat = bz.pct < 5 ? 'the underweight range (below the 5th)' : bz.pct < 85 ? 'the healthy weight range (5th to 85th)' : bz.pct < 95 ? 'the overweight range (85th to 95th)' : 'the obesity range (95th and above)';
            if (bz.pct < 5 || bz.pct >= 85) lvl = 'watch';
          } else cat = bandPhrase('wfl', bz.z, P).replace(' for ' + P.his + ' length', ' for ' + P.his + ' height');
          out.push({ ind: 'bfa', level: lvl, title: 'BMI: ' + G.pctText(bz.pct) + ' percentile', text: 'BMI ' + G.trim(bmi, 1) + ' puts ' + P.him + ' in ' + cat + ' for ' + P.his + ' age (' + stdName(bstd) + ').' });
        }
      }
    }
    // birth weight milestones
    var birth = rows.filter(function (r) { return r.a.chrono <= 3 && r.m.weightKg > 0; })[0];
    var lastW = latestRow(rows, 'wfa');
    if (birth && lastW && lastW.a.chrono > 3) {
      var bw = +birth.m.weightKg, texts = [];
      var early = rows.filter(function (r) { return r.a.chrono > birth.a.chrono && r.a.chrono <= 28 && r.m.weightKg > 0; });
      var dipped = false;
      for (var e = 0; e < early.length; e++) {
        if (+early[e].m.weightKg < bw) dipped = true;
        else if (dipped) { texts.push('Back to birth weight by day ' + early[e].a.chrono + ' (most babies are by about 2 weeks).'); break; }
      }
      [[2, 'doubled', 4, 6], [3, 'tripled', 10, 14]].forEach(function (t) {
        var target = bw * t[0];
        var hit = rows.filter(function (r) { return r.m.weightKg >= target && r.a.chrono > 3; })[0];
        if (hit) texts.push(cap(t[1]) + ' ' + P.his + ' birth weight by ' + fmtDate(hit.m.date) + ' (' + G.fmtAge(c.dob, hit.m.date) + ').');
        else if (lastW.a.age < 24 * DPM) {
          var zl = zOf(lastW, 'who', 'wfa');
          if (zl) {
            for (var dd = Math.max(lastW.a.age, 1); dd <= 1856; dd += 1) {
              var val = G.valueAt('who', 'wfa', c.sex, dd, zl.z);
              if (val >= target) {
                var date = G.addDays(c.dob, Math.round(dd + (lastW.a.chrono - lastW.a.age)));
                texts.push('On track to ' + (t[0] === 2 ? 'double' : 'triple') + ' it around ' + fmtDate(date) + ' (' + G.fmtAge(c.dob, date) + '); most babies do by ' + t[2] + ' to ' + t[3] + ' months.');
                break;
              }
            }
          }
        }
      });
      if (texts.length) out.push({ ind: 'wfa', level: 'good', icon: 'star', title: 'Birth weight milestones', text: texts.join(' ') });
    }
    return out;
  }

  function nextCheckup(c, rows) {
    var nv = G.nextVisit(c.dob, todayStr());
    if (!nv) return null;
    var chrono = G.daysBetween(c.dob, nv.date), age = G.ageForCharts(c, chrono).days;
    var exp = [];
    ['wfa', 'lhfa', 'hcfa'].forEach(function (ind) {
      var r = latestRow(rows, ind);
      if (!r) return;
      var std = stdFor(ind, age), z = zOf(r, std, ind);
      if (!z) return;
      var v = G.valueAt(std, ind, c.sex, age, z.z);
      if (v != null) exp.push({ ind: ind, v: v });
    });
    return { visit: nv, expected: exp, ageDays: age };
  }
  function birthSize(c, rows) {
    var ga = G.gaDaysOf(c);
    var b = rows.filter(function (r) { return r.a.chrono <= 1; })[0];
    if (ga == null || !b) return null;
    var items = [];
    [['wt', 'weightKg', 'wfa', 'Weight'], ['len', 'lengthCm', 'lhfa', 'Length'], ['hc', 'headCm', 'hcfa', 'Head']].forEach(function (k) {
      var v = +b.m[k[1]];
      if (!(v > 0)) return;
      var r = G.igZ(k[0], c.sex, ga, v);
      if (r) items.push({ name: k[3], ind: k[2], v: v, pct: r.pct });
    });
    return items.length ? { ga: ga, items: items } : null;
  }
  function sizeClass(p) {
    if (p < 3) return 'very small for gestational age';
    if (p < 10) return 'small for gestational age (SGA)';
    if (p <= 90) return 'appropriate for gestational age';
    if (p <= 97) return 'large for gestational age (LGA)';
    return 'very large for gestational age';
  }
  function adultHeight(c, rows) {
    var lens = rows.filter(function (r) { return r.a.lenAdj && !r.a.beforeTerm && r.a.age >= 91; });
    var res = {};
    if (lens.length) {
      var last = lens[lens.length - 1], recent = lens.filter(function (r) { return last.a.chrono - r.a.chrono <= 365; }).slice(-3);
      var zs = recent.map(function (r) { var std = r.a.age < 731 ? 'who' : 'cdc'; var z = zOf(r, std, 'lhfa'); return z ? z.z : null; }).filter(function (z) { return z != null; });
      if (zs.length) {
        var z = zs.reduce(function (a, b) { return a + b; }, 0) / zs.length;
        res.proj = { cm: G.valueAt('cdc', 'lhfa', c.sex, 240 * DPM, z), pct: G.normCdf(z) * 100, young: last.a.age < 731 };
      }
    }
    if (c.fatherCm && c.motherCm) {
      var t = (+c.fatherCm + +c.motherCm + (c.sex === 'F' ? -13 : 13)) / 2;
      var zt = G.zFor('cdc', 'lhfa', c.sex, 240 * DPM, t);
      res.target = { cm: t, lo: t - 8.5, hi: t + 8.5, pct: zt ? zt.pct : null };
    }
    return (res.proj || res.target) ? res : null;
  }

  /* ---------- overview ---------- */
  function renderOverview(view, c) {
    var rows = rowsFor(c), P = pr(c);
    var ageToday = G.daysBetween(c.dob, todayStr()), corr = G.ageForCharts(c, ageToday);
    var head = h('div', { class: 'card intro' }, [
      h('div', { class: 'big-age', text: G.fmtAge(c.dob, todayStr()) + ' old' }),
      h('div', { class: 'muted', text: 'Born ' + fmtDate(c.dob) + (G.gaDaysOf(c) != null ? ' at ' + c.gaWeeks + ' weeks ' + (c.gaDays || 0) + ' days' : '') + (corr.corrected ? ' · corrected age ' + G.fmtAgeDays(Math.max(0, corr.days)) : '') })
    ]);
    view.appendChild(head);
    var gaB = G.gaDaysOf(c);
    var anyBefore = rows.some(function (r) { return r.a.beforeTerm; }), anyAfter = rows.some(function (r) { return !r.a.beforeTerm; });
    if (gaB != null && gaB < 259 && (corr.days < 14 || (anyBefore && !anyAfter))) {
      var due = G.addDays(c.dob, 280 - gaB);
      var earlyText = corr.days < 0
        ? 'The regular growth charts start at ' + P.his + ' due date, ' + fmtDate(due) + '. Until then the birth size card compares ' + P.him + ' with babies born at the same week, and measurements are still saved in the log.'
        : 'Measurements taken before ' + P.his + ' due date (' + fmtDate(due) + ') stay in the log but are not plotted, because the regular charts start at term. Add a new measurement and the charts and percentiles appear.';
      view.appendChild(h('div', { class: 'card' }, [
        h('div', { class: 'card-title' }, [icon('info'), h('h2', { text: 'Born early' })]),
        h('p', { class: 'small', text: earlyText + ' Until age 2 the charts use corrected age, the way pediatricians do.' })
      ]));
    }
    if (!rows.length) {
      view.appendChild(h('div', { class: 'card empty' }, [
        h('h2', { text: 'Add the first measurement' }),
        h('p', { class: 'muted', text: 'Enter the numbers from a checkup (weight, length, head). You can also bring in a whole history from a spreadsheet.' }),
        h('div', { class: 'row-btns' }, [
          h('button', { class: 'btn primary', onclick: function () { openMeasurement(c, null); } }, [icon('plus'), 'Add measurement']),
          h('button', { class: 'btn', onclick: function () { openImport(c); } }, 'Import from a file')
        ])
      ]));
      return;
    }
    // stat tiles
    var tiles = h('div', { class: 'tiles' });
    var inds = ['wfa', 'lhfa', 'hcfa'];
    var lastAny = rows[rows.length - 1];
    inds.push(lastAny.a.age < 731 ? 'wfl' : 'bfa');
    ['acfa', 'tsfa', 'ssfa'].forEach(function (i) { if (latestRow(rows, i)) inds.push(i); });
    inds.forEach(function (ind) {
      var r = latestRow(rows, ind);
      if (!r) return;
      var std = ind === 'wfl' ? 'who' : stdFor(ind, r.a.age), z = zOf(r, std, ind);
      var label = ind === 'lhfa' ? (r.a.age < 731 ? 'Length' : 'Height') : G.IND[ind].name;
      var val = ind === 'wfl' ? fmtV('wfa', r.a.v.wfa) + ' at ' + fmtV('lhfa', r.a.lenAdj) : (ind === 'bfa' ? 'BMI ' + G.trim(r.a.v.bfa, 1) : fmtV(ind, r.a.v[ind]));
      var sp = h('div', { class: 'tile-spark' });
      var tile = h('button', { class: 'tile', onclick: function () { prefs.chartInd = ind; prefs.chartRange = 'auto'; savePrefs(); go('charts'); } }, [
        h('div', { class: 'tile-top' }, [h('span', { class: 'key', style: 'background:' + SERIES[ind] }), h('span', { class: 'tile-label', text: label })]),
        h('div', { class: 'tile-value', text: val }),
        z ? h('div', { class: 'tile-pct' }, [h('b', { text: G.pctText(z.pct) }), ' percentile']) : h('div', { class: 'tile-pct muted', text: 'no chart at this age' }),
        sp,
        h('div', { class: 'tile-foot muted', text: stdName(std) + ' · ' + fmtDate(r.m.date, 'auto') })
      ]);
      tiles.appendChild(tile);
      var zs = rows.filter(function (x) { return zOf(x, std, ind); }).map(function (x) { return zOf(x, std, ind).z; });
      setTimeout(function () { C.spark(sp, zs.slice(-12), SERIES[ind]); }, 0);
    });
    if (tiles.children.length) view.appendChild(tiles);
    // insights
    var ins = insights(c, rows);
    var sec = h('section', { class: 'card' }, [h('h2', { text: 'What the numbers say' }),
      h('p', { class: 'muted small', text: 'A percentile tells you how many of 100 ' + P.kids + ' the same age are smaller. The 50th is the middle, most healthy kids are between the 3rd and 97th, and steady tracking along a curve matters more than the number itself.' })]);
    ins.forEach(function (x) {
      sec.appendChild(h('div', { class: 'insight ' + x.level }, [
        h('span', { class: 'ins-key', style: 'background:' + (SERIES[x.ind] || 'var(--muted)') }),
        h('div', null, [h('div', { class: 'ins-title' }, [x.level === 'watch' ? icon('alert', 'warn-ic') : null, x.title]), h('p', { text: x.text })])
      ]));
    });
    if (ins.length) view.appendChild(sec);
    // next checkup
    var nc = nextCheckup(c, rows);
    if (nc) {
      var exp = nc.expected.map(function (e) { return { wfa: 'weight about ', lhfa: (nc.ageDays < 731 ? 'length' : 'height') + ' about ', hcfa: 'head about ' }[e.ind] + roughV(e.ind, e.v); });
      view.appendChild(h('section', { class: 'card' }, [
        h('div', { class: 'card-title' }, [icon('cal'), h('h2', { text: 'Next checkup' })]),
        h('p', null, [h('b', { text: cap(nc.visit.label) + ' visit' }), ' around ' + fmtDate(nc.visit.date) + '.']),
        exp.length ? h('p', { class: 'muted', text: 'If ' + P.he + ' stays on ' + P.his + ' curves, expect ' + listJoin(exp) + '.' }) : null
      ]));
    }
    // birth size
    var bs = birthSize(c, rows);
    if (bs) {
      var wk = Math.floor(bs.ga / 7), dd = bs.ga % 7;
      view.appendChild(h('section', { class: 'card' }, [
        h('div', { class: 'card-title' }, [icon('baby'), h('h2', { text: 'Size at birth for ' + wk + ' weeks ' + dd + ' days' })]),
        h('div', { class: 'mini-table' }, bs.items.map(function (it) {
          return h('div', { class: 'mt-row' }, [h('span', { class: 'key', style: 'background:' + SERIES[it.ind] }), h('span', { text: it.name }), h('b', { text: G.pctText(it.pct) }), h('span', { class: 'muted', text: sizeClass(it.pct) })]);
        })),
        h('p', { class: 'muted small', text: 'Compared with babies born at the same gestational age (INTERGROWTH-21st newborn standards). Between the 10th and 90th counts as appropriate for gestational age.' })
      ]));
    }
    // adult height
    var ah = adultHeight(c, rows);
    if (ah) {
      var lines = [];
      if (ah.proj && ah.proj.cm) lines.push(h('p', null, ['If ' + P.he + ' keeps tracking ' + P.his + ' current height percentile (' + G.pctText(ah.proj.pct) + '), ' + P.he + ' would be about ', h('b', { text: fmtHeightLong(ah.proj.cm) }), ' as an adult.' + (ah.proj.young ? ' Before age 2 this is a rough guess. It gets more reliable after 2 to 3 years.' : '')]));
      if (ah.target) lines.push(h('p', null, ['Based on your heights, ' + P.his + ' genetic target is about ', h('b', { text: fmtHeightLong(ah.target.cm) }), ', with most kids landing between ' + fmtHeightLong(ah.target.lo).replace(/ \(.*\)/, '') + ' and ' + fmtHeightLong(ah.target.hi).replace(/ \(.*\)/, '') + '.']));
      else lines.push(h('p', { class: 'muted small' }, ['Add both parents’ heights in ', h('a', { href: '#', onclick: function (e) { e.preventDefault(); openSettings('child'); }, text: 'Settings' }), ' to see a genetic target height.']));
      view.appendChild(h('section', { class: 'card' }, [h('div', { class: 'card-title' }, [icon('up'), h('h2', { text: 'Adult height outlook' })])].concat(lines)));
    }
    view.appendChild(h('p', { class: 'disclaimer', text: 'For tracking at home. It does not replace your pediatrician, who looks at the whole picture.' }));
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function pctPhrase(p) {
    var t = G.pctText(p);
    return /^(below|above) /.test(t) ? t.slice(0, 6) + 'the ' + t.slice(6) + ' percentile' : 'the ' + t + ' percentile';
  }
  // Rounded values for predictions (no false precision)
  function roughV(ind, v) {
    if (ind === 'wfa') {
      if (prefs.units === 'metric') return G.trim(Math.round(v * 10) / 10, 1) + ' kg';
      var oz = Math.round(v / G.KG_PER_LB * 16), lb = Math.floor(oz / 16);
      return lb + ' lb ' + (oz - lb * 16) + ' oz';
    }
    return prefs.units === 'metric' ? G.trim(Math.round(v * 2) / 2, 1) + ' cm' : G.trim(Math.round(v / G.CM_PER_IN * 4) / 4, 2) + ' in';
  }
  function listJoin(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }

  /* ---------- charts view ---------- */
  var CHART_TABS = [['wfa', 'Weight'], ['lhfa', 'Length'], ['hcfa', 'Head'], ['wfl', 'Weight for length'], ['bfa', 'BMI'], ['acfa', 'Arm'], ['tsfa', 'Triceps'], ['ssfa', 'Subscapular'], ['z', 'All percentiles']];
  function rangeOptions(ind, std) {
    if (ind === 'wfl') return [['auto', 'Auto'], ['u2', 'Under 2 (lying)'], ['o2', '2 to 5 (standing)']];
    if (ind === 'acfa' || ind === 'tsfa' || ind === 'ssfa') return [['auto', 'Auto'], ['3m2', '3 months to 2 years'], ['3m5', '3 months to 5 years']];
    var o = [['auto', 'Auto'], ['6m', 'Birth to 6 months'], ['1y', 'Birth to 1 year'], ['2y', 'Birth to 2 years'], ['5y', 'Birth to 5 years']];
    if (ind === 'hcfa') return std === 'cdc' ? o.slice(0, 4).concat([['3y', 'Birth to 3 years']]) : o;
    o.push(['2-20', '2 to 20 years']);
    return o;
  }
  function renderCharts(view, c) {
    var rows = rowsFor(c), P = pr(c);
    var lastAge = rows.length ? rows[rows.length - 1].a.age : Math.max(0, G.ageForCharts(c, G.daysBetween(c.dob, todayStr())).days);
    var hasData = function (ind) { return rows.some(function (r) { return r.a.v[ind] > 0; }); };
    var ind = prefs.chartInd || 'wfa';
    if (['acfa', 'tsfa', 'ssfa'].indexOf(ind) >= 0 && !hasData(ind)) ind = 'wfa';
    var chips = h('div', { class: 'chips', role: 'tablist' });
    CHART_TABS.forEach(function (t) {
      if (['acfa', 'tsfa', 'ssfa'].indexOf(t[0]) >= 0 && !hasData(t[0])) return;
      var label = t[0] === 'lhfa' && lastAge >= 731 ? 'Height' : t[1];
      chips.appendChild(h('button', { class: 'chip' + (t[0] === ind ? ' on' : ''), role: 'tab', 'aria-selected': String(t[0] === ind), onclick: function () { prefs.chartInd = t[0]; prefs.chartRange = 'auto'; savePrefs(); render(); } }, [t[0] !== 'z' ? h('span', { class: 'key', style: 'background:' + SERIES[t[0]] }) : null, label]));
    });
    view.appendChild(chips);
    var stdSel = h('select', { 'aria-label': 'Chart standard', title: 'Auto uses WHO under age 2 and CDC from 2, like US pediatricians', onchange: function () { prefs.std = stdSel.value; savePrefs(); render(); } }, [
      h('option', { value: 'auto', text: 'Auto' }), h('option', { value: 'who', text: 'WHO' }), h('option', { value: 'cdc', text: 'CDC' })]);
    stdSel.value = prefs.std;
    var controls = h('div', { class: 'controls' }, [h('label', { class: 'ctl' }, [h('span', { text: 'Chart' }), stdSel])]);
    var card = h('section', { class: 'card chart-card' });
    view.appendChild(controls);
    view.appendChild(card);

    if (ind === 'z') { renderZChart(card, c, rows, lastAge); return; }

    // decide range and standard
    var range = prefs.chartRange || 'auto';
    var xMin = 0, xMax, std, xIsLength = ind === 'wfl', ageForWfl = 0;
    var autoMonths = [6, 12, 24, 36, 60, 120, 240];
    var needM = Math.max(6, lastAge / DPM + 2.5);
    var pick = autoMonths.filter(function (mm) { return mm >= needM; })[0] || 240;
    if (ind === 'wfl') {
      var u2 = range === 'u2' || (range === 'auto' && lastAge < 731);
      ageForWfl = u2 ? 0 : 800;
      var lensIn = rows.filter(function (r) { return r.a.lenAdj && r.a.v.wfa && (u2 ? r.a.age < 731 : r.a.age >= 731 && r.a.age <= 1856); }).map(function (r) { return r.a.lenAdj; });
      var lo = u2 ? 45 : 65, hi = u2 ? 110 : 120;
      if (lensIn.length) { lo = Math.max(lo, Math.floor((Math.min.apply(null, lensIn) - 6) / 5) * 5); hi = Math.min(hi, Math.ceil((Math.max.apply(null, lensIn) + 8) / 5) * 5); }
      xMin = lo; xMax = hi; std = 'who';
    } else if (['acfa', 'tsfa', 'ssfa'].indexOf(ind) >= 0) {
      std = 'who'; xMin = 91; xMax = range === '3m2' ? 731 : range === '3m5' ? 1856 : Math.min(1856, Math.max(731, pick * DPM));
    } else {
      var months = { '6m': [0, 6], '1y': [0, 12], '2y': [0, 24], '3y': [0, 36], '5y': [0, 60], '2-20': [24, 240] }[range];
      if (!months) months = [0, pick];
      xMin = months[0] * DPM; xMax = months[1] * DPM;
      if (prefs.std === 'auto') std = (range === 'auto' ? lastAge < 731 : months[1] <= 24) ? 'who' : 'cdc';
      else std = prefs.std;
      if (!G.hasStd(std, ind)) std = 'who';
      var xr = G.xRange(std, ind, c.sex, lastAge);
      if (ind === 'bfa' && std === 'cdc') xMin = Math.max(xMin, 24 * DPM);
      xMax = Math.min(xMax, xr[1]);
      if (xMax - xMin < 30) { xMin = xr[0]; }
    }
    var ropts = rangeOptions(ind, std);
    var rangeSel = h('select', { 'aria-label': 'Age range', onchange: function () { prefs.chartRange = rangeSel.value; savePrefs(); render(); } }, ropts.map(function (o) { return h('option', { value: o[0], text: o[1] }); }));
    rangeSel.value = ropts.some(function (o) { return o[0] === range; }) ? range : 'auto';
    controls.appendChild(h('label', { class: 'ctl' }, [h('span', { text: 'Range' }), rangeSel]));

    var kind = kindOf(ind);
    var label = ind === 'lhfa' ? (xMin >= 731 ? 'Height' : xMax <= 731 ? 'Length' : 'Length and height') : G.IND[ind].long;
    var title = (ind === 'lhfa' ? label + ' for age' : label) + ', ' + P.kids + ' (' + stdName(std) + ')';
    if (ind === 'wfl') title = (ageForWfl ? 'Weight for height' : 'Weight for length') + ', ' + P.kids + ' (WHO)';
    card.appendChild(h('h2', { class: 'chart-title', text: title }));
    if (prefs.std === 'cdc' && std === 'who') card.appendChild(h('p', { class: 'muted small', text: 'CDC has no chart for this, so WHO is shown.' }));

    var pts = [];
    rows.forEach(function (r) {
      if (r.a.beforeTerm) return;
      var y = ind === 'wfl' ? r.a.v.wfa : r.a.v[ind];
      if (!(y > 0)) return;
      if (ind === 'wfl') {
        if (!r.a.lenAdj) return;
        if (ageForWfl === 0 ? r.a.age >= 731 : (r.a.age < 731 || r.a.age > 1856)) return;
      }
      var x = ind === 'wfl' ? r.a.lenAdj : r.a.age;
      var z = zOf(r, std, ind), zo = ind === 'wfl' ? null : zOf(r, otherStd(std), ind);
      var lines = [{ text: fmtDate(r.m.date) + ' · ' + G.fmtAge(c.dob, r.m.date) + (r.a.corrected ? ' (corrected ' + G.fmtAgeDays(r.a.age) + ')' : '') }];
      if (ind === 'wfl') lines.push({ text: 'at ' + fmtV('lhfa', r.a.lenAdj) + ' long' });
      if (z) lines.push({ strong: G.pctText(z.pct), text: 'percentile (' + stdName(std) + ')' });
      if (zo) lines.push({ text: stdName(otherStd(std)) + ': ' + G.pctText(zo.pct) });
      if (r.m.note) lines.push({ text: r.m.note });
      var vtxt = ind === 'bfa' ? 'BMI ' + G.trim(y, 1) : fmtV(ind === 'wfl' ? 'wfa' : ind, y);
      pts.push({ x: x, y: y, id: r.m.id, tip: { title: vtxt, lines: lines } });
    });
    // projection along the latest percentile
    var proj = null, lastPt = null;
    if (ind !== 'wfl' && rows.length) {
      for (var i = rows.length - 1; i >= 0; i--) { if (rows[i].a.v[ind] > 0 && zOf(rows[i], std, ind)) { lastPt = rows[i]; break; } }
      if (lastPt && lastPt.a.age >= xMin && lastPt.a.age < xMax) {
        var nc = nextCheckup(c, rows), endAge = lastPt.a.age + 91;
        if (nc && nc.ageDays > lastPt.a.age + 20 && nc.ageDays < lastPt.a.age + 200) endAge = nc.ageDays;
        endAge = Math.min(endAge, xMax);
        var zl = zOf(lastPt, std, ind).z;
        proj = [];
        for (var k = 0; k <= 12; k++) {
          var ax = lastPt.a.age + (endAge - lastPt.a.age) * k / 12;
          var vv = G.valueAt(std, ind, c.sex, ax, zl);
          if (vv != null) proj.push({ x: ax, y: vv });
        }
      }
    }
    var chartBox = h('div', { class: 'chart-box' });
    card.appendChild(chartBox);
    var draw = function () {
      C.growth(chartBox, { std: std, ind: ind === 'wfl' ? 'wfl' : ind, sex: c.sex, units: prefs.units, kind: ind === 'wfl' ? 'weight' : kind, xMin: xMin, xMax: xMax, xIsLength: xIsLength, ageForWfl: ageForWfl, points: pts, projection: proj, color: SERIES[ind], ariaLabel: title });
    };
    requestAnimationFrame(draw);
    chartDraw = draw;
    var legend = h('div', { class: 'legend' }, [
      h('span', { class: 'lg' }, [h('span', { class: 'lg-line', style: 'background:' + SERIES[ind] }), cname(c)]),
      proj ? h('span', { class: 'lg' }, [h('span', { class: 'lg-dash', style: 'border-color:' + SERIES[ind] }), 'If ' + P.he + ' stays on ' + P.his + ' curve']) : null,
      h('span', { class: 'lg' }, [h('span', { class: 'lg-band' }), 'Bands: 25th to 75th, 10th to 90th, 3rd to 97th'])
    ]);
    card.appendChild(legend);
    if (!pts.length) card.appendChild(h('p', { class: 'muted small', text: 'No measurements in this range yet.' }));
    // data table twin
    if (pts.length) {
      var tbl = h('table', { class: 'data-table' }, [h('thead', null, h('tr', null, [h('th', { text: 'Date' }), h('th', { text: ind === 'wfl' ? 'Length' : 'Age' }), h('th', { text: 'Value' }), h('th', { text: stdName(std) })]))]);
      var tb = h('tbody');
      rows.slice().reverse().forEach(function (r) {
        var y = ind === 'wfl' ? r.a.v.wfa : r.a.v[ind];
        if (!(y > 0)) return;
        var z = zOf(r, std, ind);
        if (ind === 'wfl' && !z) return;
        tb.appendChild(h('tr', null, [h('td', { text: fmtDate(r.m.date) }), h('td', { text: ind === 'wfl' ? fmtV('lhfa', r.a.lenAdj) : G.fmtAge(c.dob, r.m.date) }), h('td', { text: ind === 'bfa' ? G.trim(y, 1) : fmtV(ind === 'wfl' ? 'wfa' : ind, y) }), h('td', { text: z ? G.pctText(z.pct) : '' })]));
      });
      tbl.appendChild(tb);
      card.appendChild(h('details', { class: 'more' }, [h('summary', { text: 'Show as a table' }), tbl]));
    }
    card.appendChild(h('p', { class: 'muted small', text: chartNote(ind, std) }));
  }
  function chartNote(ind, std) {
    var n = std === 'who' ? 'WHO Child Growth Standards (birth to 5) and WHO 2007 reference (5 to 19).' : 'CDC 2000 growth charts (birth to 20), with the 2022 extended BMI percentiles.';
    if (ind === 'lhfa') n += ' Babies are measured lying down until 2 and standing after, so the curves step at age 2.';
    if (ind === 'wfl') n += ' Weight for length shows body proportion and does not depend on age.';
    if (ind === 'bfa') n += ' Under 2, BMI is shown for interest only; doctors use weight for length at that age.';
    return n;
  }
  function renderZChart(card, c, rows, lastAge) {
    var P = pr(c);
    card.appendChild(h('h2', { class: 'chart-title', text: 'Percentile history' }));
    card.appendChild(h('p', { class: 'muted small', text: 'Every measurement on one percentile scale, so you can see if ' + P.he + ' is following steady curves.' }));
    var series = [], use = ['wfa', 'lhfa', 'hcfa', 'wfl', 'bfa', 'acfa'];
    use.forEach(function (ind) {
      var pts = [];
      rows.forEach(function (r) {
        if (ind === 'bfa' && r.a.age < 731) return;
        var std = ind === 'wfl' ? 'who' : stdFor(ind, r.a.age), z = zOf(r, std, ind);
        if (z) pts.push({ x: r.a.age, z: z.z });
      });
      if (pts.length) series.push({ key: ind, name: ind === 'lhfa' ? 'Length/height' : G.IND[ind].name, color: SERIES[ind], points: pts });
    });
    var tipRows = rows.filter(function (r) { return !r.a.beforeTerm; }).map(function (r) {
      var lines = [];
      series.forEach(function (s) {
        var ind = s.key;
        if (ind === 'bfa' && r.a.age < 731) return;
        var std = ind === 'wfl' ? 'who' : stdFor(ind, r.a.age), z = zOf(r, std, ind);
        if (z) lines.push({ color: s.color, strong: G.pctText(z.pct), text: s.name });
      });
      return { x: r.a.age, title: fmtDate(r.m.date) + ' · ' + G.fmtAge(c.dob, r.m.date), lines: lines };
    });
    var xMax = Math.max(6 * DPM, lastAge * 1.08 + 14);
    var box = h('div', { class: 'chart-box' });
    card.appendChild(box);
    if (series.length > 1) card.appendChild(h('div', { class: 'legend' }, series.map(function (s) { return h('span', { class: 'lg' }, [h('span', { class: 'lg-line', style: 'background:' + s.color }), s.name]); })));
    var draw = function () { C.zHistory(box, { xMin: 0, xMax: xMax, series: series, rows: tipRows }); };
    requestAnimationFrame(draw);
    chartDraw = draw;
    card.appendChild(h('p', { class: 'muted small', text: 'Uses WHO under 2 and CDC from 2 unless you pick one standard above. Weight for length is always WHO.' }));
  }
  var chartDraw = null, rz;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (chartDraw && currentView() === 'charts') chartDraw(); }, 150); });

  /* ---------- log ---------- */
  function renderLog(view, c) {
    var rows = rowsFor(c);
    view.appendChild(h('div', { class: 'row-btns top' }, [
      h('button', { class: 'btn primary', onclick: function () { openMeasurement(c, null); } }, [icon('plus'), 'Add']),
      h('button', { class: 'btn', onclick: function () { openImport(c); } }, 'Import'),
      h('button', { class: 'btn', onclick: function () { exportCsv(c); } }, 'Export CSV')
    ]));
    if (!rows.length) { view.appendChild(h('div', { class: 'card empty' }, h('p', { class: 'muted', text: 'No measurements yet.' }))); return; }
    var list = h('div', { class: 'log' });
    rows.slice().reverse().forEach(function (r) {
      var items = [];
      [['wfa', 'Weight'], ['lhfa', r.a.age < 731 ? 'Length' : 'Height'], ['hcfa', 'Head'], ['acfa', 'Arm'], ['tsfa', 'Triceps'], ['ssfa', 'Subscap']].forEach(function (k) {
        var v = r.a.v[k[0]];
        if (!(v > 0)) return;
        var std = stdFor(k[0], r.a.age), z = zOf(r, std, k[0]);
        var shown = k[0] === 'lhfa' ? (+r.m.lengthCm) : v;
        items.push(h('div', { class: 'log-item' }, [h('span', { class: 'key', style: 'background:' + SERIES[k[0]] }), h('span', { class: 'li-label', text: k[1] }), h('span', { class: 'li-val', text: fmtV(k[0], shown) }), h('span', { class: 'li-pct', text: z ? G.pctText(z.pct) : '' })]));
      });
      var wfl = zOf(r, 'who', 'wfl');
      if (wfl && r.a.age < 731) items.push(h('div', { class: 'log-item' }, [h('span', { class: 'key', style: 'background:' + SERIES.wfl }), h('span', { class: 'li-label', text: 'Wt for length' }), h('span', { class: 'li-val', text: '' }), h('span', { class: 'li-pct', text: G.pctText(wfl.pct) })]));
      list.appendChild(h('button', { class: 'log-row', onclick: function () { openMeasurement(c, r.m); } }, [
        h('div', { class: 'log-head' }, [h('b', { text: fmtDate(r.m.date) }), h('span', { class: 'muted', text: G.fmtAge(c.dob, r.m.date) }), r.m.note ? h('span', { class: 'note', text: r.m.note }) : null]),
        h('div', { class: 'log-items' }, items)
      ]));
    });
    view.appendChild(list);
    view.appendChild(h('p', { class: 'muted small', text: 'Percentiles use WHO under 2 and CDC from 2 unless you picked one standard on the Charts tab. Tap a row to edit it.' }));
  }

  /* ---------- measurement sheet ---------- */
  function openMeasurement(c, m) {
    var P = pr(c);
    var date = h('input', { type: 'date', required: true, min: c.dob, max: G.addDays(todayStr(), 1), value: m ? m.date : todayStr() });
    var preview = h('div', { class: 'preview', 'aria-live': 'polite' });
    var w = weightInput(m ? m.weightKg : null, upd), l = lengthInput(m ? m.lengthCm : null, 'length', upd), hd = lengthInput(m ? m.headCm : null, 'head', upd);
    var arm = lengthInput(m ? m.armCm : null, 'arm', upd);
    var tri = h('input', { type: 'number', inputmode: 'decimal', step: 'any', min: 0, placeholder: 'mm', value: m && m.tricepsMm ? m.tricepsMm : '' });
    var sub = h('input', { type: 'number', inputmode: 'decimal', step: 'any', min: 0, placeholder: 'mm', value: m && m.subscapMm ? m.subscapMm : '' });
    [tri, sub, date].forEach(function (i) { i.addEventListener('input', upd); });
    var ageAt = function () { return G.daysBetween(c.dob, date.value || todayStr()); };
    var pos = m && m.position ? m.position : (ageAt() < 731 ? 'lying' : 'standing');
    var posSeg = segmented([['lying', 'Lying down'], ['standing', 'Standing']], pos, function (v) { pos = v; upd(); });
    var note = h('input', { type: 'text', placeholder: 'e.g. 6 month checkup', value: m && m.note ? m.note : '', maxlength: 120 });
    var err = h('p', { class: 'error', hidden: true });
    var more = h('details', { class: 'more' }, [h('summary', { text: 'More measurements (arm, skinfolds)' }),
      field('Mid-upper arm circumference', arm.el), field('Triceps skinfold', tri, 'Measured with skinfold calipers'), field('Subscapular skinfold', sub)]);
    if (m && (m.armCm || m.tricepsMm || m.subscapMm)) more.open = true;
    var form = h('form', { class: 'form', onsubmit: function (e) { e.preventDefault(); save(); } }, [
      field('Date measured', date),
      field('Weight', w.el),
      field('Length or height', h('div', { class: 'stack' }, [l.el, posSeg])),
      field('Head circumference', hd.el),
      more,
      field('Note', note),
      preview, err,
      h('div', { class: 'row-btns' }, [
        h('button', { class: 'btn primary', type: 'submit', text: 'Save' }),
        m ? h('button', { class: 'btn danger', type: 'button', text: 'Delete', onclick: del }) : null
      ])
    ]);
    function current() {
      return { id: m ? m.id : uid(), childId: c.id, date: date.value, weightKg: w.get(), lengthCm: l.get(), position: pos, headCm: hd.get(), armCm: arm.get(), tricepsMm: num(tri.value) || null, subscapMm: num(sub.value) || null, note: note.value.trim() };
    }
    function upd() {
      preview.textContent = '';
      if (!date.value) return;
      var rec = current(), a = G.analyze(rec, c);
      if (a.beforeTerm) { preview.appendChild(h('p', { class: 'muted small', text: 'This date is before ' + P.his + ' due date, so the term growth charts do not apply yet.' })); return; }
      var items = [];
      ['wfa', 'lhfa', 'hcfa', 'wfl', 'acfa', 'tsfa', 'ssfa'].forEach(function (ind) {
        var std = ind === 'wfl' ? 'who' : stdFor(ind, a.age), z = zOf({ a: a }, std, ind);
        if (!z) return;
        var odd = Math.abs(z.z) > 4;
        items.push(h('span', { class: 'pv' + (odd ? ' odd' : '') }, [h('span', { class: 'key', style: 'background:' + SERIES[ind] }), (ind === 'lhfa' ? (a.age < 731 ? 'Length' : 'Height') : G.IND[ind].name) + ' ', h('b', { text: G.pctText(z.pct) })]));
      });
      if (items.length) {
        preview.appendChild(h('div', { class: 'pv-wrap' }, items));
        var odd = ['wfa', 'lhfa', 'hcfa'].some(function (ind) { var z = a.z.who[ind]; return z && Math.abs(z.z) > 4; });
        if (odd) preview.appendChild(h('p', { class: 'warn-text', text: 'One of these looks very unusual for ' + P.his + ' age. Double-check the number and the unit (inches vs centimeters, pounds vs kilograms).' }));
      }
    }
    function save() {
      err.hidden = true;
      var rec = current();
      if (!rec.date) { err.textContent = 'Please pick the date.'; err.hidden = false; return; }
      if (G.daysBetween(c.dob, rec.date) < 0) { err.textContent = 'That date is before the birth date.'; err.hidden = false; return; }
      if (!rec.weightKg && !rec.lengthCm && !rec.headCm && !rec.armCm && !rec.tricepsMm && !rec.subscapMm) { err.textContent = 'Enter at least one measurement.'; err.hidden = false; return; }
      if (rec.weightKg && (rec.weightKg < 0.3 || rec.weightKg > 250)) { err.textContent = 'That weight does not look right.'; err.hidden = false; return; }
      if (rec.lengthCm && (rec.lengthCm < 20 || rec.lengthCm > 250)) { err.textContent = 'That length does not look right.'; err.hidden = false; return; }
      if (rec.headCm && (rec.headCm < 15 || rec.headCm > 80)) { err.textContent = 'That head size does not look right.'; err.hidden = false; return; }
      rec.createdAt = m ? (m.createdAt || nowIso()) : nowIso();
      rec.updatedAt = nowIso();
      Object.keys(rec).forEach(function (k) { if (rec[k] === null || rec[k] === '') delete rec[k]; });
      var summary = [rec.weightKg ? 'weight ' + G.fmtWeight(rec.weightKg, prefs.units) : null, rec.lengthCm ? 'length ' + G.fmtLen(rec.lengthCm, prefs.units) : null, rec.headCm ? 'head ' + G.fmtLen(rec.headCm, prefs.units) : null].filter(Boolean).join(', ');
      Store.change(function (doc) {
        if (m) doc.measurements = doc.measurements.map(function (x) { return x.id === rec.id ? rec : x; });
        else doc.measurements.push(rec);
      }, (m ? 'Edit ' : 'Add ') + rec.date + (summary ? ': ' + summary : ''));
      closeSheet();
      toast(m ? 'Updated' : 'Saved');
    }
    function del() {
      if (!confirm('Delete the measurement from ' + fmtDate(m.date) + '? It stays in the GitHub history if you ever need it back.')) return;
      Store.change(function (doc) {
        doc.measurements = doc.measurements.map(function (x) { return x.id === m.id ? { id: m.id, childId: m.childId, date: m.date, deleted: true, updatedAt: nowIso() } : x; });
      }, 'Delete measurement ' + m.date);
      closeSheet(); toast('Deleted');
    }
    openSheet(m ? 'Edit measurement' : 'Add measurement', form, { noFocus: true });
    upd();
  }

  /* ---------- milestones ---------- */
  function renderMilestones(view, c) {
    var P = pr(c), ageMo = G.daysBetween(c.dob, todayStr()) / DPM;
    var corr = G.ageForCharts(c, G.daysBetween(c.dob, todayStr()));
    var useMo = corr.corrected ? Math.max(0, corr.days / DPM) : ageMo;
    var card = h('section', { class: 'card' }, [
      h('h2', { text: 'Motor milestones' }),
      h('p', { class: 'muted small', text: 'The shaded bar is the WHO window when 98 of 100 healthy babies reach each milestone (1st to 99th percentile). The line marks ' + P.his + ' age today' + (corr.corrected ? ' (corrected for prematurity)' : '') + '. Log the date when ' + P.he + ' does it.' })
    ]);
    var axis = h('div', { class: 'ms-axis' });
    for (var mm = 0; mm <= 18; mm += 3) axis.appendChild(h('span', { style: 'left:' + (mm / 18 * 100) + '%', text: String(mm) }));
    G.MILESTONES.forEach(function (ms) {
      var rec = milestoneFor(c, ms.key);
      var doneMo = rec && rec.date ? G.ageForCharts(c, G.daysBetween(c.dob, rec.date)).days / DPM : null;
      var status;
      if (doneMo != null) status = 'Done at ' + G.trim(doneMo, 1) + ' months' + (doneMo < ms.lo ? ', earlier than the window.' : doneMo > ms.hi ? ', later than the window.' : ', inside the usual window.');
      else if (useMo < ms.lo) status = 'Coming up. The window opens at ' + ms.lo + ' months.';
      else if (useMo <= ms.hi) status = 'In the window now (' + ms.lo + ' to ' + ms.hi + ' months).';
      else status = 'Most babies do this by ' + ms.hi + ' months. Worth mentioning at the next checkup.';
      var track = h('div', { class: 'ms-track' }, [
        h('div', { class: 'ms-band', style: 'left:' + (ms.lo / 18 * 100) + '%;width:' + ((ms.hi - ms.lo) / 18 * 100) + '%' }),
        useMo <= 18 ? h('div', { class: 'ms-now', style: 'left:' + (Math.min(useMo, 18) / 18 * 100) + '%' }) : null,
        doneMo != null && doneMo <= 18 ? h('div', { class: 'ms-done', style: 'left:' + (doneMo / 18 * 100) + '%' }) : null
      ]);
      var input = h('input', { type: 'date', min: c.dob, max: todayStr(), value: rec && rec.date ? rec.date : '', 'aria-label': ms.name + ' date' });
      input.addEventListener('change', function () {
        var id = c.id + ':' + ms.key;
        Store.change(function (doc) {
          var others = doc.milestones.filter(function (x) { return x.id !== id; });
          others.push(input.value ? { id: id, childId: c.id, key: ms.key, date: input.value, updatedAt: nowIso() } : { id: id, childId: c.id, key: ms.key, deleted: true, updatedAt: nowIso() });
          doc.milestones = others;
        }, input.value ? 'Milestone: ' + ms.name + ' on ' + input.value : 'Clear milestone: ' + ms.name);
      });
      card.appendChild(h('div', { class: 'ms' }, [
        h('div', { class: 'ms-head' }, [h('b', { text: ms.name }), input]),
        track,
        h('p', { class: 'small' + (doneMo == null && useMo > ms.hi ? ' warn-text' : ' muted'), text: status + (ms.note ? ' ' + ms.note : '') })
      ]));
    });
    card.appendChild(h('div', { class: 'ms-axis-wrap' }, [axis, h('div', { class: 'muted small center', text: 'Age (months)' })]));
    view.appendChild(card);
    view.appendChild(h('p', { class: 'disclaimer', text: 'Source: WHO Motor Development Study (2006). Babies each have their own pace, and your pediatrician checks development at every visit.' }));
  }

  /* ---------- import / export ---------- */
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain' });
    var a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function csvCell(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportCsv(c) {
    var rows = rowsFor(c);
    var head = ['date', 'age', 'weight_kg', 'weight_lb', 'length_cm', 'length_in', 'position', 'head_cm', 'head_in', 'arm_cm', 'triceps_mm', 'subscapular_mm', 'weight_pct_who', 'length_pct_who', 'head_pct_who', 'weight_for_length_pct_who', 'bmi', 'bmi_pct_who', 'weight_pct_cdc', 'length_pct_cdc', 'head_pct_cdc', 'bmi_pct_cdc', 'note'];
    var lines = [head.join(',')];
    function p(r, std, ind) { var z = zOf(r, std, ind); return z ? (Math.round(z.pct * 10) / 10) : ''; }
    rows.forEach(function (r) {
      var m = r.m;
      lines.push([m.date, G.fmtAge(c.dob, m.date), m.weightKg || '', m.weightKg ? G.trim(m.weightKg / G.KG_PER_LB, 3) : '', m.lengthCm || '', m.lengthCm ? G.trim(m.lengthCm / G.CM_PER_IN, 2) : '', m.lengthCm ? (m.position || '') : '', m.headCm || '', m.headCm ? G.trim(m.headCm / G.CM_PER_IN, 2) : '', m.armCm || '', m.tricepsMm || '', m.subscapMm || '',
        p(r, 'who', 'wfa'), p(r, 'who', 'lhfa'), p(r, 'who', 'hcfa'), p(r, 'who', 'wfl'), r.a.v.bfa ? G.trim(r.a.v.bfa, 2) : '', p(r, 'who', 'bfa'), p(r, 'cdc', 'wfa'), p(r, 'cdc', 'lhfa'), p(r, 'cdc', 'hcfa'), p(r, 'cdc', 'bfa'), m.note || ''].map(csvCell).join(','));
    });
    download((c.name || 'child').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-growth-' + todayStr() + '.csv', lines.join('\n') + '\n', 'text/csv');
  }
  function exportJson() { download('growth-backup-' + todayStr() + '.json', JSON.stringify(Store.doc, null, 2), 'application/json'); }

  function parseCsv(text) {
    var delim = (text.split('\n')[0].match(/\t/g) || []).length > 0 ? '\t' : (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
  }
  function parseDateLoose(s) {
    s = String(s || '').trim();
    var m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
    if ((m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(s))) {
      var y = +m[3]; if (y < 100) y += 2000;
      return y + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
    }
    var t = Date.parse(s);
    if (!isNaN(t)) { var d = new Date(t); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    return null;
  }
  function parseWeight(s, unitHint) {
    s = String(s || '').trim().toLowerCase();
    if (!s) return null;
    var m;
    if ((m = /(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?|#)\s*(?:,|and)?\s*(\d+(?:\.\d+)?)?\s*(?:oz|ounces?)?/.exec(s))) return ((+m[1]) + (m[2] ? +m[2] / 16 : 0)) * G.KG_PER_LB;
    if ((m = /(\d+(?:\.\d+)?)\s*kg/.exec(s))) return +m[1];
    if ((m = /(\d+(?:\.\d+)?)\s*g\b/.exec(s))) return +m[1] / 1000;
    if ((m = /(\d+(?:\.\d+)?)\s*(?:oz|ounces?)/.exec(s))) return +m[1] / 16 * G.KG_PER_LB;
    var n = num(s);
    if (n == null) return null;
    if (unitHint === 'kg') return n;
    if (unitHint === 'g') return n / 1000;
    if (unitHint === 'oz') return n / 16 * G.KG_PER_LB;
    if (unitHint === 'lb') return n * G.KG_PER_LB;
    return prefs.units === 'metric' ? n : n * G.KG_PER_LB;
  }
  function parseLen(s, unitHint) {
    s = String(s || '').trim().toLowerCase();
    if (!s) return null;
    var m;
    if ((m = /(\d+(?:\.\d+)?)\s*cm/.exec(s))) return +m[1];
    if ((m = /(\d+(?:\.\d+)?)\s*mm/.exec(s))) return +m[1] / 10;
    if ((m = /(\d+(?:\.\d+)?)\s*(?:in|inch|inches|")/.exec(s))) return +m[1] * G.CM_PER_IN;
    var n = num(s);
    if (n == null) return null;
    if (unitHint === 'cm') return n;
    if (unitHint === 'in') return n * G.CM_PER_IN;
    return prefs.units === 'metric' ? n : n * G.CM_PER_IN;
  }
  function importRows(text, c) {
    var rows = parseCsv(text);
    if (!rows.length) return { recs: [], skipped: 0, msg: 'Nothing found.' };
    var head = rows[0].map(function (x) { return String(x).toLowerCase().trim(); });
    var toks = head.map(function (t) { return t.split(/[^a-z]+/).filter(Boolean); });
    var has = function (i, words) { return toks[i] && toks[i].some(function (w) { return words.indexOf(w) >= 0; }); };
    var col = function (re, not) { for (var i = 0; i < head.length; i++) if (re.test(head[i]) && !(not && not(i))) return i; return -1; };
    var unitOf = function (i) {
      if (has(i, ['kg', 'kgs', 'kilo', 'kilos', 'kilograms'])) return 'kg';
      if (has(i, ['g', 'grams', 'gram'])) return 'g';
      if (has(i, ['lb', 'lbs', 'pound', 'pounds'])) return 'lb';
      if (has(i, ['oz', 'ounce', 'ounces'])) return 'oz';
      if (has(i, ['cm', 'centimeters', 'centimetres'])) return 'cm';
      if (has(i, ['in', 'inch', 'inches'])) return 'in';
      if (has(i, ['mm'])) return 'mm';
      return null;
    };
    var isOzOnly = function (i) { return unitOf(i) === 'oz'; };
    var ci = { date: col(/date|day|when/), w: col(/weight|^wt/, isOzOnly), wo: col(/oz|ounce/, function (i) { return has(i, ['lb', 'lbs', 'pound', 'pounds']); }), l: col(/length|height|stature|^len|^ht/), hd: col(/head|^hc|ofc|circumference/), arm: col(/arm|muac/), tri: col(/tricep/), sub: col(/subscap/), note: col(/note|comment|visit/), pos: col(/position|posture/) };
    if (ci.w < 0 && ci.wo >= 0) { ci.w = ci.wo; ci.wo = -1; }
    var hasHeader = ci.date >= 0;
    if (!hasHeader) { ci = { date: 0, w: 1, wo: -1, l: 2, hd: 3, arm: -1, tri: -1, sub: -1, note: 4, pos: -1 }; }
    // prefer the explicit kg/cm columns when both units are present
    var wkg = head.findIndex(function (x) { return /weight|^wt/.test(x) && /kg/.test(x); });
    if (wkg >= 0) ci.w = wkg;
    var lcm = head.findIndex(function (x) { return /length|height|stature/.test(x) && /cm/.test(x); });
    if (lcm >= 0) ci.l = lcm;
    var hcm = head.findIndex(function (x) { return /head|ofc/.test(x) && /cm/.test(x); });
    if (hcm >= 0) ci.hd = hcm;
    var recs = [], skipped = 0;
    rows.slice(hasHeader ? 1 : 0).forEach(function (r) {
      var d = parseDateLoose(r[ci.date]);
      if (!d) { skipped++; return; }
      var wkgv = ci.w >= 0 ? parseWeight(r[ci.w], unitOf(ci.w)) : null;
      if (ci.wo >= 0 && ci.w >= 0 && ci.wo !== ci.w && unitOf(ci.w) !== 'kg' && unitOf(ci.w) !== 'g' && num(r[ci.wo]) != null && /^\s*[\d.]+\s*$/.test(String(r[ci.w] || '0'))) wkgv = ((num(r[ci.w]) || 0) + num(r[ci.wo]) / 16) * G.KG_PER_LB;
      var rec = {
        id: uid(), childId: c.id, date: d,
        weightKg: wkgv ? Math.round(wkgv * 10000) / 10000 : null,
        lengthCm: ci.l >= 0 ? parseLen(r[ci.l], unitOf(ci.l)) : null,
        headCm: ci.hd >= 0 ? parseLen(r[ci.hd], unitOf(ci.hd)) : null,
        armCm: ci.arm >= 0 ? parseLen(r[ci.arm], unitOf(ci.arm)) : null,
        tricepsMm: ci.tri >= 0 ? num(r[ci.tri]) : null,
        subscapMm: ci.sub >= 0 ? num(r[ci.sub]) : null,
        note: ci.note >= 0 ? String(r[ci.note] || '').trim() : '',
        position: ci.pos >= 0 && /stand/i.test(r[ci.pos] || '') ? 'standing' : (ci.pos >= 0 && /ly|lie|recumb/i.test(r[ci.pos] || '') ? 'lying' : null)
      };
      if (!rec.weightKg && !rec.lengthCm && !rec.headCm && !rec.armCm) { skipped++; return; }
      if (G.daysBetween(c.dob, d) < 0) { skipped++; return; }
      if (!rec.position) rec.position = G.daysBetween(c.dob, d) < 731 ? 'lying' : 'standing';
      ['lengthCm', 'headCm', 'armCm'].forEach(function (k) { if (rec[k]) rec[k] = Math.round(rec[k] * 1000) / 1000; });
      recs.push(rec);
    });
    return { recs: recs, skipped: skipped };
  }
  function openImport(c) {
    var P = pr(c);
    var ta = h('textarea', { rows: 7, placeholder: 'date, weight_lb, length_in, head_in\n2026-03-14, 7 lb 8 oz, 20, 13.75\n2026-04-15, 10.2, 21.75, 14.6' });
    var info = h('div', { class: 'preview' });
    var fileIn = h('input', { type: 'file', accept: '.csv,.tsv,.txt,.json,text/csv,application/json' });
    var parsed = null;
    function analyzeText(text) {
      info.textContent = '';
      parsed = null;
      if (!text.trim()) return;
      if (/^\s*\{/.test(text)) {
        try {
          var j = JSON.parse(text);
          var n = Store.normalize(j);
          parsed = { json: n };
          info.appendChild(h('p', { text: 'Backup file with ' + n.children.filter(function (x) { return !x.deleted; }).length + ' child profile(s) and ' + n.measurements.filter(function (x) { return !x.deleted; }).length + ' measurements. It will be merged with what is here; nothing gets deleted.' }));
        } catch (e) { info.appendChild(h('p', { class: 'error', text: 'That file is not valid JSON.' })); }
        return;
      }
      var r = importRows(text, c);
      parsed = r;
      var counts = { w: 0, l: 0, h: 0 };
      r.recs.forEach(function (x) { if (x.weightKg) counts.w++; if (x.lengthCm) counts.l++; if (x.headCm) counts.h++; });
      info.appendChild(h('p', { text: 'Found ' + r.recs.length + ' measurement' + (r.recs.length === 1 ? '' : 's') + ': ' + counts.w + ' with weight, ' + counts.l + ' with length, ' + counts.h + ' with head.' + (r.skipped ? ' Skipped ' + r.skipped + ' row(s) without a usable date or value.' : '') }));
      if (r.recs.length) {
        var first = r.recs[0];
        info.appendChild(h('p', { class: 'muted small', text: 'First row reads as: ' + fmtDate(first.date) + (first.weightKg ? ', ' + G.fmtWeight(first.weightKg, prefs.units) : '') + (first.lengthCm ? ', ' + G.fmtLen(first.lengthCm, prefs.units) : '') + (first.headCm ? ', head ' + G.fmtLen(first.headCm, prefs.units) : '') + '. If the units look wrong, add the unit to the column names (like weight_kg or length_in).' }));
      }
    }
    ta.addEventListener('input', function () { analyzeText(ta.value); });
    fileIn.addEventListener('change', function () {
      var f = fileIn.files && fileIn.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { ta.value = String(rd.result || ''); analyzeText(ta.value); };
      rd.readAsText(f);
    });
    function doImport() {
      if (!parsed) return;
      if (parsed.json) { Store.mergeIn(parsed.json, 'Import backup'); closeSheet(); toast('Backup merged'); render(); return; }
      var existing = rowsFor(c).map(function (r) { return r.m; });
      var fresh = parsed.recs.filter(function (x) {
        return !existing.some(function (e) { return e.date === x.date && Math.abs((e.weightKg || 0) - (x.weightKg || 0)) < 0.005 && Math.abs((e.lengthCm || 0) - (x.lengthCm || 0)) < 0.05 && Math.abs((e.headCm || 0) - (x.headCm || 0)) < 0.05; });
      });
      var t = nowIso();
      fresh.forEach(function (x) { x.createdAt = t; x.updatedAt = t; Object.keys(x).forEach(function (k) { if (x[k] === null || x[k] === '') delete x[k]; }); });
      Store.change(function (doc) { doc.measurements = doc.measurements.concat(fresh); }, 'Import ' + fresh.length + ' measurements');
      closeSheet();
      toast('Imported ' + fresh.length + (parsed.recs.length - fresh.length ? ' (' + (parsed.recs.length - fresh.length) + ' already here)' : ''));
      render();
    }
    var tmpl = h('button', { class: 'linkish', type: 'button', text: 'Download a template', onclick: function () { download('growth-template.csv', 'date,weight_lb,weight_oz,length_in,head_in,note\n' + c.dob + ',7,8,20,13.75,Birth\n', 'text/csv'); } });
    openSheet('Import measurements', [
      h('p', { class: 'muted small', text: 'Pick a CSV file (for example from a spreadsheet or your clinic portal) or paste rows below. Columns can be in any order: date, weight, length or height, head. Units can be in the column name (weight_kg, length_in) or in the values (7 lb 8 oz, 52 cm). Rows already here are skipped.' }),
      field('File', fileIn), field('Or paste', ta), info,
      h('div', { class: 'row-btns' }, [h('button', { class: 'btn primary', type: 'button', text: 'Import', onclick: doImport }), tmpl])
    ], { noFocus: true });
    void P;
  }

  /* ---------- settings ---------- */
  function openSettings(focus) {
    var c = child(), P = pr(c);
    var body = [];
    if (c) {
      body.push(h('section', { class: 'set', id: 'set-child' }, [h('h3', { text: 'Child' }), childForm(c, false),
        h('div', { class: 'row-btns' }, [
          h('button', { class: 'btn', type: 'button', text: 'Add another child', onclick: function () { closeSheet(); openSheet('Add a child', childForm(null, true)); } }),
          children().length > 1 ? h('button', { class: 'btn', type: 'button', text: 'Switch child', onclick: function () { closeSheet(); openChildPicker(); } }) : null,
          h('button', { class: 'btn danger', type: 'button', text: 'Remove ' + (c.name || 'child'), onclick: function () {
            if (!confirm('Remove ' + cname(c) + ' and all of ' + P.his + ' measurements? The GitHub history keeps a copy.')) return;
            Store.change(function (doc) {
              var t = nowIso();
              doc.children = doc.children.map(function (x) { return x.id === c.id ? { id: c.id, deleted: true, updatedAt: t } : x; });
              doc.measurements = doc.measurements.map(function (x) { return x.childId === c.id ? { id: x.id, childId: c.id, deleted: true, updatedAt: t } : x; });
              doc.milestones = doc.milestones.map(function (x) { return x.childId === c.id ? { id: x.id, childId: c.id, deleted: true, updatedAt: t } : x; });
            }, 'Remove child');
            prefs.childId = null; savePrefs(); closeSheet(); render();
          } })
        ])]));
    }
    var units = segmented([['us', 'US (lb, in)'], ['metric', 'Metric (kg, cm)']], prefs.units, function (v) { prefs.units = v; savePrefs(); render(); });
    var std = segmented([['auto', 'Auto'], ['who', 'WHO'], ['cdc', 'CDC']], prefs.std, function (v) { prefs.std = v; savePrefs(); render(); });
    var theme = segmented([['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']], prefs.theme, function (v) { prefs.theme = v; savePrefs(); applyTheme(); render(); });
    body.push(h('section', { class: 'set' }, [h('h3', { text: 'Display' }), field('Units', units), field('Growth standard', std, 'Auto uses WHO under age 2 and CDC from 2, like US pediatricians.'), field('Theme', theme)]));
    body.push(storageSection());
    body.push(h('section', { class: 'set' }, [h('h3', { text: 'Backup' }),
      h('p', { class: 'muted small', text: 'GitHub already keeps every version. These give you a copy you can open anywhere.' }),
      h('div', { class: 'row-btns' }, [
        h('button', { class: 'btn', type: 'button', text: 'Download backup (JSON)', onclick: exportJson }),
        c ? h('button', { class: 'btn', type: 'button', text: 'Download CSV', onclick: function () { exportCsv(c); } }) : null,
        c ? h('button', { class: 'btn', type: 'button', text: 'Import', onclick: function () { closeSheet(); openImport(c); } }) : null
      ])]));
    body.push(h('section', { class: 'set' }, [h('h3', { text: 'About' }),
      h('p', { class: 'small', text: 'Growth Tracker ' + VERSION + '. Percentiles come from the WHO Child Growth Standards (2006) and WHO Growth Reference (2007), the CDC 2000 Growth Charts with the 2022 extended BMI, and the INTERGROWTH-21st Newborn Size Standards. Milestone windows come from the WHO Motor Development Study.' }),
      h('p', { class: 'small muted', text: 'Calculations happen on this device. Your data goes only to your own GitHub repo. This app is for tracking and does not give medical advice.' })]));
    openSheet('Settings', body, { noFocus: true });
    if (focus) setTimeout(function () { var el = document.getElementById('set-' + focus); if (el) el.scrollIntoView({ block: 'start' }); }, 80);
  }
  function openChildPicker() {
    openSheet('Switch child', children().map(function (x) {
      return h('button', { class: 'btn block' + (child() && x.id === child().id ? ' primary' : ''), type: 'button', onclick: function () { prefs.childId = x.id; prefs.chartRange = 'auto'; savePrefs(); closeSheet(); render(); } }, [cname(x), h('span', { class: 'muted', text: ' ' + G.fmtAge(x.dob, todayStr()) })]);
    }).concat([h('button', { class: 'btn block', type: 'button', text: 'Add another child', onclick: function () { closeSheet(); openSheet('Add a child', childForm(null, true)); } })]));
  }

  function defaultOwner() {
    var m = /^([a-z0-9-]+)\.github\.io$/i.exec(location.hostname);
    return m ? m[1] : '';
  }
  function storageSection() {
    var sec = h('section', { class: 'set', id: 'set-storage' }, [h('h3', { text: 'Permanent storage (GitHub)' })]);
    var conn = Store.conn;
    var statusLine = h('p', { class: 'small' });
    function paintStatus() {
      statusLine.textContent = '';
      var st = Store.status;
      var txt = { local: 'Not connected. Data is saved on this device only.', pending: 'Changes waiting to save.', syncing: 'Saving to GitHub…', synced: 'Everything is saved in your private repo.' + (Store.lastSync ? ' Last saved ' + new Date(Store.lastSync).toLocaleString() + '.' : ''), offline: 'Offline. Changes are kept here and will save when you are back online.', error: Store.error || 'Sync problem.' }[st];
      statusLine.appendChild(document.createTextNode(txt || ''));
      statusLine.className = 'small ' + (st === 'error' ? 'error' : st === 'local' || st === 'offline' ? 'warn-text' : '');
    }
    paintStatus();
    Store.on('status', paintStatus);
    sec.appendChild(statusLine);
    if (conn) {
      var repoUrl = 'https://github.com/' + encodeURIComponent(conn.owner) + '/' + encodeURIComponent(conn.repo);
      sec.appendChild(h('p', { class: 'small' }, ['Data repo: ', h('a', { href: repoUrl, target: '_blank', rel: 'noopener', text: conn.owner + '/' + conn.repo }), ' (open it to see the full history of every change)']));
      sec.appendChild(h('div', { class: 'row-btns' }, [
        h('button', { class: 'btn primary', type: 'button', onclick: function () { Store.sync(); } }, [icon('cloud'), 'Sync now']),
        h('button', { class: 'btn', type: 'button', onclick: showConnectQr }, [icon('qr'), 'Connect another phone']),
        h('button', { class: 'btn danger', type: 'button', text: 'Disconnect this device', onclick: function () {
          if (!confirm('Disconnect this device from GitHub? Your data stays in the repo, and you can connect again any time.')) return;
          Store.disconnect(); closeSheet(); render(); toast('Disconnected');
        } })
      ]));
      Store.checkRepo().then(function (r) {
        if (!r.private) sec.insertBefore(h('p', { class: 'error', text: 'Warning: this data repo is public. Anyone can see it. Make it private in the repo Settings on GitHub.' }), statusLine.nextSibling);
      }).catch(function () { /* status line shows errors */ });
    } else {
      var owner = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', value: defaultOwner(), placeholder: 'your GitHub username' });
      var repo = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', value: 'growth-tracker-data' });
      var token = h('input', { type: 'password', autocomplete: 'off', placeholder: 'github_pat_...', spellcheck: 'false' });
      var err = h('p', { class: 'error', hidden: true });
      sec.appendChild(h('div', { class: 'row-btns' }, [
        h('button', { class: 'btn primary', type: 'button', onclick: function () { closeSheet(); openScanner(); } }, [icon('camera'), 'Scan code from another device'])
      ]));
      sec.appendChild(h('p', { class: 'muted small', text: 'Or enter the details by hand:' }));
      sec.appendChild(field('GitHub username', owner));
      sec.appendChild(field('Private data repo', repo));
      sec.appendChild(field('Access key (fine-grained token)', token, 'Stored on this device only.'));
      sec.appendChild(h('details', { class: 'more' }, [h('summary', { text: 'How to make a key' }), h('ol', { class: 'steps small' }, [
        h('li', null, ['Open ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener', text: 'GitHub new token page' }), '.']),
        h('li', { text: 'Name it Growth Tracker and pick the longest expiration offered.' }),
        h('li', { text: 'Repository access: Only select repositories, then pick your private data repo.' }),
        h('li', { text: 'Permissions: add Contents and set it to Read and write.' }),
        h('li', { text: 'Generate the token, copy it, and paste it above.' })
      ])]));
      sec.appendChild(err);
      sec.appendChild(h('div', { class: 'row-btns' }, [h('button', { class: 'btn primary', type: 'button', text: 'Connect', onclick: function () {
        err.hidden = true;
        if (!owner.value.trim() || !repo.value.trim() || !token.value.trim()) { err.textContent = 'Fill in all three.'; err.hidden = false; return; }
        Store.connect({ owner: owner.value, repo: repo.value, token: token.value }).then(function (ok) {
          if (ok) { closeSheet(); toast('Connected. Your data is saved in GitHub.'); render(); }
          else { err.textContent = Store.error || 'Could not connect.'; err.hidden = false; Store.disconnect(); }
        });
      } })]));
    }
    return sec;
  }

  /* ---------- QR connect ---------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) return res();
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function appBase() { return location.origin + location.pathname.replace(/index\.html$/, ''); }
  function showConnectQr() {
    var link = Store.connectLink(appBase());
    if (!link) return;
    loadScript('qrcode.js').then(function () {
      var qr = window.qrcode(0, 'L'); qr.addData(link); qr.make();
      var box = h('div', { class: 'qr-box', html: qr.createSvgTag({ cellSize: 6, margin: 3, scalable: true }) });
      closeSheet();
      openSheet('Connect another phone', [
        h('ol', { class: 'steps small' }, [
          h('li', { text: 'On the other phone, open the Growth Tracker app (add it to the home screen first if you want the icon).' }),
          h('li', { text: 'Tap Scan code and point it at this screen. Or scan this with the phone’s camera to open it in the browser.' }),
          h('li', { text: 'The data appears on that phone and both stay in sync.' })
        ]),
        box,
        h('p', { class: 'warn-text small', text: 'This code contains the key to your data. Only show it to your own family’s phones.' })
      ], { noFocus: true });
    }).catch(function () { toast('Could not load the QR maker.'); });
  }
  var scanStream = null;
  function stopScan() { if (scanStream) { scanStream.getTracks().forEach(function (t) { t.stop(); }); scanStream = null; } }
  function openScanner() {
    var video = h('video', { playsinline: true, muted: true, autoplay: true, class: 'scan-video' });
    var msg = h('p', { class: 'muted small', text: 'Point the camera at the code on the other device.' });
    openSheet('Scan code', [h('div', { class: 'scan-wrap' }, [video, h('div', { class: 'scan-frame' })]), msg], { onClose: stopScan, noFocus: true });
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = 'This browser cannot use the camera. Use the phone camera app to scan the code instead.'; return; }
    loadScript('jsqr.js').then(function () {
      return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    }).then(function (stream) {
      scanStream = stream; video.srcObject = stream; video.play();
      var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
      (function tick() {
        if (!scanStream) return;
        if (video.readyState >= 2 && video.videoWidth) {
          var w = video.videoWidth, hh = video.videoHeight, sc = Math.min(1, 720 / Math.max(w, hh));
          canvas.width = Math.round(w * sc); canvas.height = Math.round(hh * sc);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          var code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
          if (code && code.data) {
            var conn = Store.parseConnect(code.data);
            if (conn) { stopScan(); closeSheet(); connectWith(conn); return; }
            msg.textContent = 'That code is not a Growth Tracker code.';
          }
        }
        requestAnimationFrame(tick);
      })();
    }).catch(function () { msg.textContent = 'Camera not available. Allow camera access, or use the phone camera app to scan the code instead.'; });
  }
  function connectWith(conn) {
    toast('Connecting…', 6000);
    Store.connect(conn).then(function (ok) {
      if (ok) {
        var cs = children();
        if (cs.length && !child()) prefs.childId = cs[0].id;
        savePrefs(); render(); toast('Connected. Your data is here.');
      } else { toast(Store.error || 'Could not connect.', 5000); render(); }
    });
  }

  /* ---------- startup ---------- */
  function init() {
    applyTheme();
    $('#settingsBtn').addEventListener('click', function () { openSettings(); });
    $('#syncBadge').addEventListener('click', function () { openSettings('storage'); });
    $('#addBtn').addEventListener('click', function () { var c = child(); if (c) openMeasurement(c, null); });
    $('#childBtn').addEventListener('click', function () { if (children().length > 1) openChildPicker(); else if (child()) openSettings('child'); });
    Store.on('status', renderBadge);
    Store.on('data', function () { if ($('#sheet').hidden) render(); else renderHeader(); });
    var conn = Store.parseConnect(location.hash);
    if (conn) {
      history.replaceState(null, '', location.pathname + location.search);
      connectWith(conn);
    } else if (Store.conn) Store.sync();
    render();
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              var bar = $('#update');
              bar.hidden = false;
            }
          });
        });
      }).catch(function () { /* offline support is optional */ });
    }
    $('#update').addEventListener('click', function () { location.reload(); });
  }
  init();
})();
