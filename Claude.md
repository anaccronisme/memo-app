# Note du jour

Application web pour capturer rapidement des notes, liens, mémos vocaux et fichiers vers une base de données Notion.

## Architecture

- **Frontend**: `index.html` - Interface glassmorphism responsive (mobile-first)
- **Backend**: `api/notion.js` - Serverless function Vercel pour l'API Notion
- **Config**: `vercel.json` - Configuration des routes Vercel
- **Assets**: `apple-touch-icon.png`, `favicon.png` - Icône soleil liquid glass

## Fonctionnalités

- **Texte** - Notes tapées manuellement
- **Liens** - URLs cliquables avec description optionnelle
- **Dictée** - Reconnaissance vocale (Web Speech API, français)
- **Fichiers** - Upload d'images via imgbb
- Organisation automatique en 4 sections : Notes, Liens, Mémos Vocaux, Fichiers
- Création automatique de la page du jour (format: `YYYY-MM-DD-JourSemaine`)
- Envoi avec touche Entrée
- Bouton "Ouvrir dans Notion"
- Icône soleil pour l'écran d'accueil iPhone
- Mode écriture seule (confidentialité - pas d'affichage des notes)
- Dark mode automatique
- Footer "Vibe Codé par Anthony"

## Variables d'environnement (Vercel)

- `NOTION_TOKEN` - Token d'intégration Notion
- `NOTION_DATABASE_ID` - ID de la base de données Notion (sans tirets, sans \n)
- `IMGBB_API_KEY` - Clé API imgbb pour l'upload d'images (gratuit sur api.imgbb.com)

## API Endpoints

`POST /api/notion` avec body JSON:

- `action: 'findPage'` + `title` - Cherche une page par titre
- `action: 'createPage'` + `title` - Crée une page avec les 4 sections
- `action: 'appendContent'` + `pageId` + `content` + `type` + `url?` - Ajoute du contenu
  - `type: 'text'` → section Notes
  - `type: 'link'` → section Liens
  - `type: 'voice'` → section Mémos Vocaux
- `action: 'uploadImage'` + `title` + `imageData` + `filename` - Upload image et ajoute à section Fichiers
- `action: 'appendImage'` + `pageId` + `imageUrl` + `caption` - Ajoute une image externe
- `action: 'getContent'` + `pageId` - Récupère le contenu (non utilisé côté frontend)

## Déploiement

- **GitHub**: https://github.com/anaccronisme/memo-app
- **Vercel**: https://memo-app-eosin-one.vercel.app

## Notes techniques

- Les liens utilisent des paragraphes avec `text.link` (pas des bookmarks) pour être cliquables
- L'API détecte automatiquement le nom de la propriété titre de la base Notion
- Les nouvelles entrées sont ajoutées après le heading de section correspondant
- Si les sections n'existent pas (anciennes pages), le contenu est ajouté à la fin
- `window.location.href` utilisé pour ouvrir Notion (au lieu de `window.open` bloqué par Safari)
- Dictée : Web Speech API avec `recognition.continuous = true` pour dictée longue
- Upload images : conversion base64 côté frontend, envoi au backend, upload vers imgbb, puis ajout à Notion
- Dark mode : variables CSS avec `prefers-color-scheme: dark`, couleurs adaptées (pas de noir ni vert)

## Structure des pages Notion

Chaque page du jour contient 4 sections (headings H2) :
1. **Notes** - Texte tapé
2. **Liens** - URLs avec description
3. **Mémos Vocaux** - Texte dicté
4. **Fichiers** - Images uploadées
