# App Fonctionnement (Mon-frontend + Auth App Backend)

## 1) Architecture
- **mon-frontend**: application React (Create React App) qui gère l’UI et appelle l’API.
- **auth-app-backend**: serveur Node/Express + MongoDB.
  - Le **JWT** n’est pas stocké côté navigateur (pas de `localStorage` pour les tokens).
  - Le backend envoie un **cookie HttpOnly** `access_token`.

## 2) Démarrage (local)
### A. Lancer le backend
Dans `auth-app-backend/`:
```bash
npm install
npm start
```
- Le serveur écoute typiquement sur **PORT=5000**.

### B. Lancer le frontend
Dans `mon-frontend/`:
```bash
npm install
npm start
```
- Le frontend écoute typiquement sur **http://localhost:3000**.
- Si le port est déjà utilisé, CRA propose un autre port (ex: 3001).

## 3) CORS & cookies (point critique)
Le frontend utilise axios avec:
- `baseURL: 'http://localhost:5000'`
- `withCredentials: true`

Le backend a:
- `cors({ origin: true, credentials: true })`
- `cookieParser()`
- cookies configurés en `HttpOnly`, `sameSite: 'Lax'`, `path: '/'`

➡️ Résultat attendu: le navigateur accepte le cookie et l’envoie automatiquement lors des requêtes suivantes.

## 4) Parcours d’authentification
### A. Login
Route backend:
- `POST /public/api/login`

Le frontend:
- appelle `login(email, password)`
- le backend répond avec un JSON `role/email`
- et surtout pose le cookie `access_token` (HttpOnly)

### B. Vérification session
Route backend:
- `GET /public/api/auth/verify`

Le middleware `authenticate` lit:
- `req.cookies.access_token` (ou `req.cookies.token`)

Si cookie présent et JWT valide:
- réponse `200` avec `id/email/role/scopes`
Sinon:
- `401` avec `{ error: 'Accès refusé : token manquant' }`

### C. Logout
Route backend:
- `POST /public/api/logout`

Le backend efface:
- `access_token`
- `refresh_token` (même si refresh n’est pas persisté dans cette implémentation)

## 5) API utilisée par l’UI
Exemples côté frontend:
- Liste users: `GET /public/api/users` (middleware `authenticate + checkAdmin` côté backend)
- Logout: `POST /public/api/logout`

## 6) Dépannage rapide “connexion / token manquant”
1. Vérifier que le login **renvoie bien** un cookie `Set-Cookie: access_token=...; HttpOnly`.
2. Vérifier que le frontend fait bien `withCredentials: true` (dans `mon-frontend/src/api.js`).
3. Vérifier que les endpoints sont bien dans le bon format:
   - login: `/public/api/login`
   - verify: `/public/api/auth/verify`
   - logout: `/public/api/logout`
4. Si un reverse proxy / changement de host est utilisé:
   - attention au `secure` (cookie en `secure: true` seulement en prod)

## 7) Notes importantes
- L’ancienne approche “token dans localStorage / Authorization header” ne doit pas être utilisée avec ce backend cookie-based.
- Le flux de rafraîchissement OAuth2 complet n’est pas un refresh token persistant (la logique est simplifiée autour de `/oauth/refresh`).

