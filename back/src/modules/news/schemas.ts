import { z } from "zod";

const categorySchema = z.enum([
  "world",
  "business",
  "tech",
  "science",
  "health",
  "sports",
  "entertainment",
  "politics",
  "finance",
  "travel",
  "climate",
  "ai"
]);

export const listNewsBriefingSchema = z.object({
  categories: z.preprocess(value => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      return value
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
    }

    return ["world", "business", "tech"];
  }, z.array(categorySchema).min(1).max(5).default(["world", "business", "tech"])),
  language: z.enum(["en", "ko"]).default("en")
});

export const recordNewsClickSchema = z.object({
  category: categorySchema,
  articleUrl: z.string().url().max(2000).optional()
});
