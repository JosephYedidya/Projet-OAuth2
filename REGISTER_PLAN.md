# Plan: Ajouter une page pour créer un utilisateur + connexion immédiate

## Objectif
- Ajouter une page frontend permettant de créer un compte utilisateur.
- Lors de la création, le backend génère et renvoie un JWT.
- Le frontend stocke le token et redirige vers `/dashboard`.
- Suppression du concept de `role` côté UI (on garde le rôle par défaut côté backend = `Caissière`).

## Contexte du code actuel
- Backend (auth-app-backend/public/index.php) supporte déjà `POST /api/users` MAIS c’est protégé Admin uniquement.
- Le schéma d’utilisateur contient un `role` par défaut `Caissière`.

## Modifs proposées (technique)
### Backend
1) Modifier `auth-app-backend/public/index.php`:
   - Ajouter une route **public**: `POST /api/register`.
   - Validation: email/password requis.
   - Appeler `create_user(...)` avec `role` forcé à `Caissière` (aucun rôle venant du client).
   - Juste après création, signer un JWT et le renvoyer dans `{ token, email, role }`.

> Note: on réutilise les fonctions existantes `create_user`, `find_user_by_email`, `sign_jwt` via `src/lib.php`.

### Frontend
2) Créer `mon-frontend/src/pages/Register.jsx`:
   - Formulaire: Email + Password.
   - `api.post('/register', { email, password })`.
   - Stocker `token` dans `localStorage`.
   - Stocker aussi `userEmail` et `userRole` (si nécessaire) puis rediriger.

3) Mettre à jour `mon-frontend/src/App.js`:
   - Ajouter route `/register` -> `<Register />`.

4) Mettre à jour `mon-frontend/src/pages/Login.jsx`:
   - Ajouter un lien “Créer un compte” qui pointe vers `/register`.

### Styles (optionnel)
5) Réutiliser le style `glass-card` existant (aucune nouvelle CSS nécessaire).

## Checklist de validation
- Créer un compte (nouvel utilisateur) fonctionne.
- Le backend renvoie un token.
- L’utilisateur est redirigé sur `/dashboard`.
- Dashboard charge sans erreur et affiche le compteur utilisateurs.

