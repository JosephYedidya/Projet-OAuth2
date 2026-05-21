# TODO

## Phase 1 — Switch to Express + Mongo (remove PHP runtime)
- [ ] Update `auth-app-backend/Dockerfile` to use a Node base image and run `server.js`.
- [ ] Fix `auth-app-backend/package.json` dependencies (express/mongoose/cors/bcryptjs/jsonwebtoken/mongodb/etc.).
- [ ] Ensure Express serves routes under `/public` to match existing frontend `baseURL` (`/public`).
- [ ] Ensure environment variables (`MONGODB_URI`, `JWT_SECRET`, `PORT`) are loaded in container.
- [ ] Remove/ignore PHP runtime pieces (Apache config) in Dockerfile; keep code folder but not executed.

## Phase 2 — Verify API contract
- [ ] Smoke test: `POST /public/api/login` returns `{token, role, email}`.
- [ ] Smoke test: `POST /public/api/users` works with Admin token.
- [ ] Smoke test: `GET /public/api/users` works with Admin token.
- [ ] Smoke test: `DELETE /public/api/users/:id` works with Admin token.
- [ ] Smoke test: unauthorized requests return 401/403.

## Phase 3 — Frontend
- [ ] Confirm `mon-frontend/src/pages/Login.jsx` works without modification.

