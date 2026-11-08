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
  if (!r.ok) throw new Error(t('Video repo {r} not found (index.json missing).', { r: C.owner + '/' + C.repo }));
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
  if (days < 1) return t('today');
  if (days === 1) return t('yesterday');
  if (days < 7) return t('{n} days ago', { n: days });
  if (days < 30) return tn(days / 7 | 0, '1 week ago', '{n} weeks ago');
  if (days < 365) return tn(days / 30 | 0, '1 month ago', '{n} months ago');
  return tn(days / 365 | 0, '1 year ago', '{n} years ago');
}
const thumbHtml = v => `<div class="thumb">${v.thumbUrl ? `<img src="${v.thumbUrl}" loading="lazy">` : `<video src="${v.src}#t=1" preload="metadata" muted></video>`}</div>`;
const subs = () => store.get('subs', []);
const myChannel = () => store.get('channel', '');
function subBtn(n) {
  if (n === myChannel()) return `<a class="btn-blue" href="#/studio/customize">${t('Customize channel')}</a>`;
  const on = subs().includes(n);
  return `<button class="sub-btn ${on ? 'on' : ''}" onclick="toggleSub(${jsStr(n)})">${on ? t('Subscribed') : t('Subscribe')}</button>`;
}
function renderSubs() {
  const s = subs();
  $('#subslist').innerHTML = s.length
    ? s.map(n => `<a class="ch" href="${chLink(n)}"><span class="avatar" style="background:${color(n)}">${avInner(n)}</span>${esc(n)}</a>`).join('')
    : `<div class="foot" style="padding-top:0">${t('Subscribe to channels to see them here.')}</div>`;
}

function grid(list, empty = t('No videos yet.'), showCh = true) {
  if (!list.length) return `<div class="empty">${empty}</div>`;
  return `<div class="grid">${list.map(v => `
    <div class="vcard" onclick="location.hash=${jsStr(link(v))}">${thumbHtml(v)}
      <div class="vmeta">${showCh ? av(v.channel) : ''}<div><h3 class="vtitle">${esc(v.title)}</h3>
      <div class="small">${showCh ? `<a href="${chLink(v.channel)}" onclick="event.stopPropagation()">${esc(v.channel)}</a><br>` : ''}${ago(v.date)}</div></div></div>
    </div>`).join('')}</div>`;
}

