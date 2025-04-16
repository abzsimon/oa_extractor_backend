const mongoose = require('mongoose');

// 🧩 Topics
const topicSchema = new mongoose.Schema({
  name: String,
  count: Number
}, { _id: false });

// 🔬 Subfields
const subfieldSchema = new mongoose.Schema({
  name: String,
  total: Number,
  topics: [topicSchema]
}, { _id: false });

// 🧪 Fields
const fieldSchema = new mongoose.Schema({
  name: String,
  total: Number,
  subfields: [subfieldSchema]
}, { _id: false });

// 🌍 Domains (Disciplines)
const domainSchema = new mongoose.Schema({
  name: String,
  total: Number,
  fields: [fieldSchema]
}, { _id: false });

// 🧬 Demographic stats
const manstatSchema = new mongoose.Schema({
  gender: {
    type: String,
    enum: ["male", "female", "nonbinary"]
  },
  birth: Date,
  death: Date,
  status: {
    type: String,
    enum: ["A", "B", "C", "D", "E", "F", "G", "H"]
  }
}, { _id: false });

// 👤 Author
const authorSchema = new mongoose.Schema({
  oa_id: {
    type: String,
    validate: {
      validator: (v) => /A\d{8,10}/.test(v),
      message: 'identifiant auteur OpenAlex invalide'
    }
  },
  orcid: {
    type: String,
    validate: {
      validator: (v) => /(\d{4}-){3}\d{3}[\dX]$/.test(v),
      message: 'orcid invalide'
    }
  },
  display_name: String,
  cited_by_count: Number,
  works_count: Number,
  works: [String],
  disciplines: [domainSchema],
  manstats: manstatSchema
}, { timestamps: true });

const Author = mongoose.model('authors', authorSchema);

module.exports = Author;