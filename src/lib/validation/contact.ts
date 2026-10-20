import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1, { message: "required" }).max(120, { message: "tooLong" }),
  email: z.email({ message: "email" }).max(254, { message: "tooLong" }),
  channelUrl: z
    .string()
    .trim()
    .max(300, { message: "tooLong" })
    .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), { message: "url" }),
  message: z.string().trim().min(10, { message: "messageTooShort" }).max(5000, { message: "tooLong" }),
  // Champ piège invisible : un humain le laisse vide.
  website: z.string().max(0).optional().or(z.literal("")),
});
export type ContactInput = z.infer<typeof contactSchema>;
