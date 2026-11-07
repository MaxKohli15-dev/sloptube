const C = window.SLOPTUBE;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const enc = p => p.split('/').map(encodeURIComponent).join('/');
const RAW = p => `https://raw.githubusercontent.com/${C.owner}/${C.repo}/${C.branch}/${enc(p)}`;
const API = `https://api.github.com/repos/${C.owner}/${C.repo}`;
const VEXT = /\.(mp4|webm|mov|m4v|ogg)$/i;
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const today = () => new Date().toISOString().slice(0, 10);

// ---------- Daten: index.json (wird von einer GitHub Action im Video-Repo gebaut) ----------
// raw.githubusercontent.com hat KEIN 60-pro-Stunde-Limit, darum wird nur diese eine Datei geladen.
let DB = null;
async function loadDB(force) {
  if (DB && !force) return DB;
  const r = await fetch(RAW('index.json') + '?v=' + Math.floor(Date.now() / 30000), { cache: 'no-store' });
  if (!r.ok) throw new Error(`Video-Repo ${C.owner}/${C.repo} nicht gefunden (index.json fehlt).`);
  const j = await r.json();
  // frisch hochgeladene Videos (noch nicht im Index) aus diesem Browser ergänzen
  const pending = store.get('pending', []).filter(p => Date.now() - p.t < 15 * 60e3 && !j.videos.some(v => v.path === p.path));
  store.set('pending', pending);
  const videos = [...pending.map(p => p.video), ...j.videos].map(v => ({
    ...v, id: v.path, src: RAW(v.path), thumbUrl: v.thumb ? RAW(v.thumb) : null,
  }));
  const channels = j.channels || {};
  for (const v of videos) channels[v.channel] ||= { name: v.channel, videos: 1, joined: v.date };
  for (const c of Object.values(channels)) {
    c.avatarUrl = c.avatar ? RAW(c.avatar) : null;
    c.bannerUrl = c.banner ? RAW(c.banner) : null;
  }
  DB = { videos, channels };
  renderSubs();
  return DB;
}

// ---------- kleine Helfer ----------
const color = s => { let h = 0; for (const c of s) h = h * 31 + c.charCodeAt(0) | 0; return `hsl(${Math.abs(h) % 360},55%,45%)`; };
const chLink = (n, tab = '') => `#/channel/${encodeURIComponent(n)}${tab ? '/' + tab : ''}`;
const link = v => `#/watch/${encodeURIComponent(v.id)}`;
const jsStr = s => esc(JSON.stringify(s));
function avInner(name) {
  const c = DB?.channels[name];
  return c?.avatarUrl ? `<img src="${c.avatarUrl}" alt="">` : esc(name[0]);
}
const av = (name, cls = '') => `<a href="${chLink(name)}" class="avatar ${cls}" style="background:${color(name)}" onclick="event.stopPropagation()">${avInner(name)}</a>`;
function ago(d) {
  const days = Math.floor((Date.now() - new Date(d + 'T00:00')) / 864e5);
  if (days < 1) return 'heute';
  if (days === 1) return 'gestern';
  if (days < 7) return `vor ${days} Tagen`;
  if (days < 30) return `vor ${days / 7 | 0} Woche${days < 14 ? '' : 'n'}`;
  if (days < 365) return `vor ${days / 30 | 0} Monat${days < 60 ? '' : 'en'}`;
  return `vor ${days / 365 | 0} Jahr${days < 730 ? '' : 'en'}`;
}
const thumbHtml = v => `<div class="thumb">${v.thumbUrl ? `<img src="${v.thumbUrl}" loading="lazy">` : `<video src="${v.src}#t=1" preload="metadata" muted></video>`}</div>`;
const subs = () => store.get('subs', []);
const myChannel = () => store.get('channel', '');
function subBtn(n) {
  if (n === myChannel()) return `<a class="btn-blue" href="#/studio">Kanal anpassen</a>`;
  const on = subs().includes(n);
  return `<button class="sub-btn ${on ? 'on' : ''}" onclick="toggleSub(${jsStr(n)})">${on ? 'Abonniert' : 'Abonnieren'}</button>`;
}
function renderSubs() {
  const s = subs();
  $('#subslist').innerHTML = s.length
    ? s.map(n => `<a class="ch" href="${chLink(n)}"><span class="avatar" style="background:${color(n)}">${avInner(n)}</span>${esc(n)}</a>`).join('')
    : `<div class="foot" style="padding-top:0">Abonniere Kanäle, um sie hier zu sehen.</div>`;
}

