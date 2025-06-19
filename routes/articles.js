// routes/articles.js

// CRUD ARTICLES 

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Article = require("../models/articles");
const { authenticateToken } = require("../utils/jwtauth");
const { computeArticleCompletionRate } = require("../utils/completionRate");

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

// ------------------------------------------------------------------
// GET /articles/search?title=...&projectId=...
// Recherche d'articles par titre (fuzzy) pour un projet donné
// ------------------------------------------------------------------
router.get("/search", authenticateToken, async (req, res) => {
  console.log("✅ Route /articles/search atteinte");
  
  try {
    const { title, projectId } = req.query;
    
    // Validation des paramètres
    const trimmedTitle = title?.trim();
    if (!trimmedTitle || !projectId) {
      return res.status(400).json({ 
        message: "Les paramètres 'title' et 'projectId' sont requis." 
      });
    }
    
    // Validation de l'ObjectId MongoDB
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ 
        message: "Le paramètre 'projectId' n'est pas un ObjectId valide." 
      });
    }
    
    // Normalisation et échappement pour la recherche
    const normalizedTitle = trimmedTitle
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    // Échapper les caractères spéciaux regex
    const escapedTitle = normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Créer les patterns de recherche
    const exactRegex = new RegExp(escapedTitle, "i");
    const fuzzyRegex = new RegExp(escapedTitle.split(' ').join('.*'), 'i');
    
    console.log("🔍 Recherche avec titre:", trimmedTitle);
    console.log("🔍 Titre normalisé:", normalizedTitle);
    
    // Recherche avec plusieurs stratégies
    const matches = await Article.find({
      projectId,
      $or: [
        { title: { $regex: exactRegex } },
        { title: { $regex: fuzzyRegex } }
      ]
    })
    .limit(10)
    .lean();
    
    console.log(`✅ ${matches.length} article(s) trouvé(s)`);
    
    return res.status(200).json({
      success: true,
      count: matches.length,
      articles: matches
    });
    
  } catch (err) {
    console.error("❌ Erreur /articles/search :", err);
    return res.status(500).json({ 
      success: false,
      message: "Erreur interne du serveur", 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ------------------------------------------------------------------
// GET /articles?projectId=...
// Tous les articles d’un projet
// ------------------------------------------------------------------
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: "projectId manquant." });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "projectId invalide." });
    }

    const articles = await Article.find({ projectId })
      .sort({ pubyear: -1 })
      .lean();

    res.status(200).json(articles);
  } catch (err) {
    handleError(err, res);
  }
});

// ------------------------------------------------------------------
// GET /articles/:id?projectId=...
// Article par ID interne (champ `id`) pour un projet
// ------------------------------------------------------------------
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
      return res
        .status(404)
        .json({ message: "Article non trouvé pour ce projet." });
    }

    res.status(200).json(article);
  } catch (err) {
    handleError(err, res);
  }
});

// ------------------------------------------------------------------
// POST /articles
// Création d’un article manuel
// ------------------------------------------------------------------
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
      source
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
      source
    });

    newArticle.completionRate = computeArticleCompletionRate(newArticle);

    await newArticle.validate();
    const saved = await newArticle.save();
    res.status(201).json(saved);
  } catch (err) {
    handleError(err, res);
  }
});

// ------------------------------------------------------------------
// PUT /articles/:id?projectId=...
// Mise à jour complète d’un article
// ------------------------------------------------------------------
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
      return res
        .status(404)
        .json({ message: "Article non trouvé pour ce projet." });
    }

    article.set(req.body);
    article.completionRate = computeArticleCompletionRate(article);

    await article.save();
    res.status(200).json(article);
  } catch (err) {
    handleError(err, res);
  }
});

// ------------------------------------------------------------------
// DELETE /articles/:id?projectId=...
// Suppression d’un article
// ------------------------------------------------------------------
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
      return res
        .status(404)
        .json({ message: "Article non trouvé pour ce projet." });
    }

    res.status(200).json({
      message: "Article supprimé avec succès pour ce projet.",
      article: deleted,
    });
  } catch (err) {
    handleError(err, res);
  }
});

module.exports = router;
