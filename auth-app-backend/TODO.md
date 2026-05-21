# TODO

## Phase 1 — Switch to Express + Mongo (remove PHP runtime)
- [x] Update `auth-app-backend/Dockerfile` to use a Node base image and run `server.js`.
- [x] Fix `auth-app-backend/package.json` dependencies (express/mongoose/cors/bcryptjs/jsonwebtoken/mongodb/etc.).
- [x] Ensure environment variables (`MONGODB_URI`, `JWT_SECRET`, `PORT`) are loaded in container.
- [x] Remove/ignore PHP runtime pieces (Apache config) in Dockerfile; keep code folder but not executed.

## OAuth2 (Node/Express) — Password grant + refresh tokens
- [x] Create Mongo models: Client, RefreshToken, and extend User with `scopes`
- [x] Create OAuth2 helpers: src/oauth2.js + refresh token verifier
- [ ] Implement `/oauth/token` and `/oauth/revoke` in `auth-app-backend/server.js`
- [ ] Update JWT middleware to expose `scopes` and accept OAuth2 access tokens
- [ ] Smoke test OAuth2 endpoints with curl


## Phase 2 — Verify API contract
- [ ] Smoke test: `POST /public/api/login` returns `{token, role, email}`.
- [ ] Smoke test: `POST /public/api/users` works with Admin token.
- [ ] Smoke test: `GET /public/api/users` works with Admin token.
- [ ] Smoke test: `DELETE /public/api/users/:id` works with Admin token.
- [ ] Smoke test: unauthorized requests return 401/403.

## Phase 3 — Frontend
- [ ] Confirm `mon-frontend/src/pages/Login.jsx` works without modification.

