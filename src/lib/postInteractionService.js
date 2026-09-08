import { supabase } from "../auth/Auth";

async function addRelationship(table, userId, postId) {
  const { error } = await supabase
    .from(table)
    .upsert({ user_id: userId, post_id: postId }, { onConflict: "user_id,post_id", ignoreDuplicates: true });
  if (error) throw error;
}

async function removeRelationship(table, userId, postId) {
  const { error } = await supabase.from(table).delete().eq("user_id", userId).eq("post_id", postId);
  if (error) throw error;
}

export const likePost = (userId, postId) => addRelationship("user_likes", userId, postId);
export const unlikePost = (userId, postId) => removeRelationship("user_likes", userId, postId);
export const savePost = (userId, postId) => addRelationship("post_saves", userId, postId);
export const unsavePost = (userId, postId) => removeRelationship("post_saves", userId, postId);