function grid(list, empty = 'Noch keine Videos da.', showCh = true) {
  if (!list.length) return `<div class="empty">${empty}</div>`;
  return `<div class="grid">${list.map(v => `
    <div class="vcard" onclick="location.hash=${jsStr(link(v))}">${thumbHtml(v)}
      <div class="vmeta">${showCh ? av(v.channel) : ''}<div><h3 class="vtitle">${esc(v.title)}</h3>
      <div class="small">${showCh ? `<a href="${chLink(v.channel)}" onclick="event.stopPropagation()">${esc(v.channel)}</a><br>` : ''}${ago(v.date)}</div></div></div>
    </div>`).join('')}</div>`;
}

// ---------- Seiten ----------
const routes = {
  async ''() { $('#app').innerHTML = `<h2 class="section-title">Empfohlen</h2>` + grid((await loadDB()).videos, 'Noch keine Videos da. Lade das erste hoch!'); },
  async trending() {
    $('#app').innerHTML = `<h2 class="section-title">🔥 Neu heute</h2>` + grid((await loadDB()).videos.filter(v => v.date === today()), 'Heute wurde noch nichts hochgeladen.');
  },
  async subs() {
    const s = subs();
    $('#app').innerHTML = `<h2 class="section-title">Abos</h2>` + grid((await loadDB()).videos.filter(v => s.includes(v.channel)), 'Du hast noch keine Kanäle abonniert.');
  },
  async channels() {
    const list = Object.values((await loadDB()).channels).sort((a, b) => b.videos - a.videos);
    $('#app').innerHTML = `<h2 class="section-title">Kanäle</h2>` + (list.length ? `<div class="grid">${list.map(c => `
      <div style="text-align:center;padding:16px;background:#fff">
        <a href="${chLink(c.name)}"><span class="avatar big" style="background:${color(c.name)};margin:0 auto 12px;width:104px;height:104px">${avInner(c.name)}</span>
        <b>${esc(c.name)}</b></a><div class="small" style="margin:4px 0 12px">${c.videos} Videos</div>${subBtn(c.name)}</div>`).join('')}</div>`
      : '<div class="empty">Noch keine Kanäle.</div>');
  },
  async search(q) {
    q = decodeURIComponent(q || '');
    $('.search input').value = q;
    const l = q.toLowerCase(), db = await loadDB();
    const chs = Object.values(db.channels).filter(c => c.name.toLowerCase().includes(l));
    $('#app').innerHTML = `<h2 class="section-title">Ergebnisse für „${esc(q)}“</h2>` +
      chs.map(c => `<div class="owner" style="background:#fff;padding:16px;margin-bottom:16px">${av(c.name, 'big')}
        <div style="flex:1"><a href="${chLink(c.name)}" style="font-size:18px">${esc(c.name)}</a><div class="small">${c.videos} Videos</div>
        <div class="small">${esc((c.about || '').slice(0, 120))}</div></div>${subBtn(c.name)}</div>`).join('') +
      grid(db.videos.filter(v => (v.title + ' ' + v.desc).toLowerCase().includes(l)), chs.length ? '' : 'Keine Ergebnisse.');
  },

  // ----- Kanalseite wie YouTube 2019: Banner, Avatar, Abo-Knopf, Tabs -----
  async channel(arg) {
    const [rawName, tab = 'featured', sort = 'new'] = arg.split('/');
    const name = decodeURIComponent(rawName), db = await loadDB(), c = db.channels[name];
    if (!c) throw new Error('Kanal nicht gefunden');
    let vids = db.videos.filter(v => v.channel === name);
    const tabLink = (t, label) => `<a href="${chLink(name, t)}" class="${tab === t ? 'on' : ''}">${label}</a>`;
    let body = '';
    if (tab === 'featured') {
      const f = vids[0];
      body = (f ? `<div class="featured"><div class="player"><video src="${f.src}" controls preload="metadata"></video></div>
          <div><a href="${link(f)}" style="font-size:18px">${esc(f.title)}</a><div class="small" style="margin:8px 0">${ago(f.date)}</div>
          <div class="desc small">${esc((f.desc || '').slice(0, 300))}</div></div></div>` : '') +
        `<h2 class="section-title">Uploads <a class="small" href="${chLink(name, 'videos')}" style="color:var(--blue);margin-left:12px">▶ ALLE WIEDERGEBEN</a></h2>` +
        grid(vids.slice(1, 13), f ? 'Keine weiteren Videos.' : 'Dieser Kanal hat noch keine Videos.', false);
    } else if (tab === 'videos') {
      if (sort === 'old') vids = vids.slice().reverse();
      body = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 class="section-title" style="margin:0">Uploads</h2>
        <select onchange="location.hash=${jsStr(chLink(name, 'videos'))}+'/'+this.value">
          <option value="new" ${sort === 'new' ? 'selected' : ''}>Neueste zuerst</option>
          <option value="old" ${sort === 'old' ? 'selected' : ''}>Älteste zuerst</option></select></div>` +
        grid(vids, 'Dieser Kanal hat noch keine Videos.', false);
    } else {
      body = `<div class="about"><div><h3 style="font-weight:400">Beschreibung</h3><div class="desc">${esc(c.about) || '<span class="small">Keine Beschreibung.</span>'}</div>
        ${(c.links || []).length ? `<h3 style="font-weight:400;margin-top:32px">Links</h3>${c.links.map(l => /^https?:\/\//.test(l) ? `<div><a style="color:var(--blue)" target="_blank" rel="noopener" href="${esc(l)}">${esc(l)}</a></div>` : '').join('')}` : ''}</div>
        <div class="stats"><h3 style="font-weight:400">Statistiken</h3>
          <div>Beigetreten: ${c.joined ? new Date(c.joined).toLocaleDateString('de', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'}</div>
          <div>${c.videos} Videos</div></div></div>`;
    }
    $('#app').innerHTML = `<div style="margin:-24px -24px 0"><div class="banner" style="${c.bannerUrl ? `background-image:url('${c.bannerUrl}')` : `background:linear-gradient(120deg,${color(name)},#282828)`}"></div></div>
      <div class="chwrap"><div class="chead">${av(name, 'big')}<div class="info"><h1>${esc(name)}</h1><div class="small">${c.videos} Videos</div></div>${subBtn(name)}</div>
      <div class="tabs">${tabLink('featured', 'Übersicht')}${tabLink('videos', 'Videos')}${tabLink('about', 'Kanalinfo')}</div></div>` + body;
  },

  async watch(id) {
    id = decodeURIComponent(id);
    const db = await loadDB(), v = db.videos.find(x => x.id === id);
    if (!v) throw new Error('Video nicht gefunden.');
    const others = db.videos.filter(x => x !== v);
    const next = others.filter(o => o.channel === v.channel).concat(others.filter(o => o.channel !== v.channel));
    $('#app').innerHTML = `<div class="watch"><div class="primary">
      <div class="player"><video src="${v.src}" controls autoplay></video></div>
      <h1 class="wtitle">${esc(v.title)}</h1>
      <div class="wbar"><div class="small">Veröffentlicht am ${new Date(v.date).toLocaleDateString('de')}</div>
        <div class="likes">
          <button onclick="navigator.clipboard.writeText(location.href);this.textContent='✔ Kopiert'">↪ Teilen</button>
          <button onclick="window.open(${jsStr(v.src)})">⬇ Download</button>
        </div></div>
      <div class="owner">${av(v.channel)}
        <div style="flex:1"><a href="${chLink(v.channel)}" style="font-weight:500">${esc(v.channel)}</a>
          <div class="small">${db.channels[v.channel].videos} Videos</div>
          <div class="desc">${esc(v.desc) || '<span class="small">Keine Beschreibung</span>'}</div></div>
        ${subBtn(v.channel)}
      </div>
      <div class="comments" id="comments"></div>
    </div>
    <div class="secondary"><div class="upnext"><span>Nächstes Video</span><span class="small">AUTOPLAY ●</span></div>
      ${next.slice(0, 20).map(o => `<div class="side-item" onclick="location.hash=${jsStr(link(o))}">${thumbHtml(o)}
        <div><h3 class="vtitle">${esc(o.title)}</h3><div class="small">${esc(o.channel)}<br>${ago(o.date)}</div></div></div>`).join('') || '<div class="small">Keine weiteren Videos</div>'}
    </div></div>`;
    if (next[0]) $('.player video').onended = () => location.hash = link(next[0]);
    const g = C.giscus;
    if (g && g.repo) {
      const s = document.createElement('script');
      Object.entries({ src: 'https://giscus.app/client.js', 'data-repo': g.repo, 'data-repo-id': g.repoId, 'data-category': g.category,
        'data-category-id': g.categoryId, 'data-mapping': 'specific', 'data-term': v.id, 'data-lang': 'de', 'data-theme': 'light', crossorigin: 'anonymous' })
        .forEach(([k, val]) => s.setAttribute(k, val));
      s.async = true;
      $('#comments').innerHTML = '<h3>Kommentare</h3>';
      $('#comments').appendChild(s);
    }
  },

  // ----- Upload -----
  async upload() {
    if (!myChannel() || !store.get('key', '')) { location.hash = '#/studio'; return; }
    $('#app').innerHTML = `<form class="form" id="up"><h2>Video hochladen</h2>
      <div class="owner" style="padding-top:0">${av(myChannel())}<div><b>${esc(myChannel())}</b><div class="small">Wird gespeichert als ${today()}/${esc(myChannel())}/Titel</div></div></div>
      <label>Videodatei (mp4/webm, max. 40 MB)</label><input type="file" name="file" accept="video/*" required>
      <label>Titel</label><input name="title" maxlength="100" required>
      <label>Beschreibung (optional)</label><textarea name="desc" rows="4"></textarea>
      <button class="primary">Veröffentlichen</button>
      <div class="progress"><div></div></div><div class="small" id="st"></div><div class="err"></div></form>`;
    $('#up').onsubmit = async e => {
      e.preventDefault();
      const f = e.target, file = f.file.files[0], btn = f.querySelector('button'), st = $('#st'), bar = f.querySelector('.progress div'), err = f.querySelector('.err');
      const title = clean(f.title.value), channel = myChannel();
      if (!title) return err.textContent = 'Titel nötig';
      if (file.size > 40 * 1048576) return err.textContent = 'Datei zu groß (max. 40 MB)';
      btn.disabled = true; err.textContent = '';
      const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
      try {
        st.textContent = 'Erstelle Vorschaubild…'; bar.style.width = '3%';
        const thumb = await makeImage(file, 480, 270);
        st.textContent = 'Lade Video hoch…';
        const res = await send('/video', { channel, title, ext }, file, p => {
          bar.style.width = (3 + p * 80) + '%';
          if (p >= 1) st.textContent = 'Wird bei GitHub gespeichert… (kann kurz dauern)';
        });
        if (thumb) { st.textContent = 'Lade Vorschaubild hoch…'; await send('/video/extra', { channel, title, kind: 'thumb' }, thumb); }
        if (f.desc.value.trim()) await send('/video/extra', { channel, title, kind: 'desc' }, new Blob([f.desc.value]));
        bar.style.width = '100%'; st.textContent = 'Fertig! Für alle anderen sichtbar in ca. 1 Minute.';
        store.set('pending', [...store.get('pending', []), { t: Date.now(), path: res.path,
          video: { path: res.path, date: res.path.slice(0, 10), channel, title, thumb: thumb ? `${res.base}.jpg` : null, desc: f.desc.value } }]);
        DB = null;
        setTimeout(() => location.hash = '#/watch/' + encodeURIComponent(res.path), 1200);
      } catch (e2) { err.textContent = e2.message; btn.disabled = false; }
    };
  },

  // ----- Kanal erstellen / anmelden / anpassen (ohne GitHub, mit Kanal-Schlüssel) -----
  async studio() {
    const name = myChannel(), key = store.get('key', '');
    if (!name || !key) {
      $('#app').innerHTML = `<form class="form" id="cr"><h2>Kanal erstellen</h2>
        <p class="small">Kein Konto nötig. Du bekommst einen <b>Kanal-Schlüssel</b>, mit dem nur du in deinen Kanal hochladen kannst. Er wird in diesem Browser gespeichert.</p>
        <label>Kanalname</label><input name="name" maxlength="40" required>
        <button class="primary">Kanal erstellen</button><div class="err"></div></form>
        <form class="form" id="li" style="margin-top:24px"><h2>Ich habe schon einen Kanal</h2>
        <p class="small">Auf einem anderen Gerät? Gib deinen Kanalnamen und deinen Kanal-Schlüssel ein.</p>
        <label>Kanalname</label><input name="name" maxlength="40" required>
        <label>Kanal-Schlüssel</label><input name="key" type="password" required>
        <button class="primary">Anmelden</button><div class="err"></div></form>`;
      $('#cr').onsubmit = async e => {
        e.preventDefault();
        const f = e.target, n = clean(f.name.value);
        f.querySelector('button').disabled = true;
        try {
          const r = await send('/channel/create', { channel: n });
          store.set('channel', n); store.set('key', r.key); DB = null;
          route();
        } catch (e2) { f.querySelector('.err').textContent = e2.message; f.querySelector('button').disabled = false; }
      };
      $('#li').onsubmit = async e => {
        e.preventDefault();
        const f = e.target, n = clean(f.name.value);
        try {
          await send('/channel/check', { channel: n }, null, null, f.key.value.trim());
          store.set('channel', n); store.set('key', f.key.value.trim());
          location.hash = chLink(n);
        } catch (e2) { f.querySelector('.err').textContent = e2.message; }
      };
      return;
    }
    const db = await loadDB().catch(() => ({ channels: {} }));
    const c = db.channels[name] || {};
    $('#app').innerHTML = `<form class="form" id="st"><h2>Kanal anpassen: ${esc(name)}</h2>
      <div style="background:#fff8e1;border:1px solid #ffe082;padding:12px;margin-bottom:8px">
        <b>Dein Kanal-Schlüssel</b> – gut aufheben! Ohne ihn kommst du auf anderen Geräten nicht mehr in deinen Kanal.<br>
        <code style="word-break:break-all;user-select:all">${esc(key)}</code>
        <button type="button" class="btn-blue" style="margin-left:8px;padding:4px 8px" onclick="navigator.clipboard.writeText(${jsStr(key)});this.textContent='Kopiert'">Kopieren</button></div>
      <label>Profilbild</label><input type="file" name="avatar" accept="image/*">
      <label>Kanalbanner (am besten breit, z. B. 2560×1440)</label><input type="file" name="banner" accept="image/*">
      <label>Kanalbeschreibung</label><textarea name="about" rows="4">${esc(c.about || '')}</textarea>
      <label>Links (einer pro Zeile, mit https://)</label><textarea name="links" rows="2">${esc((c.links || []).join('\n'))}</textarea>
      <button class="primary">Speichern</button>
      <button type="button" class="primary" style="background:#fff;color:#c00;border:1px solid #c00;margin-left:8px" onclick="if(confirm('Abmelden? Ohne Kanal-Schlüssel kommst du nicht wieder rein.')){localStorage.removeItem('key');localStorage.removeItem('channel');route()}">Abmelden</button>
      <div class="small" id="ss"></div><div class="err"></div></form>`;
    $('#st').onsubmit = async e => {
      e.preventDefault();
      const f = e.target, err = f.querySelector('.err'), ss = $('#ss'), btn = f.querySelector('button');
      btn.disabled = true; err.textContent = '';
      try {
        if (f.avatar.files[0]) { ss.textContent = 'Lade Profilbild hoch…'; await send('/channel/update', { channel: name, kind: 'avatar' }, await makeImage(f.avatar.files[0], 400, 400, true)); }
        if (f.banner.files[0]) { ss.textContent = 'Lade Banner hoch…'; await send('/channel/update', { channel: name, kind: 'banner' }, await makeImage(f.banner.files[0], 2048, 330, true)); }
        ss.textContent = 'Speichere Kanalinfo…';
        const links = f.links.value.split('\n').map(s => s.trim()).filter(Boolean);
        await send('/channel/update', { channel: name, kind: 'info' }, new Blob([JSON.stringify({ about: f.about.value, links })]));
        ss.textContent = 'Gespeichert! Änderungen sind in ca. 1 Minute für alle sichtbar.';
        setTimeout(() => location.hash = chLink(name), 1500);
      } catch (e2) { err.textContent = e2.message; ss.textContent = ''; btn.disabled = false; }
    };
  },
};
const clean = s => s.trim().replace(/[\\/:*?"<>|#%]/g, '').replace(/\s+/g, ' ').replace(/^[._]+/, '');

// ---------- Upload-Server (Cloudflare Worker) ----------
function send(path, params, body, onProg, keyOverride) {
  return new Promise((ok, fail) => {
    const x = new XMLHttpRequest();
    x.open('POST', C.uploadUrl.replace(/\/$/, '') + path + '?' + new URLSearchParams(params));
    const key = keyOverride || store.get('key', '');
    if (key) x.setRequestHeader('X-Channel-Key', key);
    if (onProg) x.upload.onprogress = ev => onProg(ev.loaded / ev.total);
    x.onload = () => {
      let j = {}; try { j = JSON.parse(x.responseText); } catch {}
      x.status < 300 ? ok(j) : fail(new Error(j.error || 'Fehler ' + x.status));
    };
    x.onerror = () => fail(new Error('Upload-Server nicht erreichbar'));
    x.send(body || null);
  });
}


// Bild aus Video (Vorschaubild) oder aus Bilddatei (Avatar/Banner, cover=true) erzeugen
function makeImage(file, W, H, cover) {
  return new Promise(ok => {
    const isImg = file.type.startsWith('image/');
    const el = document.createElement(isImg ? 'img' : 'video');
    const url = URL.createObjectURL(file);
    let finished = false;
    const done = b => { if (finished) return; finished = true; URL.revokeObjectURL(url); ok(b); };
    const draw = () => {
      const w0 = el.videoWidth || el.naturalWidth, h0 = el.videoHeight || el.naturalHeight;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'); g.fillRect(0, 0, W, H);
      const r = (cover ? Math.max : Math.min)(W / w0, H / h0) || 1, w = w0 * r, h = h0 * r;
      g.drawImage(el, (W - w) / 2, (H - h) / 2, w, h);
      c.toBlob(done, 'image/jpeg', 0.85);
    };
    el.onerror = () => done(null);
    if (isImg) el.onload = draw;
    else { el.muted = true; el.preload = 'auto'; el.onloadedmetadata = () => el.currentTime = Math.min(2, el.duration / 3 || 0); el.onseeked = draw; }
    el.src = url;
    setTimeout(() => done(null), 10000);
  });
}

function toggleSub(n) { const s = subs(); store.set('subs', s.includes(n) ? s.filter(x => x !== n) : [...s, n]); renderSubs(); route(); }

$('#hright').innerHTML = `<a class="icon-btn" href="#/upload" title="Hochladen" style="display:grid;place-items:center">📹</a>
  <a href="#/studio" id="meav" class="avatar" title="Mein Kanal" style="background:#888">👤</a>`;
function renderMe() {
  const n = myChannel(), a = $('#meav');
  if (n) { a.href = chLink(n); a.style.background = color(n); a.innerHTML = avInner(n); }
}
async function route() {
  const [, name = '', ...rest] = location.hash.split('/');
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.r === name));
  window.scrollTo(0, 0);
  try { await (routes[name] || routes[''])(rest.join('/')); }
  catch (e) { $('#app').innerHTML = `<div class="empty">😕 ${esc(e.message)}</div>`; }
  renderMe();
}
window.onhashchange = route;
renderSubs();
route();
