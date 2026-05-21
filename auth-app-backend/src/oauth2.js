const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ACCESS_TOKEN_EXPIRES_IN = Number(process.env.ACCESS_TOKEN_EXPIRES_IN || 900); // seconds
const REFRESH_TOKEN_EXPIRES_IN = Number(process.env.REFRESH_TOKEN_EXPIRES_IN || 604800); // seconds

function pickScopes(requestedScopes, allowedScopes) {
  // If requestedScopes empty -> default to allowedScopes
  const allowed = new Set((allowedScopes || []).map(String));
  if (!requestedScopes || requestedScopes.length === 0) {
    return [...allowed];
  }
  const result = requestedScopes.map(String).filter((s) => allowed.has(s));
  return [...new Set(result)];
}

function createAccessToken({ user, client, scopes }) {
  const secret = process.env.OAUTH_TOKEN_SECRET || process.env.JWT_SECRET;
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    // keep compatibility with old JWT verify middleware
    id: String(user?._id || user?.id),
    sub: String(user?._id || user?.id),
    email: user?.email,
    role: user?.role,

    // OAuth2-ish claims
    client_id: client?.clientId,
    scopes: scopes || [],
    token_type: 'access_token',

    iat: now,
  };

  return jwt.sign(payload, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

function createRefreshTokenRaw() {
  return crypto.randomBytes(32).toString('hex');
}

async function hashRefreshToken(raw) {
  const rounds = 10;
  return bcrypt.hash(raw, rounds);
}

async function createRefreshToken({ raw, userId, clientId, scopes, RefreshTokenModel }) {
  const tokenHash = await hashRefreshToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000);

  const doc = await RefreshTokenModel.create({
    tokenHash,
    userId,
    clientId,
    expiresAt,
    scopes: scopes || [],
    revokedAt: null,
  });

  return { refreshTokenId: doc._id, expiresAt };
}

module.exports = {
  pickScopes,
  createAccessToken,
  createRefreshTokenRaw,
  createRefreshToken,
  hashRefreshToken,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
};

