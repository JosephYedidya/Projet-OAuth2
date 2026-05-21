const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Caissière'], default: 'Caissière' },
    // OAuth scopes for user-based grants
    scopes: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);

