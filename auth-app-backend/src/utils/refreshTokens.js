const bcrypt = require('bcryptjs');

async function verifyRefreshToken({ raw, refreshTokenDoc }) {
  if (!refreshTokenDoc || !raw) return false;

  const tokenHash = refreshTokenDoc.tokenHash;
  if (!tokenHash) return false;

  if (refreshTokenDoc.revokedAt) return false;
  if (
    refreshTokenDoc.expiresAt &&
    refreshTokenDoc.expiresAt.getTime() < Date.now()
  ) {
    return false;
  }

  return bcrypt.compare(raw, tokenHash);
}


module.exports = { verifyRefreshToken };

