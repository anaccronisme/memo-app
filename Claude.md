# Note du jour

Application web pour capturer rapidement des notes et des liens vers une base de données Notion.

## Architecture

- **Frontend**: `index.html` - Interface glassmorphism responsive (mobile-first)
- **Backend**: `api/notion.js` - Serverless function Vercel pour l'API Notion
- **Config**: `vercel.json` - Configuration des routes Vercel

## Fonctionnalités

- Ajout de texte (notes)
- Ajout de liens cliquables
- Organisation automatique avec sections "Notes" et "Liens"
- Création automatique de la page du jour (format: `YYYY-MM-DD-JourSemaine`)
- Icône soleil liquid glass pour l'écran d'accueil iPhone
- Pas d'affichage des notes (confidentialité - écriture seule)

## Variables d'environnement (Vercel)

- `NOTION_TOKEN`: Token d'intégration Notion
- `NOTION_DATABASE_ID`: ID de la base de données Notion (sans tirets, sans \n à la fin)

## API Endpoints

`POST /api/notion` avec body JSON:

- `action: 'findPage'` + `title` - Cherche une page par titre
- `action: 'createPage'` + `title` - Crée une page avec sections Notes/Liens
- `action: 'appendContent'` + `pageId` + `content` + `type` + `url?` - Ajoute du contenu

## Déploiement

- **GitHub**: https://github.com/anaccronisme/memo-app
- **Vercel**: https://memo-app-eosin-one.vercel.app

## Notes techniques

- Les liens utilisent des paragraphes avec `text.link` (pas des bookmarks) pour être cliquables
- L'API détecte automatiquement le nom de la propriété titre de la base Notion
- Les nouvelles entrées sont ajoutées juste après le heading de section (ordre antéchronologique)
- Si les sections n'existent pas (anciennes pages), le contenu est ajouté à la fin

## Améliorations possibles

- Ajouter les sections Notes/Liens aux pages existantes qui n'en ont pas
- Mode sombre automatique (déjà supporté via CSS)
- PWA pour installation sur mobile
