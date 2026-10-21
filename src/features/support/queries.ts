import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TicketAudience, TicketStatus } from "@/lib/validation/support";

export type TicketRow = {
  id: string;
  number: number;
  author_id: string;
  audience: TicketAudience;
  category: string;
  subject: string;
  status: TicketStatus;
  priority: "basse" | "normale" | "haute";
  assigned_to: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  satisfaction: number | null;
  satisfaction_comment: string | null;
  created_at: string;
  updated_at: string;
  author: { full_name: string; email: string } | null;
  assignee: { full_name: string } | null;
};

const TICKET_FIELDS =
  "id, number, author_id, audience, category, subject, status, priority, assigned_to, first_response_at, resolved_at, satisfaction, satisfaction_comment, created_at, updated_at, author:profiles!support_tickets_author_id_fkey(full_name, email), assignee:profiles!support_tickets_assigned_to_fkey(full_name)";

export async function listTickets(filters: { authorId?: string; audience?: string; category?: string; status?: string; assignedTo?: string | null } = {}) {
  const supabase = await createSupabaseServerClient();
  let q = supabase.from("support_tickets").select(TICKET_FIELDS).order("created_at", { ascending: false }).limit(300);
  if (filters.authorId) q = q.eq("author_id", filters.authorId);
  if (filters.audience) q = q.eq("audience", filters.audience);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.status === "open") q = q.neq("status", "resolu");
  else if (filters.status) q = q.eq("status", filters.status);
  if (filters.assignedTo === null) q = q.is("assigned_to", null);
  else if (filters.assignedTo) q = q.eq("assigned_to", filters.assignedTo);
  const { data } = await q;
  return (data ?? []) as unknown as TicketRow[];
}

export async function getTicket(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("support_tickets").select(TICKET_FIELDS).eq("id", id).maybeSingle();
  return data as unknown as TicketRow | null;
}

export type TicketMessage = {
  id: string;
  author_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
  author: { full_name: string; role: string } | null;
};

export async function listTicketMessages(ticketId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("ticket_messages")
    .select("id, author_id, body, is_internal, created_at, author:profiles(full_name, role)")
    .eq("ticket_id", ticketId)
    .order("created_at");
  return (data ?? []) as unknown as TicketMessage[];
}

export async function listSavedReplies() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("saved_replies").select("id, title, body_fr, body_en").order("title");
  return data ?? [];
}

/** Ticket en retard : en attente de l'équipe depuis plus longtemps que le délai annoncé. */
export function isOverdue(t: Pick<TicketRow, "status" | "updated_at">, slaHours: number | null, now = Date.now()): boolean {
  if (slaHours === null || (t.status !== "ouvert" && t.status !== "en_cours")) return false;
  return now - new Date(t.updated_at).getTime() > slaHours * 3_600_000;
}
