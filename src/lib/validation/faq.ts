import { z } from "zod";

export const FAQ_AUDIENCES = ["createur", "clipper", "tous"] as const;

const text = (max: number) => z.string().trim().min(1, { message: "required" }).max(max, { message: "tooLong" });

export const faqItemSchema = z.object({
  audience: z.enum(FAQ_AUDIENCES),
  questionFr: text(300),
  answerFr: text(3000),
  questionEn: text(300),
  answerEn: text(3000),
  sortOrder: z.string().trim().regex(/^\d{1,4}$/, { message: "number" }),
  isVisible: z.boolean(),
  isTop: z.boolean(),
});
export type FaqItemInput = z.infer<typeof faqItemSchema>;
