const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Article = require("../models/articles");
const { stringify } = require("csv-stringify");
const { authenticateToken } = require("../utils/jwtauth");

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
      "title",
      "authors",
      "pubyear",
      "referenceType",
      "oa_status",
      "subfields",
      "language",
      "keywords",
      "objectFocus",
      "dataTypesDiscussed",
      "discourseGenre",
      "methodology",
      "funding",
      "positionOnDataOpenAccess",
      "barriers",
      "positionOnOpenAccessAndIssues",
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

module.exports = router;
