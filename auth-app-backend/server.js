const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();


const app = express();

// Middleware
app.use(express.json()); // JSON
app.use(express.urlencoded({ extended: false })); // application/x-www-form-urlencoded (OAuth2)
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(cookieParser());


// Connexion à MongoDB Atlas (avec options SSL pour éviter les erreurs)
mongoose
  .connect(process.env.MONGODB_URI, {
    tls: true,
    tlsAllowInvalidCertificates: true, // DEV ONLY
    tlsAllowInvalidHostnames: true, // DEV ONLY
    serverSelectionTimeoutMS: 30000,
    retryWrites: true,
    w: 'majority',
  })
  .then(() => console.log('✅ Connecté à MongoDB Atlas'))
  .catch((err) => console.error('❌ Erreur MongoDB Atlas :', err));

// Models
const User = require('./src/models/User');
const Client = require('./src/models/Client');


// OAuth helpers
const {
  pickScopes,
  createAccessToken,
  createRefreshTokenRaw,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} = require('./src/oauth2');



// Middleware pour vérifier le token JWT (depuis cookies HttpOnly)
const authenticate = (req, res, next) => {
  const token = req.cookies?.access_token || req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Accès refusé : token manquant' });
  }

  try {
    const secret = process.env.OAUTH_TOKEN_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);

    req.user = decoded;
    req.scopes = decoded.scopes || [];
    next();
  } catch (err) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      req.scopes = decoded.scopes || [];
      return next();
    } catch (_err) {
      return res.status(400).json({ error: 'Token invalide' });
    }
  }
};


const checkScope = (requiredScope) => (req, res, next) => {
  const scopes = req.scopes || [];
  if (!scopes.includes(requiredScope)) {
    return res.status(403).json({ error: 'Scope insuffisant' });
  }
  next();
};


// Middleware pour vérifier le rôle Admin
const checkAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Réservé aux admins' });
  }
  next();
};


// Route : Registration (public) - role forcé à Caissière
app.post('/public/api/register', async (req, res) => {
  const { email, password } = req.body;
  const scopes = req.body.scopes || [];

  if (!email || !password) {
    return res.status(400).json({ error: 'Champs requis' });
  }


  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      role: 'Caissière',
      scopes,
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(201).json({ token, role: user.role, email: user.email });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur création compte' });
  }
});

// Route : Connexion
app.post('/public/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });


  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: 'Mot de passe incorrect' });

  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // HttpOnly cookie
  setAccessCookie(res, token);
  return res.status(200).json({ role: user.role, email: user.email });

});

// Route : Ajouter un utilisateur (Admin uniquement)
app.post('/public/api/users', authenticate, checkAdmin, async (req, res) => {
  const { email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashedPassword, role });
  await user.save();
  res.status(201).json({ message: 'Utilisateur créé' });
});

// Route : Lister les utilisateurs (Admin uniquement)
app.get('/public/api/users', authenticate, checkAdmin, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Route : Supprimer un utilisateur (Admin uniquement)
app.delete('/public/api/users/:id', authenticate, checkAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Utilisateur supprimé' });
});

// Cookie settings (HttpOnly)
function isProd() {
  return process.env.NODE_ENV === 'production';
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'Lax',
  secure: isProd(),
  // path must be root so cookies are sent to all routes
  path: '/',
};

function setAccessCookie(res, accessToken) {
  res.cookie('access_token', accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_EXPIRES_IN * 1000,
  });
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_EXPIRES_IN * 1000,
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}

// OAuth2: token exchange + refresh tokens

function normalizeScopeString(scopes) {

  if (!scopes) return '';
  if (Array.isArray(scopes)) return scopes.join(' ');
  return String(scopes);
}

async function verifyClient({ clientId, clientSecret }) {
  if (!clientId || !clientSecret) return null;
  const client = await Client.findOne({ clientId });
  if (!client) return null;

  const ok = await bcrypt.compare(clientSecret, client.clientSecretHash);
  if (!ok) return null;
  return client;
}

