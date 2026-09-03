import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const journalEntry = z.object({
  title: z.string(),
  description: z.string(),
});

const journal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/journal" }),
  schema: z.discriminatedUnion("draft", [
    journalEntry.extend({
      draft: z.literal(true),
      publishedAt: z.coerce.date().optional(),
    }),
    journalEntry.extend({
      draft: z.literal(false),
      publishedAt: z.coerce.date(),
    }),
  ]),
});

export const collections = { journal };
