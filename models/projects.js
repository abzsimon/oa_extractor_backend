const mongoose = require('mongoose');
const { Schema } = mongoose;
const fieldEncryption = require('mongoose-field-encryption').fieldEncryption;

// Schéma pour un membre du partenaire
const MemberSchema = new Schema({
  prenom: {
    type: String,
    required: true,
    trim: true
  },
  nom: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    required: true,
    trim: true
  },
  coord: {
    type: Boolean,
    default: false
  }
});

// Schéma pour un partenaire
const PartnerSchema = new Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  sigle: {
    type: String,
    trim: true
  },
  categorie: {
    type: String,
    trim: true
  },
  membres: {
    type: [MemberSchema],
    default: []
  }
});

// Schéma principal pour un projet
const ProjectSchema = new Schema(
  {
    identifiant: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    titre: {
      type: String,
      required: true,
      trim: true
    },
    site: {
      type: String,
      trim: true
    },
    nombre_partenaires: {
      type: Number,
      default: 0
    },
    charge_projet_scientifique: {
      type: String,
      trim: true,
      lowercase: true
    },
    service_conventionnement: {
      type: String,
      trim: true,
      lowercase: true
    },
    service_financier: {
      type: String,
      trim: true,
      lowercase: true
    },
    T0_administratif: {
      type: Date
    },
    T0_scientifique: {
      type: Date
    },
    duree_scientifique_initiale: {
      type: Number
    },
    duree_scientifique_prolongations: {
      type: Number
    },
    Tfinal_projet: {
      type: Date
    },
    // Champs sensibles GitLab
    gitlabToken: {
      type: String,
      required: true,
      trim: true
    },
    gitlabBackupProjectId: {
      type: String,
      required: true,
      trim: true
    },
    partenaires: {
      type: [PartnerSchema],
      default: []
    },
    projectDescription: {
      type: String,
      default: "# Titre du projet\n\nDécrivez ici votre projet en **Markdown**.",
    },
  },
  {
    timestamps: true
  }
);

// Plugin pour chiffrer les champs sensibles. Ne pas oubblier de mettre la clé dans les variables d'environnement sous vercel !
ProjectSchema.plugin(fieldEncryption, {
  fields: ['gitlabToken', 'gitlabBackupProjectId'],
  secret: process.env.FIELD_ENCRYPTION_KEY
});

module.exports = mongoose.model('Project', ProjectSchema);