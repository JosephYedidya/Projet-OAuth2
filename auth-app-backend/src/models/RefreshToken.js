const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema(
  {
    // bcrypt hash of the raw refresh token
    tokenHash: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    scopes: { type: [String], default: [] },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);

