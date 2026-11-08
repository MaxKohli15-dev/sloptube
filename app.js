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
  // eigene Änderungen der letzten 15 Min. (Upload/Bearbeiten/Löschen) sofort anzeigen,
  // weil GitHub die index.json ein paar Minuten zwischenspeichert
  const ops = store.get('ops', []).filter(o => Date.now() - o.t < 15 * 60e3);
  store.set('ops', ops);
  let list = j.videos;
  for (const o of ops) {
    if (o.del) list = list.filter(v => v.path !== o.del);
    if (o.add) list = [o.add, ...list.filter(v => v.path !== o.add.path)];
  }
  const videos = list.map(v => ({
    ...v, id: v.path, src: RAW(v.path), thumbUrl: v.thumb ? RAW(v.thumb) : null,
  }));
  const channels = j.channels || {};
  for (const c of Object.values(channels)) c.videos = 0;
  for (const v of videos) { channels[v.channel] ||= { name: v.channel, joined: v.date, videos: 0 }; channels[v.channel].videos++; }
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
  if (n === myChannel()) return `<a class="btn-blue" href="#/studio/customize">Kanal anpassen</a>`;
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
    $('#app').innerHTML = `<h2 class="section-title">Neu heute</h2>` + grid((await loadDB()).videos.filter(v => v.date === today()), 'Heute wurde noch nichts hochgeladen.');
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
        `<h2 class="section-title">Uploads <a class="small" href="${chLink(name, 'videos')}" style="color:var(--blue);margin-left:12px">ALLE WIEDERGEBEN</a></h2>` +
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
          <button onclick="navigator.clipboard.writeText(location.href);this.textContent='Kopiert'">Teilen</button>
          <button onclick="window.open(${jsStr(v.src)})">Download</button>
        </div></div>
      <div class="owner">${av(v.channel)}
        <div style="flex:1"><a href="${chLink(v.channel)}" style="font-weight:500">${esc(v.channel)}</a>
          <div class="small">${db.channels[v.channel].videos} Videos</div>
          <div class="desc">${esc(v.desc) || '<span class="small">Keine Beschreibung</span>'}</div></div>
        ${subBtn(v.channel)}
      </div>
      <div class="comments" id="comments"></div>
    </div>
    <div class="secondary"><div class="upnext"><span>Nächstes Video</span><span class="small">AUTOPLAY</span></div>
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

  // ===================== SLOPTUBE STUDIO =====================
  // #/studio            → Dashboard
  // #/studio/content    → Inhalte (Videotabelle)   …/content/upload öffnet den Upload-Dialog
  // #/studio/edit/PFAD  → Videodetails bearbeiten
  // #/studio/customize  → Kanalanpassung
  async studio(arg) {
    const name = myChannel(), key = store.get('key', '');
    if (!name || !key) return studioLogin();
    const [t0, ...rest] = arg.split('/'), tab = t0 || 'dashboard';
    const db = await loadDB().catch(() => ({ videos: [], channels: {} }));
    const mine = db.videos.filter(v => v.channel === name);
    const c = db.channels[name] || { name, videos: 0 };
    const navItem = (t, icon, label) => `<a href="#/studio${t === 'dashboard' ? '' : '/' + t}" class="${tab === t ? 'on' : ''}">${icon}<span>${label}</span></a>`;
    const shell = (title, body, actions = '') => {
      $('#app').innerHTML = `<div class="st">
        <aside class="st-side">
          <a href="${chLink(name)}" class="st-me" title="Kanal ansehen"><span class="avatar" style="background:${color(name)}">${avInner(name)}</span>
            <b>Dein Kanal</b><span class="small">${esc(name)}</span></a>
          ${navItem('dashboard', '', 'Dashboard')}${navItem('content', '', 'Inhalte')}${navItem('customize', '', 'Anpassung')}
          <a href="${chLink(name)}"><span>Kanal ansehen</span></a>
          <a href="#/"><span>Zurück zu SlopTube</span></a>
        </aside>
        <section class="st-main"><div class="st-head"><h1>${title}</h1><div>${actions}
          <button class="st-create" onclick="openUpload()">ERSTELLEN</button></div></div>${body}</section></div>`;
    };

    if (tab === 'dashboard') {
      const last = mine[0];
      const size = mine.reduce((s, v) => s + (v.size || 0), 0);
      shell('Kanal-Dashboard', `<div class="st-cards">
        <div class="st-card">${last ? `<h3>Neuestes Video</h3>${thumbHtml(last)}
            <p style="font-weight:500;margin:12px 0 4px">${esc(last.title)}</p><div class="small">Veröffentlicht ${ago(last.date)}</div>
            <div style="margin-top:16px;display:flex;gap:8px"><a class="st-link" href="#/studio/edit/${encodeURIComponent(last.id)}">VIDEO BEARBEITEN</a><a class="st-link" href="${link(last)}">ANSEHEN</a></div>`
          : `<div style="text-align:center;padding:24px 0"><p>Möchtest du dein erstes Video sehen? Lade eins hoch!</p>
            <button class="st-primary" onclick="openUpload()">VIDEOS HOCHLADEN</button></div>`}</div>
        <div class="st-card"><h3>Kanalanalysen</h3>
          <div class="small">Videos insgesamt</div><div class="st-big">${mine.length}</div>
          <hr><div class="st-row"><span>Speicher belegt</span><b>${fmtSize(size)}</b></div>
          <div class="st-row"><span>Neuestes Upload</span><b>${last ? ago(last.date) : '–'}</b></div>
          <div class="st-row"><span>Kanal erstellt</span><b>${c.joined ? new Date(c.joined).toLocaleDateString('de') : '–'}</b></div>
          <div class="st-row"><span>Abonniert (in diesem Browser)</span><b>${subs().includes(name) ? 'ja' : 'nein'}</b></div>
          <a class="st-link" href="#/studio/content" style="display:inline-block;margin-top:12px">ZU DEN INHALTEN</a></div>
        <div class="st-card"><h3>Neuigkeiten aus dem Studio</h3>
          <p><b>Willkommen im SlopTube Studio!</b></p>
          <p class="small">Hier verwaltest du alles: Videos hochladen, Titel, Beschreibung und Thumbnail ändern, Videos löschen und deinen Kanal mit Profilbild und Banner gestalten.</p>
          <p class="small">Tipp: Änderungen siehst du sofort, alle anderen nach ein paar Minuten.</p>
          <hr><h3 style="margin-top:12px">Dein Kanal-Schlüssel</h3>
          <p class="small">Damit meldest du dich auf anderen Geräten an. Gut aufheben!</p>
          <button class="st-link" onclick="navigator.clipboard.writeText(${jsStr(key)});this.textContent='KOPIERT'">SCHLÜSSEL KOPIEREN</button></div>
      </div>`);
    }

    else if (tab === 'content') {
      shell('Kanalinhalte', `<div class="st-tabs"><span class="on">Uploads</span></div>
        ${mine.length ? `<table class="st-table"><thead><tr><th>Video</th><th>Sichtbarkeit</th><th>Datum</th><th>Größe</th><th></th></tr></thead><tbody>
        ${mine.map(v => `<tr>
          <td><div class="st-vid"><a href="#/studio/edit/${encodeURIComponent(v.id)}">${thumbHtml(v)}</a>
            <div><a href="#/studio/edit/${encodeURIComponent(v.id)}" style="font-weight:500">${esc(v.title)}</a>
            <div class="small st-desc">${esc(v.desc || 'Beschreibung hinzufügen')}</div>
            <div class="st-acts"><a href="#/studio/edit/${encodeURIComponent(v.id)}" title="Details">Bearbeiten</a><a href="${link(v)}" title="Auf SlopTube ansehen">Ansehen</a>
            <button title="Löschen" onclick="deleteVideo(${jsStr(v.id)})">Löschen</button></div></div></div></td>
          <td>Öffentlich</td><td>${new Date(v.date).toLocaleDateString('de')}<div class="small">Veröffentlicht</div></td>
          <td>${fmtSize(v.size)}</td><td></td></tr>`).join('')}</tbody></table>`
        : `<div class="empty" style="background:#fff">Keine Inhalte verfügbar<br><br><button class="st-primary" onclick="openUpload()">VIDEOS HOCHLADEN</button></div>`}`);
      if (rest[0] === 'upload') openUpload();
    }

    else if (tab === 'edit') {
      const path = decodeURIComponent(rest.join('/')), v = mine.find(x => x.id === path);
      if (!v) throw new Error('Video nicht gefunden');
      shell('Videodetails', `<form id="ed" class="st-edit">
        <div class="st-card" style="flex:1">
          <label>Titel (erforderlich)</label><input name="title" value="${esc(v.title)}" maxlength="100" required>
          <label>Beschreibung</label><textarea name="desc" rows="10" placeholder="Erzähl den Zuschauern etwas über dein Video">${esc(v.desc || '')}</textarea>
          <label>Thumbnail</label>
          <div class="small" style="margin-bottom:8px">Lade ein Bild hoch, das zeigt, worum es in deinem Video geht.</div>
          <div class="st-thumbs">
            <label class="st-upthumb">Thumbnail hochladen<input type="file" name="thumb" accept="image/*" hidden onchange="previewThumb(this)"></label>
            <div class="thumb" id="thumbprev">${v.thumbUrl ? `<img src="${v.thumbUrl}">` : `<video src="${v.src}#t=1" preload="metadata" muted></video>`}</div>
          </div>
          <div class="small" id="es" style="margin-top:16px"></div><div class="err"></div>
        </div>
        <div class="st-card st-prev"><div class="player"><video src="${v.src}" controls preload="metadata"></video></div>
          <div class="small" style="margin-top:12px">Videolink</div><a href="${link(v)}" style="color:var(--blue);word-break:break-all">${esc(location.origin + location.pathname + link(v))}</a>
          <div class="small" style="margin-top:12px">Dateiname</div><div>${esc(v.path.split('/').pop())}</div>
          <div class="small" style="margin-top:12px">Sichtbarkeit</div><div>Öffentlich</div>
          <button type="button" class="st-link" style="color:#c00;margin-top:16px" onclick="deleteVideo(${jsStr(v.id)})">VIDEO LÖSCHEN</button>
        </div></form>`,
        `<a class="st-link" href="#/studio/content">ZURÜCK</a> <button class="st-primary" form="ed">SPEICHERN</button>`);
      $('#ed').onsubmit = async e => {
        e.preventDefault();
        const f = e.target, es = $('#es'), err = f.querySelector('.err');
        const title = clean(f.title.value);
        if (!title) return err.textContent = 'Titel erforderlich';
        err.textContent = '';
        let updated = { ...v };
        try {
          if (title !== v.title) {
            es.textContent = 'Titel wird geändert…';
            const r = await send('/video/rename', { channel: name, path: v.path, title });
            const base = r.path.replace(/\.[^.]+$/, '');
            updated = { ...updated, path: r.path, title, thumb: v.thumb ? `${base}.${v.thumb.split('.').pop()}` : null };
          }
          if (f.desc.value !== (v.desc || '')) {
            es.textContent = 'Beschreibung wird gespeichert…';
            await send('/video/extra', { channel: name, path: updated.path, kind: 'desc' }, new Blob([f.desc.value]));
            updated.desc = f.desc.value;
          }
          if (f.thumb.files[0]) {
            es.textContent = 'Thumbnail wird hochgeladen…';
            await send('/video/extra', { channel: name, path: updated.path, kind: 'thumb' }, await makeImage(f.thumb.files[0], 1280, 720, true));
            updated.thumb = updated.path.replace(/\.[^.]+$/, '.jpg');
          }
          const plain = ({ path, date, channel, title, thumb, desc, size }) => ({ path, date, channel, title, thumb, desc, size });
          store.set('ops', [...store.get('ops', []), { t: Date.now(), del: v.path }, { t: Date.now(), add: plain(updated) }]);
          DB = null;
          es.textContent = 'Gespeichert';
          if (updated.path !== v.path) location.hash = '#/studio/edit/' + encodeURIComponent(updated.path);
        } catch (e2) { err.textContent = e2.message; es.textContent = ''; }
      };
    }

    else if (tab === 'customize') {
      shell('Kanalanpassung', `<div class="st-tabs"><span class="on">Branding & Infos</span></div>
        <form id="cu" class="st-card" style="max-width:860px">
          <h3>Profilbild</h3><div class="st-brand"><span class="avatar" style="width:120px;height:120px;font-size:48px;background:${color(name)}" id="avprev">${avInner(name)}</span>
            <div class="small">Dein Profilbild erscheint neben deinen Videos und Kommentaren. Am besten quadratisch, mind. 98×98 Pixel.<br><br>
            <label class="st-link">HOCHLADEN<input type="file" name="avatar" accept="image/*" hidden onchange="previewImg(this,'#avprev')"></label></div></div>
          <h3>Bannerbild</h3><div class="st-brand"><div id="bnprev" class="st-bannerprev" style="${c.bannerUrl ? `background-image:url('${c.bannerUrl}')` : `background:linear-gradient(120deg,${color(name)},#282828)`}"></div>
            <div class="small">Wird oben auf deiner Kanalseite angezeigt. Am besten 2048×1152 Pixel.<br><br>
            <label class="st-link">HOCHLADEN<input type="file" name="banner" accept="image/*" hidden onchange="previewImg(this,'#bnprev',true)"></label></div></div>
          <h3>Name</h3><div class="small">${esc(name)} <i>(der Kanalname kann nicht geändert werden)</i></div>
          <h3>Beschreibung</h3><textarea name="about" rows="5" placeholder="Erzähl den Zuschauern etwas über deinen Kanal">${esc(c.about || '')}</textarea>
          <h3>Links</h3><textarea name="links" rows="3" placeholder="https://… (einer pro Zeile)">${esc((c.links || []).join('\n'))}</textarea>
          <h3>Kanal-URL</h3><a style="color:var(--blue);word-break:break-all" href="${chLink(name)}">${esc(location.origin + location.pathname + chLink(name))}</a>
          <div class="small" id="cs" style="margin-top:16px"></div><div class="err"></div>
          <hr><h3>Abmelden</h3><div class="small">Ohne deinen Kanal-Schlüssel kommst du danach nicht mehr in deinen Kanal!</div>
          <button type="button" class="st-link" style="color:#c00" onclick="if(confirm('Wirklich abmelden?')){localStorage.removeItem('key');localStorage.removeItem('channel');route()}">ABMELDEN</button>
        </form>`, `<a class="st-link" href="${chLink(name)}">KANAL ANSEHEN</a> <button class="st-primary" form="cu">VERÖFFENTLICHEN</button>`);
      $('#cu').onsubmit = async e => {
        e.preventDefault();
        const f = e.target, cs = $('#cs'), err = f.querySelector('.err');
        err.textContent = '';
        try {
          if (f.avatar.files[0]) { cs.textContent = 'Profilbild wird hochgeladen…'; await send('/channel/update', { channel: name, kind: 'avatar' }, await makeImage(f.avatar.files[0], 400, 400, true)); }
          if (f.banner.files[0]) { cs.textContent = 'Banner wird hochgeladen…'; await send('/channel/update', { channel: name, kind: 'banner' }, await makeImage(f.banner.files[0], 2048, 330, true)); }
          cs.textContent = 'Infos werden gespeichert…';
          const links = f.links.value.split('\n').map(s => s.trim()).filter(Boolean);
          await send('/channel/update', { channel: name, kind: 'info' }, new Blob([JSON.stringify({ about: f.about.value, links })]));
          cs.textContent = 'Veröffentlicht. Für alle sichtbar in ein paar Minuten.';
        } catch (e2) { err.textContent = e2.message; cs.textContent = ''; }
      };
    }
    else location.hash = '#/studio';
  },
};

// ----- Studio: Anmelden / Kanal erstellen -----
function studioLogin() {
  $('#app').innerHTML = `<div style="text-align:center;margin:24px 0 8px"><span class="logo" style="justify-content:center;font-size:28px"><span class="play"><i></i></span>Studio</span>
    <p class="small">Dein Ort für alles rund um deinen Kanal. Kein Konto nötig.</p></div>
    <form class="form" id="cr"><h2>Kanal erstellen</h2>
    <p class="small">Du bekommst einen <b>Kanal-Schlüssel</b>, mit dem nur du deinen Kanal verwalten kannst. Er wird in diesem Browser gespeichert.</p>
    <label>Kanalname</label><input name="name" maxlength="40" required>
    <button class="primary">Kanal erstellen</button><div class="err"></div></form>
    <form class="form" id="li" style="margin-top:24px"><h2>Ich habe schon einen Kanal</h2>
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
      location.hash = '#/studio/customize';
    } catch (e2) { f.querySelector('.err').textContent = e2.message; f.querySelector('button').disabled = false; }
  };
  $('#li').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, n = clean(f.name.value);
    try {
      await send('/channel/check', { channel: n }, null, null, f.key.value.trim());
      store.set('channel', n); store.set('key', f.key.value.trim());
      route();
    } catch (e2) { f.querySelector('.err').textContent = e2.message; }
  };
}

