"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, authorize } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/session";
import { logError } from "@/lib/log";
import { notifyPermission, notifyUsers } from "@/lib/notifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  type SavedReplyInput,
  audienceOf,
  type TicketInput,
  type TicketStatus,
  savedReplySchema,
  ticketReplySchema,
  ticketSchema,
} from "@/lib/validation/support";

const uuid = z.uuid();

/** Nouveau ticket (personne connectée). */
export async function createTicketAction(input: TicketInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const audience = audienceOf(user);
  if (!TICKET_CATEGORIES[audience].includes(parsed.data.category)) return { ok: false, error: "validation" };

  const supabase = await createSupabaseServerClient();
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({ author_id: user.id, audience, category: parsed.data.category, subject: parsed.data.subject })
    .select("id, number")
    .single();
  if (error || !ticket) {
    logError("support.create", error);
    return { ok: false, error: "generic" };
  }
  const { error: msgError } = await supabase.from("ticket_messages").insert({ ticket_id: ticket.id, author_id: user.id, body: parsed.data.message });
  logError("support.firstMessage", msgError);
  await notifyPermission(
    "support.manage",
    "ticket_created",
    { name: user.fullName || user.email, subject: parsed.data.subject, number: ticket.number },
    `/admin/support/${ticket.id}`,
  );
  revalidatePath("/", "layout");
  return { ok: true, data: { id: ticket.id } };
}

/** Message dans un ticket : l'auteur répond, ou l'équipe (réponse ou note interne). */
export async function replyTicketAction(ticketId: string, body: string, internal = false): Promise<ActionResult> {
  const user = await requireUser();
  if (!uuid.safeParse(ticketId).success) return { ok: false, error: "validation" };
  const parsed = ticketReplySchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "validation" };

  const supabase = await createSupabaseServerClient();
  const { data: ticket } = await supabase.from("support_tickets").select("id, number, author_id, assigned_to, subject").eq("id", ticketId).maybeSingle();
  if (!ticket) return { ok: false, error: "forbidden" };
  const isAuthor = ticket.author_id === user.id;
  const { error } = await supabase
    .from("ticket_messages")
    .insert({ ticket_id: ticketId, author_id: user.id, body: parsed.data, is_internal: !isAuthor && internal });
  if (error) {
    logError("support.reply", error);
    return { ok: false, error: "forbidden" };
  }
  const payload = { subject: ticket.subject, number: ticket.number, body: parsed.data.slice(0, 300) };
  if (isAuthor) {
    if (ticket.assigned_to) await notifyUsers([ticket.assigned_to], "ticket_reply", payload, `/admin/support/${ticketId}`);
    else await notifyPermission("support.manage", "ticket_reply", payload, `/admin/support/${ticketId}`);
  } else if (!internal) {
    await notifyUsers([ticket.author_id], "ticket_reply", payload, `/support/${ticketId}`);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resolveTicketAction(ticketId: string): Promise<ActionResult> {
  return rpc("ticket_resolve", { p_ticket_id: ticketId });
}

export async function reopenTicketAction(ticketId: string): Promise<ActionResult> {
  return rpc("ticket_reopen", { p_ticket_id: ticketId });
}

export async function rateTicketAction(ticketId: string, rating: number, comment: string): Promise<ActionResult> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "validation" };
  return rpc("ticket_rate", { p_ticket_id: ticketId, p_rating: rating, p_comment: comment.slice(0, 2000) });
}

async function rpc(fn: string, args: Record<string, unknown>): Promise<ActionResult> {
  await requireUser();
  if (!uuid.safeParse(args.p_ticket_id).success) return { ok: false, error: "validation" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) {
    logError(`support.${fn}`, error);
    return { ok: false, error: "forbidden" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Équipe : statut, priorité, attribution. */
export async function updateTicketAction(
  ticketId: string,
  values: { status: TicketStatus; priority: "basse" | "normale" | "haute"; assignedTo: string },
): Promise<ActionResult> {
  const auth = await authorize("support.manage");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!uuid.safeParse(ticketId).success || !TICKET_STATUSES.includes(values.status)) return { ok: false, error: "validation" };
  if (!["basse", "normale", "haute"].includes(values.priority)) return { ok: false, error: "validation" };
  const assignedTo = values.assignedTo && uuid.safeParse(values.assignedTo).success ? values.assignedTo : null;
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("support_tickets").select("status, assigned_to, subject, number").eq("id", ticketId).maybeSingle();
  if (!before) return { ok: false, error: "forbidden" };
  const { error } = await supabase
    .from("support_tickets")
    .update({
      status: values.status,
      priority: values.priority,
      assigned_to: assignedTo,
      resolved_at: values.status === "resolu" ? (before.status === "resolu" ? undefined : new Date().toISOString()) : null,
    })
    .eq("id", ticketId);
  if (error) {
    logError("support.update", error);
    return { ok: false, error: "forbidden" };
  }
  if (assignedTo && assignedTo !== before.assigned_to && assignedTo !== auth.user.id) {
    await notifyUsers([assignedTo], "ticket_assigned", { subject: before.subject, number: before.number }, `/admin/support/${ticketId}`);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Réponses enregistrées (modèles FR/EN). */
export async function saveSavedReplyAction(id: string | null, input: SavedReplyInput): Promise<ActionResult> {
  const auth = await authorize("support.manage");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (id !== null && !uuid.safeParse(id).success) return { ok: false, error: "validation" };
  const parsed = savedReplySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const row = { title: parsed.data.title, body_fr: parsed.data.bodyFr, body_en: parsed.data.bodyEn };
  const supabase = await createSupabaseServerClient();
  const { error } = id
    ? await supabase.from("saved_replies").update(row).eq("id", id)
    : await supabase.from("saved_replies").insert({ ...row, created_by: auth.user.id });
  logError("support.savedReply", error);
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteSavedReplyAction(id: string): Promise<ActionResult> {
  const auth = await authorize("support.manage");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!uuid.safeParse(id).success) return { ok: false, error: "validation" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("saved_replies").delete().eq("id", id);
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Message du formulaire de contact traité (boîte de réception unifiée). */
export async function markContactHandledAction(id: string, handled: boolean): Promise<ActionResult> {
  const auth = await authorize("requests.manage");
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!uuid.safeParse(id).success) return { ok: false, error: "validation" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("contact_messages").update({ handled, handled_by: handled ? auth.user.id : null }).eq("id", id);
  if (error) return { ok: false, error: "forbidden" };
  revalidatePath("/", "layout");
  return { ok: true };
}
