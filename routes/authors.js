// routes/authors.js

// CRUD AUTEURS

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Author = require("../models/authors");
const Article = require("../models/articles");
const { authenticateToken } = require("../utils/jwtauth");
const { computeAuthorCompletionRate } = require("../utils/completionRate");

// Utilitaire pour mapper les erreurs Mongo vers un code HTTP approprié (on trouve exactement le même dans authors.js)

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

/* ---------------------------------------------------------
   GET /authors/search?display_name=...&projectId=...
   Recherche par nom (fuzzy) pour un projet
--------------------------------------------------------- */
router.get("/search", authenticateToken, async (req, res) => {
  try {
    const { display_name, projectId } = req.query;
    const trimmedName = display_name?.trim();

    if (!trimmedName || !projectId) {
      return res.status(400).json({
        message: "Les paramètres 'display_name' et 'projectId' sont requis.",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res
        .status(400)
        .json({ message: "'projectId' n'est pas un ObjectId valide." });
    }

    const normalized = trimmedName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const exact = new RegExp(escaped, "i");
    const fuzzy = new RegExp(escaped.split(" ").join(".*"), "i");

    const matches = await Author.find({
      projectId,
      $or: [
        { display_name: { $regex: exact } },
        { display_name: { $regex: fuzzy } },
      ],
    })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      count: matches.length,
      authors: matches,
    });
  } catch (err) {
    handleError(err, res);
  }
});

/* ---------------------------------------------------------
   GET /authors?projectId=...
   Retourne tous les auteurs du projet
--------------------------------------------------------- */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId)
      return res.status(400).json({ message: "projectId manquant." });
    if (!mongoose.Types.ObjectId.isValid(projectId))
      return res.status(400).json({ message: "projectId invalide." });

    const authors = await Author.find({ projectId });
    res.status(200).json(authors);
  } catch (err) {
    handleError(err, res);
  }
});

/* ---------------------------------------------------------
   GET /authors/:id/articles?projectId=...
   Récupère tous les articles associés à un auteur (via son id)
--------------------------------------------------------- */
router.get("/:id/articles", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { projectId } = req.query;

  console.log("📥 Requête reçue /authors/:id/articles", { id, projectId });

  if (!projectId)
    return res.status(400).json({ message: "projectId manquant." });
  if (!mongoose.Types.ObjectId.isValid(projectId))
    return res.status(400).json({ message: "projectId invalide." });

  try {
    const articles = await Article.find({ authors: id, projectId })
      .populate({
        path: "authors",
        model: "Author",
        match: { projectId },
        localField: "authors",
        foreignField: "id",
      })
      .lean();

    res.status(200).json(articles);
  } catch (err) {
    console.error("❌ Erreur dans /authors/:id/articles:", err);
    return res.status(500).json({
      message: "Erreur serveur dans la récupération des articles.",
      error: err.message,
    });
  }
});

/* ---------------------------------------------------------
   GET /authors/:id?projectId=...
   Récupère un auteur par id pour le projet
--------------------------------------------------------- */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.query;

    if (!projectId)
      return res.status(400).json({ message: "projectId manquant." });
    if (!mongoose.Types.ObjectId.isValid(projectId))
      return res.status(400).json({ message: "projectId invalide." });

    const author = await Author.findOne({ id, projectId }).lean();
    if (!author) return res.status(404).json({ message: "Auteur non trouvé." });

    res.status(200).json(author);
  } catch (err) {
    handleError(err, res);
  }
});

/* ---------------------------------------------------------
   POST /authors/bulk
   Upsert d’un tableau d’auteurs (au moment de la création manuelle d'un article avec des auteurs, ajoutés manuellement ou récupérés depuis OpenAlex, pour éviter les erreurs de synchronisation)
--------------------------------------------------------- */
router.post("/bulk", authenticateToken, async (req, res) => {
  try {
    const authors = req.body; // tableau [{ id, display_name, projectId, ... }]

    if (!Array.isArray(authors) || authors.length === 0) {
      return res
        .status(400)
        .json({ message: "Le corps doit être un tableau non vide." });
    }

    // 1️⃣  Vérifications rapides + construction des opérations
    const ops = [];
    for (const a of authors) {
      if (!a.projectId || !mongoose.Types.ObjectId.isValid(a.projectId)) {
        return res.status(400).json({
          message: "Chaque auteur doit contenir un projectId valide.",
        });
      }
      if (!a.id || !a.display_name) {
        return res.status(400).json({
          message: "Chaque auteur doit avoir 'id' et 'display_name'.",
        });
      }

      ops.push({
        updateOne: {
          filter: { id: a.id, projectId: a.projectId },
          update: { $setOnInsert: a }, // ⚠️ change en $set: a si tu veux MAJ
          upsert: true,
        },
      });
    }

    // 2️⃣  Exécution en masse
    const result = await Author.bulkWrite(ops, { ordered: false });

    /* result example :
       { nInserted, nUpserted, nMatched, nModified, nUpserted, nExisting, ... }
    */
    res.status(200).json({
      ok: true,
      created: result.upsertedCount ?? 0,
      skipped: result.nMatched ?? 0,
      total: authors.length,
    });
  } catch (err) {
    handleError(err, res); // ta fonction existante
  }
});

/* ---------------------------------------------------------
   POST /authors
   Création d’un auteur (corps JSON + projectId)
--------------------------------------------------------- */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      id,
      source,
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

    if (!projectId)
      return res.status(400).json({ message: "projectId manquant." });
    if (!mongoose.Types.ObjectId.isValid(projectId))
      return res.status(400).json({ message: "projectId invalide." });

    const newAuthor = new Author({
      id,
      source,
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

    newAuthor.completionRate = computeAuthorCompletionRate(newAuthor);

    await newAuthor.validate();
    const saved = await newAuthor.save();
    res.status(201).json(saved);
  } catch (err) {
    handleError(err, res);
  }
});

/* ---------------------------------------------------------
   PUT /authors/:id?projectId=...
   Mise à jour complète d’un auteur
--------------------------------------------------------- */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.query;

    if (!projectId)
      return res.status(400).json({ message: "projectId manquant." });
    if (!mongoose.Types.ObjectId.isValid(projectId))
      return res.status(400).json({ message: "projectId invalide." });

    const author = await Author.findOne({ id, projectId });
    if (!author) return res.status(404).json({ message: "Auteur non trouvé." });

    author.set(req.body);
    author.completionRate = computeAuthorCompletionRate(author);

    await author.save();
    res.status(200).json(author);
  } catch (err) {
    handleError(err, res);
  }
});

/* ---------------------------------------------------------
   DELETE /authors/:id?projectId=...
   Suppression d’un auteur
--------------------------------------------------------- */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.query;

    if (!projectId)
      return res.status(400).json({ message: "projectId manquant." });
    if (!mongoose.Types.ObjectId.isValid(projectId))
      return res.status(400).json({ message: "projectId invalide." });

    const deleted = await Author.findOneAndDelete({ id, projectId });
    if (!deleted)
      return res.status(404).json({ message: "Auteur non trouvé." });

    res.status(200).json({
      message: "Auteur supprimé avec succès.",
      author: deleted,
    });
  } catch (err) {
    handleError(err, res);
  }
});

module.exports = router;
