// ===== SlopTube Einstellungen =====
// Das Repo, in dem die Videos liegen (muss ÖFFENTLICH sein).
// Aufbau darin:  2026-11-07/Kanalname/Videoname.mp4
//   optional:    2026-11-07/Kanalname/Videoname.jpg  (Vorschaubild)
//   optional:    2026-11-07/Kanalname/Videoname.txt  (Beschreibung)
window.SLOPTUBE = {
  owner: 'MaxKohli15-dev',
  repo: 'sloptube-videos',
  branch: 'main',

  // Adresse des Cloudflare-Workers (Upload-Server, hält den GitHub-Token geheim)
  uploadUrl: 'https://sloptube-upload.DEIN-NAME.workers.dev',

  // Optional: Kommentare über giscus (https://giscus.app) – leer lassen = keine Kommentare
  giscus: { repo: '', repoId: '', category: '', categoryId: '' },
};
