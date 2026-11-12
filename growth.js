/* growth.js: growth math, reference lookup and plain-language insights. No DOM code here. */
(function (root) {
  'use strict';
  var D = root.GROWTH_DATA;
  var DPM = 30.4375; // days per month, the WHO and CDC convention

  /* ---------- numeric helpers ---------- */
  function erfc(x) {
    // Numerical Recipes erfcc, fractional error below 1.2e-7
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
      t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  function normCdf(z) { return 0.5 * erfc(-z / Math.SQRT2); }
  function normInv(p) {
    // Acklam's algorithm
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var pl = 0.02425, q, r;
    if (p < pl) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > 1 - pl) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  function lmsZ(y, L, M, S) {
    if (!(y > 0)) return null;
    return Math.abs(L) < 1e-9 ? Math.log(y / M) / S : (Math.pow(y / M, L) - 1) / (L * S);
  }
  function lmsY(z, L, M, S) {
    if (Math.abs(L) < 1e-9) return M * Math.exp(S * z);
    var base = 1 + L * S * z;
    if (base <= 0) return null;
    return M * Math.pow(base, 1 / L);
  }
  // WHO adjusted z-score: beyond +/-3 SD the distance is measured in fixed SD23 units (WHO 2006, chapter 7)
  function whoAdjZ(y, L, M, S) {
    var z = lmsZ(y, L, M, S);
    if (z === null) return null;
    if (z > 3) {
      var sd3p = lmsY(3, L, M, S), sd2p = lmsY(2, L, M, S);
      return 3 + (y - sd3p) / (sd3p - sd2p);
    }
    if (z < -3) {
      var sd3n = lmsY(-3, L, M, S), sd2n = lmsY(-2, L, M, S);
      return -3 + (y - sd3n) / (sd2n - sd3n);
    }
    return z;
  }
  // Value at a z for a WHO adjusted indicator (inverse of whoAdjZ), used for drawing and projections
  function whoAdjY(z, L, M, S) {
    if (z > 3) { var a = lmsY(3, L, M, S), b = lmsY(2, L, M, S); return a + (z - 3) * (a - b); }
    if (z < -3) { var c = lmsY(-3, L, M, S), e = lmsY(-2, L, M, S); return c + (z + 3) * (e - c); }
    return lmsY(z, L, M, S);
  }

  // Student t CDF through the regularized incomplete beta function (for INTERGROWTH skew t)
  function gammaln(x) {
    var cof = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, tmp = x + 5.5, ser = 1.000000000190015;
    tmp -= (x + 0.5) * Math.log(tmp);
    for (var j = 0; j < 6; j++) ser += cof[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
  function betacf(a, b, x) {
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d; var h = d;
    for (var m = 1; m <= 200; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d; var del = d * c; h *= del;
      if (Math.abs(del - 1) < 3e-12) break;
    }
    return h;
  }
  function betai(a, b, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function tCdf(t, nu) {
    var p = 0.5 * betai(nu / 2, 0.5, nu / (nu + t * t));
    return t > 0 ? 1 - p : p;
  }
  function st3Cdf(y, mu, sigma, nu, tau) {
    var k = 1 + nu * nu;
    if (y < mu) return 2 / k * tCdf(nu * (y - mu) / sigma, tau);
    return 1 / k + 2 * nu * nu / k * (tCdf((y - mu) / (sigma * nu), tau) - 0.5);
  }
  function st3Quantile(p, mu, sigma, nu, tau) {
    var lo = mu - 30 * sigma, hi = mu + 30 * sigma;
    for (var i = 0; i < 80; i++) {
      var mid = (lo + hi) / 2;
      if (st3Cdf(mid, mu, sigma, nu, tau) < p) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* ---------- reference curves ---------- */
  function interp(curve, x) {
    var xs = curve.x, n = xs.length;
    if (!(x >= xs[0] - 1e-6 && x <= xs[n - 1] + 1e-6)) return null;
    if (x <= xs[0]) return { L: curve.L[0], M: curve.M[0], S: curve.S[0] };
    if (x >= xs[n - 1]) return { L: curve.L[n - 1], M: curve.M[n - 1], S: curve.S[n - 1] };
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
    var t = (x - xs[lo]) / (xs[hi] - xs[lo]);
    return {
      L: curve.L[lo] + (curve.L[hi] - curve.L[lo]) * t,
      M: curve.M[lo] + (curve.M[hi] - curve.M[lo]) * t,
      S: curve.S[lo] + (curve.S[hi] - curve.S[lo]) * t
    };
  }
  function interpSigma(curve, x) {
    if (!curve.sx) return null;
    var xs = curve.sx, n = xs.length;
    if (x <= xs[0]) return curve.sig[0];
    if (x >= xs[n - 1]) return curve.sig[n - 1];
    var i = 0; while (i < n - 2 && xs[i + 1] < x) i++;
    var t = (x - xs[i]) / (xs[i + 1] - xs[i]);
    return curve.sig[i] + (curve.sig[i + 1] - curve.sig[i]) * t;
  }

  var IND = {
    wfa: { name: 'Weight', long: 'Weight for age', kind: 'weight', x: 'age', adj: true },
    lhfa: { name: 'Length', long: 'Length/height for age', kind: 'length', x: 'age', adj: false },
    hcfa: { name: 'Head', long: 'Head circumference for age', kind: 'head', x: 'age', adj: false },
    wfl: { name: 'Weight for length', long: 'Weight for length/height', kind: 'weight', x: 'length', adj: true },
    bfa: { name: 'BMI', long: 'BMI for age', kind: 'bmi', x: 'age', adj: true },
    acfa: { name: 'Arm', long: 'Arm circumference for age', kind: 'arm', x: 'age', adj: true },
    tsfa: { name: 'Triceps skinfold', long: 'Triceps skinfold for age', kind: 'skin', x: 'age', adj: true },
    ssfa: { name: 'Subscapular skinfold', long: 'Subscapular skinfold for age', kind: 'skin', x: 'age', adj: true }
  };

  // Returns the curve (with label) used for an indicator at an age (days) and, for weight for length, a length (cm).
  function pickCurve(std, ind, sex, ageDays) {
    var W = D.who, C = D.cdc, m = ageDays / DPM;
    if (std === 'who') {
      switch (ind) {
        case 'wfa': return ageDays <= 3653 ? { c: W.wfa[sex], src: ageDays <= 1856 ? 'WHO 2006' : 'WHO 2007' } : null;
        case 'lhfa': return ageDays < 731 ? { c: W.lfa[sex], src: 'WHO 2006', lying: true } : (m <= 228.5 ? { c: W.hfa[sex], src: ageDays <= 1856 ? 'WHO 2006' : 'WHO 2007' } : null);
        case 'hcfa': return ageDays <= 1856 ? { c: W.hcfa[sex], src: 'WHO 2006' } : null;
        case 'bfa': return ageDays < 731 ? { c: W.bfa_l[sex], src: 'WHO 2006' } : (m <= 228.5 ? { c: W.bfa_h[sex], src: ageDays <= 1856 ? 'WHO 2006' : 'WHO 2007' } : null);
        case 'wfl': return ageDays <= 1856 ? (ageDays < 731 ? { c: W.wfl[sex], src: 'WHO 2006', lying: true } : { c: W.wfh[sex], src: 'WHO 2006' }) : null;
        case 'acfa': return (ageDays >= 91 && ageDays <= 1856) ? { c: W.acfa[sex], src: 'WHO 2006' } : null;
        case 'tsfa': return (ageDays >= 91 && ageDays <= 1856) ? { c: W.tsfa[sex], src: 'WHO 2006' } : null;
        case 'ssfa': return (ageDays >= 91 && ageDays <= 1856) ? { c: W.ssfa[sex], src: 'WHO 2006' } : null;
      }
      return null;
    }
    switch (ind) {
      case 'wfa': return m < 24 ? { c: C.wfa_inf[sex], src: 'CDC 2000' } : (m <= 240 ? { c: C.wfa[sex], src: 'CDC 2000' } : null);
      case 'lhfa': return m < 24 ? { c: C.lfa_inf[sex], src: 'CDC 2000', lying: true } : (m <= 240 ? { c: C.hfa[sex], src: 'CDC 2000' } : null);
      case 'hcfa': return m <= 36 ? { c: C.hcfa[sex], src: 'CDC 2000' } : null;
      case 'bfa': return (m >= 24 && m <= 240.5) ? { c: C.bfa[sex], src: 'CDC 2000' } : null;
    }
    return null;
  }
  function hasStd(std, ind) { return std === 'who' || ['wfa', 'lhfa', 'hcfa', 'bfa'].indexOf(ind) >= 0; }

  // Length/height standardised to the way the chart expects it at this age (0.7 cm rule)
  function adjLen(cm, position, ageDays) {
    if (!(cm > 0)) return null;
    if (ageDays < 731 && position === 'standing') return cm + 0.7;
    if (ageDays >= 731 && position === 'lying') return cm - 0.7;
    return cm;
  }

  function zFor(std, ind, sex, ageDays, value, xLen) {
    if (!(value > 0)) return null;
    var pc = pickCurve(std, ind, sex, ageDays);
    if (!pc) return null;
    var x = ind === 'wfl' ? xLen : ageDays;
    if (ind === 'wfl' && !(xLen > 0)) return null;
    var lms = interp(pc.c, x);
    if (!lms) return null;
    var z;
    if (std === 'who' && IND[ind].adj) z = whoAdjZ(value, lms.L, lms.M, lms.S);
    else z = lmsZ(value, lms.L, lms.M, lms.S);
    if (z === null || !isFinite(z)) return null;
    var pct = normCdf(z) * 100;
    // CDC 2022 extended BMI above the 95th percentile
    if (std === 'cdc' && ind === 'bfa' && z > 1.6448536) {
      var sig = interpSigma(pc.c, ageDays);
      if (sig) {
        var p95 = lmsY(1.6448536, lms.L, lms.M, lms.S);
        pct = 90 + 10 * normCdf((value - p95) / sig);
        if (pct >= 100) pct = 99.9999;
        z = normInv(pct / 100);
      }
    }
    return { z: z, pct: pct, src: pc.src };
  }

  // Value on a reference curve at z (for drawing percentile lines and projections)
  function valueAt(std, ind, sex, x, z, ageDaysForWfl) {
    var age = ind === 'wfl' ? (ageDaysForWfl == null ? 0 : ageDaysForWfl) : x;
    var pc = pickCurve(std, ind, sex, age);
    if (!pc) return null;
    var lms = interp(pc.c, x);
    if (!lms) return null;
    return (std === 'who' && IND[ind].adj) ? whoAdjY(z, lms.L, lms.M, lms.S) : lmsY(z, lms.L, lms.M, lms.S);
  }

  // Range of x for which a reference exists
  function xRange(std, ind, sex, ageDays) {
    var W = D.who, C = D.cdc;
    if (ind === 'wfl') {
      var c = ageDays < 731 ? W.wfl[sex] : W.wfh[sex];
      return [c.x[0], c.x[c.x.length - 1]];
    }
    if (std === 'who') {
      if (ind === 'wfa') return [0, 3652.5];
      if (ind === 'lhfa' || ind === 'bfa') return [0, 228 * DPM];
      if (ind === 'hcfa') return [0, 1856];
      return [91, 1856];
    }
    if (ind === 'hcfa') return [0, 36 * DPM];
    if (ind === 'bfa') return [24 * DPM, 240 * DPM];
    return [0, 240 * DPM];
  }

  /* ---------- INTERGROWTH-21st newborn size ---------- */
  function igZ(kind, sex, gaDays, value) {
    if (!(value > 0) || !(gaDays >= 168) || gaDays > 300) return null;
    var I = D.ig, pct;
    if (gaDays < 231) {
      var e = I.early[kind], w = gaDays / 7;
      var mu = e.b[0] + e.b[1] * (e.sqrt ? Math.sqrt(w) : w) + e.b[2] * (sex === 'M' ? 1 : 0);
      var y = e.log ? Math.log(value) : value;
      var z0 = (y - mu) / e.sd;
      return { z: z0, pct: normCdf(z0) * 100, src: 'INTERGROWTH-21st (very preterm)' };
    }
    var t = I[kind][sex], i = Math.round(gaDays) - t.ga0;
    if (i < 0 || i >= t.mu.length) return null;
    pct = st3Cdf(value, t.mu[i], t.sigma[i], t.nu, t.tau) * 100;
    pct = Math.min(Math.max(pct, 1e-6), 100 - 1e-6);
    return { z: normInv(pct / 100), pct: pct, src: 'INTERGROWTH-21st' };
  }
  function igValue(kind, sex, gaDays, pct) {
    var I = D.ig;
    if (gaDays < 231) {
      var e = I.early[kind], w = gaDays / 7;
      var mu = e.b[0] + e.b[1] * (e.sqrt ? Math.sqrt(w) : w) + e.b[2] * (sex === 'M' ? 1 : 0);
      var y = mu + e.sd * normInv(pct / 100);
      return e.log ? Math.exp(y) : y;
    }
    var t = I[kind][sex], i = Math.round(gaDays) - t.ga0;
    if (i < 0 || i >= t.mu.length) return null;
    return st3Quantile(pct / 100, t.mu[i], t.sigma[i], t.nu, t.tau);
  }

  /* ---------- dates and ages ---------- */
  function parseDate(s) {
    if (!s) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (!m) return null;
    return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  }
  function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
  function addDays(s, n) { var d = new Date(parseDate(s) + n * 86400000); return d.toISOString().slice(0, 10); }
  function addMonths(s, n) {
    var t = parseDate(s), d = new Date(t), y = d.getUTCFullYear(), mo = d.getUTCMonth() + n, day = d.getUTCDate();
    var last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, mo, Math.min(day, last))).toISOString().slice(0, 10);
  }
  function ageParts(dob, date) {
    var a = new Date(parseDate(dob)), b = new Date(parseDate(date));
    if (b < a) return null;
    var y = b.getUTCFullYear() - a.getUTCFullYear(), m = b.getUTCMonth() - a.getUTCMonth(), d = b.getUTCDate() - a.getUTCDate();
    if (d < 0) { m -= 1; d += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); }
    if (m < 0) { y -= 1; m += 12; }
    return { y: y, m: m, d: d, totalMonths: y * 12 + m };
  }
  function fmtAge(dob, date) {
    var days = daysBetween(dob, date);
    if (days < 0) return 'before birth';
    if (days === 0) return 'birth';
    if (days < 14) return days + (days === 1 ? ' day' : ' days');
    var p = ageParts(dob, date);
    if (p.totalMonths < 2) { var w = Math.floor(days / 7), dd = days % 7; return w + ' wk' + (dd ? ' ' + dd + ' d' : ''); }
    if (p.totalMonths < 24) return p.totalMonths + ' mo' + (p.d ? ' ' + p.d + ' d' : '');
    return p.y + ' y' + (p.m ? ' ' + p.m + ' mo' : '');
  }
  function fmtAgeDays(days) {
    if (days < 14) return Math.round(days) + ' days';
    if (days < 61) return Math.round(days / 7) + ' weeks';
    var mo = days / DPM;
    if (mo < 24) return (Math.round(mo * 2) / 2) + ' months';
    var yrs = mo / 12;
    return (Math.round(yrs * 2) / 2) + ' years';
  }

  /* ---------- units ---------- */
  var KG_PER_LB = 0.45359237, CM_PER_IN = 2.54;
  function trim(n, dp) { var s = n.toFixed(dp); return dp > 0 ? s.replace(/\.?0+$/, '') : s; }
  function lbOz(kg) {
    var totalOz = kg / KG_PER_LB * 16;
    var r = Math.round(totalOz * 10) / 10, lb = Math.floor(r / 16), oz = r - lb * 16;
    if (oz >= 15.95) { lb += 1; oz = 0; }
    return { lb: lb, oz: Math.round(oz * 10) / 10 };
  }
  function fmtWeight(kg, units) {
    if (kg == null || !isFinite(kg)) return '';
    if (units === 'metric') return trim(kg, kg < 10 ? 2 : 1) + ' kg';
    var p = lbOz(kg);
    if (p.lb >= 40) return trim(kg / KG_PER_LB, 1) + ' lb';
    return p.lb + ' lb ' + trim(p.oz, 1) + ' oz';
  }
  function fmtWeightDelta(kg, units) {
    var sign = kg < 0 ? '−' : '+', a = Math.abs(kg);
    if (units === 'metric') return sign + (a < 1 ? Math.round(a * 1000) + ' g' : trim(a, 2) + ' kg');
    var p = lbOz(a);
    return sign + (p.lb ? p.lb + ' lb ' : '') + trim(p.oz, 1) + ' oz';
  }
  function fmtLen(cm, units, dp) {
    if (cm == null || !isFinite(cm)) return '';
    if (units === 'metric') return trim(cm, dp == null ? 1 : dp) + ' cm';
    return trim(cm / CM_PER_IN, dp == null ? 2 : dp) + ' in';
  }
  function fmtLenDelta(cm, units) {
    var sign = cm < 0 ? '−' : '+', a = Math.abs(cm);
    return sign + (units === 'metric' ? trim(a, 1) + ' cm' : trim(a / CM_PER_IN, 2) + ' in');
  }
  function fmtValue(kind, v, units) {
    if (v == null || !isFinite(v)) return '';
    if (kind === 'weight') return fmtWeight(v, units);
    if (kind === 'length' || kind === 'head' || kind === 'arm') return fmtLen(v, units, kind === 'length' ? undefined : (units === 'metric' ? 1 : 2));
    if (kind === 'bmi') return trim(v, 1);
    if (kind === 'skin') return trim(v, 1) + ' mm';
    return String(v);
  }
  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function pctText(p) {
    if (p == null || !isFinite(p)) return '';
    if (p < 0.1) return 'below 0.1st';
    if (p > 99.9) return 'above 99.9th';
    if (p < 1) { var a = Math.round(p * 10) / 10; return (a === 0.1 ? '0.1st' : a.toFixed(1) + 'th'); }
    if (p > 99) { var b = Math.floor(p * 10) / 10; return b.toFixed(1) + 'th'; }
    return ordinal(Math.round(p));
  }

  /* ---------- per-measurement analysis ---------- */
  function gaDaysOf(child) {
    if (!child || child.gaWeeks == null || child.gaWeeks === '') return null;
    return (+child.gaWeeks) * 7 + (+child.gaDays || 0);
  }
  function ageForCharts(child, chronoDays) {
    var ga = gaDaysOf(child);
    if (ga != null && ga < 259 && child.correctAge !== false && chronoDays < 731) {
      return { days: chronoDays - (280 - ga), corrected: true };
    }
    return { days: chronoDays, corrected: false };
  }

  function analyze(m, child) {
    var chrono = daysBetween(child.dob, m.date);
    var a = ageForCharts(child, chrono), age = a.days;
    var out = { chrono: chrono, age: age, corrected: a.corrected, z: { who: {}, cdc: {} }, v: {} };
    if (age < 0) { out.beforeTerm = true; return out; }
    var len = adjLen(+m.lengthCm, m.position || (age < 731 ? 'lying' : 'standing'), age);
    var w = +m.weightKg || null;
    out.v = { wfa: w, lhfa: len, hcfa: +m.headCm || null, wfl: w, bfa: (w && len) ? w / Math.pow(len / 100, 2) : null, acfa: +m.armCm || null, tsfa: +m.tricepsMm || null, ssfa: +m.subscapMm || null };
    out.lenAdj = len;
    ['who', 'cdc'].forEach(function (std) {
      Object.keys(IND).forEach(function (ind) {
        if (!hasStd(std, ind)) return;
        var val = out.v[ind];
        if (!val) return;
        var r = zFor(std, ind, child.sex, age, val, ind === 'wfl' ? len : null);
        if (r) out.z[std][ind] = r;
      });
    });
    return out;
  }

  // Which standard to use for a child at an age when the preference is 'auto' (US practice: WHO under 2, CDC from 2)
  function autoStd(pref, ageDays) {
    if (pref === 'who' || pref === 'cdc') return pref;
    return ageDays < 730.5 ? 'who' : 'cdc';
  }

  /* ---------- percentile lines ---------- */
  var MAJOR = [5, 10, 25, 50, 75, 90, 95];
  var MAJOR_Z = MAJOR.map(function (p) { return normInv(p / 100); });
  function linesBetween(z1, z2) {
    var lo = Math.min(z1, z2), hi = Math.max(z1, z2), n = 0;
    MAJOR_Z.forEach(function (z) { if (z > lo && z < hi) n++; });
    return n;
  }
  function zBand(z) {
    if (z < -2) return 'low';
    if (z < -1) return 'lowish';
    if (z <= 1) return 'mid';
    if (z <= 2) return 'highish';
    return 'high';
  }

  /* ---------- well-child schedule (AAP Bright Futures) ---------- */
  var VISITS = [
    { label: 'newborn', d: 4 }, { label: '1 month', m: 1 }, { label: '2 month', m: 2 }, { label: '4 month', m: 4 },
    { label: '6 month', m: 6 }, { label: '9 month', m: 9 }, { label: '12 month', m: 12 }, { label: '15 month', m: 15 },
    { label: '18 month', m: 18 }, { label: '2 year', m: 24 }, { label: '2½ year', m: 30 }
  ];
  for (var yy = 3; yy <= 21; yy++) VISITS.push({ label: yy + ' year', m: yy * 12 });
  function nextVisit(dob, today) {
    for (var i = 0; i < VISITS.length; i++) {
      var v = VISITS[i], date = v.d ? addDays(dob, v.d) : addMonths(dob, v.m);
      if (daysBetween(today, date) >= 0) return { label: v.label, date: date };
    }
    return null;
  }

  /* ---------- WHO motor milestones (windows of achievement, 1st to 99th percentile, months) ---------- */
  var MILESTONES = [
    { key: 'sit', name: 'Sitting without support', lo: 3.8, hi: 9.2 },
    { key: 'standAssist', name: 'Standing with assistance', lo: 4.8, hi: 11.4 },
    { key: 'crawl', name: 'Hands-and-knees crawling', lo: 5.2, hi: 13.5, note: 'About 4 in 100 babies skip crawling entirely, and that is normal.' },
    { key: 'walkAssist', name: 'Walking with assistance', lo: 5.9, hi: 13.7 },
    { key: 'standAlone', name: 'Standing alone', lo: 6.9, hi: 16.9 },
    { key: 'walkAlone', name: 'Walking alone', lo: 8.2, hi: 17.6 }
  ];

  root.Growth = {
    DPM: DPM, IND: IND, MAJOR: MAJOR, MILESTONES: MILESTONES, VISITS: VISITS,
    KG_PER_LB: KG_PER_LB, CM_PER_IN: CM_PER_IN,
    normCdf: normCdf, normInv: normInv, lmsZ: lmsZ, lmsY: lmsY, whoAdjZ: whoAdjZ, tCdf: tCdf, st3Cdf: st3Cdf,
    interp: interp, pickCurve: pickCurve, hasStd: hasStd, zFor: zFor, valueAt: valueAt, xRange: xRange, adjLen: adjLen,
    igZ: igZ, igValue: igValue, gaDaysOf: gaDaysOf, ageForCharts: ageForCharts, analyze: analyze, autoStd: autoStd,
    parseDate: parseDate, daysBetween: daysBetween, addDays: addDays, addMonths: addMonths, ageParts: ageParts,
    fmtAge: fmtAge, fmtAgeDays: fmtAgeDays, fmtWeight: fmtWeight, fmtWeightDelta: fmtWeightDelta, fmtLen: fmtLen,
    fmtLenDelta: fmtLenDelta, fmtValue: fmtValue, lbOz: lbOz, pctText: pctText, ordinal: ordinal, trim: trim,
    linesBetween: linesBetween, zBand: zBand, nextVisit: nextVisit
  };
})(typeof window !== 'undefined' ? window : globalThis);
