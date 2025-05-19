const express = require("express");
const router = express.Router();
const Article = require("../models/articles");

// Erreur générique
const handleError = (err, res) => {
  res.status(500).json({
    error: err.name || "MongoError",
    message: err.message,
  });
};

// GET /articles — obtenir tous les articles (tout le schéma, aucune coupe)
router.get("/", async (req, res) => {
  try {
    // Optionnel : tri par date de création/début, ou custom
    const articles = await Article.find({}).sort({ pubyear: -1 }).lean();
    res.status(200).json({ data: articles, total: articles.length });
  } catch (err) {
    handleError(err, res);
  }
});

// GET /articles/:id — obtenir un article par son id (tout le schéma, aucune coupe)
router.get("/:id", async (req, res) => {
  try {
    const article = await Article.findOne({ id: req.params.id }).lean();
    if (!article) {
      return res.status(404).json({ message: "Article non trouvé" });
    }
    res.status(200).json(article);
  } catch (err) {
    handleError(err, res);
  }
});

// POST /articles — ajouter un article
router.post("/", async (req, res) => {
  try {
    const article = new Article(req.body);
    await article.validate();
    const saved = await article.save();
    res.status(201).json(saved);
  } catch (err) {
    handleError(err, res);
  }
});

// PUT /articles/:id — mettre à jour tout l'article
router.put("/:id", async (req, res) => {
  try {
    const article = await Article.findOne({ id: req.params.id });
    if (!article) {
      return res.status(404).json({ message: "Article non trouvé" });
    }
    article.set(req.body);
    await article.save();
    res.status(200).json(article);
  } catch (err) {
    handleError(err, res);
  }
});

// DELETE /articles/:id — supprimer l'article
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Article.findOneAndDelete({ id: req.params.id });
    if (!deleted) {
      return res.status(404).json({ message: "Article non trouvé" });
    }
    res.status(200).json({
      message: "Article supprimé avec succès",
      article: deleted,
    });
  } catch (err) {
    handleError(err, res);
  }
});

module.exports = router;