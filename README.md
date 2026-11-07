# SlopTube

YouTube-2019-Style Video-Seite für **GitHub Pages**. Die Videos liegen in einem **zweiten Repo**.

## Einrichtung

1. **Repo für die Website** (z. B. `sloptube`): diese Dateien hochladen (`index.html`, `app.js`, `config.js`).
   Dann *Settings → Pages → Branch: main / root* → Speichern.
2. **Repo für die Videos** (z. B. `sloptube-videos`): neu anlegen, **öffentlich**, mit README (damit es nicht leer ist).
3. In `config.js` `owner` (dein GitHub-Name) und `repo` (Video-Repo) eintragen.

## Aufbau des Video-Repos

```
2026-11-07/
  MaxGaming/
    Mein erstes Video.mp4
    Mein erstes Video.jpg   ← Vorschaubild (optional, wird beim Upload automatisch erstellt)
    Mein erstes Video.txt   ← Beschreibung (optional)
2026-11-08/
  Anderer Kanal/
    Lustige Katze.webm
```

Ordner = Datum → Kanalname → Video. Die Seite liest das Repo und baut daraus alles: Startseite, Kanäle, Suche.

## Videos hochladen

- **Über SlopTube:** erst unter „Mein Kanal“ Token, Kanalname, Profilbild und Banner eintragen, dann 📹-Knopf. Braucht einen GitHub-Token mit Schreibrecht aufs Video-Repo
  (Fine-grained Token, nur dieses Repo, „Contents: Read and write“). Wer hochladen soll, braucht Zugriff
  (z. B. als *Collaborator* eintragen) oder du gibst ihm einen Token.
- **Oder direkt auf GitHub:** im Video-Repo *Add file → Upload files* und Pfad `Datum/Kanal/` davor schreiben.

## Grenzen (wegen GitHub)

- Max. ~95 MB pro Video (GitHub-Limit 100 MB), Repo sollte unter ~1–5 GB bleiben.
- Kein 60-Abrufe-Limit: Eine GitHub Action im Video-Repo baut nach jedem Upload `index.json`, die Seite lädt nur diese Datei.
- Abos werden im Browser gespeichert. Kommentare optional über [giscus](https://giscus.app) (in `config.js`).
- Nach einem Upload kann es 1–2 Minuten dauern, bis das Video abspielbar ist.
