import "server-only";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { serverEnv } from "@/lib/server-env";

/**
 * Envoie un e-mail transactionnel via Resend. Sans clé (développement,
 * tests), l'e-mail est seulement écrit dans le journal du serveur.
 * Une panne d'envoi ne doit jamais faire échouer l'action de l'utilisateur.
 */
export async function sendEmail(input: { to: string; subject: string; react: ReactElement }): Promise<void> {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) {
    console.info(`[e-mail non envoyé : RESEND_API_KEY absente] à ${input.to} — ${input.subject}`);
    return;
  }
  try {
    const { error } = await new Resend(env.RESEND_API_KEY).emails.send({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      react: input.react,
    });
    if (error) console.error(`[e-mail] échec d'envoi à ${input.to} : ${error.message}`);
  } catch (err) {
    console.error(`[e-mail] échec d'envoi à ${input.to}`, err);
  }
}