// ----- Studio: Upload-Dialog -----
function openUpload() {
  const channel = myChannel();
  document.querySelector('.st-modal')?.remove();
  const m = document.createElement('div');
  m.className = 'st-modal';
  m.innerHTML = `<form class="st-dialog" id="up">
    <div class="st-dhead"><b>Videos hochladen</b><button type="button" class="icon-btn" onclick="this.closest('.st-modal').remove()">×</button></div>
    <div id="step1" class="st-drop">
      
      <p>Videodateien zum Hochladen hierher ziehen und ablegen</p>
      <p class="small">Deine Videos sind sofort öffentlich. Max. 40 MB.</p>
      <label class="st-primary" style="display:inline-block">DATEIEN AUSWÄHLEN<input type="file" name="file" accept="video/*" hidden></label>
    </div>
    <div id="step2" hidden style="padding:24px">
      <label>Titel (erforderlich)</label><input name="title" maxlength="100" required>
      <label>Beschreibung</label><textarea name="desc" rows="5" placeholder="Erzähl den Zuschauern etwas über dein Video"></textarea>
      <div class="small" style="margin-top:12px">Speicherort: ${today()}/${esc(channel)}/<i>Titel</i> · Das Thumbnail wird automatisch erstellt und kann später geändert werden.</div>
      <div class="progress"><div></div></div><div class="small" id="st"></div><div class="err"></div>
      <div style="text-align:right;margin-top:16px"><button class="st-primary">VERÖFFENTLICHEN</button></div>
    </div></form>`;
  document.body.appendChild(m);
  const f = $('#up'), drop = $('#step1');
  const pick = file => {
    if (!file) return;
    if (!file.type.startsWith('video/')) return alert('Bitte eine Videodatei wählen');
    if (file.size > 40 * 1048576) return alert('Datei zu groß (max. 40 MB)');
    f._file = file; drop.hidden = true; $('#step2').hidden = false;
    f.title.value = clean(file.name.replace(/\.[^.]+$/, '')).slice(0, 100);
    f.title.focus();
  };
  f.file.onchange = () => pick(f.file.files[0]);
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); pick(e.dataTransfer.files[0]); };
  f.onsubmit = async e => {
    e.preventDefault();
    const file = f._file, btn = f.querySelector('#step2 button'), st = $('#st'), bar = f.querySelector('.progress div'), err = f.querySelector('.err');
    const title = clean(f.title.value);
    if (!title) return err.textContent = 'Titel erforderlich';
    btn.disabled = true; err.textContent = '';
    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
    try {
      st.textContent = 'Thumbnail wird erstellt…'; bar.style.width = '3%';
      const thumb = await makeImage(file, 1280, 720);
      st.textContent = 'Wird hochgeladen…';
      const res = await send('/video', { channel, title, ext }, file, p => {
        bar.style.width = (3 + p * 80) + '%';
        if (p >= 1) st.textContent = 'Wird verarbeitet…';
      });
      if (thumb) { st.textContent = 'Thumbnail wird hochgeladen…'; await send('/video/extra', { channel, path: res.path, kind: 'thumb' }, thumb); }
      if (f.desc.value.trim()) await send('/video/extra', { channel, path: res.path, kind: 'desc' }, new Blob([f.desc.value]));
      bar.style.width = '100%'; st.textContent = 'Veröffentlicht!';
      store.set('ops', [...store.get('ops', []), { t: Date.now(), add: { path: res.path, date: res.path.slice(0, 10), channel, title,
        thumb: thumb ? `${res.base}.jpg` : null, desc: f.desc.value, size: file.size } }]);
      DB = null;
      setTimeout(() => { m.remove(); location.hash = '#/studio/content'; route(); }, 900);
    } catch (e2) { err.textContent = e2.message; btn.disabled = false; }
  };
}

