/* sync.js: local storage plus permanent storage in a private GitHub repo (every save is a commit). */
(function (root) {
  'use strict';
  var KEY_DOC = 'gt.doc', KEY_CONN = 'gt.conn', KEY_DIRTY = 'gt.dirty', KEY_LAST = 'gt.lastSync';
  var PATH = 'data.json';
  var COLS = ['children', 'measurements', 'milestones'];

  function lsGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { root.localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  function emptyDoc() { return { app: 'growth-tracker', schema: 1, savedAt: null, children: [], measurements: [], milestones: [] }; }
  function normalize(d) {
    var out = emptyDoc();
    if (d && typeof d === 'object') {
      out.savedAt = d.savedAt || null;
      COLS.forEach(function (k) { out[k] = Array.isArray(d[k]) ? d[k].filter(function (r) { return r && typeof r === 'object' && r.id; }) : []; });
    }
    return out;
  }
  function sortKeys(o) {
    var r = {};
    Object.keys(o).sort().forEach(function (k) { if (o[k] !== undefined) r[k] = o[k]; });
    return r;
  }
  function byId(a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }
  // Union by id; for the same id the newer updatedAt wins. Deleted records stay as tombstones so deletes sync too.
  function mergeDocs(a, b) {
    var out = emptyDoc();
    COLS.forEach(function (k) {
      var map = {};
      (a[k] || []).concat(b[k] || []).forEach(function (r) {
        if (!r || !r.id) return;
        var cur = map[r.id];
        if (!cur || String(r.updatedAt || '') > String(cur.updatedAt || '')) map[r.id] = r;
      });
      out[k] = Object.keys(map).sort().map(function (id) { return sortKeys(map[id]); });
    });
    out.savedAt = (a.savedAt || '') > (b.savedAt || '') ? a.savedAt : b.savedAt;
    return out;
  }
  function canon(d) {
    return JSON.stringify(COLS.map(function (k) { return (d[k] || []).slice().sort(byId).map(sortKeys); }));
  }
  function recordCount(d) { return COLS.reduce(function (n, k) { return n + (d[k] || []).length; }, 0); }

  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(String(b64 || '').replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function b64urlEncode(str) { return b64encode(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64urlDecode(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return b64decode(s); }

  function loadDoc() {
    var raw = lsGet(KEY_DOC);
    if (!raw) return emptyDoc();
    try { return normalize(JSON.parse(raw)); } catch (e) { return emptyDoc(); }
  }
  function loadConn() {
    var raw = lsGet(KEY_CONN);
    if (!raw) return null;
    try { var c = JSON.parse(raw); return c && c.owner && c.repo && c.token ? c : null; } catch (e) { return null; }
  }

  var listeners = {};
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }
  function emit(evt, arg) { (listeners[evt] || []).forEach(function (fn) { try { fn(arg); } catch (e) { console.error(e); } }); }

  var S = {
    doc: loadDoc(),
    conn: loadConn(),
    dirty: lsGet(KEY_DIRTY) === '1',
    status: 'local',
    error: null,
    lastSync: +(lsGet(KEY_LAST) || 0) || null,
    messages: [],
    on: on,
    emptyDoc: emptyDoc, mergeDocs: mergeDocs, normalize: normalize, recordCount: recordCount,
    b64urlEncode: b64urlEncode, b64urlDecode: b64urlDecode
  };

  function setStatus(st, err) {
    S.status = st; S.error = err || null;
    emit('status', st);
  }
  function saveLocal() {
    var ok = lsSet(KEY_DOC, JSON.stringify(S.doc));
    lsSet(KEY_DIRTY, S.dirty ? '1' : '0');
    return ok;
  }

  /* ---- changes from the app ---- */
  var timer = null;
  S.change = function (mutator, message) {
    mutator(S.doc);
    S.doc.savedAt = new Date().toISOString();
    S.dirty = true;
    if (message) S.messages.push(message);
    saveLocal();
    emit('data');
    if (S.conn) { clearTimeout(timer); timer = setTimeout(function () { S.sync(); }, 900); setStatus('pending'); }
    else setStatus('local');
  };
  S.replaceAll = function (doc) {
    S.doc = mergeDocs(emptyDoc(), normalize(doc));
    S.dirty = true; saveLocal(); emit('data');
    if (S.conn) S.sync();
  };
  S.mergeIn = function (doc, message) {
    S.change(function (d) {
      var m = mergeDocs(d, normalize(doc));
      COLS.forEach(function (k) { d[k] = m[k]; });
    }, message || 'Import data');
  };

  /* ---- GitHub API ---- */
  function api(method, path, body) {
    var h = { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + S.conn.token, 'X-GitHub-Api-Version': '2022-11-28' };
    if (body) h['Content-Type'] = 'application/json';
    return fetch('https://api.github.com' + path, { method: method, headers: h, cache: 'no-store', body: body ? JSON.stringify(body) : undefined });
  }
  function repoPath() { return '/repos/' + encodeURIComponent(S.conn.owner) + '/' + encodeURIComponent(S.conn.repo); }
  function httpError(res, what) {
    var e = new Error(what || ('GitHub answered ' + res.status));
    e.status = res.status;
    if (res.status === 401) { e.code = 'auth'; e.message = 'GitHub did not accept the key. It may have expired or been deleted.'; }
    else if (res.status === 403) {
      if (res.headers.get('x-ratelimit-remaining') === '0') { e.code = 'rate'; e.message = 'GitHub is limiting requests right now. It will retry shortly.'; }
      else { e.code = 'perm'; e.message = 'The key is not allowed to write to the data repo. It needs Contents: Read and write.'; }
    } else if (res.status === 404) { e.code = 'repo'; e.message = 'Cannot find the data repo, or the key is not allowed to see it.'; }
    return e;
  }
  function getRemote() {
    return api('GET', repoPath() + '/contents/' + PATH).then(function (res) {
      if (res.status === 404) {
        return api('GET', repoPath()).then(function (r2) {
          if (!r2.ok) throw httpError(r2);
          return { doc: null, sha: null };
        });
      }
      if (!res.ok) throw httpError(res);
      return res.json().then(function (j) {
        var text = b64decode(j.content), parsed;
        try { parsed = JSON.parse(text); } catch (e) {
          var err = new Error('The data file on GitHub is not valid JSON, so nothing was overwritten. Fix or restore it from the repo history.');
          err.code = 'bad-remote'; throw err;
        }
        return { doc: normalize(parsed), sha: j.sha };
      });
    });
  }
  function putRemote(doc, sha, message) {
    var body = { message: message, content: b64encode(JSON.stringify(doc, null, 2) + '\n') };
    if (sha) body.sha = sha;
    return api('PUT', repoPath() + '/contents/' + PATH, body).then(function (res) {
      if (res.status === 409 || res.status === 422) return { conflict: true };
      if (!res.ok) throw httpError(res);
      return res.json().then(function (j) { return { sha: j.content && j.content.sha }; });
    });
  }
  function commitMessage() {
    var msgs = S.messages.slice();
    if (!msgs.length) return 'Sync growth data';
    var uniq = msgs.filter(function (m, i) { return msgs.indexOf(m) === i; });
    if (uniq.length === 1) return uniq[0];
    return uniq.length + ' changes: ' + uniq.slice(0, 3).join('; ') + (uniq.length > 3 ? '; ...' : '');
  }

  var syncing = false, again = false;
  S.sync = function () {
    if (!S.conn) { setStatus('local'); return Promise.resolve(false); }
    if (syncing) { again = true; return Promise.resolve(false); }
    if (root.navigator && root.navigator.onLine === false) { setStatus('offline'); return Promise.resolve(false); }
    syncing = true; setStatus('syncing');
    var attempt = 0;
    function round() {
      attempt++;
      return getRemote().then(function (remote) {
        var merged = remote.doc ? mergeDocs(remote.doc, S.doc) : mergeDocs(emptyDoc(), S.doc);
        if (canon(merged) !== canon(S.doc)) { S.doc = merged; saveLocal(); emit('data'); }
        var needPush = remote.doc ? canon(merged) !== canon(remote.doc) : recordCount(merged) > 0;
        if (!needPush) return true;
        merged.savedAt = new Date().toISOString();
        return putRemote(merged, remote.sha, commitMessage()).then(function (res) {
          if (res.conflict) {
            if (attempt >= 4) { var e = new Error('Another device kept saving at the same moment. Try again.'); e.code = 'conflict'; throw e; }
            return round();
          }
          return true;
        });
      });
    }
    return round().then(function () {
      S.dirty = false; S.messages = []; saveLocal();
      S.lastSync = Date.now(); lsSet(KEY_LAST, String(S.lastSync));
      setStatus('synced');
      return true;
    }).catch(function (e) {
      if (e && e.name === 'TypeError') setStatus('offline', 'No connection right now. Changes are kept on this device and will save when you are back online.');
      else setStatus('error', (e && e.message) || 'Sync failed.');
      if (e && e.code === 'rate') setTimeout(function () { S.sync(); }, 60000);
      return false;
    }).then(function (r) {
      syncing = false;
      if (again) { again = false; return S.sync(); }
      return r;
    });
  };

  /* ---- connection management ---- */
  S.connect = function (conn) {
    S.conn = { owner: String(conn.owner).trim(), repo: String(conn.repo).trim(), token: String(conn.token).trim() };
    lsSet(KEY_CONN, JSON.stringify(S.conn));
    emit('conn');
    return S.sync();
  };
  S.disconnect = function () {
    S.conn = null; lsDel(KEY_CONN); emit('conn'); setStatus('local');
  };
  // Checks the repo exists, is private and readable with this key
  S.checkRepo = function () {
    if (!S.conn) return Promise.reject(new Error('Not connected'));
    return api('GET', repoPath()).then(function (res) {
      if (!res.ok) throw httpError(res);
      return res.json();
    }).then(function (j) { return { private: !!j.private, url: j.html_url, push: j.permissions ? !!j.permissions.push : null }; });
  };
  S.connectLink = function (base) {
    if (!S.conn) return null;
    return base + '#connect=' + b64urlEncode(JSON.stringify({ o: S.conn.owner, r: S.conn.repo, t: S.conn.token }));
  };
  S.parseConnect = function (text) {
    var m = /#connect=([A-Za-z0-9_\-]+)/.exec(String(text || ''));
    if (!m) return null;
    try {
      var j = JSON.parse(b64urlDecode(m[1]));
      if (j && j.o && j.r && j.t) return { owner: j.o, repo: j.r, token: j.t };
    } catch (e) { /* not ours */ }
    return null;
  };

  if (S.conn) setStatus(S.dirty ? 'pending' : 'synced');
  root.addEventListener('online', function () { if (S.conn) S.sync(); });
  root.document && root.document.addEventListener('visibilitychange', function () {
    if (root.document.visibilityState === 'visible' && S.conn && (!S.lastSync || Date.now() - S.lastSync > 20000)) S.sync();
  });

  root.Store = S;
})(window);
