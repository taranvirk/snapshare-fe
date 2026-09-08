import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowPathIcon, MagnifyingGlassIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../auth/Auth";
import EmptyState from "../../components/EmptyState/EmptyState";
import ExploreSkeleton from "./ExploreSkeleton";
import ExploreTile from "./ExploreTile";
import useExploreFeed from "./useExploreFeed";

export default function Explore() {
  const { user } = useAuth();
  const sentinelRef = useRef(null);
  const { posts, loading, loadingMore, hasMore, error, loadMore, refresh } = useExploreFeed(user.id);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading || loadingMore || error) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { rootMargin: "500px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [error, hasMore, loadMore, loading, loadingMore]);

  return (
    <main className="page page--wide explore-page">
      <header className="explore-header">
        <div><span className="eyebrow">Made for your curiosity</span><h1>Explore</h1><p>Fresh perspectives, rising posts, and creators beyond your circle.</p></div>
        <div className="button-row"><button className="button button--ghost" type="button" onClick={refresh}><ArrowPathIcon />Refresh</button><Link className="button button--secondary" to="/search"><MagnifyingGlassIcon />Search</Link></div>
      </header>

      {loading && <ExploreSkeleton />}
      {!loading && error && <EmptyState icon={<ArrowPathIcon />} title="Explore took a detour" body={error} action={<button className="button button--secondary" type="button" onClick={refresh}>Try again</button>} />}
      {!loading && !error && !posts.length && <EmptyState icon={<SparklesIcon />} title="Nothing new to explore yet" body="Share more moments or check back as the Snapshare community grows." action={<Link className="button button--primary" to="/create-post">Create a post</Link>} />}

      {!loading && !error && posts.length > 0 && (
        <>
          <section className="explore-grid" aria-label="Recommended posts">
            {posts.map((post, index) => <ExploreTile post={post} featured={index % 11 === 0} key={post.post_id} />)}
          </section>
          <div className="explore-sentinel" ref={sentinelRef} aria-hidden="true" />
          {loadingMore && <div className="discovery-loading"><span className="spinner" />Finding more posts</div>}
          {!hasMore && <p className="explore-end">You’re caught up—for now.</p>}
        </>
      )}
    </main>
  );
}
