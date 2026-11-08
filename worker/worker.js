// SlopTube Upload-Server (Cloudflare Worker)
// Hält den GitHub-Token geheim (Secret GITHUB_TOKEN) und schreibt Uploads ins Video-Repo.
// Jeder Kanal hat einen geheimen Kanal-Schlüssel; im Repo liegt nur dessen SHA-256-Hash.

const MAX_VIDEO = 40 * 1024 * 1024;   // Worker-Speicher reicht nicht für mehr (Base64 für GitHub)
const MAX_IMAGE = 3 * 1024 * 1024;
const VIDEO_EXT = ['mp4', 'webm', 'mov', 'm4v', 'ogg'];

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Channel-Key',
      'Access-Control-Max-Age': '86400',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method !== 'POST') return json({ ok: true, name: 'SlopTube Upload-Server' });
    if (!allowed.includes(origin)) return json({ error: 'Nicht erlaubt' }, 403);

    const gh = github(env);
    const url = new URL(req.url);
    const q = k => clean(url.searchParams.get(k) || '');
    try {
      const channel = q('channel');
      if (!channel || channel.length > 40) return json({ error: 'Ungültiger Kanalname' }, 400);
      const dir = `_kanaele/${channel}`;
      const keyHash = (await gh.get(`${dir}/key.txt`))?.text?.trim();

      // --- Kanal erstellen ---
      if (url.pathname === '/channel/create') {
        if (keyHash) return json({ error: 'Diesen Kanalnamen gibt es schon' }, 409);
        const key = [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join('');
        await gh.put(`${dir}/key.txt`, enc(await sha256(key)), `Neuer Kanal: ${channel}`);
        await gh.put(`${dir}/info.json`, enc(JSON.stringify({ about: '', links: [], created: today() })), `Kanalinfo: ${channel}`);
        return json({ key });
      }

      // ab hier: Kanal-Schlüssel nötig
      if (!keyHash) return json({ error: 'Kanal existiert nicht' }, 404);
      if (await sha256(req.headers.get('X-Channel-Key') || '') !== keyHash) return json({ error: 'Falscher Kanal-Schlüssel' }, 403);

      if (url.pathname === '/channel/check') return json({ ok: true });

      if (url.pathname === '/channel/update') {
        const kind = url.searchParams.get('kind');
        const body = await readBody(req, MAX_IMAGE);
        if (kind === 'avatar' || kind === 'banner') {
          if (!isJpeg(body)) return json({ error: 'Nur JPEG' }, 400);
          await gh.put(`${dir}/${kind}.jpg`, body, `${kind}: ${channel}`);
        } else if (kind === 'info') {
          const info = JSON.parse(new TextDecoder().decode(body));
          const old = JSON.parse((await gh.get(`${dir}/info.json`))?.text || '{}');
          const out = {
            about: String(info.about || '').slice(0, 5000),
            links: (info.links || []).filter(l => /^https?:\/\//.test(l)).slice(0, 10).map(l => String(l).slice(0, 300)),
            created: old.created || today(),
          };
          await gh.put(`${dir}/info.json`, enc(JSON.stringify(out, null, 1)), `Kanalinfo: ${channel}`);
        } else return json({ error: 'Unbekannt' }, 400);
        return json({ ok: true });
      }

      if (url.pathname === '/video') {
        const title = q('title'), ext = (url.searchParams.get('ext') || '').toLowerCase();
        if (!title || title.length > 100) return json({ error: 'Ungültiger Titel' }, 400);
        if (!VIDEO_EXT.includes(ext)) return json({ error: 'Dateityp nicht erlaubt' }, 400);
        const base = `${today()}/${channel}/${title}`;
        if (await gh.exists(`${base}.${ext}`)) return json({ error: 'Du hast heute schon ein Video mit diesem Titel' }, 409);
        const video = await readBody(req, MAX_VIDEO);
        await gh.put(`${base}.${ext}`, video, `Video: ${base}`);
        return json({ path: `${base}.${ext}`, base });
      }

      // ----- Studio: Videos bearbeiten / löschen (nur eigene) -----
      const ownPath = () => {
        const p = url.searchParams.get('path') || '';
        const m = p.match(/^(\d{4}-\d{2}-\d{2})\/([^/]+)\/([^/]+)\.([a-z0-9]+)$/i);
        if (!m || m[2] !== channel || !VIDEO_EXT.includes(m[4].toLowerCase())) { const e = new Error('Nicht dein Video'); e.status = 403; throw e; }
        return { path: p, date: m[1], dir: `${m[1]}/${m[2]}`, title: m[3], ext: m[4], base: `${m[1]}/${m[2]}/${m[3]}` };
      };
      // alle Dateien, die zu einem Video gehören (Video, Bild, Beschreibung)
      const related = async v => (await gh.list(v.dir)).filter(f => f.name.replace(/\.[^.]+$/, '') === v.title);

      if (url.pathname === '/video/delete') {
        const v = ownPath();
        const files = await related(v);
        if (!files.length) return json({ error: 'Video nicht gefunden' }, 404);
        await gh.commit(files.map(f => ({ path: `${v.dir}/${f.name}`, sha: null })), `Video gelöscht: ${v.base}`);
        return json({ ok: true });
      }

      if (url.pathname === '/video/rename') {
        const v = ownPath(), title = q('title');
        if (!title || title.length > 100) return json({ error: 'Ungültiger Titel' }, 400);
        if (title === v.title) return json({ path: v.path });
        const files = await related(v);
        if ((await gh.list(v.dir)).some(f => f.name.replace(/\.[^.]+$/, '') === title)) return json({ error: 'Diesen Titel gibt es an dem Tag schon' }, 409);
        const changes = [];
        for (const f of files) {
          const ext = f.name.slice(v.title.length);
          changes.push({ path: `${v.dir}/${f.name}`, sha: null }, { path: `${v.dir}/${title}${ext}`, sha: f.sha });
        }
        await gh.commit(changes, `Umbenannt: ${v.base} → ${title}`);
        return json({ path: `${v.dir}/${title}.${v.ext}` });
      }

      // Vorschaubild / Beschreibung setzen (path = eigenes Video; ohne path: heutiges Video mit title)
      if (url.pathname === '/video/extra') {
        const base = url.searchParams.get('path') ? ownPath().base : `${today()}/${channel}/${q('title')}`;
        if (url.searchParams.get('path')) {
          // altes Vorschaubild in anderem Format entfernen, damit .jpg greift
          const v = ownPath();
          const olds = (await related(v)).filter(f => /\.(png|jpeg|webp)$/i.test(f.name));
          if (olds.length && url.searchParams.get('kind') === 'thumb') await gh.commit(olds.map(f => ({ path: `${v.dir}/${f.name}`, sha: null })), 'Altes Vorschaubild entfernt');
        }
        const kind = url.searchParams.get('kind');
        const body = await readBody(req, MAX_IMAGE);
        if (kind === 'thumb' && isJpeg(body)) await gh.put(`${base}.jpg`, body, `Vorschaubild: ${base}`);
        else if (kind === 'desc') await gh.put(`${base}.txt`, enc(new TextDecoder().decode(body).slice(0, 5000)), `Beschreibung: ${base}`);
        else return json({ error: 'Unbekannt' }, 400);
        return json({ ok: true });
      }
      return json({ error: 'Unbekannt' }, 404);
    } catch (e) {
      return json({ error: e.message || 'Serverfehler' }, e.status || 500);
    }
  },
};

