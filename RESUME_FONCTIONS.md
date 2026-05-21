# Résumé des fonctions (par fichier)

## 1) `mon-frontend/src/pages/Dashboard.jsx`

### Fonctions utilitaires
- **`initialsFromEmail(email)`**
  - Déduit les initiales (2 caractères) depuis la partie avant `@`.
  - Gère les séparateurs `.`, espaces, `_`, `-`.
  - Retourne `?` si `email` est vide.

- **`safeString(v)`**
  - Retourne `v` si c’est une string, sinon `''`.

- **`includesCI(haystack, needle)`**
  - Test d’appartenance **case-insensitive**.
  - Convertit les 2 valeurs en string, puis fait `toLowerCase().includes(...)`.

### Composant React
- **`Dashboard()`** *(component principal, `export default`)*
  - **État**:
    - `users`: liste utilisateurs chargée depuis l’API.
    - `loading`: indicateur chargement.
    - `query`: texte de recherche.
    - `theme`: récupéré/stocké dans `localStorage` (`dark` par défaut).
  - **Hooks**:
    - `useMemo(profile)`: construit `profile` depuis `localStorage` (nom/email/role/tel/address/birthDate/accentColor).
    - `useEffect([theme])`: applique `document.documentElement.dataset.theme = theme` et persiste dans `localStorage`.
    - `useEffect([navigate])`: vérifie la présence d’un `token`; sinon redirige vers `/login`, puis appelle `fetchUsers()`.
  - **Fonctions internes**:
    - **`fetchUsers()`** (async)
      - `api.get('/api/users')` puis `setUsers(response.data)`.
      - En cas d’erreur: `notification.error(...)`.
      - `finally`: `setLoading(false)`.
    - **`handleLogout()`**
      - Supprime le `token` et les infos stockées dans `localStorage`.
      - Redirige vers `/login`.
  - **Traitement**:
    - `filteredUsers = useMemo(...)` filtre `users` selon `query` via `includesCI`.
    - `registeredCount = users.length`.
    - `columns`: configuration des colonnes du tableau Ant Design (incluant le rendu de `role` et le fallback téléphone).
  - **UI**:
    - Barre profil + toggle thème + bouton déconnexion.
    - Bloc compteur utilisateurs (éléments `users-count-*`).
    - Barre recherche.
    - `Table` AntD avec `filteredUsers`.


## 2) `mon-frontend/src/pages/Login.jsx`

### Composant React
- **`Login()`** *(component principal, `export default`)*
  - **État**:
    - Login: `email`, `password`, `loading`.
    - Create user: `createEmail`, `createPassword`, `creating`.
  - **Hook**:
    - `navigate = useNavigate()`.
  - **Fonctions internes**:
    - **`handleLogin()`** *(async)*
      - Valide `email/password`.
      - `api.post('/api/login', { email, password })`.
      - Stocke `token`, `userEmail`, `userRole`, `isLoggedIn` dans `localStorage`.
      - Stocke aussi les infos optionnelles (`fullName`, `phone`, `address`, `birthDate`, `accentColor`).
      - Redirection vers `/dashboard`.
      - Notifications succès/erreur.
      - `finally`: `setLoading(false)`.
    - **`handleCreateUser()`** *(async, actuellement non utilisé dans le JSX fourni)*
      - Valide `createEmail/createPassword`.
      - Vérifie la présence de `token` dans `localStorage`.
      - `api.post('/api/users', { email, password, role: 'Caissière' }, { headers: Authorization })`.
      - Notification succès/erreur.
      - Met à jour certains champs (`setEmail(createEmail)`, etc.).
      - `finally`: `setCreating(false)`.
  - **UI**:
    - Page conteneur vidéo + `Card` “glass-card”.
    - Champs Email / Password.
    - Bouton `Login` déclenchant `handleLogin`.


## 3) `mon-frontend/src/App.js`

### Composant React
- **`App()`** *(component principal)*
  - Met en place le routing via `BrowserRouter`.
  - Définit les routes:
    - `/login` → `<Login />`
    - `/dashboard` → `<Dashboard />`
    - `/` → `<Login />`
  - `export default App`.


## 4) `mon-frontend/src/api.js`

### Configuration Axios
- **`api`** *(instance Axios exportée default)*
  - Crée une instance avec `baseURL: 'http://localhost:5000/public'`.
  - Intercepteur **request**:
    - **Fonction d’intercepteur** `api.interceptors.request.use(config => ...)`
      - Récupère `token` depuis `localStorage`.
      - Si présent: ajoute `config.headers.Authorization = 'Bearer <token>'`.
      - Retourne `config`.


## 5) `mon-frontend/src/auth.js`

### Fonctions liées à l’auth
- **`login(email, password)`** *(async)*
  - Appelle `api.post('/login', { email, password })`.
  - Stocke `token`, `role`, `email` dans `localStorage`.
  - Retourne `response.data`.

- **`logout()`**
  - Supprime `token`, `role`, `email` de `localStorage`.

- **`isAuthenticated()`**
  - Retourne `true/false` selon présence d’un `token`.

- **`getUserRole()`**
  - Retourne `userRole` ou `role` (compatibilité arrière).

- **`getUserEmail()`**
  - Retourne `userEmail` ou `email` (compatibilité arrière).


## 6) `mon-frontend/src/index.js`

- Code d’entrée CRA:
  - Crée le `root` React via `ReactDOM.createRoot(...)`.
  - Rendu de `<App />` dans `<React.StrictMode>`.
  - Appel `reportWebVitals()`.


## 7) `mon-frontend/src/index.css`
- Styles globaux (fournis dans la lecture précédente: non détaillés ici car non fournis entièrement dans le dump).


## 8) `mon-frontend/src/styles.css`
- Pas de “fonctions”, mais des **règles CSS**:
  - Styles Dashboard (page, shell, topbar, table).
  - Styles compteur utilisateurs:
    - `.users-count-wrap` (conteneur **rounded-square glass card**)
    - `.users-count-icon`
    - `.users-count-tag` (remise à plat pour éviter le look pill)
    - `.users-count-number`, `.users-count-label`
  - Thème light/dark via variables:
    - `:root` définit variables de glass/text.
    - `html[data-theme="light"]` ajuste variables.


## 9) `mon-frontend/src/reportWebVitals.js`
- **`reportWebVitals(onPerfEntry)`**
  - Si `onPerfEntry` existe et est une fonction:
    - Import dynamique de `web-vitals`.
    - Attache `getCLS`, `getFID`, `getFCP`, `getLCP`, `getTTFB`.


## 10) `mon-frontend/src/App.test.js`
- **Test Jest**:
  - `test('renders learn react link', ...)`
  - Rendu `<App />` puis vérifie qu’un texte correspondant à `/learn react/i` est présent.


---

## Note
Le fichier `Login.jsx` que vous avez fourni contient aussi des import/états (ex. `UserAddOutlined`, `setCreateEmail`, `creating`, `handleCreateUser`) pouvant être marqués non utilisés par ESLint selon le JSX actuel.

