// models/authors.js
const mongoose = require("mongoose");

/* ----------------------- Sous-schémas ----------------------- */

// 🧩 Topics
const topicSchema = new mongoose.Schema({
  name: String,
  count: Number,
});

// 🔬 Subfields
const subfieldSchema = new mongoose.Schema({
  name: String,
  total: Number,
  topics: [topicSchema],
});

// 🧪 Fields
const fieldSchema = new mongoose.Schema({
  name: String,
  total: Number,
  subfields: [subfieldSchema],
});

// 🌍 Domains (Disciplines)
const domainSchema = new mongoose.Schema({
  name: String,
  total: Number,
  fields: [fieldSchema],
});

// Top tags
const topTagsSchema = new mongoose.Schema({
  name: String,
  percentage: Number,
});

// Types de documents
const docTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, default: 0 },
});

/* --------------------------- Auteur ------------------------- */

const authorSchema = new mongoose.Schema(
  {
    // Identifiant unique : A######## (OpenAlex) OU MA-XXXXXXXXX (manuel)
    id: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (v) => /^A\d{8,11}$/.test(v) || /^MA-\w{8,11}$/.test(v),
        message: "Identifiant invalide : attendu A######## ou MA-XXXXXXXXX",
      },
    },

    // Origine des données
    source: {
      type: String,
      required: true,
      default: "openalex",
      enum: ["openalex", "manual"],
    },

    // --- Métadonnées ---
    orcid: {
      type: String,
      validate: {
        validator(v) {
          if (!v) return true;
          return /^(\d{4}-){3}\d{3}[\dX]$/.test(v);
        },
        message: "ORCID invalide",
      },
    },
    display_name: String,
    cited_by_count: Number,
    works_count: Number,
    institutions: { type: [String], default: [] },
    countries: { type: [String], default: [] },
    overall_works: String,
    doctypes: [docTypeSchema],
    study_works: [String],
    top_five_topics: [String],
    top_five_fields: [topTagsSchema],
    top_two_domains: [topTagsSchema],
    topic_tree: [domainSchema],
    gender: {
      type: String,
      enum: ["male", "female", "nonbinary"],
    },
    status: {
      type: String,
      enum: ["A", "B", "C", "D", "E", "F", "G", "H"],
    },
    annotation: String,
    completionRate: { type: Number, default: 0 },

    // Lien vers le projet
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
  },
  { timestamps: true }
);

// Index unique combiné (id, projectId)
authorSchema.index({ id: 1, projectId: 1 }, { unique: true });
authorSchema.index({ display_name: "text" });

module.exports = mongoose.model("Author", authorSchema);
