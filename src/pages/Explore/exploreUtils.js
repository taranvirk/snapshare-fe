export function appendUniquePosts(current, incoming) {
  const seen = new Set(current.map((post) => String(post.post_id)));
  return [...current, ...incoming.filter((post) => {
    const key = String(post.post_id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })];
}

export function cursorFromPost(post) {
  if (!post) return null;
  return {
    score: post.score,
    createdAt: post.created_at,
    postId: post.post_id,
  };
}

export function isImage(url = "") {
  return /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|avif)(\?.*)?$/i.test(url);
}
