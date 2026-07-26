import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteConfig } from "../config/site";

export async function GET(context) {
  const journal = await getCollection("journal");

  const publishedEntries = journal
    .filter((entry) => entry.data.draft !== true)
    .sort((a, b) => {
      const dateA = a.data.publishedAt
        ? new Date(a.data.publishedAt).valueOf()
        : 0;
      const dateB = b.data.publishedAt
        ? new Date(b.data.publishedAt).valueOf()
        : 0;
      return dateB - dateA;
    });

  return rss({
    title: siteConfig.name,
    description: siteConfig.description,
    site: context.site,
    items: publishedEntries.map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.publishedAt
        ? new Date(entry.data.publishedAt)
        : new Date(),
      description: entry.data.description,
      link: `/journal/${entry.id}/`,
    })),
  });
}
