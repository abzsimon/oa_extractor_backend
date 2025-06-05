// routes/projects.js
const express = require("express");
const mongoose = require("mongoose");
const Project = require("../models/projects");

const router = express.Router();

/**
 * GET /projects/:projectId
 * Récupère les informations d’un projet par son _id MongoDB
 */
router.get("/:projectId", async (req, res) => {
  const { projectId } = req.params;

  // Vérifier que projectId est un ObjectId valide
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: "ID de projet invalide." });
  }

  try {
    // Trouver le projet
    const project = await Project.findById(projectId).exec();
    if (!project) {
      return res.status(404).json({ message: "Projet non trouvé." });
    }

    // Renvoyer le document complet (les champs chiffrés seront déchiffrés par le plugin)
    return res.json(project);
  } catch (err) {
    console.error("❌ Erreur GET /projects/:projectId :", err);
    return res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

module.exports = router;
