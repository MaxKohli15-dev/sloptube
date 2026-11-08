// ===== SlopTube translations =====
// Keys are the English texts. To add a language: add it to LANGS and add a column to every entry.
const LANGS = { en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français' };
let LANG = (() => { try { return JSON.parse(localStorage.getItem('lang')) || 'en'; } catch { return 'en'; } })();
if (!LANGS[LANG]) LANG = 'en';
document.documentElement.lang = LANG;

const DICT = {
  // --- navigation / header ---
  'Search': ['Suchen', 'Buscar', 'Rechercher'],
  'Home': ['Startseite', 'Inicio', 'Accueil'],
  'New today': ['Neu heute', 'Nuevo hoy', 'Nouveau aujourd’hui'],
  'Subscriptions': ['Abos', 'Suscripciones', 'Abonnements'],
  'Channels': ['Kanäle', 'Canales', 'Chaînes'],
  'Settings': ['Einstellungen', 'Configuración', 'Paramètres'],
  'Hosted on GitHub Pages': ['Gehostet auf GitHub Pages', 'Alojado en GitHub Pages', 'Hébergé sur GitHub Pages'],
  'Subscribe to channels to see them here.': ['Abonniere Kanäle, um sie hier zu sehen.', 'Suscríbete a canales para verlos aquí.', 'Abonne-toi à des chaînes pour les voir ici.'],
  'Language': ['Sprache', 'Idioma', 'Langue'],

  // --- lists ---
  'Recommended': ['Empfohlen', 'Recomendados', 'Recommandations'],
  'No videos yet.': ['Noch keine Videos da.', 'Todavía no hay videos.', 'Pas encore de vidéos.'],
  'No videos yet. Upload the first one in SlopTube Studio!': ['Noch keine Videos da. Lade das erste im SlopTube Studio hoch!', 'Todavía no hay videos. ¡Sube el primero en SlopTube Studio!', 'Pas encore de vidéos. Mets en ligne la première dans SlopTube Studio !'],
  'Nothing has been uploaded today.': ['Heute wurde noch nichts hochgeladen.', 'Hoy no se ha subido nada.', 'Rien n’a été mis en ligne aujourd’hui.'],
  'You haven\'t subscribed to any channels yet.': ['Du hast noch keine Kanäle abonniert.', 'Todavía no te has suscrito a ningún canal.', 'Tu n’es abonné à aucune chaîne.'],
  'No channels yet.': ['Noch keine Kanäle.', 'Todavía no hay canales.', 'Pas encore de chaînes.'],
  'Results for "{q}"': ['Ergebnisse für „{q}“', 'Resultados para «{q}»', 'Résultats pour « {q} »'],
  'No results.': ['Keine Ergebnisse.', 'Sin resultados.', 'Aucun résultat.'],
  '1 video': ['1 Video', '1 video', '1 vidéo'],
  '{n} videos': ['{n} Videos', '{n} videos', '{n} vidéos'],

  // --- time ---
  'today': ['heute', 'hoy', 'aujourd’hui'],
  'yesterday': ['gestern', 'ayer', 'hier'],
  '{n} days ago': ['vor {n} Tagen', 'hace {n} días', 'il y a {n} jours'],
  '1 week ago': ['vor 1 Woche', 'hace 1 semana', 'il y a 1 semaine'],
  '{n} weeks ago': ['vor {n} Wochen', 'hace {n} semanas', 'il y a {n} semaines'],
  '1 month ago': ['vor 1 Monat', 'hace 1 mes', 'il y a 1 mois'],
  '{n} months ago': ['vor {n} Monaten', 'hace {n} meses', 'il y a {n} mois'],
  '1 year ago': ['vor 1 Jahr', 'hace 1 año', 'il y a 1 an'],
  '{n} years ago': ['vor {n} Jahren', 'hace {n} años', 'il y a {n} ans'],

  // --- channel page ---
  'Customize channel': ['Kanal anpassen', 'Personalizar canal', 'Personnaliser la chaîne'],
  'Subscribe': ['Abonnieren', 'Suscribirse', 'S’abonner'],
  'Subscribed': ['Abonniert', 'Suscrito', 'Abonné'],
  'Channel not found': ['Kanal nicht gefunden', 'Canal no encontrado', 'Chaîne introuvable'],
  'PLAY ALL': ['ALLE WIEDERGEBEN', 'REPRODUCIR TODO', 'TOUT LIRE'],
  'No more videos.': ['Keine weiteren Videos.', 'No hay más videos.', 'Plus d’autres vidéos.'],
  'This channel doesn\'t have any videos yet.': ['Dieser Kanal hat noch keine Videos.', 'Este canal todavía no tiene videos.', 'Cette chaîne n’a pas encore de vidéos.'],
  'Newest first': ['Neueste zuerst', 'Más recientes', 'Plus récentes'],
  'Oldest first': ['Älteste zuerst', 'Más antiguos', 'Plus anciennes'],
  'Description': ['Beschreibung', 'Descripción', 'Description'],
  'No description.': ['Keine Beschreibung.', 'Sin descripción.', 'Aucune description.'],
  'Links': ['Links', 'Enlaces', 'Liens'],
  'Stats': ['Statistiken', 'Estadísticas', 'Statistiques'],
  'Joined {d}': ['Beigetreten: {d}', 'Se unió el {d}', 'Inscrit le {d}'],
  'Home tab': ['Übersicht', 'Inicio', 'Accueil'],
  'Videos': ['Videos', 'Videos', 'Vidéos'],
  'About': ['Kanalinfo', 'Más información', 'À propos'],

  // --- watch page ---
  'Video not found.': ['Video nicht gefunden.', 'Video no encontrado.', 'Vidéo introuvable.'],
  'Published on {d}': ['Veröffentlicht am {d}', 'Publicado el {d}', 'Publiée le {d}'],
  'Share': ['Teilen', 'Compartir', 'Partager'],
  'Copied': ['Kopiert', 'Copiado', 'Copié'],
  'Download': ['Download', 'Descargar', 'Télécharger'],
  'No description': ['Keine Beschreibung', 'Sin descripción', 'Aucune description'],
  'Up next': ['Nächstes Video', 'A continuación', 'À suivre'],
  'AUTOPLAY': ['AUTOPLAY', 'REPRODUCCIÓN AUTOMÁTICA', 'LECTURE AUTO'],
  'No more videos': ['Keine weiteren Videos', 'No hay más videos', 'Plus d’autres vidéos'],
  'Comments': ['Kommentare', 'Comentarios', 'Commentaires'],

  // --- studio ---
  'View channel': ['Kanal ansehen', 'Ver canal', 'Voir la chaîne'],
  'Your channel': ['Dein Kanal', 'Tu canal', 'Ta chaîne'],
  'Dashboard': ['Dashboard', 'Panel', 'Tableau de bord'],
  'Content': ['Inhalte', 'Contenido', 'Contenu'],
  'Customization': ['Anpassung', 'Personalización', 'Personnalisation'],
  'Back to SlopTube': ['Zurück zu SlopTube', 'Volver a SlopTube', 'Retour à SlopTube'],
  'CREATE': ['ERSTELLEN', 'CREAR', 'CRÉER'],
  'Channel dashboard': ['Kanal-Dashboard', 'Panel del canal', 'Tableau de bord de la chaîne'],
  'Latest video': ['Neuestes Video', 'Último video', 'Dernière vidéo'],
  'Published {ago}': ['Veröffentlicht {ago}', 'Publicado {ago}', 'Publiée {ago}'],
  'EDIT VIDEO': ['VIDEO BEARBEITEN', 'EDITAR VIDEO', 'MODIFIER LA VIDÉO'],
  'WATCH': ['ANSEHEN', 'VER', 'REGARDER'],
  'Want to see your first video here? Upload one!': ['Möchtest du dein erstes Video sehen? Lade eins hoch!', '¿Quieres ver tu primer video aquí? ¡Sube uno!', 'Tu veux voir ta première vidéo ici ? Mets-en une en ligne !'],
  'UPLOAD VIDEOS': ['VIDEOS HOCHLADEN', 'SUBIR VIDEOS', 'METTRE EN LIGNE'],
  'Channel analytics': ['Kanalanalysen', 'Estadísticas del canal', 'Statistiques de la chaîne'],
  'Total videos': ['Videos insgesamt', 'Videos en total', 'Vidéos au total'],
  'Storage used': ['Speicher belegt', 'Almacenamiento usado', 'Stockage utilisé'],
  'Latest upload': ['Neuestes Upload', 'Última subida', 'Dernière mise en ligne'],
  'Channel created': ['Kanal erstellt', 'Canal creado', 'Chaîne créée'],
  'Subscribed (in this browser)': ['Abonniert (in diesem Browser)', 'Suscrito (en este navegador)', 'Abonné (dans ce navigateur)'],
  'yes': ['ja', 'sí', 'oui'],
  'no': ['nein', 'no', 'non'],
  'GO TO CONTENT': ['ZU DEN INHALTEN', 'IR AL CONTENIDO', 'VOIR LE CONTENU'],
  'News from the Studio': ['Neuigkeiten aus dem Studio', 'Novedades de Studio', 'Actualités du Studio'],
  'Welcome to SlopTube Studio!': ['Willkommen im SlopTube Studio!', '¡Bienvenido a SlopTube Studio!', 'Bienvenue dans SlopTube Studio !'],
  'Manage everything here: upload videos, change titles, descriptions and thumbnails, delete videos and design your channel with a profile picture and banner.': ['Hier verwaltest du alles: Videos hochladen, Titel, Beschreibung und Thumbnail ändern, Videos löschen und deinen Kanal mit Profilbild und Banner gestalten.', 'Gestiona todo aquí: sube videos, cambia títulos, descripciones y miniaturas, elimina videos y diseña tu canal con foto de perfil y banner.', 'Gère tout ici : mets en ligne des vidéos, modifie titres, descriptions et miniatures, supprime des vidéos et personnalise ta chaîne avec une photo de profil et une bannière.'],
  'Tip: you see changes right away, everyone else after a few minutes.': ['Tipp: Änderungen siehst du sofort, alle anderen nach ein paar Minuten.', 'Consejo: tú ves los cambios al instante, los demás tras unos minutos.', 'Astuce : tu vois les changements tout de suite, les autres après quelques minutes.'],
  'Your channel key': ['Dein Kanal-Schlüssel', 'Tu clave de canal', 'Ta clé de chaîne'],
  'Use it to sign in on other devices. Keep it safe!': ['Damit meldest du dich auf anderen Geräten an. Gut aufheben!', 'Úsala para iniciar sesión en otros dispositivos. ¡Guárdala bien!', 'Elle sert à te connecter sur d’autres appareils. Garde-la bien !'],
  'COPY KEY': ['SCHLÜSSEL KOPIEREN', 'COPIAR CLAVE', 'COPIER LA CLÉ'],
  'COPIED': ['KOPIERT', 'COPIADO', 'COPIÉ'],
  'Channel content': ['Kanalinhalte', 'Contenido del canal', 'Contenu de la chaîne'],
  'Uploads': ['Uploads', 'Subidas', 'Mises en ligne'],
  'Video': ['Video', 'Video', 'Vidéo'],
  'Visibility': ['Sichtbarkeit', 'Visibilidad', 'Visibilité'],
  'Date': ['Datum', 'Fecha', 'Date'],
  'Size': ['Größe', 'Tamaño', 'Taille'],
  'Add description': ['Beschreibung hinzufügen', 'Añadir descripción', 'Ajouter une description'],
  'Details': ['Details', 'Detalles', 'Détails'],
  'Edit': ['Bearbeiten', 'Editar', 'Modifier'],
  'Watch on SlopTube': ['Auf SlopTube ansehen', 'Ver en SlopTube', 'Regarder sur SlopTube'],
  'Watch': ['Ansehen', 'Ver', 'Regarder'],
  'Delete': ['Löschen', 'Eliminar', 'Supprimer'],
  'Public': ['Öffentlich', 'Público', 'Publique'],
  'Published': ['Veröffentlicht', 'Publicado', 'Publiée'],
  'No content available': ['Keine Inhalte verfügbar', 'No hay contenido disponible', 'Aucun contenu disponible'],
  'Video details': ['Videodetails', 'Detalles del video', 'Détails de la vidéo'],
  'Title (required)': ['Titel (erforderlich)', 'Título (obligatorio)', 'Titre (obligatoire)'],
  'Tell viewers about your video': ['Erzähl den Zuschauern etwas über dein Video', 'Cuéntales a los espectadores sobre tu video', 'Présente ta vidéo aux spectateurs'],
  'Thumbnail': ['Thumbnail', 'Miniatura', 'Miniature'],
  'Upload a picture that shows what\'s in your video.': ['Lade ein Bild hoch, das zeigt, worum es in deinem Video geht.', 'Sube una imagen que muestre de qué trata tu video.', 'Mets en ligne une image qui montre le contenu de ta vidéo.'],
  'Upload thumbnail': ['Thumbnail hochladen', 'Subir miniatura', 'Importer une miniature'],
  'Video link': ['Videolink', 'Enlace del video', 'Lien de la vidéo'],
  'Filename': ['Dateiname', 'Nombre de archivo', 'Nom du fichier'],
  'DELETE VIDEO': ['VIDEO LÖSCHEN', 'ELIMINAR VIDEO', 'SUPPRIMER LA VIDÉO'],
  'BACK': ['ZURÜCK', 'VOLVER', 'RETOUR'],
  'SAVE': ['SPEICHERN', 'GUARDAR', 'ENREGISTRER'],
  'Title required': ['Titel erforderlich', 'Título obligatorio', 'Titre obligatoire'],
  'Changing title…': ['Titel wird geändert…', 'Cambiando título…', 'Modification du titre…'],
  'Saving description…': ['Beschreibung wird gespeichert…', 'Guardando descripción…', 'Enregistrement de la description…'],
  'Uploading thumbnail…': ['Thumbnail wird hochgeladen…', 'Subiendo miniatura…', 'Importation de la miniature…'],
  'Saved': ['Gespeichert', 'Guardado', 'Enregistré'],
  'Channel customization': ['Kanalanpassung', 'Personalización del canal', 'Personnalisation de la chaîne'],
  'Branding & info': ['Branding & Infos', 'Imagen e información', 'Image de marque et infos'],
  'Profile picture': ['Profilbild', 'Foto de perfil', 'Photo de profil'],
  'Your profile picture appears next to your videos. Square works best, at least 98×98 pixels.': ['Dein Profilbild erscheint neben deinen Videos. Am besten quadratisch, mind. 98×98 Pixel.', 'Tu foto de perfil aparece junto a tus videos. Mejor cuadrada, mínimo 98×98 píxeles.', 'Ta photo de profil apparaît à côté de tes vidéos. Idéalement carrée, au moins 98×98 pixels.'],
  'UPLOAD': ['HOCHLADEN', 'SUBIR', 'IMPORTER'],
  'Banner image': ['Bannerbild', 'Imagen del banner', 'Image de bannière'],
  'Shown at the top of your channel page. 2048×1152 pixels works best.': ['Wird oben auf deiner Kanalseite angezeigt. Am besten 2048×1152 Pixel.', 'Se muestra arriba en tu canal. Mejor 2048×1152 píxeles.', 'Affichée en haut de ta chaîne. Idéalement 2048×1152 pixels.'],
  'Name': ['Name', 'Nombre', 'Nom'],
  '(the channel name can\'t be changed)': ['(der Kanalname kann nicht geändert werden)', '(el nombre del canal no se puede cambiar)', '(le nom de la chaîne ne peut pas être modifié)'],
  'Tell viewers about your channel': ['Erzähl den Zuschauern etwas über deinen Kanal', 'Cuéntales a los espectadores sobre tu canal', 'Présente ta chaîne aux spectateurs'],
  'https://… (one per line)': ['https://… (einer pro Zeile)', 'https://… (uno por línea)', 'https://… (un par ligne)'],
  'Channel URL': ['Kanal-URL', 'URL del canal', 'URL de la chaîne'],
  'Sign out': ['Abmelden', 'Cerrar sesión', 'Se déconnecter'],
  'Without your channel key you can\'t get back into your channel!': ['Ohne deinen Kanal-Schlüssel kommst du danach nicht mehr in deinen Kanal!', '¡Sin tu clave de canal no podrás volver a entrar!', 'Sans ta clé de chaîne, tu ne pourras plus y accéder !'],
  'SIGN OUT': ['ABMELDEN', 'CERRAR SESIÓN', 'SE DÉCONNECTER'],
  'Really sign out?': ['Wirklich abmelden?', '¿Seguro que quieres cerrar sesión?', 'Vraiment te déconnecter ?'],
  'VIEW CHANNEL': ['KANAL ANSEHEN', 'VER CANAL', 'VOIR LA CHAÎNE'],
  'PUBLISH': ['VERÖFFENTLICHEN', 'PUBLICAR', 'PUBLIER'],
  'Uploading profile picture…': ['Profilbild wird hochgeladen…', 'Subiendo foto de perfil…', 'Importation de la photo de profil…'],
  'Uploading banner…': ['Banner wird hochgeladen…', 'Subiendo banner…', 'Importation de la bannière…'],
  'Saving info…': ['Infos werden gespeichert…', 'Guardando información…', 'Enregistrement des infos…'],
  'Published. Visible to everyone in a few minutes.': ['Veröffentlicht. Für alle sichtbar in ein paar Minuten.', 'Publicado. Visible para todos en unos minutos.', 'Publié. Visible par tous dans quelques minutes.'],

  // --- studio sign-in ---
  'Your place for everything about your channel. No account needed.': ['Dein Ort für alles rund um deinen Kanal. Kein Konto nötig.', 'Tu lugar para todo lo relacionado con tu canal. Sin cuenta.', 'Ton espace pour tout ce qui concerne ta chaîne. Aucun compte requis.'],
  'Create channel': ['Kanal erstellen', 'Crear canal', 'Créer une chaîne'],
  'You get a channel key that only lets you manage your channel. It is saved in this browser.': ['Du bekommst einen Kanal-Schlüssel, mit dem nur du deinen Kanal verwalten kannst. Er wird in diesem Browser gespeichert.', 'Recibirás una clave de canal con la que solo tú podrás gestionar tu canal. Se guarda en este navegador.', 'Tu reçois une clé de chaîne qui te permet, à toi seul, de gérer ta chaîne. Elle est enregistrée dans ce navigateur.'],
  'Channel name': ['Kanalname', 'Nombre del canal', 'Nom de la chaîne'],
  'I already have a channel': ['Ich habe schon einen Kanal', 'Ya tengo un canal', 'J’ai déjà une chaîne'],
  'Channel key': ['Kanal-Schlüssel', 'Clave del canal', 'Clé de chaîne'],
  'Sign in': ['Anmelden', 'Iniciar sesión', 'Se connecter'],

  // --- upload dialog ---
  'Upload videos': ['Videos hochladen', 'Subir videos', 'Mettre en ligne des vidéos'],
  'Drag and drop video files to upload': ['Videodateien zum Hochladen hierher ziehen und ablegen', 'Arrastra y suelta archivos de video para subirlos', 'Glisse-dépose des fichiers vidéo pour les mettre en ligne'],
  'Your videos are public right away. Max. 40 MB.': ['Deine Videos sind sofort öffentlich. Max. 40 MB.', 'Tus videos son públicos al instante. Máx. 40 MB.', 'Tes vidéos sont publiques tout de suite. 40 Mo max.'],
  'SELECT FILES': ['DATEIEN AUSWÄHLEN', 'SELECCIONAR ARCHIVOS', 'SÉLECTIONNER DES FICHIERS'],
  'Saved as: {p} · The thumbnail is created automatically and can be changed later.': ['Speicherort: {p} · Das Thumbnail wird automatisch erstellt und kann später geändert werden.', 'Se guarda en: {p} · La miniatura se crea automáticamente y se puede cambiar después.', 'Enregistré sous : {p} · La miniature est créée automatiquement et peut être modifiée plus tard.'],
  'Title': ['Titel', 'Título', 'Titre'],
  'Please choose a video file': ['Bitte eine Videodatei wählen', 'Elige un archivo de video', 'Choisis un fichier vidéo'],
  'File too large (max. 40 MB)': ['Datei zu groß (max. 40 MB)', 'Archivo demasiado grande (máx. 40 MB)', 'Fichier trop volumineux (40 Mo max.)'],
  'Creating thumbnail…': ['Thumbnail wird erstellt…', 'Creando miniatura…', 'Création de la miniature…'],
  'Uploading…': ['Wird hochgeladen…', 'Subiendo…', 'Mise en ligne…'],
  'Processing…': ['Wird verarbeitet…', 'Procesando…', 'Traitement…'],
  'Published!': ['Veröffentlicht!', '¡Publicado!', 'Publiée !'],
  'Delete video permanently? This can\'t be undone.': ['Video endgültig löschen? Das kann nicht rückgängig gemacht werden.', '¿Eliminar el video para siempre? No se puede deshacer.', 'Supprimer définitivement la vidéo ? C’est irréversible.'],

  // --- settings ---
  'Choose the language of SlopTube and SlopTube Studio. It is saved in this browser.': ['Wähle die Sprache von SlopTube und SlopTube Studio. Sie wird in diesem Browser gespeichert.', 'Elige el idioma de SlopTube y SlopTube Studio. Se guarda en este navegador.', 'Choisis la langue de SlopTube et SlopTube Studio. Elle est enregistrée dans ce navigateur.'],
  'Clear subscriptions': ['Abos löschen', 'Borrar suscripciones', 'Effacer les abonnements'],
  'Removes all subscriptions saved in this browser.': ['Entfernt alle Abos, die in diesem Browser gespeichert sind.', 'Elimina todas las suscripciones guardadas en este navegador.', 'Supprime tous les abonnements enregistrés dans ce navigateur.'],
  'CLEAR': ['LÖSCHEN', 'BORRAR', 'EFFACER'],
  'Remove all subscriptions?': ['Alle Abos entfernen?', '¿Eliminar todas las suscripciones?', 'Supprimer tous les abonnements ?'],
  'Signed in as {n}': ['Angemeldet als {n}', 'Sesión iniciada como {n}', 'Connecté en tant que {n}'],
  'Not signed in. Create a channel in SlopTube Studio.': ['Nicht angemeldet. Erstelle einen Kanal im SlopTube Studio.', 'No has iniciado sesión. Crea un canal en SlopTube Studio.', 'Non connecté. Crée une chaîne dans SlopTube Studio.'],
  'Account': ['Konto', 'Cuenta', 'Compte'],

  // --- errors (also from the upload server) ---
  'Video repo {r} not found (index.json missing).': ['Video-Repo {r} nicht gefunden (index.json fehlt).', 'Repositorio de videos {r} no encontrado (falta index.json).', 'Dépôt vidéo {r} introuvable (index.json manquant).'],
  'Upload server not reachable': ['Upload-Server nicht erreichbar', 'Servidor de subida no disponible', 'Serveur d’envoi injoignable'],
  'Error {n}': ['Fehler {n}', 'Error {n}', 'Erreur {n}'],
  'Not allowed': ['Nicht erlaubt', 'No permitido', 'Non autorisé'],
  'Invalid channel name': ['Ungültiger Kanalname', 'Nombre de canal no válido', 'Nom de chaîne invalide'],
  'This channel name is already taken': ['Diesen Kanalnamen gibt es schon', 'Este nombre de canal ya existe', 'Ce nom de chaîne est déjà pris'],
  'Channel doesn\'t exist': ['Kanal existiert nicht', 'El canal no existe', 'La chaîne n’existe pas'],
  'Wrong channel key': ['Falscher Kanal-Schlüssel', 'Clave de canal incorrecta', 'Clé de chaîne incorrecte'],
  'JPEG only': ['Nur JPEG', 'Solo JPEG', 'JPEG uniquement'],
  'Unknown': ['Unbekannt', 'Desconocido', 'Inconnu'],
  'Invalid title': ['Ungültiger Titel', 'Título no válido', 'Titre invalide'],
  'File type not allowed': ['Dateityp nicht erlaubt', 'Tipo de archivo no permitido', 'Type de fichier non autorisé'],
  'You already uploaded a video with this title today': ['Du hast heute schon ein Video mit diesem Titel', 'Hoy ya subiste un video con este título', 'Tu as déjà mis en ligne une vidéo avec ce titre aujourd’hui'],
  'Not your video': ['Nicht dein Video', 'No es tu video', 'Ce n’est pas ta vidéo'],
  'Video not found': ['Video nicht gefunden', 'Video no encontrado', 'Vidéo introuvable'],
  'That title already exists on that day': ['Diesen Titel gibt es an dem Tag schon', 'Ese título ya existe ese día', 'Ce titre existe déjà ce jour-là'],
  'File too large': ['Datei zu groß', 'Archivo demasiado grande', 'Fichier trop volumineux'],
  'Server error': ['Serverfehler', 'Error del servidor', 'Erreur du serveur'],
};

const LANG_INDEX = { de: 0, es: 1, fr: 2 };
function t(s, vars) {
  let out = s;
  if (LANG !== 'en') { const row = DICT[s]; if (row && row[LANG_INDEX[LANG]]) out = row[LANG_INDEX[LANG]]; }
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return out;
}
const tn = (n, one, many) => (n === 1 ? t(one) : t(many, { n }));
function setLang(l) {
  try { localStorage.setItem('lang', JSON.stringify(l)); } catch {}
  location.reload();
}
// static texts in index.html: <x data-t="English">, placeholders: data-tp
function translateStatic() {
  document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  document.querySelectorAll('[data-tp]').forEach(el => el.placeholder = t(el.dataset.tp));
}