async function deleteVideo(path) {
  if (!confirm('Video endgültig löschen? Das kann nicht rückgängig gemacht werden.')) return;
  try {
    await send('/video/delete', { channel: myChannel(), path });
    store.set('ops', [...store.get('ops', []), { t: Date.now(), del: path }]);
    DB = null;
    location.hash = '#/studio/content'; route();
  } catch (e) { alert(e.message); }
}
function previewThumb(inp) { previewImg(inp, '#thumbprev'); }
function previewImg(inp, sel, bg) {
  const file = inp.files[0]; if (!file) return;
  const url = URL.createObjectURL(file), el = $(sel);
  if (bg) { el.style.background = `url('${url}') center/cover`; } else el.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
}
const fmtSize = b => !b ? '–' : b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

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

$('#hright').innerHTML = `<a href="#/studio" class="btn-blue" id="studiobtn">SlopTube Studio</a>
  <a href="#/studio" id="meav" class="avatar" title="SlopTube Studio" style="background:#ccc"></a>`;
function renderMe() {
  const n = myChannel(), a = $('#meav');
  if (n) { a.style.background = color(n); a.innerHTML = avInner(n); }
}
let routeId = 0;
async function route() {
  const my = ++routeId;
  await loadDB().catch(() => {});   // Daten vorladen, damit kein älterer Seitenwechsel später drüberschreibt
  if (my !== routeId) return;
  let [, name = '', ...rest] = location.hash.split('/');
  if (name === 'upload') { location.hash = '#/studio/content/upload'; return; }
  document.body.classList.toggle('studio', name === 'studio');
  $('.logo .t').textContent = name === 'studio' ? 'Studio' : 'SlopTube';
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.r === name));
  window.scrollTo(0, 0);
  try { await (routes[name] || routes[''])(rest.join('/')); }
  catch (e) { $('#app').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  renderMe();
}
window.onhashchange = route;
renderSubs();
route();
