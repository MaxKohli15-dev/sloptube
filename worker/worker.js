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

      // Vorschaubild / Beschreibung zu einem eigenen Video von heute
      if (url.pathname === '/video/extra') {
        const base = `${today()}/${channel}/${q('title')}`;
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
