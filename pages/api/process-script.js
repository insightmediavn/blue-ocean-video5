// ✅ pages/api/process-script.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { scriptContent } = req.body;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL_ID || "openai/gpt-4o";

  if (!apiKey || !apiKey.startsWith("sk-or-")) {
    return res.status(401).json({ error: "API Key missing or invalid." });
  }

  if (!scriptContent || scriptContent.trim().length < 10) {
    return res.status(400).json({ error: "Script content is too short or empty." });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: `Dưới đây là một đoạn kịch bản video:\n\n${scriptContent}\n\nTrích xuất tối đa 15 từ khóa quan trọng nhất có liên quan đến nội dung. Chỉ trả về JSON đúng định dạng:\n{\n  \"keywords\": [\"từ khóa 1\", \"từ khóa 2\"]\n}`
          }
        ],
        temperature: 0.3
      })
    });

    const raw = await response.text();
    console.log("🧾 Raw response from OpenRouter:", raw);

    let parsedData;
    try {
      parsedData = JSON.parse(raw);
    } catch (e) {
      return res.status(400).json({ error: "AI returned invalid JSON.", raw });
    }

    const content = parsedData.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(400).json({ error: "AI returned an empty response.", raw });
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(400).json({ error: "No valid JSON found in AI response.", content });
    }

    try {
      const keywords = JSON.parse(jsonMatch[0]);
      return res.status(200).json({ result: keywords });
    } catch (err) {
      return res.status(400).json({ error: "Could not parse extracted JSON.", content });
    }
  } catch (error) {
    return res.status(500).json({ error: "Failed to call AI.", detail: error.message });
  }
}
