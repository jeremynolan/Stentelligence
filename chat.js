const express = require("express");
const router = express.Router();

let OpenAI;
(async () => {
  OpenAI = (await import("openai")).default;
})();

// 🔥 PASTE YOUR GPT SYSTEM INSTRUCTIONS HERE
const SYSTEM_INSTRUCTIONS = `
You are Stentelligence, an SMT and stencil engineering assistant...
(← replace this with your real instructions from your GPT)
`;

router.post("/", async (req, res) => {
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { prompt } = req.body;

    // ✔ Responses API (supported in v6)
    const response = await client.responses.create({
      model: "gpt-4.1",   // or the exact model your GPT is using
      input: [
        {
          role: "system",
          content: SYSTEM_INSTRUCTIONS
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    // Extract text properly
    const output = response.output_text || "⚠️ No response text returned.";

    res.json({ reply: output });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    res.status(500).json({
      error: "AI server error",
      details: err.message
    });
  }
});

module.exports = router;
