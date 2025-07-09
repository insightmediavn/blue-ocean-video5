export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { scriptContent } = req.body;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = "openai/gpt-4o";

  if (!apiKey || !apiKey.startsWith("sk-or-")) {
    return res.status(401).json({ error: "API Key missing or invalid." });
  }

  if (!scriptContent || scriptContent.trim().length < 20) {
    return res.status(400).json({ error: "Script content is too short or empty." });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are an AI that extracts keywords from video scripts. Only return a JSON array with the top 10 most relevant keywords."
          },
          {
            role: "user",
            content: `Here is the video script:

${scriptContent}

Extract max 10 keywords in this format:
{"keywords": ["a", "b", "c"]}`
          }
        ]
      })
    });

    const raw = await response.text();
    console.log("RAW RESPONSE FROM OPENROUTER:\n", raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({ error: "Failed to parse JSON", raw });
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(400).json({ error: "AI returned an empty response.", debug: data });
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(400).json({ error: "Could not find JSON structure in AI response.", aiResponse: content });
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return res.status(400).json({ error: "Could not parse JSON string in AI response.", content });
    }

    return res.status(200).json({ output: parsed });
  } catch (error) {
    return res.status(500).json({
      error: "AI request failed.",
      detail: error.message
    });
  }
}