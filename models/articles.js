const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const articleSchema = new Schema({
  // === OpenAlex Data. Récupéré depuis l'API donc pas besoin de validator ni de contrainte de forme avancée ===
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  authors: {
    type: [String],
    required: true,
  },
  authorsFullNames: {
    type: [String],
    required: true,
  },
  abstract: {
    type: String,
    default: "No Abstract",
  },
  publishedIn: {
    type: String,
    default: "None",
  },
  url: {
    type: String,
    default: "None",
  },
  doi: {
    type: String,
    default: "None",
  },
  pubyear: {
    type: Number,
    default: null,
  },
  pdfRelativePath: {
    type: String,
    default: "None",
  },
  referenceType: {
    type: String,
    required: true,
  },
  oa_status: {
    type: Boolean,
    required: true,
  },
  topics: {
    type: [String],
    default: [],
  },
  domains: {
    type: [String],
    default: [],
  },
  fields: {
    type: [String],
    default: [],
  },
  subfields: {
    type: [String],
    default: [],
  },

  // === User-Input Data ===
  language: {
    type: String,
    enum: ["FR", "EN", "ES", "DE", "IT", "PT", "Autre"],
    required: true,
  },
  keywords: {
    type: [String],
    required: true,
  },
  openAccess: { type: Boolean, required: true },
  objectFocus: {
    type: String,
    enum: [
      "Données de la recherche (toutes sciences)",
      "Données de la recherche en SHS",
      "SHS en général",
    ],
    required: true,
  },
  dataTypesDiscussed: {
    type: [String],
    enum: [
      "Observation",
      "Observation/Notes",
      "Observation/Photo",
      "Observation/Audio",
      "Observation/Vidéo",
      "Questionnaire",
      "Questionnaire/Questions",
      "Questionnaire/Réponses",
      "Questionnaire/Statistiques",
      "Entretien",
      "Entretien/Audio",
      "Entretien/Vidéo",
      "Entretien/Transcription",
      "Entretien/Grille",
      "Analyse computationnelle",
      "Analyse computationnelle/Corpus textuel",
      "Analyse computationnelle/Réseaux",
      "Analyse computationnelle/Logs",
      "Analyse computationnelle/Mesures géographiques",
      "Analyse computationnelle/Mesures numériques",
      "Analyse computationnelle/Carte",
      "Analyse computationnelle/Code",
      "Analyse computationnelle/Corpus d'images",
      "Analyse computationnelle/Documentation complémentaire",
      "Archive",
      "Archive/Sources textuelles",
      "Archive/Sources visuelles (plans, cadastres, relevés archéo...)",
      "Archive/Photographies",
      "Archive/Artefacts archéologiques",
      "Archive/Mesures numériques",
      "Archive/Tableaux, sculptures, bâti...",
      "Archive/Autres (partitions musicales...)",
      "Expérimentation",
      "Expérimentation/Audio",
      "Expérimentation/Vidéo",
      "Expérimentation/Transcriptions",
      "Expérimentation/Notes",
      "Expérimentation/Mesures numériques",
      "Autres",
      "Autres/Brouillons",
      "Autres/Carnets",
      "Autres/Objet informatique (plateforme, interface...)",
      "Données non spécifiées",
    ],
    required: true,
  },
  additionalDataTypes: {
    type: [String],
    default: [],
  },
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
    required: true,
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
    required: true,
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
    required: true,
  },
  positionOnDataOpenAccess: {
    type: String,
    enum: [
      "Opposition forte (rejet)",
      "Opposition (mise en garde)",
      "Neutre",
      "Faveur (recommendation)",
      "Faveur forte (injonction)",
      "Indéfini",
    ],
    required: true,
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
      "Aucun frein mentionné",
    ],
    required: true,
  },
  positionOnOpenAccessAndIssues: {
    type: [String],
    enum: [
      "Favoriser la réutilisation des données",
      "Favoriser l'intégrité, contre la fraude",
      "Favorise la cause écologique, environnement",
      "Favorise la publication libre",
      "Favorise la restitution à la société",
      "Autre",
      "Aucune",
    ],
    required: true,
  },
  remarks: {
    type: String,
    default: "",
  },
});

const Article = mongoose.model("articles", articleSchema);

module.exports = Article;
