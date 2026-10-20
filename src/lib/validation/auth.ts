import { z } from "zod";

// Schémas partagés client/serveur. Les messages sont des clés de traduction
// (namespace « validation »), traduites à l'affichage.

export const emailSchema = z.email({ message: "email" }).max(254, { message: "tooLong" });

export const passwordSchema = z
  .string()
  .min(12, { message: "passwordTooShort" })
  .max(128, { message: "tooLong" })
  .regex(/\d/, { message: "passwordDigit" })
  .regex(/[^A-Za-z0-9]/, { message: "passwordSymbol" });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "required" }).max(128, { message: "tooLong" }),
});

export const signupSchema = z.object({
  fullName: z.string().trim().min(1, { message: "required" }).max(120, { message: "tooLong" }),
  creatorName: z.string().trim().min(1, { message: "required" }).max(120, { message: "tooLong" }),
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal(true, { message: "termsRequired" }),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z.object({ password: passwordSchema });

export const mfaCodeSchema = z.object({ code: z.string().regex(/^\d{6}$/, { message: "code" }) });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotInput = z.infer<typeof forgotSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
export type MfaCodeInput = z.infer<typeof mfaCodeSchema>;

/** Transforme une erreur zod en { champ: cléDeMessage }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
