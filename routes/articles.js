const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Article = require("../models/articles");
const { authenticateToken } = require("../utils/jwtauth");

// Erreur générique
const handleError = (err, res) => {
  res.status(500).json({
    error: err.name || "MongoError",
    message: err.message,
  });
};

/**
 * GET /articles?projectId=...
 *
 * Retourne tous les articles du projet spécifié.
 * projectId est obligatoire.
 * Utilisation du middleware authenticateToken pour vérifier le token
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

    // Trouver tous les articles pour ce projet
    const articles = await Article.find({ projectId })
      .sort({ pubyear: -1 })
      .lean();

    // Retourner directement le tableau d'articles
    res.status(200).json(articles);
  } catch (err) {
    handleError(err, res);
  }
});

/**
 * GET /articles/:id?projectId=...
 *
 * Récupère un article par son champ `id` pour le projet donné.
 * projectId en query est obligatoire.
 * Utilisation du middleware authenticateToken pour vérifier le token
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: "projectId manquant en query." });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "projectId invalide." });
    }

    const article = await Article.findOne({ id, projectId }).lean();
    if (!article) {
      return res.status(404).json({ message: "Article non trouvé pour ce projet." });
    }

    // Retourner l'article trouvé
    res.status(200).json(article);
  } catch (err) {
    handleError(err, res);
  }
});

/**
 * POST /articles
 *
 * Crée un nouvel article pour un projet donné.
 * Body JSON doit contenir obligatoirement `projectId`.
 * Utilisation du middleware authenticateToken pour vérifier le token
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      id,
      title,
      authors,
      authorsFullNames,
      abstract,
      publishedIn,
      url,
      doi,
      pubyear,
      pdfRelativePath,
      referenceType,
      oa_status,
      topics,
      domains,
      fields,
      subfields,
      language,
      keywords,
      openAccess,
      objectFocus,
      dataTypesDiscussed,
      additionalDataTypes,
      discourseGenre,
      methodology,
      funding,
      positionOnDataOpenAccess,
      barriers,
      positionOnOpenAccessAndIssues,
      remarks,
      projectId,
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: "projectId manquant." });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "projectId invalide." });
    }

    const newArticle = new Article({
      id,
      title,
      authors,
      authorsFullNames,
      abstract,
      publishedIn,
      url,
      doi,
      pubyear,
      pdfRelativePath,
      referenceType,
      oa_status,
      topics,
      domains,
      fields,
      subfields,
      language,
      keywords,
      openAccess,
      objectFocus,
      dataTypesDiscussed,
      additionalDataTypes,
      discourseGenre,
      methodology,
      funding,
      positionOnDataOpenAccess,
      barriers,
      positionOnOpenAccessAndIssues,
      remarks,
      projectId,
    });
    await newArticle.validate();
    const saved = await newArticle.save();
    res.status(201).json(saved);
  } catch (err) {
    handleError(err, res);
  }
});

/**
 * PUT /articles/:id
 *
 * Met à jour entièrement un article (par son champ `id`) pour le projet donné.
 * projectId en query est obligatoire.
 * Utilisation du middleware authenticateToken pour vérifier le token
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: "projectId manquant en query." });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "projectId invalide." });
    }

    const article = await Article.findOne({ id, projectId });
    if (!article) {
      return res.status(404).json({ message: "Article non trouvé pour ce projet." });
    }

    article.set(req.body);
    await article.save();
    res.status(200).json(article);
  } catch (err) {
    handleError(err, res);
  }
});

/**
 * DELETE /articles/:id
 *
 * Supprime un article pour le projet donné.
 * Utilisation du middleware authenticateToken pour vérifier le token
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: "projectId manquant en query." });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "projectId invalide." });
    }

    const deleted = await Article.findOneAndDelete({ id, projectId });
    if (!deleted) {
      return res.status(404).json({ message: "Article non trouvé pour ce projet." });
    }
    return res.status(200).json({
      message: "Article supprimé avec succès pour ce projet.",
      article: deleted,
    });
  } catch (err) {
    handleError(err, res);
  }
});

module.exports = router;
