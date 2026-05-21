/*
  Dev helper to create an OAuth2 Client in MongoDB.
  Usage:
    node scripts/create-oauth-client.js

  It will:
    - create or update clientId=demo (grants: password, refresh_token)
    - store bcrypt-hashed clientSecret
*/

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Client = require('../src/models/Client');

const clientId = process.env.OAUTH_CLIENT_ID || 'demo';
const clientSecretPlain = process.env.OAUTH_CLIENT_SECRET || 'demo_secret';

(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('Missing env MONGODB_URI');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
  });

  const clientSecretHash = await bcrypt.hash(clientSecretPlain, 10);

  const grants = ['password', 'refresh_token'];
  const scopes = ['read', 'write'];

  await Client.updateOne(
    { clientId },
    {
      $set: {
        clientSecretHash,
        redirectUris: [],
        grants,
        scopes,
      },
    },
    { upsert: true }
  );

  const created = await Client.findOne({ clientId });
  console.log('OAuth client ready:', {
    clientId: created.clientId,
    grants: created.grants,
    scopes: created.scopes,
  });

  process.exit(0);
})();

