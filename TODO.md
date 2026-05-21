# TODO

## OAuth2 (Node/Express) — OAuth2 password grant + refresh tokens

- [x] Create project-local OAuth2 helpers (src/oauth2.js)
- [x] Add Mongo models: Client + RefreshToken (and extend User with scopes)
- [ ] Add `/oauth/token` (password grant + refresh_token grant)
- [ ] Add `/oauth/revoke` (optional but implemented)
- [ ] Update JWT authenticate middleware to accept OAuth2 access tokens + expose scopes
- [ ] Add `checkScope(requiredScope)` middleware and guard admin routes where relevant
- [ ] Update package.json dependencies if needed (urlencoded parsing)
- [ ] Update .env variables for token TTL + OAUTH_TOKEN_SECRET (document in README/TODO)
- [ ] Smoke test with curl for:
  - [ ] password grant -> access_token + refresh_token
  - [ ] refresh grant -> new access_token
  - [ ] revoke -> refresh token fails
  - [ ] access_token can call `/public/api/users`


