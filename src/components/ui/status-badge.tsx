import { getTranslations } from "next-intl/server";
import { Badge, type Tone } from "./badge";

// Correspondance statut → ton (maquette, Main.dc.html section 03).
// Chaque phase ajoute ses types (clip, tâche, prospect).
const TONES = {
  client: {
    inscrit: "neutral",
    attente_paiement: "neutral",
    paiement_a_verifier: "amber",
    actif: "green",
    grace: "orange",
    lecture_seule: "red",
    suspendu: "red",
    archive: "neutral",
  },
  payment: {
    en_attente: "neutral",
    a_verifier: "amber",
    valide: "green",
    refuse: "red",
  },
  clip: {
    planifie: "neutral",
    en_montage: "blue",
    a_valider: "amber",
    valide: "teal",
    programme: "violet",
    publie: "forest",
    rejete: "red",
  },
  video: {
    envoi: "blue",
    recue: "neutral",
    en_traitement: "amber",
    clips_extraits: "green",
    archivee: "neutral",
    erreur: "red",
  },
  request: {
    nouvelle: "blue",
    en_cours: "amber",
    terminee: "green",
    refusee: "red",
  },
  account: {
    actif: "green",
    en_croissance: "teal",
    bloque: "red",
    abandonne: "neutral",
  },
} as const satisfies Record<string, Record<string, Tone>>;

type StatusType = keyof typeof TONES;

export async function StatusBadge<T extends StatusType>({ type, value }: { type: T; value: keyof (typeof TONES)[T] & string }) {
  const t = await getTranslations("status");
  const tone = (TONES[type] as Record<string, Tone>)[value] ?? "neutral";
  return <Badge tone={tone}>{t(`${type}.${value}` as never)}</Badge>;
}
