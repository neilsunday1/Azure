const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).send("Server is running");
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

    const loadstring = `loadstring(game:HttpGet('${API_BASE_URL}/raw/${scriptId}'))()`;

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

app.get("/raw/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("scripts")
      .select("code")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data || !data.code) {
      return res.status(404).type("text/plain").send("Script not found.");
    }

    return res.type("text/plain").send(data.code);
  } catch (error) {
    console.error("Error fetching script:", error);
    return res.status(500).type("text/plain").send("Failed to fetch script.");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