// ---------- GitHub ----------
function github(env) {
  const base = `https://api.github.com/repos/${env.REPO}/contents/`;
  const headers = { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'sloptube-worker' };
  const u = p => base + p.split('/').map(encodeURIComponent).join('/');
  return {
    async get(path) {
      const r = await fetch(u(path) + `?ref=${env.BRANCH}`, { headers });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('GitHub-Fehler ' + r.status);
      const j = await r.json();
      return { sha: j.sha, text: j.content ? new TextDecoder().decode(b64decode(j.content)) : '' };
    },
    async list(dir) {
      const r = await fetch(u(dir) + `?ref=${env.BRANCH}`, { headers });
      if (r.status === 404) return [];
      if (!r.ok) throw new Error('GitHub-Fehler ' + r.status);
      return (await r.json()).filter(f => f.type === 'file');
    },
    // mehrere Dateien in EINEM Commit ändern (sha=null löscht, sha=blob verschiebt ohne neu hochzuladen)
    async commit(changes, message) {
      const api = `https://api.github.com/repos/${env.REPO}/git`;
      const call = async (method, p, body) => {
        const r = await fetch(api + p, { method, headers, body: body && JSON.stringify(body) });
        if (!r.ok) { const e = new Error('GitHub-Fehler ' + r.status); e.status = r.status === 422 ? 409 : 502; throw e; }
        return r.json();
      };
      for (let i = 0; i < 3; i++) {
        try {
          const ref = await call('GET', `/ref/heads/${env.BRANCH}`);
          const head = await call('GET', `/commits/${ref.object.sha}`);
          const tree = await call('POST', '/trees', { base_tree: head.tree.sha, tree: changes.map(c => ({ path: c.path, mode: '100644', type: 'blob', sha: c.sha })) });
          const commit = await call('POST', '/commits', { message, tree: tree.sha, parents: [ref.object.sha] });
          await call('PATCH', `/refs/heads/${env.BRANCH}`, { sha: commit.sha });
          return;
        } catch (e) { if (i === 2 || e.status !== 409) throw e; }
      }
    },
    async exists(path) {
      const r = await fetch(u(path) + `?ref=${env.BRANCH}`, { method: 'HEAD', headers });
      return r.ok;
    },
    async put(path, bytes, message) {
      const old = bytes.length < MAX_IMAGE ? await this.get(path).catch(() => null) : null;
      const r = await fetch(u(path), {
        method: 'PUT', headers,
        body: JSON.stringify({ message, content: b64encode(bytes), branch: env.BRANCH, ...(old ? { sha: old.sha } : {}) }),
      });
      if (!r.ok) { const e = new Error('GitHub-Fehler ' + r.status + ': ' + ((await r.json().catch(() => ({}))).message || '')); e.status = 502; throw e; }
    },
  };
}

// ---------- Helfer ----------
const clean = s => s.trim().replace(/[\\/:*?"<>|#%\x00-\x1f]/g, '').replace(/\s+/g, ' ').replace(/^\.+/, '').replace(/^_/, '');
const today = () => new Date().toISOString().slice(0, 10);
const enc = s => new TextEncoder().encode(s);
const isJpeg = b => b[0] === 0xff && b[1] === 0xd8;
async function sha256(s) {
  const h = await crypto.subtle.digest('SHA-256', enc(s));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function readBody(req, max) {
  const len = +req.headers.get('Content-Length') || 0;
  if (len > max) { const e = new Error(`Datei zu groß (max. ${Math.round(max / 1048576)} MB)`); e.status = 413; throw e; }
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.length > max) { const e = new Error('Datei zu groß'); e.status = 413; throw e; }
  return buf;
}
function b64encode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function b64decode(s) {
  const bin = atob(s.replace(/\n/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
