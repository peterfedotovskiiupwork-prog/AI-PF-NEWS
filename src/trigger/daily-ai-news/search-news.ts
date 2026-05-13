import { task } from "@trigger.dev/sdk";

export interface RawArticle {
  title: string;
  snippet: string;
  source: string;
  url: string;
  date: string;
  category: "ai" | "world";
}

const SEARCH_QUERIES = [
  { query: "OpenAI new model release announcement", category: "ai" as const },
  { query: "Anthropic Claude new feature update", category: "ai" as const },
  { query: "Nvidia AI GPU announcement release", category: "ai" as const },
  { query: "Google DeepMind Gemini AI release", category: "ai" as const },
  { query: "Meta AI Llama model launch", category: "ai" as const },
  { query: "Microsoft Copilot AI product", category: "ai" as const },
  { query: "AI regulation policy law", category: "ai" as const },
  { query: "AI research breakthrough paper", category: "ai" as const },
  { query: "Claude AI capabilities features update", category: "ai" as const },
  { query: "OpenAI ChatGPT new feature", category: "ai" as const },
  { query: "world geopolitics breaking news", category: "world" as const },
  { query: "global economy policy change", category: "world" as const },
  { query: "international conflict diplomacy", category: "world" as const },
];

export const searchNews = task({
  id: "search-news",
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 30_000,
  },
  run: async (): Promise<{ articles: RawArticle[] }> => {
    const serpApiKey = process.env.SERPAPI_KEY;
    if (!serpApiKey) throw new Error("SERPAPI_KEY is not set");

    const allArticles: RawArticle[] = [];
    const seenUrls = new Set<string>();
    const today = new Date().toISOString().split("T")[0];

    console.log(`SERP key loaded: ${serpApiKey ? serpApiKey.slice(0, 6) + "..." : "NO"}`);

    for (const sq of SEARCH_QUERIES) {
      try {
        const params = new URLSearchParams({
          q: sq.query,
          api_key: serpApiKey,
          engine: "google_news",
          num: "10",
          google_domain: "google.com",
          hl: "en",
          gl: "us",
        });

        const res = await fetch(`https://serpapi.com/search?${params}`, {
          signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
          console.warn(`SERP API returned ${res.status} for query: "${sq.query}"`);
          continue;
        }

        const data = await res.json();
        if (sq.query === SEARCH_QUERIES[0].query) {
          console.log(`SERP first response keys: ${Object.keys(data).join(", ")}`);
          console.log(`SERP has news_results: ${!!data.news_results}`);
        }
        const results = data.news_results || [];

        for (const item of results) {
          const url = item.link || item.url;
          if (!url || seenUrls.has(url)) continue;
          seenUrls.add(url);

          const sourceName = typeof item.source === "object" && item.source !== null
            ? item.source.name
            : item.source || item.domain || "";

          allArticles.push({
            title: (item.title || "").trim(),
            snippet: (item.snippet || "").trim(),
            source: sourceName,
            url,
            date: item.date || item.published_at || today,
            category: sq.category,
          });
        }
      } catch (err) {
        console.warn(`SERP search failed for "${sq.query}":`, err);
      }
    }

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const isFresh = (dateStr: string): boolean => {
      try {
        const parsed = Date.parse(dateStr);
        if (isNaN(parsed)) return true;
        return parsed >= fourDaysAgo.getTime();
      } catch {
        return true;
      }
    };

    const fresh = allArticles.filter((a) => isFresh(a.date));
    const aiArticles = fresh.filter((a) => a.category === "ai");
    const worldArticles = fresh.filter((a) => a.category === "world");
    const sampled = [
      ...aiArticles.slice(0, 130),
      ...worldArticles.slice(0, 70),
    ];
    console.log(
      `Found ${allArticles.length} unique, ${fresh.length} fresh (${aiArticles.length} AI, ${worldArticles.length} world), sampling ${sampled.length} for curation`
    );
    return { articles: sampled };
  },
});
