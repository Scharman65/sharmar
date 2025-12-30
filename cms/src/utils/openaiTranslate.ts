const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function translateText(params: {
  text: string;
  from: string;   // "en"
  to: string;     // "ru" | "sr-Latn-ME"
}): Promise<string> {
  const { text, from, to } = params;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  const system = [
    "You are a precise translator for a yacht marketplace in Montenegro.",
    "Return ONLY the translated text. No quotes, no markdown, no explanations.",
    "Keep brand names, marina/city names, and proper nouns as-is.",
    "Preserve numbers, units, currency, and punctuation.",
  ].join(" ");

  const user = `Translate from ${from} to ${to}:\n\n${text}`;

  const resp = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${resp.status}: ${body.slice(0, 500)}`);
  }

  const json: any = await resp.json();
  return (json?.choices?.[0]?.message?.content ?? "").trim();
}