app.post('/oauth/token', async (req, res) => {
  const {
    grant_type: grantType,
    username,
    password,
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  } = req.body || {};

  if (!grantType || !clientId || !clientSecret) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'grant_type, client_id et client_secret requis',
    });
  }

  try {
    const client = await verifyClient({ clientId, clientSecret });
    if (!client) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Client invalide',
      });
    }

    // client must allow requested grant
    const allowedGrants = client.grants || [];
    if (!allowedGrants.includes(grantType)) {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Grant non autorisé pour ce client',
      });
    }

    if (grantType === 'password') {
      if (!username || !password) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'username et password requis pour grant_type=password',
        });
      }

      const user = await User.findOne({ email: username });
      if (!user) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid username or password',
        });
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid username or password',
        });
      }

      const scopes = pickScopes([], client.scopes || user.scopes || []);

      const accessToken = createAccessToken({
        user,
        client,
        scopes: scopes.length ? scopes : user.scopes,
      });

      const rawRefresh = createRefreshTokenRaw();

      // Cookie-only storage (HttpOnly)
      setAccessCookie(res, accessToken);
      setRefreshCookie(res, rawRefresh);

      // Keep OAuth2 shape partially for clients, but tokens are in cookies
      return res.status(200).json({
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
        scope: normalizeScopeString(scopes.length ? scopes : user.scopes),
      });

    }

    if (grantType === 'refresh_token') {
      // Cookie-based refresh flow uses /oauth/refresh endpoint.
      // Keep this endpoint for OAuth2 compatibility but do not persist refresh tokens.
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Utilisez /oauth/refresh (refresh_token cookie) pour rafraîchir access_token',
      });
    }


    // Optional grant: client_credentials (not implementing as it is not in backend spec tests)
    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'Grant non supporté',
    });
  } catch (err) {
    console.error('OAuth2 /oauth/token error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.post('/oauth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'refresh token manquant' });
    }

    // Refresh token is opaque in this implementation. We re-issue access_token by
    // decoding user from access_token if present, otherwise fail.
    // (Full persistent refresh tokens removed.)
    const currentAccessToken = req.cookies?.access_token;
    if (!currentAccessToken) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'access token manquant' });
    }

    const secret = process.env.OAUTH_TOKEN_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(currentAccessToken, secret);

    const user = await User.findById(decoded.id || decoded.sub);
    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'user introuvable' });
    }

    const scopes = user.scopes || [];
    const client = await Client.findOne({});

    const accessToken = createAccessToken({
      user,
      client,
      scopes,
    });

    setAccessCookie(res, accessToken);
    return res.status(200).json({});
  } catch (err) {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'refresh invalide' });
  }
});

app.post('/oauth/revoke', async (req, res) => {

  const { client_id: clientId, client_secret: clientSecret, token } = req.body || {};

  if (!clientId || !clientSecret || !token) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  try {
    const client = await verifyClient({ clientId, clientSecret });
    if (!client) {
      return res.status(401).json({ error: 'invalid_client' });
    }

    const docs = await RefreshToken.find({ clientId, revokedAt: null });
    let match = null;
    for (const doc of docs) {
      const ok = await verifyRefreshToken({ raw: token, refreshTokenDoc: doc });
      if (ok) {
        match = doc;
        break;
      }
    }

    if (match) {
      match.revokedAt = new Date();
      await match.save();
    }

    // OAuth2 recommends same response for success even if token invalid
    return res.status(200).json({ revoked: true });
  } catch (err) {
    console.error('OAuth2 /oauth/revoke error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Route : Déconnexion (clear cookies)
app.post('/public/api/logout', async (req, res) => {
  clearAuthCookies(res);
  return res.status(200).json({ ok: true });
});

// Route : Vérifier le token (exchange/verification JWT)
// (ne pas inclure /public dans le path car Express sert déjà depuis la racine backend)
app.get('/public/api/auth/verify', authenticate, async (req, res) => {
  return res.status(200).json({
    id: req.user.id || req.user.sub,
    email: req.user.email,
    role: req.user.role,
    scopes: req.scopes,
  });
});


// Démarrer le serveur

// Basic health check (useful for smoke tests)
app.get('/public/healthz', (_req, res) => res.status(200).json({ ok: true }));

// Ensure PORT is defined (works both locally and in Docker)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));

