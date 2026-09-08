import { useCallback, useEffect, useRef, useState } from "react";
import { appendUniquePosts } from "./exploreUtils";
import { exploreErrorMessage, fetchExplorePage, recordExploreImpressions } from "./exploreService";

export default function useExploreFeed(userId) {
  const cursorRef = useRef(null);
  const asOfRef = useRef(null);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const requestRef = useRef(0);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");

  const loadPage = useCallback(async ({ reset = false } = {}) => {
    if (loadingRef.current || (!reset && !hasMoreRef.current)) return;
    loadingRef.current = true;
    const requestId = ++requestRef.current;

    if (reset) {
      cursorRef.current = null;
      asOfRef.current = new Date().toISOString();
      hasMoreRef.current = true;
      setPosts([]);
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError("");

    try {
      const page = await fetchExplorePage({ cursor: cursorRef.current, asOf: asOfRef.current });
      if (requestId !== requestRef.current) return;
      setPosts((current) => reset ? page.items : appendUniquePosts(current, page.items));
      cursorRef.current = page.nextCursor;
      hasMoreRef.current = page.hasMore;
      setHasMore(page.hasMore);
      void recordExploreImpressions(page.items.map(({ post_id: postId }) => postId)).catch(() => undefined);
    } catch (loadError) {
      if (requestId === requestRef.current) setError(exploreErrorMessage(loadError));
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    requestRef.current += 1;
    loadingRef.current = false;
    loadPage({ reset: true });
    return () => { requestRef.current += 1; };
  }, [loadPage, userId]);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore: loadPage,
    refresh: () => loadPage({ reset: true }),
  };
}
