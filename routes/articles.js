const express = require("express");
const router = express.Router();
const Article = require("../models/articles");

// Utilitaire de gestion d'erreur
const handleError = (err, res) => {
  let status = 500;
  if (err.code === 11000) status = 409; // Duplicate key
  else if (err.name === "ValidationError" || err.code === 121) status = 400;
  else if (err.code === 13 || err.code === 18) status = 401;
  res.status(status).json({
    error: err.name || "MongoError",
    message: err.message,
    ...(err.code && { code: err.code }),
    ...(err.keyValue && { keyValue: err.keyValue }),
  });
};

// GET /articles - liste avec pagination, tri simple, et quelques filtres possibles
router.get("/", async (req, res) => {
  try {
    const {
      limit = 50,
      skip = 0,
      sort = "title",
      language,
      objectFocus,
      oa_status,
      keyword,
      author,
    } = req.query;

    let query = Article.find();

    if (language) query = query.where("language").equals(language);
    if (objectFocus) query = query.where("objectFocus").equals(objectFocus);
    if (oa_status !== undefined)
      query = query.where("oa_status").equals(oa_status === "true");
    if (keyword) query = query.where("keywords").in([keyword]);
    if (author) query = query.where("authors").in([author]);

    query = query.select(
      "id title authors pubyear language keywords objectFocus oa_status"
    );

    const sortField = sort.startsWith("-") ? sort : sort;
    query = query.sort(sortField).skip(Number(skip)).limit(Number(limit));

    const articles = await query.exec();

    const countQuery = Article.find();
    if (language) countQuery.where("language").equals(language);
    if (objectFocus) countQuery.where("objectFocus").equals(objectFocus);
    if (oa_status !== undefined)
      countQuery.where("oa_status").equals(oa_status === "true");
    if (keyword) countQuery.where("keywords").in([keyword]);
    if (author) countQuery.where("authors").in([author]);
    const total = await countQuery.countDocuments();

    res.status(200).json({
      data: articles,
      meta: {
        total,
        limit: Number(limit),
        skip: Number(skip),
        hasMore: total > Number(skip) + articles.length,
        filters: {
          language: language || null,
          objectFocus: objectFocus || null,
          oa_status: oa_status !== undefined ? oa_status : null,
          keyword: keyword || null,
          author: author || null,
        },
      },
    });
  } catch (err) {
    handleError(err, res);
  }
});

// GET /articles/:id - un article par son id (OpenAlex)
router.get("/:id", async (req, res) => {
  try {
    const article = await Article.findOne({ id: req.params.id }).lean();
    if (!article) {
      return res.status(404).json({ message: "Article non trouvé" });
    }
    res.status(200).json(article);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// POST /articles - créer un article
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

// PUT /articles/:id - remplacer un article existant (PUT = remplace tout)
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

// DELETE /articles/:id - supprimer un article par son id
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
    res.status(500).json({
      error: err.name || "MongoError",
      message: err.message,
    });
  }
});

module.exports = router;