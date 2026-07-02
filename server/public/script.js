const scriptInput = document.getElementById("scriptInput");
const passwordInput = document.getElementById("passwordInput");
const outputBox = document.getElementById("outputBox");
const statusPill = document.getElementById("statusPill");
const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");
const resetBtn = document.getElementById("resetBtn");

function setStatus(message, tone = "idle") {
  statusPill.textContent = message;
  statusPill.dataset.tone = tone;
}

generateBtn.addEventListener("click", async () => {
  const code = scriptInput.value;
  const password = passwordInput.value;

  if (!code.trim() || !password.trim()) {
    setStatus("Code and password required", "error");
    return;
  }

  setStatus("Sending to backend...", "idle");

  try {
    const response = await fetch("/api/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Backend request failed");
    }

    outputBox.value = data.loadstring || "";
    setStatus("Generated", "ready");
  } catch (error) {
    console.error("Generate request failed:", error);
    outputBox.value = "";
    setStatus(error.message || "Request failed", "error");
  }
});

copyBtn.addEventListener("click", async () => {
  const textToCopy = outputBox.value.trim();

  if (!textToCopy || textToCopy.includes("appear here")) {
    setStatus("Nothing to copy", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(textToCopy);
    setStatus("Copied", "copy");
  } catch (error) {
    setStatus("Clipboard blocked", "error");
  }
});

resetBtn.addEventListener("click", () => {
  scriptInput.value = "";
  passwordInput.value = "";
  outputBox.value = "";
  setStatus("Reset", "idle");
});

scriptInput.addEventListener("input", () => {
  if (scriptInput.value.trim()) {
    setStatus("Drafting", "idle");
  }
});
