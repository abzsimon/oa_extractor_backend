// routes/authors.js - Ajouter cette section à ton fichier existant
// Ou créer routes/authors-stats.js si tu préfères séparer

const express = require('express');
const router = express.Router();
const Author = require('../models/authors');

/** ——————————————————————————————————————————
 * 1) Cache simple réutilisé (même logique que stats)
 */
class SimpleCache {
  constructor(ttl = 3600000) { // 1 heure par défaut
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }
  
  set(key, data) {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.ttl
    });
  }
  
  clear() {
    this.cache.clear();
  }
  
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

// Instance globale du cache pour authors
const authorsCache = new SimpleCache(3600000); // 1 heure

// Nettoyage automatique toutes les 10 minutes
setInterval(() => {
  authorsCache.cleanup();
}, 10 * 60 * 1000);

/** 2) Pipeline d'agrégation pour authors */
const authorsPipeline = [
  {
    $facet: {
      totalAuthors: [{ $count: "count" }],

      /* Statistiques par genre */
      gender: [
        { $match: { gender: { $ne: null } } },
        { $group: { _id: "$gender", count: { $sum: 1 } } }
      ],

      /* Statistiques par statut */
      status: [
        { $match: { status: { $ne: null } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ],

      /* Répartition par nombre de citations */
      citationRanges: [
        {
          $bucket: {
            groupBy: "$cited_by_count",
            boundaries: [0, 10, 50, 100, 500, 1000, 5000, 10000],
            default: "5000+",
            output: { count: { $sum: 1 } }
          }
        }
      ],

      /* Répartition par nombre de travaux */
      worksRanges: [
        {
          $bucket: {
            groupBy: "$works_count",
            boundaries: [0, 5, 10, 25, 50, 100, 200],
            default: "200+",
            output: { count: { $sum: 1 } }
          }
        }
      ],

      /* Top institutions */
      topInstitutions: [
        { $unwind: "$institutions" },
        { $group: { _id: "$institutions", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ],

      /* Top pays */
      topCountries: [
        { $unwind: "$countries" },
        { $group: { _id: "$countries", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ],

      /* Types de documents */
      docTypes: [
        { $unwind: "$doctypes" },
        { $group: { _id: "$doctypes.name", count: { $sum: "$doctypes.quantity" } } },
        { $sort: { count: -1 } }
      ],

      /* Top topics */
      topTopics: [
        { $unwind: "$top_five_topics" },
        { $group: { _id: "$top_five_topics", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 }
      ],

      /* Top fields (à partir des top_five_fields) */
      topFields: [
        { $unwind: "$top_five_fields" },
        { $group: { 
          _id: "$top_five_fields.name", 
          count: { $sum: 1 },
          avgPercentage: { $avg: "$top_five_fields.percentage" }
        }},
        { $sort: { count: -1 } },
        { $limit: 10 }
      ],

      /* Top domaines */
      topDomains: [
        { $unwind: "$top_two_domains" },
        { $group: { 
          _id: "$top_two_domains.name", 
          count: { $sum: 1 },
          avgPercentage: { $avg: "$top_two_domains.percentage" }
        }},
        { $sort: { count: -1 } }
      ],

      /* Statistiques par projet */
      projectDistribution: [
        { $group: { _id: "$projectId", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]
    }
  }
];

/** 3) Route GET /authors/stats */
router.get('/stats', async (req, res) => {
  try {
    // Paramètre ?refresh=true pour forcer le recalcul
    const forceRefresh = req.query.refresh === 'true';
    
    // Vérifier le cache d'abord (sauf si refresh forcé)
    if (!forceRefresh) {
      const cached = authorsCache.get("globalAuthorsStats");
      if (cached) {
        console.log('Authors stats servies depuis le cache');
        return res.json(cached);
      }
    } else {
      console.log('Authors refresh forcé - cache ignoré');
    }

    console.log('Calcul des statistiques authors...');
    
    // Calcul des stats
    const [raw] = await Author.aggregate(authorsPipeline);
    const total = raw.totalAuthors[0]?.count || 0;

    const addPct = arr =>
      arr.map(({ _id, count, avgPercentage }) => {
        const result = {
          _id,
          count,
          percent: +(count * 100 / total).toFixed(1)
        };
        if (avgPercentage !== undefined) {
          result.avgPercentage = +avgPercentage.toFixed(1);
        }
        return result;
      }).sort((a, b) => b.count - a.count);

    // Fonction spéciale pour les ranges (citations, works)
    const addPctRanges = arr =>
      arr.map(({ _id, count }) => ({
        range: _id,
        count,
        percent: +(count * 100 / total).toFixed(1)
      }));

    const stats = {
      totalAuthors: total,
      gender: addPct(raw.gender || []),
      status: addPct(raw.status || []),
      citationRanges: addPctRanges(raw.citationRanges || []),
      worksRanges: addPctRanges(raw.worksRanges || []),
      topInstitutions: addPct(raw.topInstitutions || []),
      topCountries: addPct(raw.topCountries || []),
      docTypes: addPct(raw.docTypes || []),
      topTopics: addPct(raw.topTopics || []),
      topFields: addPct(raw.topFields || []),
      topDomains: addPct(raw.topDomains || []),
      projectDistribution: addPct(raw.projectDistribution || [])
    };

    // Statistiques supplémentaires calculées
    if (total > 0) {
      stats.averageCitations = await Author.aggregate([
        { $group: { _id: null, avg: { $avg: "$cited_by_count" } } }
      ]).then(r => r[0]?.avg ? +r[0].avg.toFixed(1) : 0);
      
      stats.averageWorksCount = await Author.aggregate([
        { $group: { _id: null, avg: { $avg: "$works_count" } } }
      ]).then(r => r[0]?.avg ? +r[0].avg.toFixed(1) : 0);
    }

    // Sauvegarder en cache
    authorsCache.set("globalAuthorsStats", stats);
    
    res.json(stats);
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques authors:', error);
    res.status(500).json({ 
      error: 'Erreur lors du calcul des statistiques authors' 
    });
  }
});

/** 4) Route pour vider le cache authors */
router.delete('/stats/cache', (req, res) => {
  authorsCache.clear();
  res.json({ message: 'Cache authors vidé avec succès' });
});

/** 5) Route pour voir l'état du cache authors */
router.get('/stats/cache/info', (req, res) => {
  const item = authorsCache.cache.get("globalAuthorsStats");
  if (!item) {
    return res.json({ cached: false });
  }
  
  const timeLeft = Math.max(0, item.expires - Date.now());
  res.json({
    cached: true,
    expiresIn: Math.floor(timeLeft / 1000), // secondes restantes
    expiresAt: new Date(item.expires).toISOString()
  });
});

module.exports = router;