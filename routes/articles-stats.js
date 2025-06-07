const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Article = require("../models/articles");
const { authenticateToken } = require("../utils/jwtauth"); // 👈

// -----------------------------------------------------------------------------
// 1) Petit cache mémoire (inchangé, mais multi-clé)
// -----------------------------------------------------------------------------
class SimpleCache {
  constructor(ttl = 3600000) {
    // 1 h
    this.cache = new Map();
    this.ttl = ttl;
  }
  get(key) {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }
  set(key, data) {
    this.cache.set(key, { data, expires: Date.now() + this.ttl });
  }
  clear(key) {
    // vide tout ou une clé précise
    if (key) this.cache.delete(key);
    else this.cache.clear();
  }
  cleanup() {
    const now = Date.now();
    for (const [k, v] of this.cache.entries()) {
      if (now > v.expires) this.cache.delete(k);
    }
  }
}
const statsCache = new SimpleCache();
setInterval(() => statsCache.cleanup(), 10 * 60 * 1e3); // 10 min

// -----------------------------------------------------------------------------
// 2) Facet commun (sans $match) — on l’enrichira dynamiquement
// -----------------------------------------------------------------------------
const facetStage = {
  $facet: {
    totalArticles: [{ $count: "count" }],
    languages: [{ $group: { _id: "$language", count: { $sum: 1 } } }],
    openAccess: [{ $group: { _id: "$openAccess", count: { $sum: 1 } } }],
    referenceTypes: [{ $group: { _id: "$referenceType", count: { $sum: 1 } } }],
    objectFocus: [{ $group: { _id: "$objectFocus", count: { $sum: 1 } } }],
    funding: [{ $group: { _id: "$funding", count: { $sum: 1 } } }],
    positionOnDataOpenAccess: [
      { $group: { _id: "$positionOnDataOpenAccess", count: { $sum: 1 } } },
    ],
    byYear: [
      { $match: { pubyear: { $ne: null } } },
      { $group: { _id: "$pubyear", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ],
    discourseGenre: [
      { $unwind: "$discourseGenre" },
      { $group: { _id: "$discourseGenre", count: { $sum: 1 } } },
    ],
    barriers: [
      { $unwind: "$barriers" },
      { $group: { _id: "$barriers", count: { $sum: 1 } } },
    ],
    positionOnOpenAccessAndIssues: [
      { $unwind: "$positionOnOpenAccessAndIssues" },
      { $group: { _id: "$positionOnOpenAccessAndIssues", count: { $sum: 1 } } },
    ],
    topKeywords: [
      { $unwind: "$keywords" },
      { $group: { _id: "$keywords", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ],
    fields: [
      { $unwind: "$fields" },
      { $group: { _id: "$fields", count: { $sum: 1 } } },
    ],
    subfields: [
      { $unwind: "$subfields" },
      { $group: { _id: "$subfields", count: { $sum: 1 } } },
    ],
  },
};

// -----------------------------------------------------------------------------
// 3) Helper commun (% + tri)
// -----------------------------------------------------------------------------
const addPct = (arr, total) =>
  arr
    .map(({ _id, count }) => ({
      _id,
      count,
      percent: +((count * 100) / (total || 1)).toFixed(1),
    }))
    .sort((a, b) => b.count - a.count);

// -----------------------------------------------------------------------------
// 4) GET /article-stats   (auth + projectId obligatoire)
// -----------------------------------------------------------------------------
router.get("/", authenticateToken, async (req, res) => {
  const { projectId, refresh } = req.query;

  // ---- validations ---------------------------------------------------------
  if (!projectId) {
    return res.status(400).json({ message: "projectId manquant en query." });
  }
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: "projectId invalide." });
  }

  const cacheKey = `stats:${projectId}`;
  if (refresh !== "true") {
    const cached = statsCache.get(cacheKey);
    if (cached) return res.json(cached);
  }

  try {
    // ---- pipeline dynamique (match + facets) -------------------------------
    const matchStage = {
      $match: { projectId: new mongoose.Types.ObjectId(projectId) },
    };
    const [raw] = await Article.aggregate([matchStage, facetStage]);

    const total = raw.totalArticles[0]?.count || 0;
    const stats = {
      totalArticles: total,
      languages: addPct(raw.languages, total),
      openAccess: addPct(raw.openAccess, total),
      byYear: addPct(raw.byYear, total),
      referenceTypes: addPct(raw.referenceTypes, total),
      objectFocus: addPct(raw.objectFocus, total),
      funding: addPct(raw.funding, total),
      positionOnDataOpenAccess: addPct(raw.positionOnDataOpenAccess, total),
      discourseGenre: addPct(raw.discourseGenre, total),
      barriers: addPct(raw.barriers, total),
      positionOnOpenAccessAndIssues: addPct(
        raw.positionOnOpenAccessAndIssues,
        total
      ),
      topKeywords: addPct(raw.topKeywords, total),
      fields: addPct(raw.fields, total),
      subfields: addPct(raw.subfields, total),
    };

    statsCache.set(cacheKey, stats);
    res.json(stats);
  } catch (err) {
    console.error("Erreur /article-stats :", err);
    res.status(500).json({ error: "Problème lors du calcul des statistiques" });
  }
});

// -----------------------------------------------------------------------------
// 5) POST /article-stats/refresh   (force le recalcul + auth + projectId)
// -----------------------------------------------------------------------------
router.post("/refresh", authenticateToken, async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) {
    return res.status(400).json({ message: "projectId manquant en query." });
  }
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: "projectId invalide." });
  }

  statsCache.clear(`stats:${projectId}`); // vide seulement cette clé
  return res.json({
    message: "Cache vidé, prochain GET recalculera les stats.",
  });
});

// -----------------------------------------------------------------------------
// 6) (optionnel) DELETE /article-stats/cache   pour purge globale (admin)
// -----------------------------------------------------------------------------
router.delete("/cache", authenticateToken, (req, res) => {
  statsCache.clear();
  res.json({ message: "Cache global vidé." });
});

module.exports = router;
