const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

dotenv.config();

const app = express();

app.use((req, res, next) => {
  console.log("--- New Request ---");
  console.log("Method:", req.method);
  console.log("Full URL:", req.originalUrl);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/test", (req, res) => {
  res.send("TEST SUCCESSFUL");
});

const port = Number(process.env.PORT) || 10000;
const publicPath = path.join(__dirname, "public");
const API_BASE_URL =
  process.env.API_BASE_URL || "https://azure-31yw.onrender.com";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_KEY in environment variables.",
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());

app.get("/api/raw/:id", async (req, res) => {
  console.log("Route /api/raw/:id accessed");
  try {
    const { id } = req.params;
    console.log(`[raw] request received for id: ${id}`);

    const { data, error } = await supabase
      .from("scripts")
      .select("code")
      .eq("id", id)
      .single();

    console.log(`[raw] lookup result for id ${id}`, {
      hasData: Boolean(data),
      hasCode: Boolean(data?.code),
      error: error?.message || null,
    });

    if (error) {
      console.error("Supabase raw lookup error:", error);
      res.setHeader("Content-Type", "text/plain");
      return res.status(404).send("Script not found.");
    }

    if (!data || !data.code) {
      res.setHeader("Content-Type", "text/plain");
      return res.status(404).send("Script not found.");
    }

    const scriptContent = data.code;
    res.setHeader("Content-Type", "text/plain");
    return res.send(scriptContent);
  } catch (error) {
    console.error("Error fetching script:", error);
    res.setHeader("Content-Type", "text/plain");
    return res.status(500).send("Failed to fetch script.");
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.get("/style.css", (req, res) => {
  res.sendFile(path.join(publicPath, "style.css"));
});

app.get("/script.js", (req, res) => {
  res.sendFile(path.join(publicPath, "script.js"));
});

function generateScriptId(length = 6) {
  return crypto
    .randomBytes(length)
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
}

app.post("/api/convert", async (req, res) => {
  try {
    const { code, password } = req.body || {};

    if (!code || typeof code !== "string" || !code.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Code is required." });
    }

    if (!password || typeof password !== "string" || !password.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Password is required." });
    }

    const scriptId = generateScriptId();

    const { error } = await supabase.from("scripts").insert({
      id: scriptId,
      code: code.trim(),
      password: password.trim(),
    });

    if (error) {
      throw error;
    }

    const loadstring = `loadstring(game:HttpGet('${API_BASE_URL}/api/raw/${scriptId}'))()`;

    return res.status(201).json({
      success: true,
      scriptId,
      loadstring,
      message: "Script stored successfully.",
    });
  } catch (error) {
    console.error("Error creating script:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create script.",
      error: error.message,
    });
  }
});

app.use(
  express.static(publicPath, {
    index: false,
    extensions: ["html", "css", "js"],
  }),
);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
