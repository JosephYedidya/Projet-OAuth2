const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, unique: true, index: true },
    // bcrypt hash of clientSecret
    clientSecretHash: { type: String, required: true },
    redirectUris: { type: [String], default: [] },
    // e.g. ["password", "refresh_token", "client_credentials"]
    grants: { type: [String], default: ['password', 'refresh_token'] },
    scopes: { type: [String], default: ['read', 'write'] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', ClientSchema);

