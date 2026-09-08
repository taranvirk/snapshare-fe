export function compareMessages(left, right) {
  const timeDifference = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  if (timeDifference) return timeDifference;
  const leftId = Number(left.id);
  const rightId = Number(right.id);
  if (Number.isFinite(leftId) && Number.isFinite(rightId)) return leftId - rightId;
  return String(left.id).localeCompare(String(right.id));
}

export function mergeMessage(messages, incoming) {
  const duplicateIndex = messages.findIndex((message) =>
    (incoming.id && String(message.id) === String(incoming.id))
    || (incoming.client_message_id && message.client_message_id === incoming.client_message_id));

  const nextMessages = [...messages];
  if (duplicateIndex >= 0) {
    nextMessages[duplicateIndex] = { ...nextMessages[duplicateIndex], ...incoming, pending: false };
  } else {
    nextMessages.push(incoming);
  }
  return nextMessages.sort(compareMessages);
}

export function messageBelongsToConversation(message, conversationId) {
  return String(message.conversation_id) === String(conversationId);
}

export function otherParticipantId(conversation, currentUserId) {
  return conversation.user_one_id === currentUserId ? conversation.user_two_id : conversation.user_one_id;
}
