import test from "node:test";
import assert from "node:assert/strict";
import { appendUniquePosts, cursorFromPost, isImage } from "./exploreUtils.js";

test("appendUniquePosts keeps cursor pages ordered without duplicate posts", () => {
  const current = [{ post_id: 3 }, { post_id: 2 }];
  const incoming = [{ post_id: 2 }, { post_id: 1 }];
  assert.deepEqual(appendUniquePosts(current, incoming).map(({ post_id }) => post_id), [3, 2, 1]);
});

test("cursorFromPost preserves the deterministic ranking tuple", () => {
  assert.deepEqual(cursorFromPost({ post_id: 9, created_at: "2026-09-07T12:00:00Z", score: 0.75 }), {
    postId: 9,
    createdAt: "2026-09-07T12:00:00Z",
    score: 0.75,
  });
});

test("isImage handles storage URLs with query parameters", () => {
  assert.equal(isImage("https://example.com/photo.webp?token=abc"), true);
  assert.equal(isImage("https://example.com/video.mp4"), false);
});
