// routes/auth.js

// CREER UN UTILISATEUR OU SE LOGGER

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { registerSchema, loginSchema } = require("../utils/userValidation");
const User = require("../models/users");

const router = express.Router();

// POST /auth/register
router.post("/register", async (req, res) => {
  // 1) Validation Joi pour username, password, lastLogin, projectIds et role
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      errors: error.details.map((d) => ({
        field: d.context.key,
        message: d.message,
      })),
    });
  }

  // value contient déjà username, password, lastLogin, projectIds et role (avec role par défaut "user")
  const { username, password, lastLogin, projectIds = [], role } = value;

  try {
    // 2) Vérifier unicité du username
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ message: "Ce username est déjà utilisé." });
    }

    // 3) Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4) Préparer l’objet à enregistrer
    const newUserData = {
      username,
      role,
      passwordHash,
      lastLogin: lastLogin ? new Date(lastLogin) : null,
      projectIds // Mongoose convertira automatiquement chaque string en ObjectId
    };

    const newUser = new User(newUserData);
    await newUser.save();

    // 5) Générer un JWT pour connexion immédiate
    const payload = { id: newUser._id.toString(), role: newUser.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "secret_key", {
      expiresIn: "1h",
    });

    // 6) Réponse à plat (sans passwordHash)
    return res.status(201).json({
      token,
      id: newUser._id,
      username: newUser.username,
      isActive: newUser.isActive,
      role: newUser.role,
      lastLogin: newUser.lastLogin,
      projectIds: newUser.projectIds,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    });
  } catch (err) {
    console.error("❌ Erreur POST /register :", err);
    return res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  // 1) Validation minimale via loginSchema
  const { error } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      errors: error.details.map((d) => ({
        field: d.context.key,
        message: d.message,
      })),
    });
  }

  const { username, password } = req.body;

  try {
    // 2) Recherche de l’utilisateur par username
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Username ou mot de passe invalide." });
    }

    // 3) Comparaison bcrypt
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Username ou mot de passe invalide." });
    }

    // 4) Vérifier isActive
    if (!user.isActive) {
      return res
        .status(403)
        .json({ message: "Le compte n’est pas encore activé." });
    }

    // 5) Mettre à jour lastLogin
    user.lastLogin = new Date();
    await user.save();

    // 6) Générer un JWT
    const payload = { id: user._id.toString(), role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "secret_key", {
      expiresIn: "1h",
    });

    // 7) Réponse à plat (sans passwordHash)
    return res.json({
      token,
      id: user._id,
      username: user.username,
      isActive: user.isActive,
      role: user.role,
      lastLogin: user.lastLogin,
      projectIds: user.projectIds,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    console.error("❌ Erreur POST /login :", err);
    return res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

module.exports = router;
