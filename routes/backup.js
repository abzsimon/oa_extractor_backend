// routes/backup.js
const express        = require("express");
const router         = express.Router();
const { MongoClient } = require("mongodb");

// Assuming Node 18+ (fetch is global). If not, install node-fetch@2 and require it:
// const fetch = require("node-fetch");

const handleError = (err, res) => {
  res.status(500).json({
    error: err.name || "Error",
    message: err.message,
  });
};

router.post("/", async (req, res) => {
  const MONGODB             = process.env.MONGODB;
  const GITLAB_TOKEN          = process.env.GITLAB_TOKEN;
  const GITLAB_BACKUP_PROJECT = process.env.GITLAB_BACKUP_PROJECT; // e.g. "147"

  if (!MONGODB || !GITLAB_TOKEN || !GITLAB_BACKUP_PROJECT) {
    return res.status(500).json({
      message:
        "Variables manquantes : MONGODB, GITLAB_TOKEN et GITLAB_BACKUP_PROJECT doivent être définis",
    });
  }

  let client;
  try {
    // 1. Connect to MongoDB and fetch collections
    client = new MongoClient(MONGODB);
    await client.connect();
    const db = client.db("oaextractor");

    const [articlesDocs, authorsDocs] = await Promise.all([
      db.collection("articles").find().toArray(),
      db.collection("authors").find().toArray(),
    ]);
    await client.close();

    // 2. Build timestamp + JSON strings
    const now       = new Date();
    const timestamp = now
      .toISOString()
      .replace("T", "_")
      .replace(/:/g, "-")
      .split(".")[0]; // e.g. "2025-05-30_15-30-00"

    const articlesJson = JSON.stringify(articlesDocs, null, 2);
    const authorsJson  = JSON.stringify(authorsDocs,  null, 2);

    // 3. Prepare GitLab file paths and actions
    const basePath = "db_backups";
    const file1    = `${basePath}/articles.json`;
    const file2    = `${basePath}/authors.json`;

    const updateActions = [
      { action: "update", file_path: file1, content: articlesJson },
      { action: "update", file_path: file2, content: authorsJson },
    ];
    const createActions = [
      { action: "create", file_path: file1, content: articlesJson },
      { action: "create", file_path: file2, content: authorsJson },
    ];

    // 4. Function to send commit to GitLab
    async function sendCommit(actionsArray) {
      const payload = {
        branch: "main",
        commit_message: `Backup oaextractor ${timestamp}`,
        actions: actionsArray,
      };
      const projectId = GITLAB_BACKUP_PROJECT; 
      const gitlabUrl = `https://gitlab.huma-num.fr/api/v4/projects/${projectId}/repository/commits`;

      const response = await fetch(gitlabUrl, {
        method: "POST",
        headers: {
          "PRIVATE-TOKEN": GITLAB_TOKEN,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify(payload),
      });
      return response;
    }

    // 5. Try update; if “file doesn’t exist” (400 + message), retry create
    let gitRes = await sendCommit(updateActions);

    if (!gitRes.ok) {
      // GitLab returns 400 with JSON { message: "A file with this name doesn't exist" } 
      // when you attempt to update a path that isn't there yet.
      if (gitRes.status === 400) {
        const errorData = await gitRes.json().catch(() => ({}));
        if (
          errorData.message &&
          errorData.message.includes("A file with this name doesn't exist")
        ) {
          // Retry as “create”
          gitRes = await sendCommit(createActions);
        }
      }
    }

    if (!gitRes.ok) {
      const errorData = await gitRes.json().catch(() => ({}));
      return res
        .status(gitRes.status)
        .json({ message: errorData.message || "Erreur GitLab", details: errorData });
    }

    // 6. Success
    const gitData = await gitRes.json();
    return res.status(200).json({ message: "Backup GitLab réussi", commit: gitData });
  } catch (err) {
    console.error("Erreur backup :", err);
    if (client) await client.close();
    return handleError(err, res);
  }
});

module.exports = router;