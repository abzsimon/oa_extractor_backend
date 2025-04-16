const express = require('express');
const router = express.Router();
const Author = require('../models/authors');

// POST /authors
router.post('/', async (req, res) => {
  try {
    const author = new Author(req.body);
    await author.validate(); // vérifie les erreurs sans enregistrer
    const saved = await author.save(); // sauvegarde uniquement si tout est valide
    res.status(201).json(saved);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.keys(err.errors).map(key => ({
        field: key,
        message: err.errors[key].message
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la création de l’auteur.' });
  }
});

module.exports = router;
