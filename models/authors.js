// models/authors.js
const mongoose = require("mongoose");

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

// topTagsSchema
const topTagsSchema = new mongoose.Schema({
  name: String,
  percentage: Number,
});

const docTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, default: 0 },
});

// 👤 Author
const authorSchema = new mongoose.Schema(
  {
    oa_id: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (v) => /A\d{8,10}/.test(v),
        message: "identifiant auteur OpenAlex invalide",
      },
    },
    orcid: {
      type: String,
      validate: {
        validator: function (v) {
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
    annotation: {
      type: String,
    },

    // → Champ supplémentaire : on lie chaque auteur à un projet
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Author", authorSchema);
