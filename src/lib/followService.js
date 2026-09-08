import { supabase } from "../auth/Auth";

export async function followUser(followerId, followingId) {
  if (!followerId || !followingId || followerId === followingId) {
    throw new Error("A valid follow relationship requires two different users.");
  }

  const { error } = await supabase
    .from("followers")
    .upsert(
      { follower_id: followerId, following_id: followingId },
      { onConflict: "follower_id,following_id", ignoreDuplicates: true },
    );
  if (!error) return;

  // A legacy table can report a conflict before the migration repairs its ID
  // sequence. Treat it as success only when the requested pair really exists.
  if (error.code === "23505") {
    const { count, error: verificationError } = await supabase
      .from("followers")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    if (!verificationError && count > 0) return;
  }
  throw error;
}

export async function unfollowUser(followerId, followingId) {
  const { error } = await supabase
    .from("followers")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  if (error) throw error;
}

export function followErrorMessage(error) {
  if (error?.code === "23505" || error?.code === "42P10" || error?.code === "42501" || error?.code === "PGRST204") {
    return "Following needs its Supabase migration before it can be used.";
  }
  return "Couldn't update this follow. Please try again.";
}
