import { supabase } from "../../auth/Auth";
import { cursorFromPost } from "./exploreUtils";

export const EXPLORE_PAGE_SIZE = 24;

export async function fetchExplorePage({ cursor = null, asOf, limit = EXPLORE_PAGE_SIZE } = {}) {
  const boundedLimit = Math.min(Math.max(limit, 1), 48);
  const { data, error } = await supabase.rpc("get_explore_feed", {
    p_limit: boundedLimit + 1,
    p_cursor_score: cursor?.score ?? null,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_post_id: cursor?.postId ?? null,
    p_as_of: asOf,
  });
  if (error) throw error;

  const rows = data ?? [];
  const hasMore = rows.length > boundedLimit;
  const items = rows.slice(0, boundedLimit);
  return {
    items,
    hasMore,
    nextCursor: hasMore ? cursorFromPost(items.at(-1)) : null,
  };
}

export async function recordExploreImpressions(postIds) {
  if (!postIds.length) return;
  const { error } = await supabase.rpc("record_explore_impressions", { p_post_ids: postIds });
  if (error) throw error;
}

export async function recordExploreClick(postId) {
  const { error } = await supabase.rpc("record_explore_click", { p_post_id: postId });
  if (error) throw error;
}

export function exploreErrorMessage(error) {
  if (error?.code === "PGRST202" || /get_explore_feed/i.test(error?.message ?? "")) {
    return "Explore needs its Supabase migration before it can be used.";
  }
  return "Explore is unavailable right now. Please try again.";
}
