const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const mongoose = require("mongoose");
const Article = require("../models/articles");
const Author = require("../models/authors");
const { stringify } = require("csv-stringify");
const { authenticateToken } = require("../utils/jwtauth");
const ExcelJS = require("exceljs");
const dayjs = require("dayjs");

const SHARED_SECRET = process.env.SHARED_SECRET;

// ✅ Route privée : génère une URL signée pour accès temporaire à un CSV
router.get("/bibliograph/signed-url", authenticateToken, (req, res) => {
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({ error: "Missing projectId" });
  }

  const expires = Math.floor(Date.now() / 1000) + 300; // expire dans 5 minutes

  const signature = crypto
    .createHmac("sha256", SHARED_SECRET)
    .update(projectId + expires)
    .digest("hex");

  const publicCsvUrl = `${req.protocol}://${req.get("host")}/csv/bibliograph/public?projectId=${projectId}&expires=${expires}&signature=${signature}`;

  res.json({ csvUrl: publicCsvUrl });
});

// ✅ Route publique : sert le CSV si signature et expiration valides
router.get("/bibliograph/public", async (req, res) => {
  try {
    const { projectId, expires, signature } = req.query;

    if (!projectId || !expires || !signature) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > Number(expires)) {
      return res.status(403).send("Link expired");
    }

    const expected = crypto
      .createHmac("sha256", SHARED_SECRET)
      .update(projectId + expires)
      .digest("hex");

    if (expected !== signature) {
      return res.status(403).send("Invalid signature");
    }

    const articles = await Article.find({ projectId });

    const columns = [
      "id",
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="articles.csv"');
    res.setHeader("Access-Control-Allow-Origin", "*");

    const stringifier = stringify({
      header: true,
      columns,
      cast: {
        object: (value) =>
          Array.isArray(value) ? value.join("; ") : value === null ? "" : String(value),
        boolean: (value) => value === null ? "" : value ? "true" : "false",
      },
    });

    for (const article of articles) {
      const record = {};
      for (const col of columns) {
        record[col] = article[col] ?? "";
      }
      stringifier.write(record);
    }

    stringifier.end();
    stringifier.pipe(res);
  } catch (err) {
    console.error("CSV public error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Route privée : génère un fichier excel avec un nom unique horodaté avec un dump de articles et authors

router.get("/excel", authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: "Paramètre projectId manquant." });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: "projectId invalide." });
    }

    // Récupération des données
    const articles = await Article.find({ projectId }).lean();
    const authors  = await Author.find({ projectId }).lean();

    const workbook  = new ExcelJS.Workbook();
    const sheetA    = workbook.addWorksheet("Articles");
    const sheetB    = workbook.addWorksheet("Authors");

    // — Onglet ARTICLES (inchangé) —
    const articleCols = [
      "id","title","authors","pubyear","referenceType","oa_status",
      "subfields","language","keywords","objectFocus","dataTypesDiscussed",
      "discourseGenre","methodology","funding","positionOnDataOpenAccess",
      "barriers","positionOnOpenAccessAndIssues",
    ];
    sheetA.columns = articleCols.map(col => ({ header: col, key: col, width: 30 }));
    articles.forEach(a => {
      const row = {};
      articleCols.forEach(col => {
        const v = a[col];
        row[col] = Array.isArray(v) ? v.join("; ")
                 : typeof v === "boolean" ? v.toString()
                 : v || "";
      });
      sheetA.addRow(row);
    });

    // — Onglet AUTHORS (champs explicitement tirés du modèle) —
    const authorCols = [
      "id",             // identifiant A######## ou MA-XXXXXXXXX
      "source",         // "openalex" ou "manual"
      "orcid",          // ORCID
      "display_name",
      "cited_by_count",
      "works_count",
      "institutions",   // tableau de strings
      "countries",      // tableau de strings
      "overall_works",
      "doctypes",       // sous-documents { name, quantity }
      "study_works",    // tableau de strings
      "top_five_topics",// tableau de strings
      "top_five_fields",// sous-documents { name, percentage }
      "top_two_domains",// sous-documents { name, percentage }
      "topic_tree",     // arborescence de domaines
      "gender",         // enum
      "status",         // enum A–H
      "annotation",
      "completionRate",
      "createdAt",      // timestamp
      "updatedAt"       // timestamp
    ];
    sheetB.columns = authorCols.map(col => ({ header: col, key: col, width: 25 }));
    authors.forEach(u => {
      const row = {};
      authorCols.forEach(col => {
        const v = u[col];
        if (Array.isArray(v))       row[col] = v.join("; ");
        else if (v && typeof v === "object") row[col] = JSON.stringify(v);
        else if (typeof v === "boolean")     row[col] = v.toString();
        else                                  row[col] = v || "";
      });
      sheetB.addRow(row);
    });

    // — Génération du nom de fichier avec timestamp —
    const ts       = dayjs().format("YYYYMMDDHHmm");
    const filename = `articles_${ts}.xlsx`;

    res
      .status(200)
      .set({
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Access-Control-Allow-Origin": "*",
      });

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Erreur export XLSX :", err);
    res.status(500).json({ error: "Erreur serveur lors de la génération du fichier Excel." });
  }
});

module.exports = router;
