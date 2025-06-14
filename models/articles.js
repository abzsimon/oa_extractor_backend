const mongoose = require("mongoose");
const { Schema } = mongoose;

// Sous-schéma pour un frein
const freinSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"],
      required: true,
    },
    citation: {
      type: String,
      required: true,
    },
    paragraphe: {
      type: String,
    },
  },
  { _id: false }
);

const articleSchema = new Schema(
  {
    // === Source de l'article ===
    source: {
      type: String,
      required: true,
      default: "openalex",
      enum: ["openalex", "manual"],
    },

    // === OpenAlex Data ===
    id: { type: String, required: true },
    title: { type: String, required: true },
    authors: { type: [String], required: true },
    authorsFullNames: { type: [String], required: true },
    abstract: { type: String, default: "No Abstract" },
    publishedIn: { type: String, default: "None" },
    url: { type: String, default: "None" },
    doi: { type: String, default: "None" },
    pubyear: { type: Number, default: null },
    pdfRelativePath: { type: String, default: "None" },
    referenceType: { type: String, required: true },
    oa_status: { type: Boolean, required: true },
    topics: { type: [String], default: [] },
    domains: { type: [String], default: [] },
    fields: { type: [String], default: [] },
    subfields: { type: [String], default: [] },

    // === User-Input Data ===
    language: {
      type: String,
      enum: ["FR", "EN", "ES", "DE", "IT", "PT", "Autre"],
      default: null,
    },
    selectedSubfield : { type: String, default: null },
    keywords: { type: [String], default: [] },
    openAccess: { type: Boolean, default: null },
    objectFocus: {
      type: String,
      enum: [
        "Données de la recherche (toutes sciences)",
        "Données de la recherche en SHS",
        "SHS en général",
      ],
      default: null,
    },
    dataTypesDiscussed: {
      type: [String],
      enum: [
        "Observation/Observation en général",
        "Observation/Notes",
        "Observation/Photo",
        "Observation/Audio",
        "Observation/Vidéo",
        "Questionnaire/Questionnaire en général",
        "Questionnaire/Questions",
        "Questionnaire/Réponses",
        "Questionnaire/Statistiques",
        "Entretien/Entretien en général",
        "Entretien/Audio",
        "Entretien/Vidéo",
        "Entretien/Transcription",
        "Entretien/Grille",
        "Analyse computationnelle/Analyse computationnelle en général",
        "Analyse computationnelle/Corpus textuel",
        "Analyse computationnelle/Réseaux",
        "Analyse computationnelle/Logs",
        "Analyse computationnelle/Mesures géographiques",
        "Analyse computationnelle/Mesures numériques",
        "Analyse computationnelle/Carte",
        "Analyse computationnelle/Code",
        "Analyse computationnelle/Corpus d'images",
        "Analyse computationnelle/Documentation complémentaire",
        "Archive/Archive en général",
        "Archive/Sources textuelles",
        "Archive/Sources visuelles (plans, cadastres, relevés archéo...)",
        "Archive/Photographies",
        "Archive/Artefacts archéologiques",
        "Archive/Mesures numériques",
        "Archive/Tableaux, sculptures, bâti...",
        "Archive/Autres (partitions musicales...)",
        "Expérimentation/Expérimentation en général",
        "Expérimentation/Audio",
        "Expérimentation/Vidéo",
        "Expérimentation/Transcriptions",
        "Expérimentation/Notes",
        "Expérimentation/Mesures numériques",
        "Autres/Autres",
        "Autres/Brouillons",
        "Autres/Carnets",
        "Autres/Objet informatique (plateforme, interface...)",
        "Données non spécifiées",
      ],
      default: [],
    },
    additionalDataTypes: { type: [String], default: [] },
    discourseGenre: {
      type: [String],
      enum: [
        "Essai réflexif",
        "Etude de terrain, données",
        "Pamphlet, texte polémique",
        "Texte normatif/Orientation stratégique, recommandations politiques",
        "Texte normatif/Guide de bonnes pratiques, manuel, dictionnaire, formation",
        "Etudes institutionnelles (ministère, université...)",
        "Autre",
      ],
      default: [],
    },
    methodology: {
      type: [String],
      enum: [
        "Observation",
        "Observation participante",
        "Étude de pratique réflexive (retour d'expérience)",
        "Entretien",
        "Expérimentation (focus group)",
        "Quanti/Questionnaire, sondage",
        "Quanti/Computationnel",
        "Réflexion conceptuelle (philosophique)",
        "Analyse statistique indirecte (méta-analyse)",
        "Analyse discursive",
        "Analyse sémiotique",
        "Analyse cartographique",
        "Analyse historique",
        "Etude de cas/Comparaison",
        "Monographie (1 seul cas)",
        "Aucune relevée",
      ],
      default: [],
    },
    funding: {
      type: String,
      enum: [
        "Sans financement",
        "Agence publique de financement (ANR, Europe, Fonds national suisse, National Science Foundation...)",
        "Public autre",
        "Privé",
        "Autre",
        "Non relevé",
      ],
      default: null,
    },
    positionOnDataOpenAccess: {
      type: [String],
      enum: [
        "Opposition forte (rejet)",
        "Opposition (mise en garde)",
        "Neutre",
        "Faveur (recommendation)",
        "Faveur forte (injonction)",
        "Indéfini",
      ],
      validate: {
        validator: function (v) { return Array.isArray(v) && v.length <= 2; },
        message: (props) => `Au maximum 2 choix, mais ${props.value.length} fournis.`
      },
      default: [],
    },
    barriers: {
      type: [String],
      enum: [
        "A Frein épistémique diversité (coexistence de savoirs situés)",
        "B Frein épistémique constructivisme",
        "C Frein épistémique singularité des SHS",
        "D Frein juridique propriété",
        "E Frein juridique anonym/perso",
        "F Frein technique infra",
        "G Freins socio-technique (formation, compétences)",
        "H Frein éthique-socio",
        "I Frein liberté académique",
        "J Autres freins",
        "K Aucun frein mentionné",
      ],
      default: [],
    },
    remarksOnBarriers: { type: [freinSchema], default: [] },
    positionOnOpenAccessAndIssues: {
      type: [String],
      enum: [
        "Favoriser la réutilisation des données",
        "Favoriser l'intégrité, contre la fraude",
        "Favorise une science incrémentale et non redondante",
        "Favorise la publication libre",
        "Favorise la restitution à la société",
        "Autre",
        "Aucune",
      ],
      default: [],
    },
    remarks: { type: String, default: null },
    completionRate: { type: Number, default: 0 },
    fulltext: { type: String, default: null },

    // === Champ ajouté pour rattacher chaque article à un projet ===
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  },
  { timestamps: true }
);

// Index unique combiné (id, projectId)
articleSchema.index({ id: 1, projectId: 1 }, { unique: true });

module.exports = mongoose.model("articles", articleSchema);
