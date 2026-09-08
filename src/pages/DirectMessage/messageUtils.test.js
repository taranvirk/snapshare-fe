import test from "node:test";
import assert from "node:assert/strict";
import { mergeMessage, messageBelongsToConversation, otherParticipantId } from "./messageUtils.js";

test("mergeMessage orders rapid messages chronologically", () => {
  const newest = { id: 3, client_message_id: "c", created_at: "2026-09-03T12:00:03Z" };
  const oldest = { id: 1, client_message_id: "a", created_at: "2026-09-03T12:00:01Z" };
  const middle = { id: 2, client_message_id: "b", created_at: "2026-09-03T12:00:02Z" };
  const result = [newest, oldest, middle].reduce(mergeMessage, []);
  assert.deepEqual(result.map((message) => message.id), [1, 2, 3]);
});

test("mergeMessage replaces an optimistic message instead of duplicating it", () => {
  const optimistic = { id: "optimistic:abc", client_message_id: "abc", body: "hello", pending: true, created_at: "2026-09-03T12:00:00Z" };
  const persisted = { id: 9, client_message_id: "abc", body: "hello", created_at: "2026-09-03T12:00:01Z" };
  const result = mergeMessage([optimistic], persisted);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 9);
  assert.equal(result[0].pending, false);
});

test("repeated realtime delivery of the same database row remains idempotent", () => {
  const persisted = { id: 12, client_message_id: "message-12", body: "once", created_at: "2026-09-03T12:00:01Z" };
  const result = mergeMessage(mergeMessage([], persisted), persisted);
  assert.equal(result.length, 1);
  assert.equal(result[0].body, "once");
});

test("conversation guards keep messages in the correct chat", () => {
  assert.equal(messageBelongsToConversation({ conversation_id: "conversation-a" }, "conversation-a"), true);
  assert.equal(messageBelongsToConversation({ conversation_id: "conversation-b" }, "conversation-a"), false);
});

test("otherParticipantId returns the user who is not signed in", () => {
  const conversation = { user_one_id: "user-a", user_two_id: "user-b" };
  assert.equal(otherParticipantId(conversation, "user-a"), "user-b");
  assert.equal(otherParticipantId(conversation, "user-b"), "user-a");
});
