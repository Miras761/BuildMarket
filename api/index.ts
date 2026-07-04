import express from "express";

const app = express();
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const { message, context, history } = req.body;
    const apiKey =
      process.env.OPENROUTER_API ||
      process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error:
          "OPENROUTER_API or OPENROUTER_API_KEY is not configured.",
      });
    }

    const formattedHistory = Array.isArray(history)
      ? history
          .filter((h: any) => h.text !== message)
          .map((h: any) => ({
            role: h.role,
            content: h.text,
          }))
      : [];

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai.studio.build",
          "X-Title": "Construction Marketplace Assistant",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content: `You are an expert AI assistant for a construction materials marketplace.
Your responsibilities:
- Help customers choose building materials.
- Explain differences between products.
- Calculate approximate quantities of materials.
- Recommend alternatives.
- Explain specifications.
- Help compare prices.
- Give practical construction advice.
- Be polite, professional and concise.
Marketplace Context:
${JSON.stringify(context, null, 2)}
Never invent store information.
Only answer using available context if provided.
              `,
            },
            ...formattedHistory,
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter Error:", errorText);

      if (response.status === 429) {
        return res.status(429).json({
          reply:
            "Лимит запросов временно исчерпан. Попробуйте немного позже.",
        });
      }

      return res.status(response.status).json({
        error: "OpenRouter request failed.",
        details: errorText,
      });
    }

    const data = await response.json();
    return res.json({
      reply:
        data.choices?.[0]?.message?.content ??
        "Извините, ответ не был получен.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error.",
    });
  }
});

export default app;
