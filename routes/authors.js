// routes/authors.js

// CRUD AUTEURS 

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Author = require("../models/authors");
const { authenticateToken } = require("../utils/jwtauth");

// Utilitaire pour mapper les erreurs Mongo vers un code HTTP approprié (on trouve exactement le même dans articles.js)
const handleError = (err, res) => {
  let status = 500;

  if (err.code === 11000) {
    // Violation d'unicité d'index (duplication de clé)
    status = 409;
  } else if (err.name === "ValidationError" || err.code === 121) {
    // Erreur de validation Mongoose
    status = 400;
  } else if (err.code === 13 || err.code === 18) {
    // Erreur d'authentification/permissions
    status = 401;
  }

  return res.status(status).json({
    error: err.name || "MongoError",
    message: err.message,
    ...(err.code && { code: err.code }),
    ...(err.keyValue && { keyValue: err.keyValue }),
  });
};

/**
 * GET /authors?projectId=...
 *
 * Retourne tous les auteurs pour le projet donné, sans filtres ni sélection de champs.
 * projectId est obligatoire.
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: "projectId manquant." });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "projectId invalide." });
    }

    const authors = await Author.find({ projectId });
    return res.status(200).json(authors);
  } catch (err) {
    handleError(err, res);
  }
});

/**
 * GET /authors/:oa_id?projectId=...
 *
 * Récupère un auteur (oa_id) pour le projet indiqué.
 * projectId dans la query est obligatoire.
 */
router.get("/:oa_id", authenticateToken, async (req, res) => {
  try {
    const { oa_id } = req.params;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: "projectId manquant en query." });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "projectId invalide." });
    }

    const author = await Author.findOne({ oa_id, projectId }).lean();
    if (!author) {
      return res.status(404).json({ message: "Auteur non trouvé pour ce projet." });
    }
    res.status(200).json(author);
  } catch (err) {
    handleError(err, res);
  }
});

/**
 * POST /authors
 *
 * Crée un auteur pour un projet donné.
 * Body JSON doit contenir obligatoirement `projectId`.
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      oa_id,
      orcid,
      display_name,
      cited_by_count,
      works_count,
      institutions,
      countries,
      overall_works,
      doctypes,
      study_works,
      top_five_topics,
      top_five_fields,
      top_two_domains,
      topic_tree,
      gender,
      status,
      annotation,
      projectId,
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: "projectId manquant." });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "projectId invalide." });
    }

    const newAuthor = new Author({
      oa_id,
      orcid,
      display_name,
      cited_by_count,
      works_count,
      institutions,
      countries,
      overall_works,
      doctypes,
      study_works,
      top_five_topics,
      top_five_fields,
      top_two_domains,
      topic_tree,
      gender,
      status,
      annotation,
      projectId,
    });
    await newAuthor.validate();
    const saved = await newAuthor.save();
    return res.status(201).json(saved);
  } catch (err) {
    handleError(err, res);
  }
});

/**
 * PUT /authors/:oa_id?projectId=...
 *
 * Remplace un auteur pour ce projet. Body JSON contient les champs à mettre à jour.
 */
router.put("/:oa_id", authenticateToken, async (req, res) => {
  try {
    const { oa_id } = req.params;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: "projectId manquant en query." });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "projectId invalide." });
    }

    const author = await Author.findOne({ oa_id, projectId });
    if (!author) {
      return res.status(404).json({ message: "Auteur non trouvé pour ce projet." });
    }

    author.set(req.body);
    await author.save();
    res.status(200).json(author);
  } catch (err) {
    handleError(err, res);
  }
});

/**
 * DELETE /authors/:oa_id?projectId=...
 *
 * Supprime l’auteur pour ce projet.
 */
router.delete("/:oa_id", authenticateToken, async (req, res) => {
  try {
    const { oa_id } = req.params;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: "projectId manquant en query." });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "projectId invalide." });
    }

    const deleted = await Author.findOneAndDelete({ oa_id, projectId });
    if (!deleted) {
      return res.status(404).json({ message: "Auteur non trouvé pour ce projet." });
    }
    res.status(200).json({
      message: "Auteur supprimé avec succès pour ce projet.",
      author: deleted,
    });
  } catch (err) {
    res.status(500).json({
      error: err.name || "MongoError",
      message: err.message,
    });
  }
});

module.exports = router;