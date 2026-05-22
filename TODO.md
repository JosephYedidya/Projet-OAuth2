# TODO - Cookie-based auth refactor

## Step 1: Backend logout endpoint
- [ ] Add `POST /public/api/logout` that clears `access_token` + `refresh_token` cookies.
- [ ] Ensure cookies are cleared with `path: '/'`.

## Step 2: Frontend axios config
- [ ] Update `mon-frontend/src/api.js`
  - set `withCredentials: true`
  - remove Authorization/localStorage interceptor
  - add response interceptor: on 401 call `POST /oauth/refresh` then retry once.

## Step 3: Frontend auth helpers
- [ ] Update `mon-frontend/src/auth.js`
  - remove localStorage token logic
  - implement `logout()` calling backend `/public/api/logout`
  - implement `isAuthenticated()` via `/public/api/auth/verify`

## Step 4: Pages updates
- [ ] Update `mon-frontend/src/pages/Login.jsx`
  - remove localStorage writes after login
- [ ] Update `mon-frontend/src/pages/Register.jsx`
  - remove localStorage writes after register
- [ ] Update `mon-frontend/src/pages/AutoDashboard.jsx`
  - remove localStorage token presence checks
- [ ] Update `mon-frontend/src/pages/Dashboard.jsx`
  - remove localStorage token presence checks and clear any gating logic

## Step 5: Backend cookie consistency
- [ ] Align cookieOptions with spec: sameSite Lax, refresh path limited (likely `/oauth/token`), secure true only in prod.

## Step 6: Verification
- [ ] Login -> verify `Set-Cookie` headers
- [ ] `curl` verify: cookies -> `/public/api/auth/verify`
- [ ] Refresh on 401 -> works

