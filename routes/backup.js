const express = require("express");
const router = express.Router();
const { MongoClient, ObjectId } = require("mongodb");
const { authenticateToken } = require("../utils/jwtauth");

const handleError = (err, res) => {
  console.error("❌ Error Handler Triggered:", err);
  res.status(500).json({
    error: err.name || "Error",
    message: err.message,
  });
};

router.post("/", authenticateToken, async (req, res) => {
  console.log("🔐 Authenticated request received");

  const { projectId } = req.body;
  console.log("📦 Received projectId:", projectId);

  if (!projectId) {
    console.warn("⚠️ Missing projectId in request body");
    return res.status(400).json({ message: "projectId manquant." });
  }

  if (!ObjectId.isValid(projectId)) {
    console.warn("⚠️ projectId invalide:", projectId);
    return res.status(400).json({ message: "projectId invalide." });
  }

  const MONGODB               = process.env.MONGODB;
  const GITLAB_TOKEN          = process.env.GITLAB_TOKEN;
  const GITLAB_BACKUP_PROJECT = process.env.GITLAB_BACKUP_PROJECT;

  console.log("🔧 Env variables:");
  console.log("   - MONGODB               =", MONGODB ? "OK" : "MISSING");
  console.log("   - GITLAB_TOKEN          =", GITLAB_TOKEN ? "OK" : "MISSING");
  console.log("   - GITLAB_BACKUP_PROJECT =", GITLAB_BACKUP_PROJECT);

  if (!MONGODB || !GITLAB_TOKEN || !GITLAB_BACKUP_PROJECT) {
    return res.status(500).json({
      message: "Variables manquantes : MONGODB, GITLAB_TOKEN et GITLAB_BACKUP_PROJECT doivent être définis",
    });
  }

  let client;
  try {
    client = new MongoClient(MONGODB);
    await client.connect();
    const db = client.db("oaextractor");
    const filter = { projectId: new ObjectId(projectId) };

    console.log("🔍 Querying MongoDB with filter:", filter);

    const [articlesDocs, authorsDocs] = await Promise.all([
      db.collection("articles").find(filter).toArray(),
      db.collection("authors").find(filter).toArray(),
    ]);

    console.log(`   → articlesDocs.length = ${articlesDocs.length}`);
    console.log(`   → authorsDocs.length  = ${authorsDocs.length}`);
    await client.close();

    const now       = new Date();
    const timestamp = now.toISOString().replace("T", "_").replace(/:/g, "-").split(".")[0];
    console.log("🕒 Generated timestamp:", timestamp);

    const articlesJson = JSON.stringify(articlesDocs, null, 2);
    const authorsJson  = JSON.stringify(authorsDocs, null, 2);

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

    async function sendCommit(actionsArray, mode) {
      const payload = {
        branch: "main",
        commit_message: `Backup oaextractor ${timestamp}`,
        actions: actionsArray,
      };

      const raw = JSON.stringify(payload);
      console.log(`📤 Sending ${mode} commit:`);
      console.log("   → Payload preview:", raw.slice(0, 80) + (raw.length > 80 ? "…" : ""));
      console.log("   → Length:", raw.length);

      const char32 = raw.charAt(32);
      const cp32 = raw.codePointAt(32);
      const context32 = raw.slice(Math.max(0, 22), Math.min(raw.length, 42));
      console.log(`   → char@32 = "${char32}", codePoint=${cp32}. Context = …${context32}…`);

      const response = await fetch(GITLAB_BACKUP_PROJECT, {
        method: "POST",
        headers: {
          "PRIVATE-TOKEN": GITLAB_TOKEN,
          "Content-Type": "application/json",
        },
        body: Buffer.from(raw, "utf-8"),  // 👈 PATCHED LINE
      });

      return response;
    }

    console.log("🚀 Attempting to send updateActions to GitLab...");
    let gitRes = await sendCommit(updateActions, "update");

    if (!gitRes.ok && gitRes.status === 400) {
      const errorData = await gitRes.json().catch(() => ({}));
      console.warn("⚠️ Update failed, checking for file-not-exist error...");
      if (errorData.message?.includes("A file with this name doesn't exist")) {
        console.log("↪️ Retrying with createActions...");
        gitRes = await sendCommit(createActions, "create");
      }
    }

    if (!gitRes.ok) {
      const errorData = await gitRes.json().catch(() => ({}));
      console.error("❌ GitLab response error:", errorData);
      return res.status(gitRes.status).json({
        message: errorData.message || "Erreur GitLab",
        details: errorData,
      });
    }

    const gitData = await gitRes.json();
    console.log("✅ GitLab commit successful! Commit ID:", gitData.id || gitData.commit?.id);
    return res.status(200).json({ message: "Backup GitLab réussi", commit: gitData });

  } catch (err) {
    console.error("💥 Exception caught in backup route:", err);
    if (client) await client.close();
    return handleError(err, res);
  }
});

module.exports = router;
