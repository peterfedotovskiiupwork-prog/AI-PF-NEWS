import { schedules } from "@trigger.dev/sdk";
import { searchNews } from "./search-news.js";
import { curateNews } from "./curate-news.js";
import { sendEmail } from "./send-email.js";

export const dailyAINews = schedules.task({
  id: "daily-ai-news",
  cron: "0 9 * * *",

  run: async () => {
    console.log("Starting daily AI news pipeline...");

    const searchResult = await searchNews.triggerAndWait({}).unwrap();
    console.log(`Search complete: ${searchResult.articles.length} articles found`);

    if (searchResult.articles.length === 0) {
      console.log("No articles found, skipping curation and email");
      return { status: "skipped", reason: "no_articles" };
    }

    const curationResult = await curateNews
      .triggerAndWait({ articles: searchResult.articles })
      .unwrap();
    console.log("Curation complete");

    const emailResult = await sendEmail
      .triggerAndWait({ briefing: curationResult.briefing })
      .unwrap();
    console.log("Email sent:", emailResult.sent);

    return {
      status: "completed",
      articlesFound: searchResult.articles.length,
      emailSent: emailResult.sent,
    };
  },
});
