const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json()); // Pour parser le JSON
app.use(cors()); // Autorise les requêtes CORS (pour ton frontend React)

// Connexion à MongoDB Atlas (avec options SSL pour éviter les erreurs)
mongoose.connect(process.env.MONGODB_URI, {
  tls: true, // Active TLS
  tlsAllowInvalidCertificates: true, // Contourne les erreurs de certificat (DEV ONLY)
  tlsAllowInvalidHostnames: true, // Contourne les erreurs de nom d'hôte (DEV ONLY)
  serverSelectionTimeoutMS: 30000,
  retryWrites: true,
  w: 'majority'
})
.then(() => console.log('✅ Connecté à MongoDB Atlas'))
.catch(err => console.error('❌ Erreur MongoDB Atlas :', err));

// Modèle Utilisateur
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Caissière'], default: 'Caissière' },
});
const User = mongoose.model('User', UserSchema);

// Middleware pour vérifier le token JWT
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Accès refusé : token manquant' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Token invalide' });
  }
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

  if (!email || !password) {
    return res.status(400).json({ error: 'Champs requis' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, role: 'Caissière' });
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
  res.json({ token, role: user.role, email: user.email });
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

// Route : Vérifier le token (exchange/verification JWT)
// (ne pas inclure /public dans le path car Express sert déjà depuis la racine backend)
app.get('/public/api/auth/verify', authenticate, async (req, res) => {
  return res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
  });
});

// Démarrer le serveur

// Basic health check (useful for smoke tests)
app.get('/public/healthz', (_req, res) => res.status(200).json({ ok: true }));

// Ensure PORT is defined (works both locally and in Docker)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));

