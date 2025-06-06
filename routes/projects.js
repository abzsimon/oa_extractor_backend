// routes/projects.js
const express = require("express");
const mongoose = require("mongoose");
const Project = require("../models/projects");
const { authenticateToken } = require("../utils/jwtauth"); // Adjust path as needed
const router = express.Router();

/**
 * GET /projects/:projectId
 * Récupère les informations d'un projet par son _id MongoDB
 */
router.get("/:projectId", authenticateToken, async (req, res) => {
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

/**
 * PATCH /projects/:projectId
 * Met à jour uniquement la description d'un projet
 */
router.patch("/:projectId", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { projectDescription } = req.body;
  
  // Vérifier que projectId est un ObjectId valide
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: "ID de projet invalide." });
  }

  // Vérifier que projectDescription est fourni
  if (typeof projectDescription !== 'string') {
    return res.status(400).json({ message: "Le champ 'projectDescription' est requis et doit être une chaîne de caractères." });
  }

  try {
    // Mettre à jour uniquement la description du projet
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { 
        projectDescription,
        updatedAt: new Date() // Mettre à jour la date de modification
      },
      { 
        new: true, // Retourner le document mis à jour
        runValidators: true // Exécuter les validateurs du schéma
      }
    ).exec();

    if (!updatedProject) {
      return res.status(404).json({ message: "Projet non trouvé." });
    }

    console.log(`✅ Description du projet ${projectId} mise à jour par utilisateur ${req.user.id}`);
    return res.json(updatedProject);

  } catch (err) {
    console.error("❌ Erreur PATCH /projects/:projectId :", err);
    
    // Gestion des erreurs de validation Mongoose
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        message: "Erreur de validation.", 
        errors: validationErrors 
      });
    }
    
    return res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

module.exports = router;