const express = require("express");
const router = express.Router();
const Author = require("../models/authors");

// Fonction utilitaire pour la gestion d'erreurs PUT & DELETE
const handleError = (err, res) => {
  let status = 500;
  // Gestion des erreurs communes
  if (err.code === 11000) status = 409; // Erreurs de doublon de clé oa_id
  else if (err.name === "ValidationError" || err.code === 121)
    status = 400; // Erreurs liées aux validators du schema
  else if (err.code === 13 || err.code === 18) status = 401; // Erreurs liés à l'authentification

  res.status(status).json({
    error: err.name || "MongoError",
    message: err.message,
    ...(err.code && { code: err.code }), // Inclure le code d'erreur Mongo si présent
    ...(err.keyValue && { keyValue: err.keyValue }), // En cas de duplicat, inclure la clé oa_id
  });
};

// Fonctions utilitaires pour GET 

// GET /authors - obtenir plusieurs auteurs avec filtres, pagination et tri
router.get("/", async (req, res) => {
  try {
    const {
      limit = 50,
      skip = 0,
      sort = "display_name",
      topic,
      domain,
      field,
      minCitations,
      gender,
      status,
    } = req.query;

    // Construction de la requête de base
    let query = Author.find();

    // Ajout des filtres conditionnels
    if (minCitations) {
      query = query.where("cited_by_count").gte(Number(minCitations));
    }

    if (topic) {
      query = query.where("top_five_topics").in([topic]);
    }

    if (gender) {
      query = query.where("manstats.gender").equals(gender);
    }

    if (status) {
      query = query.where("manstats.status").equals(status);
    }

    // Filtrage par domaine ou champ (plus complexe car dans des sous-documents)
    if (domain) {
      query = query.where("topic_tree.name").equals(domain);
    }

    if (field) {
      query = query.where("topic_tree.fields.name").equals(field);
    }

    // Optimisation: sélectionner seulement les champs nécessaires pour la liste
    // Évite de charger toute l'arborescence des topics pour chaque auteur
    query = query.select(
      "oa_id display_name cited_by_count works_count top_five_topics manstats.gender"
    );

    // Ajout de la pagination et du tri
    const sortField = sort.startsWith("-") ? sort : sort;
    query = query.sort(sortField).skip(Number(skip)).limit(Number(limit));

    // Exécution de la requête
    const authors = await query.exec();

    // Comptage du nombre total d'auteurs (avec les mêmes filtres)
    const countQuery = Author.find();

    // Appliquer les mêmes filtres au comptage
    if (minCitations)
      countQuery.where("cited_by_count").gte(Number(minCitations));
    if (topic) countQuery.where("top_five_topics").in([topic]);
    if (gender) countQuery.where("manstats.gender").equals(gender);
    if (status) countQuery.where("manstats.status").equals(status);
    if (domain) countQuery.where("topic_tree.name").equals(domain);
    if (field) countQuery.where("topic_tree.fields.name").equals(field);

    const total = await countQuery.countDocuments();

    // Renvoyer les résultats avec les métadonnées
    res.status(200).json({
      data: authors,
      meta: {
        total,
        limit: Number(limit),
        skip: Number(skip),
        hasMore: total > Number(skip) + authors.length,
        filters: {
          topic: topic || null,
          domain: domain || null,
          field: field || null,
          minCitations: minCitations ? Number(minCitations) : null,
          gender: gender || null,
          status: status || null,
        },
      },
    });
  } catch (err) {
    handleError(err, res);
  }
});

// GET /authors/:oa_id - obtenir un auteur spécifique avec toutes ses données
router.get("/:oa_id", async (req, res) => {
  try {
    const author = await Author.findOne({ oa_id: req.params.oa_id }).lean();

    if (!author) {
      return res.status(404).json({ message: "Auteur non trouvé" });
    }

    res.status(200).json(author);
  } catch (err) {
    console.error("Erreur lors de la récupération de l'auteur :", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// POST /authors -- ajouter un auteur à la DB
router.post("/", async (req, res) => {
  try {
    const author = new Author(req.body);
    await author.validate();
    const saved = await author.save();
    res.status(201).json(saved);
  } catch (err) {
    handleError(err, res);
  }
});

// PUT /authors/:oa_id -- remplace les données de l'auteur
router.put("/:oa_id", async (req, res) => {
  try {
    const author = await Author.findOne({ oa_id: req.params.oa_id });
    if (!author) {
      return res.status(404).json({ message: "Auteur non trouvé" });
    }
    author.set(req.body); // Applique les nouvelles données
    await author.save(); // Valide, met à jour updatedAt, déclenche les hooks
    res.status(200).json(author);
  } catch (err) {
    handleError(err, res);
  }
});

// DELETE -- supprimer un auteur
router.delete("/:oa_id", async (req, res) => {
  try {
    const deleted = await Author.findOneAndDelete({ oa_id: req.params.oa_id });
    if (!deleted) {
      return res.status(404).json({ message: "Auteur non trouvé" });
    }
    res.status(200).json({
      message: "Auteur supprimé avec succès",
      author: deleted,
    });
  } catch (err) {
    // Pour cette route, on utilise une gestion d'erreur simplifiée car les erreurs possibles sont moins nombreuses pour la suppression
    res.status(500).json({
      error: err.name || "MongoError",
      message: err.message,
    });
  }
});

module.exports = router;
