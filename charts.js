/* charts.js: responsive SVG growth charts with percentile bands, trend line, projection and tooltips. */
(function (root) {
  'use strict';
  var G = root.Growth;
  var NS = 'http://www.w3.org/2000/svg';
  var PCTS = [3, 10, 25, 50, 75, 90, 97];
  var DPM = G.DPM;

  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function niceStep(span, target) {
    var raw = span / Math.max(target, 1), mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    var nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nice * mag;
  }
  function fmtTick(v, step) {
    var dp = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
    if (step === 2.5 || step === 0.25) dp = Math.max(dp, step === 0.25 ? 2 : 1);
    return (+v.toFixed(dp)).toLocaleString();
  }
  function toDisp(kind, v, units) {
    if (v == null) return null;
    if (units !== 'metric') {
      if (kind === 'weight') return v / G.KG_PER_LB;
      if (kind === 'length' || kind === 'head' || kind === 'arm') return v / G.CM_PER_IN;
    }
    return v;
  }
  function unitLabel(kind, units) {
    var us = units !== 'metric';
    return { weight: us ? 'lb' : 'kg', length: us ? 'in' : 'cm', head: us ? 'in' : 'cm', arm: us ? 'in' : 'cm', bmi: 'kg/m²', skin: 'mm' }[kind] || '';
  }
  function ageAxis(xMin, xMax) {
    var out = [], step, i, unitDays, title;
    if (xMax <= 92) {
      unitDays = 7; step = (xMax - xMin) <= 56 ? 1 : 2; title = 'Age (weeks)';
    } else if (xMax <= 36 * DPM + 1) {
      unitDays = DPM; var spanM = (xMax - xMin) / DPM; step = spanM <= 12.5 ? 1 : spanM <= 24.5 ? 2 : 3; title = 'Age (months)';
    } else {
      unitDays = 12 * DPM; step = (xMax - xMin) / (12 * DPM) <= 10.5 ? 1 : 2; title = 'Age (years)';
    }
    for (i = Math.ceil(xMin / unitDays / step - 1e-9) * step; i * unitDays <= xMax + 1e-6; i += step) out.push({ x: i * unitDays, label: String(i) });
    return { ticks: out, title: title };
  }
  function breaksFor(std, ind) {
    if (std === 'who' && (ind === 'lhfa' || ind === 'bfa')) return [[-1e9, 730.9999], [731, 1e9]];
    if (std === 'cdc' && (ind === 'wfa' || ind === 'lhfa')) return [[-1e9, 730.4], [730.5, 1e9]];
    return [[-1e9, 1e9]];
  }

  function makeTooltip(wrap) {
    var tip = document.createElement('div');
    tip.className = 'gt-tip';
    tip.setAttribute('role', 'status');
    tip.hidden = true;
    wrap.appendChild(tip);
    return tip;
  }
  function fillTip(tip, data) {
    tip.textContent = '';
    var v = document.createElement('div'); v.className = 'gt-tip-v'; v.textContent = data.title; tip.appendChild(v);
    (data.lines || []).forEach(function (ln) {
      var d = document.createElement('div');
      d.className = 'gt-tip-l';
      if (ln.color) { var k = document.createElement('span'); k.className = 'gt-key'; k.style.background = ln.color; d.appendChild(k); }
      if (ln.strong) { var s = document.createElement('b'); s.textContent = ln.strong + ' '; d.appendChild(s); }
      d.appendChild(document.createTextNode(ln.text));
      tip.appendChild(d);
    });
  }
  function placeTip(tip, wrap, px, py) {
    tip.hidden = false;
    var w = tip.offsetWidth, h = tip.offsetHeight, W = wrap.clientWidth;
    var left = Math.min(Math.max(px - w / 2, 4), W - w - 4);
    var top = py - h - 14;
    if (top < 2) top = py + 16;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  /* Growth chart: reference percentile curves with the child's measurements on top.
     o = { std, ind, sex, units, kind, xMin, xMax, xIsLength, ageForWfl, points:[{x,y,tip}], projection:[{x,y}], color } (y in base units) */
  function growth(container, o) {
    container.textContent = '';
    var wrap = document.createElement('div');
    wrap.className = 'gt-chart';
    container.appendChild(wrap);
    var W = Math.max(280, Math.floor(container.clientWidth || 340));
    var H = Math.round(Math.min(520, Math.max(300, W * 0.82)));
    var m = { l: 42, r: 40, t: 24, b: 40 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, class: 'gt-svg', role: 'img', 'aria-label': o.ariaLabel || 'Growth chart' }, wrap);

    // reference curves
    var curves = {}, segs = [];
    var br = o.xIsLength ? [[-1e9, 1e9]] : breaksFor(o.std, o.ind);
    br.forEach(function (b) {
      var a = Math.max(o.xMin, b[0]), c = Math.min(o.xMax, b[1]);
      if (c - a > 1e-6) segs.push([a, c]);
    });
    var yLo = Infinity, yHi = -Infinity;
    PCTS.forEach(function (p) {
      var z = G.normInv(p / 100);
      curves[p] = segs.map(function (s) {
        var pts = [], N = 90;
        for (var i = 0; i <= N; i++) {
          var x = s[0] + (s[1] - s[0]) * i / N;
          var y = G.valueAt(o.std, o.ind, o.sex, x, z, o.ageForWfl);
          if (y == null || !isFinite(y)) continue;
          y = toDisp(o.kind, y, o.units);
          pts.push([x, y]);
          if (y < yLo) yLo = y;
          if (y > yHi) yHi = y;
        }
        return pts;
      });
    });
    var pts = (o.points || []).filter(function (p) { return p.x >= o.xMin - 1e-6 && p.x <= o.xMax + 1e-6 && p.y > 0; })
      .map(function (p) { return { x: p.x, y: toDisp(o.kind, p.y, o.units), tip: p.tip, id: p.id }; });
    var proj = (o.projection || []).filter(function (p) { return p.x >= o.xMin && p.x <= o.xMax && p.y > 0; })
      .map(function (p) { return { x: p.x, y: toDisp(o.kind, p.y, o.units) }; });
    pts.concat(proj).forEach(function (p) { if (p.y < yLo) yLo = p.y; if (p.y > yHi) yHi = p.y; });
    if (!isFinite(yLo)) { yLo = 0; yHi = 1; }
    var pad = (yHi - yLo) * 0.04;
    yLo -= pad; yHi += pad;
    var ystep = niceStep(yHi - yLo, Math.max(5, Math.round(ph / 40)));
    yLo = Math.floor(yLo / ystep) * ystep; yHi = Math.ceil(yHi / ystep) * ystep;
    if (o.kind !== 'bmi' && o.kind !== 'skin' && yLo < 0) yLo = 0;

    function X(x) { return m.l + (x - o.xMin) / (o.xMax - o.xMin) * pw; }
    function Y(y) { return m.t + (1 - (y - yLo) / (yHi - yLo)) * ph; }

    var gGrid = svgEl('g', { class: 'gt-grid' }, svg);
    for (var yv = yLo; yv <= yHi + ystep * 0.01; yv += ystep) {
      svgEl('line', { x1: m.l, x2: m.l + pw, y1: Y(yv), y2: Y(yv) }, gGrid);
      var t = svgEl('text', { x: m.l - 6, y: Y(yv) + 3.5, class: 'gt-tick', 'text-anchor': 'end' }, svg);
      t.textContent = fmtTick(yv, ystep);
    }
    var xt;
    if (o.xIsLength) {
      var xs0 = toDisp('length', o.xMin, o.units), xs1 = toDisp('length', o.xMax, o.units);
      var xstep = niceStep(xs1 - xs0, Math.max(4, Math.round(pw / 60)));
      xt = { ticks: [], title: 'Length (' + unitLabel('length', o.units) + ')' };
      for (var xv = Math.ceil(xs0 / xstep) * xstep; xv <= xs1 + 1e-9; xv += xstep) {
        xt.ticks.push({ x: o.units === 'metric' ? xv : xv * G.CM_PER_IN, label: fmtTick(xv, xstep) });
      }
    } else {
      xt = ageAxis(o.xMin, o.xMax);
    }
    var lastLabelX = -1e9;
    xt.ticks.forEach(function (tk) {
      var px = X(tk.x);
      svgEl('line', { x1: px, x2: px, y1: m.t, y2: m.t + ph }, gGrid);
      if (px - lastLabelX < 22) return;
      var tx = svgEl('text', { x: px, y: m.t + ph + 15, class: 'gt-tick', 'text-anchor': 'middle' }, svg);
      tx.textContent = tk.label;
      lastLabelX = px;
    });
    var xTitle = svgEl('text', { x: m.l + pw / 2, y: H - 6, class: 'gt-axis-title', 'text-anchor': 'middle' }, svg);
    xTitle.textContent = xt.title;
    var yTitle = svgEl('text', { x: m.l - 6, y: 12, class: 'gt-axis-title', 'text-anchor': 'end' }, svg);
    yTitle.textContent = unitLabel(o.kind, o.units);
    svgEl('line', { x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph, class: 'gt-baseline' }, svg);

    // clip
    var cid = 'clip' + Math.random().toString(36).slice(2, 8);
    var defs = svgEl('defs', null, svg);
    var cp = svgEl('clipPath', { id: cid }, defs);
    svgEl('rect', { x: m.l, y: m.t, width: pw, height: ph }, cp);
    var plot = svgEl('g', { 'clip-path': 'url(#' + cid + ')' }, svg);

    // bands
    [[3, 97], [10, 90], [25, 75]].forEach(function (pair) {
      curves[pair[0]].forEach(function (lo, si) {
        var hi = curves[pair[1]][si];
        if (!lo.length || !hi.length) return;
        var d = lo.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ');
        d += ' ' + hi.slice().reverse().map(function (p) { return 'L' + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ') + ' Z';
        svgEl('path', { d: d, class: 'gt-band' }, plot);
      });
    });
    PCTS.forEach(function (p) {
      curves[p].forEach(function (seg) {
        if (seg.length < 2) return;
        var d = seg.map(function (q, i) { return (i ? 'L' : 'M') + X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1); }).join(' ');
        svgEl('path', { d: d, class: p === 50 ? 'gt-ref gt-ref-50' : 'gt-ref' }, plot);
      });
    });
    // right-edge percentile labels, spaced so they never collide
    var labels = [];
    PCTS.forEach(function (p) {
      var segsP = curves[p], last = segsP[segsP.length - 1];
      if (!last || !last.length) return;
      var q = last[last.length - 1];
      labels.push({ p: p, y: Y(q[1]) });
    });
    var placed = [], order = [50, 97, 3, 90, 10, 75, 25];
    order.forEach(function (p) {
      var lb = labels.filter(function (l) { return l.p === p; })[0];
      if (!lb || lb.y < m.t - 2 || lb.y > m.t + ph + 2) return;
      if (placed.some(function (q) { return Math.abs(q.y - lb.y) < 11; })) return;
      placed.push(lb);
      var tt = svgEl('text', { x: m.l + pw + 4, y: lb.y + 3.5, class: 'gt-plabel' + (p === 50 ? ' gt-plabel-50' : '') }, svg);
      tt.textContent = G.ordinal(p);
    });

    // projection
    if (proj.length > 1) {
      var dp = proj.map(function (p, i) { return (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1); }).join(' ');
      svgEl('path', { d: dp, class: 'gt-proj', style: 'stroke:' + o.color }, plot);
      var pe = proj[proj.length - 1];
      svgEl('circle', { cx: X(pe.x), cy: Y(pe.y), r: 4, class: 'gt-proj-dot', style: 'stroke:' + o.color }, plot);
    }
    // the child's line and dots
    if (pts.length > 1) {
      var dl = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1); }).join(' ');
      svgEl('path', { d: dl, class: 'gt-line', style: 'stroke:' + o.color }, plot);
    }
    var dots = pts.map(function (p, i) {
      var g = svgEl('g', { class: 'gt-pt', tabindex: 0, 'aria-label': p.tip ? (p.tip.title + ', ' + (p.tip.lines || []).map(function (l) { return (l.strong ? l.strong + ' ' : '') + l.text; }).join(', ')) : '' }, svg);
      svgEl('circle', { cx: X(p.x), cy: Y(p.y), r: 4.5, class: 'gt-dot', style: 'fill:' + o.color }, g);
      g.addEventListener('focus', function () { show(i); });
      g.addEventListener('blur', hide);
      return g;
    });

    // interaction
    var tip = makeTooltip(wrap);
    var cross = svgEl('line', { y1: m.t, y2: m.t + ph, class: 'gt-cross', visibility: 'hidden' }, svg);
    svg.insertBefore(cross, svg.querySelector('.gt-pt'));
    var active = -1;
    function show(i) {
      var p = pts[i];
      if (!p || !p.tip) return;
      dots.forEach(function (d, j) { d.classList.toggle('on', j === i); });
      active = i;
      if (!o.xIsLength) { cross.setAttribute('x1', X(p.x)); cross.setAttribute('x2', X(p.x)); cross.setAttribute('visibility', 'visible'); }
      fillTip(tip, p.tip);
      placeTip(tip, wrap, X(p.x), Y(p.y));
    }
    function hide() {
      active = -1; tip.hidden = true; cross.setAttribute('visibility', 'hidden');
      dots.forEach(function (d) { d.classList.remove('on'); });
    }
    function nearest(evt) {
      var r = svg.getBoundingClientRect(), px = evt.clientX - r.left, py = evt.clientY - r.top, best = -1, bd = Infinity;
      pts.forEach(function (p, i) {
        var dx = X(p.x) - px, dy = o.xIsLength ? Y(p.y) - py : 0, dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < bd) { bd = dd; best = i; }
      });
      return bd <= (o.xIsLength ? 36 : 48) ? best : -1;
    }
    svg.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var i = nearest(e); if (i >= 0) { if (i !== active) show(i); } else hide();
    });
    svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hide(); });
    svg.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      var i = nearest(e); if (i >= 0) show(i); else hide();
    });
    return { svg: svg, count: pts.length };
  }

  /* Percentile history: every measure's percentile over time on one z-scale.
     o = { xMin, xMax, series:[{key,name,color,points:[{x,z}]}], rows:[{x, title, lines}] } */
  function zHistory(container, o) {
    container.textContent = '';
    var wrap = document.createElement('div');
    wrap.className = 'gt-chart';
    container.appendChild(wrap);
    var W = Math.max(280, Math.floor(container.clientWidth || 340));
    var H = Math.round(Math.min(440, Math.max(260, W * 0.7)));
    var m = { l: 42, r: 14, t: 10, b: 40 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b, ZMAX = 3.2;
    var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, class: 'gt-svg', role: 'img', 'aria-label': 'Percentile history chart' }, wrap);
    function X(x) { return m.l + (x - o.xMin) / (o.xMax - o.xMin) * pw; }
    function Y(z) { z = Math.max(-ZMAX, Math.min(ZMAX, z)); return m.t + (1 - (z + ZMAX) / (2 * ZMAX)) * ph; }
    var band = svgEl('path', { class: 'gt-band', d: 'M' + m.l + ' ' + Y(G.normInv(0.97)) + ' H' + (m.l + pw) + ' V' + Y(G.normInv(0.03)) + ' H' + m.l + ' Z' }, svg);
    band.setAttribute('aria-hidden', 'true');
    svgEl('path', { class: 'gt-band', d: 'M' + m.l + ' ' + Y(G.normInv(0.75)) + ' H' + (m.l + pw) + ' V' + Y(G.normInv(0.25)) + ' H' + m.l + ' Z' }, svg);
    var gGrid = svgEl('g', { class: 'gt-grid' }, svg);
    PCTS.forEach(function (p) {
      var y = Y(G.normInv(p / 100));
      svgEl('line', { x1: m.l, x2: m.l + pw, y1: y, y2: y, class: p === 50 ? 'gt-ref-50' : null }, gGrid);
      var t = svgEl('text', { x: m.l - 6, y: y + 3.5, class: 'gt-tick', 'text-anchor': 'end' }, svg);
      t.textContent = G.ordinal(p);
    });
    var xt = ageAxis(o.xMin, o.xMax), lastLabelX = -1e9;
    xt.ticks.forEach(function (tk) {
      var px = X(tk.x);
      svgEl('line', { x1: px, x2: px, y1: m.t, y2: m.t + ph }, gGrid);
      if (px - lastLabelX < 22) return;
      var tx = svgEl('text', { x: px, y: m.t + ph + 15, class: 'gt-tick', 'text-anchor': 'middle' }, svg);
      tx.textContent = tk.label; lastLabelX = px;
    });
    var xTitle = svgEl('text', { x: m.l + pw / 2, y: H - 6, class: 'gt-axis-title', 'text-anchor': 'middle' }, svg);
    xTitle.textContent = xt.title;
    svgEl('line', { x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph, class: 'gt-baseline' }, svg);
    o.series.forEach(function (s) {
      var pts = s.points.filter(function (p) { return p.x >= o.xMin && p.x <= o.xMax && isFinite(p.z); });
      if (pts.length > 1) {
        svgEl('path', { class: 'gt-line', style: 'stroke:' + s.color, d: pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.z).toFixed(1); }).join(' ') }, svg);
      }
      pts.forEach(function (p) { svgEl('circle', { cx: X(p.x), cy: Y(p.z), r: 4, class: 'gt-dot', style: 'fill:' + s.color }, svg); });
    });
    var tip = makeTooltip(wrap);
    var cross = svgEl('line', { y1: m.t, y2: m.t + ph, class: 'gt-cross', visibility: 'hidden' }, svg);
    var rows = (o.rows || []).filter(function (r) { return r.x >= o.xMin && r.x <= o.xMax; });
    function nearest(evt) {
      var r = svg.getBoundingClientRect(), px = evt.clientX - r.left, best = -1, bd = Infinity;
      rows.forEach(function (row, i) { var d = Math.abs(X(row.x) - px); if (d < bd) { bd = d; best = i; } });
      return bd <= 48 ? best : -1;
    }
    function show(i) {
      var row = rows[i];
      cross.setAttribute('x1', X(row.x)); cross.setAttribute('x2', X(row.x)); cross.setAttribute('visibility', 'visible');
      fillTip(tip, row);
      placeTip(tip, wrap, X(row.x), m.t + 20);
    }
    function hide() { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); }
    svg.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; var i = nearest(e); if (i >= 0) show(i); else hide(); });
    svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hide(); });
    svg.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') return; var i = nearest(e); if (i >= 0) show(i); else hide(); });
    return { svg: svg };
  }

  /* Tiny percentile sparkline for stat tiles */
  function spark(container, zs, color) {
    container.textContent = '';
    if (zs.length < 2) return;
    var W = Math.max(60, Math.floor(container.clientWidth || 96)), H = 26, svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, class: 'gt-spark', 'aria-hidden': 'true' }, container);
    var lo = Math.min(-1, Math.min.apply(null, zs)), hi = Math.max(1, Math.max.apply(null, zs));
    function X(i) { return 3 + i / (zs.length - 1) * (W - 6); }
    function Y(z) { return 3 + (1 - (z - lo) / (hi - lo)) * (H - 6); }
    svgEl('line', { x1: 0, x2: W, y1: Y(0), y2: Y(0), class: 'gt-spark-mid' }, svg);
    svgEl('path', { d: zs.map(function (z, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(z).toFixed(1); }).join(' '), class: 'gt-spark-line', style: 'stroke:' + color }, svg);
    svgEl('circle', { cx: X(zs.length - 1), cy: Y(zs[zs.length - 1]), r: 3, style: 'fill:' + color }, svg);
  }

  root.Charts = { growth: growth, zHistory: zHistory, spark: spark, unitLabel: unitLabel, toDisp: toDisp, PCTS: PCTS };
})(window);
