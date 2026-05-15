import { task } from "@trigger.dev/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { RawArticle } from "./search-news.js";

export const curateNews = task({
  id: "curate-news",
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload: { articles: RawArticle[] }): Promise<{ briefing: string }> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemma-4-26b-a4b-it",
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    });

    const today = new Date().toISOString().split("T")[0];
    const articlesJson = JSON.stringify(payload.articles, null, 2);

    const result = await model.generateContent(
      `Today is ${today}. You are a news curator. This is your only job: produce a briefing with exactly 8-10 AI stories and 3-5 world news stories. You MUST NOT output fewer stories than these minimums.

## CRITICAL COUNT RULE
Count your stories before finishing. Verify from source data:
- AI section: 8 to 10 stories
- World section: 3 to 5 stories
Total: 11 to 15 stories. If you have fewer, you failed.

## PRIORITY — always look for these first
1. Anthropic/Claude — ANY update: new features, UI changes, model releases, capability changes, even small ones
2. OpenAI — model releases, ChatGPT features, announcements
3. Nvidia — new GPUs, AI hardware, announcements
4. Google DeepMind / Gemini — model releases, research
5. Meta AI / Microsoft AI — product launches, model releases
6. Other AI — regulations, research breakthroughs, partnerships, safety

## FRESHNESS
Exclude anything clearly older than 4 days from today (${today}). If the date is unclear, include it and mark [age unknown].

## WHAT TO INCLUDE
- Model releases, research papers, product launches, regulations, company announcements
- Feature updates and UI changes — especially Claude and ChatGPT. Even minor new features.
- Partnerships, safety developments, funding rounds

## WHAT TO EXCLUDE
- Stock market updates, price movements, financial analysis
- Opinion pieces, rumors, paid content
- Articles clearly older than 4 days

## WORLD NEWS
You MUST include 3-5 world news stories. Geopolitics, natural disasters, major policy changes, significant market events. If the raw data has fewer than 3 world articles, write shorter summaries for what's available.

## FORMAT — output exactly like this, no preamble, no code fences:

## AI

**[Headline]** — One-sentence summary.
Source: Publication (URL) — Age: X days/hours ago

**[Headline]** — One-sentence summary.
Source: Publication (URL) — Age: X days/hours ago

(8 to 10 items)

---

## World

**[Headline]** — One-sentence summary.
Source: Publication (URL) — Age: X days/hours ago

(3 to 5 items)

## RAW DATA

${articlesJson}`
    );

    let text = result.response.text().trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:markdown)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    }
    const briefing = text.trim();

    console.log(`Curation produced ${briefing.length} chars`);
    console.log("Briefing preview:", briefing.slice(0, 300));

    return { briefing };
  },
});