// ---------- Seiten ----------
const routes = {
  async ''() { $('#app').innerHTML = `<h2 class="section-title">${t('Recommended')}</h2>` + grid((await loadDB()).videos, t('No videos yet. Upload the first one in SlopTube Studio!')); },
  async trending() {
    $('#app').innerHTML = `<h2 class="section-title">${t('New today')}</h2>` + grid((await loadDB()).videos.filter(v => v.date === today()), t('Nothing has been uploaded today.'));
  },
  async subs() {
    const s = subs();
    $('#app').innerHTML = `<h2 class="section-title">${t('Subscriptions')}</h2>` + grid((await loadDB()).videos.filter(v => s.includes(v.channel)), t('You haven\'t subscribed to any channels yet.'));
  },
  async channels() {
    const list = Object.values((await loadDB()).channels).sort((a, b) => b.videos - a.videos);
    $('#app').innerHTML = `<h2 class="section-title">${t('Channels')}</h2>` + (list.length ? `<div class="grid">${list.map(c => `
      <div style="text-align:center;padding:16px;background:#fff">
        <a href="${chLink(c.name)}"><span class="avatar big" style="background:${color(c.name)};margin:0 auto 12px;width:104px;height:104px">${avInner(c.name)}</span>
        <b>${esc(c.name)}</b></a><div class="small" style="margin:4px 0 12px">${tn(c.videos, '1 video', '{n} videos')}</div>${subBtn(c.name)}</div>`).join('')}</div>`
      : `<div class="empty">${t('No channels yet.')}</div>`);
  },
  async search(q) {
    q = decodeURIComponent(q || '');
    $('.search input').value = q;
    const l = q.toLowerCase(), db = await loadDB();
    const chs = Object.values(db.channels).filter(c => c.name.toLowerCase().includes(l));
    $('#app').innerHTML = `<h2 class="section-title">${t('Results for "{q}"', { q: esc(q) })}</h2>` +
      chs.map(c => `<div class="owner" style="background:#fff;padding:16px;margin-bottom:16px">${av(c.name, 'big')}
        <div style="flex:1"><a href="${chLink(c.name)}" style="font-size:18px">${esc(c.name)}</a><div class="small">${tn(c.videos, '1 video', '{n} videos')}</div>
        <div class="small">${esc((c.about || '').slice(0, 120))}</div></div>${subBtn(c.name)}</div>`).join('') +
      grid(db.videos.filter(v => (v.title + ' ' + v.desc).toLowerCase().includes(l)), chs.length ? '' : t('No results.'));
  },

  // ----- Kanalseite wie YouTube 2019: Banner, Avatar, Abo-Knopf, Tabs -----
  async channel(arg) {
    const [rawName, tab = 'featured', sort = 'new'] = arg.split('/');
    const name = decodeURIComponent(rawName), db = await loadDB(), c = db.channels[name];
    if (!c) throw new Error(t('Channel not found'));
    let vids = db.videos.filter(v => v.channel === name);
    const tabLink = (t, label) => `<a href="${chLink(name, t)}" class="${tab === t ? 'on' : ''}">${label}</a>`;
    let body = '';
    if (tab === 'featured') {
      const f = vids[0];
      body = (f ? `<div class="featured"><div class="player"><video src="${f.src}" controls preload="metadata"></video></div>
          <div><a href="${link(f)}" style="font-size:18px">${esc(f.title)}</a><div class="small" style="margin:8px 0">${ago(f.date)}</div>
          <div class="desc small">${esc((f.desc || '').slice(0, 300))}</div></div></div>` : '') +
        `<h2 class="section-title">${t('Uploads')} <a class="small" href="${chLink(name, 'videos')}" style="color:var(--blue);margin-left:12px">${t('PLAY ALL')}</a></h2>` +
        grid(vids.slice(1, 13), f ? t('No more videos.') : t('This channel doesn\'t have any videos yet.'), false);
    } else if (tab === 'videos') {
      if (sort === 'old') vids = vids.slice().reverse();
      body = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 class="section-title" style="margin:0">${t('Uploads')}</h2>
        <select onchange="location.hash=${jsStr(chLink(name, 'videos'))}+'/'+this.value">
          <option value="new" ${sort === 'new' ? 'selected' : ''}>${t('Newest first')}</option>
          <option value="old" ${sort === 'old' ? 'selected' : ''}>${t('Oldest first')}</option></select></div>` +
        grid(vids, t('This channel doesn\'t have any videos yet.'), false);
    } else {
      body = `<div class="about"><div><h3 style="font-weight:400">${t('Description')}</h3><div class="desc">${esc(c.about) || `<span class="small">${t('No description.')}</span>`}</div>
        ${(c.links || []).length ? `<h3 style="font-weight:400;margin-top:32px">${t('Links')}</h3>${c.links.map(l => /^https?:\/\//.test(l) ? `<div><a style="color:var(--blue)" target="_blank" rel="noopener" href="${esc(l)}">${esc(l)}</a></div>` : '').join('')}` : ''}</div>
        <div class="stats"><h3 style="font-weight:400">${t('Stats')}</h3>
          <div>${t('Joined {d}', { d: c.joined ? new Date(c.joined).toLocaleDateString(LANG, { day: 'numeric', month: 'short', year: 'numeric' }) : '–' })}</div>
          <div>${tn(c.videos, '1 video', '{n} videos')}</div></div></div>`;
    }
    $('#app').innerHTML = `<div style="margin:-24px -24px 0"><div class="banner" style="${c.bannerUrl ? `background-image:url('${c.bannerUrl}')` : `background:linear-gradient(120deg,${color(name)},#282828)`}"></div></div>
      <div class="chwrap"><div class="chead">${av(name, 'big')}<div class="info"><h1>${esc(name)}</h1><div class="small">${tn(c.videos, '1 video', '{n} videos')}</div></div>${subBtn(name)}</div>
      <div class="tabs">${tabLink('featured', t('Home tab'))}${tabLink('videos', t('Videos'))}${tabLink('about', t('About'))}</div></div>` + body;
  },

  async watch(id) {
    id = decodeURIComponent(id);
    const db = await loadDB(), v = db.videos.find(x => x.id === id);
    if (!v) throw new Error(t('Video not found.'));
    const others = db.videos.filter(x => x !== v);
    const next = others.filter(o => o.channel === v.channel).concat(others.filter(o => o.channel !== v.channel));
    $('#app').innerHTML = `<div class="watch"><div class="primary">
      <div class="player"><video src="${v.src}" controls autoplay></video></div>
      <h1 class="wtitle">${esc(v.title)}</h1>
      <div class="wbar"><div class="small">${t('Published on {d}', { d: new Date(v.date).toLocaleDateString(LANG) })}</div>
        <div class="likes">
          <button onclick="navigator.clipboard.writeText(location.href);this.textContent=${jsStr(t('Copied'))}">${t('Share')}</button>
          <button onclick="window.open(${jsStr(v.src)})">${t('Download')}</button>
        </div></div>
      <div class="owner">${av(v.channel)}
        <div style="flex:1"><a href="${chLink(v.channel)}" style="font-weight:500">${esc(v.channel)}</a>
          <div class="small">${tn(db.channels[v.channel].videos, '1 video', '{n} videos')}</div>
          <div class="desc">${esc(v.desc) || `<span class="small">${t('No description')}</span>`}</div></div>
        ${subBtn(v.channel)}
      </div>
      <div class="comments" id="comments"></div>
    </div>
    <div class="secondary"><div class="upnext"><span>${t('Up next')}</span><span class="small">${t('AUTOPLAY')}</span></div>
      ${next.slice(0, 20).map(o => `<div class="side-item" onclick="location.hash=${jsStr(link(o))}">${thumbHtml(o)}
        <div><h3 class="vtitle">${esc(o.title)}</h3><div class="small">${esc(o.channel)}<br>${ago(o.date)}</div></div></div>`).join('') || `<div class="small">${t('No more videos')}</div>`}
    </div></div>`;
    if (next[0]) $('.player video').onended = () => location.hash = link(next[0]);
    const g = C.giscus;
    if (g && g.repo) {
      const s = document.createElement('script');
      Object.entries({ src: 'https://giscus.app/client.js', 'data-repo': g.repo, 'data-repo-id': g.repoId, 'data-category': g.category,
        'data-category-id': g.categoryId, 'data-mapping': 'specific', 'data-term': v.id, 'data-lang': LANG, 'data-theme': 'light', crossorigin: 'anonymous' })
        .forEach(([k, val]) => s.setAttribute(k, val));
      s.async = true;
      $('#comments').innerHTML = `<h3>${t('Comments')}</h3>`;
      $('#comments').appendChild(s);
    }
  },

  // ----- Settings -----
  async settings() {
    const n = myChannel();
    $('#app').innerHTML = `<div class="form" style="max-width:720px"><h2>${t('Settings')}</h2>
      <h3 style="font-weight:500;margin-top:24px">${t('Language')}</h3>
      <p class="small">${t('Choose the language of SlopTube and SlopTube Studio. It is saved in this browser.')}</p>
      <div class="langs">${Object.entries(LANGS).map(([k, v]) =>
        `<label class="${k === LANG ? 'on' : ''}"><input type="radio" name="lang" value="${k}" ${k === LANG ? 'checked' : ''} onchange="setLang(this.value)"> ${v}</label>`).join('')}</div>
      <h3 style="font-weight:500;margin-top:32px">${t('Account')}</h3>
      <p class="small">${n ? t('Signed in as {n}', { n: `<b>${esc(n)}</b>` }) : t('Not signed in. Create a channel in SlopTube Studio.')}</p>
      <a class="btn-blue" href="#/studio">SlopTube Studio</a>
      <h3 style="font-weight:500;margin-top:32px">${t('Clear subscriptions')}</h3>
      <p class="small">${t('Removes all subscriptions saved in this browser.')}</p>
      <button class="btn-blue" style="color:#c00;border-color:#c00" onclick="if(confirm(${jsStr(t('Remove all subscriptions?'))})){localStorage.removeItem('subs');renderSubs()}">${t('CLEAR')}</button>
    </div>`;
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
          <a href="${chLink(name)}" class="st-me" title="${t('View channel')}"><span class="avatar" style="background:${color(name)}">${avInner(name)}</span>
            <b>${t('Your channel')}</b><span class="small">${esc(name)}</span></a>
          ${navItem('dashboard', '', t('Dashboard'))}${navItem('content', '', t('Content'))}${navItem('customize', '', t('Customization'))}
          <a href="${chLink(name)}"><span>${t('View channel')}</span></a>
          <a href="#/settings"><span>${t('Settings')}</span></a>
          <a href="#/"><span>${t('Back to SlopTube')}</span></a>
        </aside>
        <section class="st-main"><div class="st-head"><h1>${title}</h1><div>${actions}
          <button class="st-create" onclick="openUpload()">${t('CREATE')}</button></div></div>${body}</section></div>`;
    };

    if (tab === 'dashboard') {
      const last = mine[0];
      const size = mine.reduce((s, v) => s + (v.size || 0), 0);
      shell(t('Channel dashboard'), `<div class="st-cards">
        <div class="st-card">${last ? `<h3>${t('Latest video')}</h3>${thumbHtml(last)}
            <p style="font-weight:500;margin:12px 0 4px">${esc(last.title)}</p><div class="small">${t('Published {ago}', { ago: ago(last.date) })}</div>
            <div style="margin-top:16px;display:flex;gap:8px"><a class="st-link" href="#/studio/edit/${encodeURIComponent(last.id)}">${t('EDIT VIDEO')}</a><a class="st-link" href="${link(last)}">${t('WATCH')}</a></div>`
          : `<div style="text-align:center;padding:24px 0"><p>${t('Want to see your first video here? Upload one!')}</p>
            <button class="st-primary" onclick="openUpload()">${t('UPLOAD VIDEOS')}</button></div>`}</div>
        <div class="st-card"><h3>${t('Channel analytics')}</h3>
          <div class="small">${t('Total videos')}</div><div class="st-big">${mine.length}</div>
          <hr><div class="st-row"><span>${t('Storage used')}</span><b>${fmtSize(size)}</b></div>
          <div class="st-row"><span>${t('Latest upload')}</span><b>${last ? ago(last.date) : '–'}</b></div>
          <div class="st-row"><span>${t('Channel created')}</span><b>${c.joined ? new Date(c.joined).toLocaleDateString(LANG) : '–'}</b></div>
          <div class="st-row"><span>${t('Subscribed (in this browser)')}</span><b>${subs().includes(name) ? t('yes') : t('no')}</b></div>
          <a class="st-link" href="#/studio/content" style="display:inline-block;margin-top:12px">${t('GO TO CONTENT')}</a></div>
        <div class="st-card"><h3>${t('News from the Studio')}</h3>
          <p><b>${t('Welcome to SlopTube Studio!')}</b></p>
          <p class="small">${t('Manage everything here: upload videos, change titles, descriptions and thumbnails, delete videos and design your channel with a profile picture and banner.')}</p>
          <p class="small">${t('Tip: you see changes right away, everyone else after a few minutes.')}</p>
          <hr><h3 style="margin-top:12px">${t('Your channel key')}</h3>
          <p class="small">${t('Use it to sign in on other devices. Keep it safe!')}</p>
          <button class="st-link" onclick="navigator.clipboard.writeText(${jsStr(key)});this.textContent=${jsStr(t('COPIED'))}">${t('COPY KEY')}</button></div>
      </div>`);
    }

    else if (tab === 'content') {
      shell(t('Channel content'), `<div class="st-tabs"><span class="on">${t('Uploads')}</span></div>
        ${mine.length ? `<table class="st-table"><thead><tr><th>${t('Video')}</th><th>${t('Visibility')}</th><th>${t('Date')}</th><th>${t('Size')}</th><th></th></tr></thead><tbody>
        ${mine.map(v => `<tr>
          <td><div class="st-vid"><a href="#/studio/edit/${encodeURIComponent(v.id)}">${thumbHtml(v)}</a>
            <div><a href="#/studio/edit/${encodeURIComponent(v.id)}" style="font-weight:500">${esc(v.title)}</a>
            <div class="small st-desc">${esc(v.desc || t('Add description'))}</div>
            <div class="st-acts"><a href="#/studio/edit/${encodeURIComponent(v.id)}" title="${t('Details')}">${t('Edit')}</a><a href="${link(v)}" title="${t('Watch on SlopTube')}">${t('Watch')}</a>
            <button title="${t('Delete')}" onclick="deleteVideo(${jsStr(v.id)})">${t('Delete')}</button></div></div></div></td>
          <td>${t('Public')}</td><td>${new Date(v.date).toLocaleDateString(LANG)}<div class="small">${t('Published')}</div></td>
          <td>${fmtSize(v.size)}</td><td></td></tr>`).join('')}</tbody></table>`
        : `<div class="empty" style="background:#fff">${t('No content available')}<br><br><button class="st-primary" onclick="openUpload()">${t('UPLOAD VIDEOS')}</button></div>`}`);
      if (rest[0] === 'upload') openUpload();
    }

    else if (tab === 'edit') {
      const path = decodeURIComponent(rest.join('/')), v = mine.find(x => x.id === path);
      if (!v) throw new Error(t('Video not found'));
      shell(t('Video details'), `<form id="ed" class="st-edit">
        <div class="st-card" style="flex:1">
          <label>${t('Title (required)')}</label><input name="title" value="${esc(v.title)}" maxlength="100" required>
          <label>${t('Description')}</label><textarea name="desc" rows="10" placeholder="${t('Tell viewers about your video')}">${esc(v.desc || '')}</textarea>
          <label>${t('Thumbnail')}</label>
          <div class="small" style="margin-bottom:8px">${t('Upload a picture that shows what\'s in your video.')}</div>
          <div class="st-thumbs">
            <label class="st-upthumb">${t('Upload thumbnail')}<input type="file" name="thumb" accept="image/*" hidden onchange="previewThumb(this)"></label>
            <div class="thumb" id="thumbprev">${v.thumbUrl ? `<img src="${v.thumbUrl}">` : `<video src="${v.src}#t=1" preload="metadata" muted></video>`}</div>
          </div>
          <div class="small" id="es" style="margin-top:16px"></div><div class="err"></div>
        </div>
        <div class="st-card st-prev"><div class="player"><video src="${v.src}" controls preload="metadata"></video></div>
          <div class="small" style="margin-top:12px">${t('Video link')}</div><a href="${link(v)}" style="color:var(--blue);word-break:break-all">${esc(location.origin + location.pathname + link(v))}</a>
          <div class="small" style="margin-top:12px">${t('Filename')}</div><div>${esc(v.path.split('/').pop())}</div>
          <div class="small" style="margin-top:12px">${t('Visibility')}</div><div>${t('Public')}</div>
          <button type="button" class="st-link" style="color:#c00;margin-top:16px" onclick="deleteVideo(${jsStr(v.id)})">${t('DELETE VIDEO')}</button>
        </div></form>`,
        `<a class="st-link" href="#/studio/content">${t('BACK')}</a> <button class="st-primary" form="ed">${t('SAVE')}</button>`);
      $('#ed').onsubmit = async e => {
        e.preventDefault();
        const f = e.target, es = $('#es'), err = f.querySelector('.err');
        const title = clean(f.title.value);
        if (!title) return err.textContent = t('Title required');
        err.textContent = '';
        let updated = { ...v };
        try {
          if (title !== v.title) {
            es.textContent = t('Changing title…');
            const r = await send('/video/rename', { channel: name, path: v.path, title });
            const base = r.path.replace(/\.[^.]+$/, '');
            updated = { ...updated, path: r.path, title, thumb: v.thumb ? `${base}.${v.thumb.split('.').pop()}` : null };
          }
          if (f.desc.value !== (v.desc || '')) {
            es.textContent = t('Saving description…');
            await send('/video/extra', { channel: name, path: updated.path, kind: 'desc' }, new Blob([f.desc.value]));
            updated.desc = f.desc.value;
          }
          if (f.thumb.files[0]) {
            es.textContent = t('Uploading thumbnail…');
            await send('/video/extra', { channel: name, path: updated.path, kind: 'thumb' }, await makeImage(f.thumb.files[0], 1280, 720, true));
            updated.thumb = updated.path.replace(/\.[^.]+$/, '.jpg');
          }
          const plain = ({ path, date, channel, title, thumb, desc, size }) => ({ path, date, channel, title, thumb, desc, size });
          store.set('ops', [...store.get('ops', []), { t: Date.now(), del: v.path }, { t: Date.now(), add: plain(updated) }]);
          DB = null;
          es.textContent = t('Saved');
          if (updated.path !== v.path) location.hash = '#/studio/edit/' + encodeURIComponent(updated.path);
        } catch (e2) { err.textContent = t(e2.message); es.textContent = ''; }
      };
    }

    else if (tab === 'customize') {
      shell(t('Channel customization'), `<div class="st-tabs"><span class="on">${t('Branding & info')}</span></div>
        <form id="cu" class="st-card" style="max-width:860px">
          <h3>${t('Profile picture')}</h3><div class="st-brand"><span class="avatar" style="width:120px;height:120px;font-size:48px;background:${color(name)}" id="avprev">${avInner(name)}</span>
            <div class="small">${t('Your profile picture appears next to your videos. Square works best, at least 98×98 pixels.')}<br><br>
            <label class="st-link">${t('UPLOAD')}<input type="file" name="avatar" accept="image/*" hidden onchange="previewImg(this,'#avprev')"></label></div></div>
          <h3>${t('Banner image')}</h3><div class="st-brand"><div id="bnprev" class="st-bannerprev" style="${c.bannerUrl ? `background-image:url('${c.bannerUrl}')` : `background:linear-gradient(120deg,${color(name)},#282828)`}"></div>
            <div class="small">${t('Shown at the top of your channel page. 2048×1152 pixels works best.')}<br><br>
            <label class="st-link">${t('UPLOAD')}<input type="file" name="banner" accept="image/*" hidden onchange="previewImg(this,'#bnprev',true)"></label></div></div>
          <h3>${t('Name')}</h3><div class="small">${esc(name)} <i>${t('(the channel name can\'t be changed)')}</i></div>
          <h3>${t('Description')}</h3><textarea name="about" rows="5" placeholder="${t('Tell viewers about your channel')}">${esc(c.about || '')}</textarea>
          <h3>${t('Links')}</h3><textarea name="links" rows="3" placeholder="${t('https://… (one per line)')}">${esc((c.links || []).join('\n'))}</textarea>
          <h3>${t('Channel URL')}</h3><a style="color:var(--blue);word-break:break-all" href="${chLink(name)}">${esc(location.origin + location.pathname + chLink(name))}</a>
          <div class="small" id="cs" style="margin-top:16px"></div><div class="err"></div>
          <hr><h3>${t('Sign out')}</h3><div class="small">${t('Without your channel key you can\'t get back into your channel!')}</div>
          <button type="button" class="st-link" style="color:#c00" onclick="if(confirm(${jsStr(t('Really sign out?'))})){localStorage.removeItem('key');localStorage.removeItem('channel');route()}">${t('SIGN OUT')}</button>
        </form>`, `<a class="st-link" href="${chLink(name)}">${t('VIEW CHANNEL')}</a> <button class="st-primary" form="cu">${t('PUBLISH')}</button>`);
      $('#cu').onsubmit = async e => {
        e.preventDefault();
        const f = e.target, cs = $('#cs'), err = f.querySelector('.err');
        err.textContent = '';
        try {
          if (f.avatar.files[0]) { cs.textContent = t('Uploading profile picture…'); await send('/channel/update', { channel: name, kind: 'avatar' }, await makeImage(f.avatar.files[0], 400, 400, true)); }
          if (f.banner.files[0]) { cs.textContent = t('Uploading banner…'); await send('/channel/update', { channel: name, kind: 'banner' }, await makeImage(f.banner.files[0], 2048, 330, true)); }
          cs.textContent = t('Saving info…');
          const links = f.links.value.split('\n').map(s => s.trim()).filter(Boolean);
          await send('/channel/update', { channel: name, kind: 'info' }, new Blob([JSON.stringify({ about: f.about.value, links })]));
          cs.textContent = t('Published. Visible to everyone in a few minutes.');
        } catch (e2) { err.textContent = t(e2.message); cs.textContent = ''; }
      };
    }
    else location.hash = '#/studio';
  },
};

// ----- Studio: Anmelden / Kanal erstellen -----
function studioLogin() {
  $('#app').innerHTML = `<div style="text-align:center;margin:24px 0 8px"><span class="logo" style="justify-content:center;font-size:28px"><span class="play"><i></i></span>Studio</span>
    <p class="small">${t('Your place for everything about your channel. No account needed.')}</p></div>
    <form class="form" id="cr"><h2>${t('Create channel')}</h2>
    <p class="small">${t('You get a channel key that only lets you manage your channel. It is saved in this browser.')}</p>
    <label>${t('Channel name')}</label><input name="name" maxlength="40" required>
    <button class="primary">${t('Create channel')}</button><div class="err"></div></form>
    <form class="form" id="li" style="margin-top:24px"><h2>${t('I already have a channel')}</h2>
    <label>${t('Channel name')}</label><input name="name" maxlength="40" required>
    <label>${t('Channel key')}</label><input name="key" type="password" required>
    <button class="primary">${t('Sign in')}</button><div class="err"></div></form>`;
  $('#cr').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, n = clean(f.name.value);
    f.querySelector('button').disabled = true;
    try {
      const r = await send('/channel/create', { channel: n });
      store.set('channel', n); store.set('key', r.key); DB = null;
      location.hash = '#/studio/customize';
    } catch (e2) { f.querySelector('.err').textContent = t(e2.message); f.querySelector('button').disabled = false; }
  };
  $('#li').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, n = clean(f.name.value);
    try {
      await send('/channel/check', { channel: n }, null, null, f.key.value.trim());
      store.set('channel', n); store.set('key', f.key.value.trim());
      route();
    } catch (e2) { f.querySelector('.err').textContent = t(e2.message); }
  };
}

// ----- Studio: Upload-Dialog -----
function openUpload() {
  const channel = myChannel();
  document.querySelector('.st-modal')?.remove();
  const m = document.createElement('div');
  m.className = 'st-modal';
  m.innerHTML = `<form class="st-dialog" id="up">
    <div class="st-dhead"><b>${t('Upload videos')}</b><button type="button" class="icon-btn" onclick="this.closest('.st-modal').remove()">×</button></div>
    <div id="step1" class="st-drop">
      
      <p>${t('Drag and drop video files to upload')}</p>
      <p class="small">${t('Your videos are public right away. Max. 40 MB.')}</p>
      <label class="st-primary" style="display:inline-block">${t('SELECT FILES')}<input type="file" name="file" accept="video/*" hidden></label>
    </div>
    <div id="step2" hidden style="padding:24px">
      <label>${t('Title (required)')}</label><input name="title" maxlength="100" required>
      <label>${t('Description')}</label><textarea name="desc" rows="5" placeholder="${t('Tell viewers about your video')}"></textarea>
      <div class="small" style="margin-top:12px">${t('Saved as: {p} · The thumbnail is created automatically and can be changed later.', { p: `${today()}/${esc(channel)}/<i>${t('Title')}</i>` })}</div>
      <div class="progress"><div></div></div><div class="small" id="st"></div><div class="err"></div>
      <div style="text-align:right;margin-top:16px"><button class="st-primary">${t('PUBLISH')}</button></div>
    </div></form>`;
  document.body.appendChild(m);
  const f = $('#up'), drop = $('#step1');
  const pick = file => {
    if (!file) return;
    if (!file.type.startsWith('video/')) return alert(t('Please choose a video file'));
    if (file.size > 40 * 1048576) return alert(t('File too large (max. 40 MB)'));
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
    if (!title) return err.textContent = t('Title required');
    btn.disabled = true; err.textContent = '';
    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
    try {
      st.textContent = t('Creating thumbnail…'); bar.style.width = '3%';
      const thumb = await makeImage(file, 1280, 720);
      st.textContent = t('Uploading…');
      const res = await send('/video', { channel, title, ext }, file, p => {
        bar.style.width = (3 + p * 80) + '%';
        if (p >= 1) st.textContent = t('Processing…');
      });
      if (thumb) { st.textContent = t('Uploading thumbnail…'); await send('/video/extra', { channel, path: res.path, kind: 'thumb' }, thumb); }
      if (f.desc.value.trim()) await send('/video/extra', { channel, path: res.path, kind: 'desc' }, new Blob([f.desc.value]));
      bar.style.width = '100%'; st.textContent = t('Published!');
      store.set('ops', [...store.get('ops', []), { t: Date.now(), add: { path: res.path, date: res.path.slice(0, 10), channel, title,
        thumb: thumb ? `${res.base}.jpg` : null, desc: f.desc.value, size: file.size } }]);
      DB = null;
      setTimeout(() => { m.remove(); location.hash = '#/studio/content'; route(); }, 900);
    } catch (e2) { err.textContent = t(e2.message); btn.disabled = false; }
  };
}

async function deleteVideo(path) {
  if (!confirm(t('Delete video permanently? This can\'t be undone.'))) return;
  try {
    await send('/video/delete', { channel: myChannel(), path });
    store.set('ops', [...store.get('ops', []), { t: Date.now(), del: path }]);
    DB = null;
    location.hash = '#/studio/content'; route();
  } catch (e) { alert(t(e.message)); }
}
function previewThumb(inp) { previewImg(inp, '#thumbprev'); }
function previewImg(inp, sel, bg) {
  const file = inp.files[0]; if (!file) return;
  const url = URL.createObjectURL(file), el = $(sel);
  if (bg) { el.style.background = `url('${url}') center/cover`; } else el.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
}
const fmtSize = b => !b ? '–' : b > 1048576 ? (b / 1048576).toLocaleString(LANG, { maximumFractionDigits: 1 }) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

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
      x.status < 300 ? ok(j) : fail(new Error(t(j.error || t('Error {n}', { n: x.status }))));
    };
    x.onerror = () => fail(new Error(t('Upload server not reachable')));
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
  catch (e) { $('#app').innerHTML = `<div class="empty">${esc(t(e.message))}</div>`; }
  renderMe();
}
window.onhashchange = route;
translateStatic();
$('#langname').textContent = LANGS[LANG];
$('#region').textContent = LANG.toUpperCase();
renderSubs();
route();
