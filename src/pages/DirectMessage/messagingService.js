import { supabase } from "../../auth/Auth";
import { compareMessages, otherParticipantId } from "./messageUtils";

const PROFILE_FIELDS = "user_id, username, profile_picture_url, user_bio";

export async function listConversations(currentUserId) {
  const { data: rows, error } = await supabase
    .from("conversations")
    .select("id, user_one_id, user_two_id, created_at, updated_at, last_message_at, last_message_preview, last_sender_id")
    .or(`user_one_id.eq.${currentUserId},user_two_id.eq.${currentUserId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  const otherUserIds = [...new Set((rows ?? []).map((conversation) => otherParticipantId(conversation, currentUserId)))];
  if (!otherUserIds.length) return [];

  const { data: profiles, error: profileError } = await supabase.from("public_profiles").select(PROFILE_FIELDS).in("user_id", otherUserIds);
  if (profileError) throw profileError;
  const profileById = Object.fromEntries((profiles ?? []).map((profile) => [profile.user_id, profile]));

  return rows.map((conversation) => {
    const otherUserId = otherParticipantId(conversation, currentUserId);
    return {
      ...conversation,
      otherUserId,
      otherUser: profileById[otherUserId] ?? { user_id: otherUserId, username: "Snapshare member", profile_picture_url: "", user_bio: "" },
    };
  });
}

export async function getOrCreateConversation(otherUserId) {
  const { data, error } = await supabase.rpc("get_or_create_conversation", { other_user_id: otherUserId });
  if (error) throw error;
  return data;
}

export async function listRegisteredUsers(currentUserId) {
  const { data, error } = await supabase.from("public_profiles").select(PROFILE_FIELDS).neq("user_id", currentUserId).order("username");
  if (error) throw error;
  return data ?? [];
}

export async function loadConversationMessages(conversationId) {
  const pageSize = 500;
  const messages = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, recipient_id, body, client_message_id, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    messages.push(...(data ?? []));
    hasMore = Boolean(data && data.length === pageSize);
    if (hasMore) from += pageSize;
  }

  return messages.sort(compareMessages);
}

export async function insertMessage({ conversationId, senderId, recipientId, body, clientMessageId }) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      recipient_id: recipientId,
      body,
      client_message_id: clientMessageId,
    })
    .select("id, conversation_id, sender_id, recipient_id, body, client_message_id, created_at")
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToMessages(currentUserId, onMessage, onStatus) {
  const channel = supabase
    .channel(`direct-messages:${currentUserId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${currentUserId}` }, ({ new: message }) => onMessage(message))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${currentUserId}` }, ({ new: message }) => onMessage(message))
    .subscribe((status) => onStatus?.(status));

  return () => { void supabase.removeChannel(channel); };
}
