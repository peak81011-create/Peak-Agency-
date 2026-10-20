import { z } from "zod";

export const REQUEST_TYPES = ["clip", "style", "nouveau_compte", "modification", "autre"] as const;

export const requestSchema = z.object({
  type: z.enum(REQUEST_TYPES),
  title: z.string().trim().min(3, { message: "required" }).max(160, { message: "tooLong" }),
  description: z.string().trim().min(1, { message: "required" }).max(5000, { message: "tooLong" }),
  desiredDueDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "date" }),
});
export type RequestInput = z.infer<typeof requestSchema>;

export const commentSchema = z.object({
  body: z.string().trim().min(1, { message: "required" }).max(5000, { message: "tooLong" }),
});

export const ENTITY_TYPES = ["clip", "request", "video", "client"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];
