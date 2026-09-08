import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ChatBubbleOvalLeftIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import { useAuth, supabase } from "../../auth/Auth";
import Avatar from "../../components/Avatar/Avatar";
import Carousel from "../../components/Carousel/Carousel";
import EmptyState from "../../components/EmptyState/EmptyState";
import { getRelativeDate } from "../../utils/DateFormatter";
import { followErrorMessage, followUser } from "../../lib/followService";
import { likePost, unlikePost } from "../../lib/postInteractionService";

function FeedSkeleton() {
  return <div className="post-card skeleton-card"><div className="skeleton skeleton--line" /><div className="skeleton skeleton--media" /><div className="skeleton skeleton--line skeleton--short" /></div>;
}

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [authors, setAuthors] = useState({});
  const [likes, setLikes] = useState({});
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [suggestions, setSuggestions] = useState([]);
  const [followingSuggestions, setFollowingSuggestions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: following, error: followingError } = await supabase.from("followers").select("following_id").eq("follower_id", user.id);
      if (followingError) throw followingError;

      const followedIds = following?.map((row) => row.following_id) ?? [];
      const feedIds = [...new Set([user.id, ...followedIds])];
      const { data: postRows, error: postsError } = await supabase.from("posts").select("*").in("user_id", feedIds).order("post_id", { ascending: false }).limit(30);
      if (postsError) throw postsError;

      const safePosts = postRows ?? [];
      setPosts(safePosts);
      const authorIds = [...new Set(safePosts.map((post) => post.user_id))];
      const postIds = safePosts.map((post) => post.post_id);

      const [authorResult, likesResult, likedResult, suggestionResult] = await Promise.all([
        authorIds.length ? supabase.from("public_profiles").select("user_id, username, profile_picture_url").in("user_id", authorIds) : Promise.resolve({ data: [] }),
        postIds.length ? supabase.from("likes").select("post_id, like_count").in("post_id", postIds) : Promise.resolve({ data: [] }),
        postIds.length ? supabase.from("user_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
        supabase.from("public_profiles").select("user_id, username, profile_picture_url, user_bio").neq("user_id", user.id).limit(8),
      ]);

      setAuthors(Object.fromEntries((authorResult.data ?? []).map((profile) => [profile.user_id, profile])));
      setLikes(Object.fromEntries((likesResult.data ?? []).map((row) => [row.post_id, row.like_count ?? 0])));
      setLikedPosts(new Set((likedResult.data ?? []).map((row) => row.post_id)));
      setSuggestions((suggestionResult.data ?? []).filter((profile) => !followedIds.includes(profile.user_id)).slice(0, 4));
    } catch (feedError) {
      setError(feedError.message || "We couldn't load your feed.");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const toggleLike = async (postId) => {
    const wasLiked = likedPosts.has(postId);
    const previousCount = likes[postId] ?? 0;
    const nextCount = Math.max(0, previousCount + (wasLiked ? -1 : 1));
    setLikedPosts((current) => {
      const next = new Set(current);
      wasLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setLikes((current) => ({ ...current, [postId]: nextCount }));

    try {
      if (wasLiked) await unlikePost(user.id, postId);
      else await likePost(user.id, postId);
    } catch {
      setLikedPosts((current) => {
        const next = new Set(current);
        wasLiked ? next.add(postId) : next.delete(postId);
        return next;
      });
      setLikes((current) => ({ ...current, [postId]: previousCount }));
      toast.error("That like didn't stick. Please try again.");
    }
  };

  const followSuggestion = async (profile) => {
    if (followingSuggestions.has(profile.user_id)) return;
    setFollowingSuggestions((current) => new Set(current).add(profile.user_id));
    try {
      await followUser(user.id, profile.user_id);
      setSuggestions((current) => current.filter((item) => item.user_id !== profile.user_id));
      toast.success(`You're now following ${profile.username}`);
    } catch (error) {
      toast.error(followErrorMessage(error));
    } finally {
      setFollowingSuggestions((current) => {
        const next = new Set(current);
        next.delete(profile.user_id);
        return next;
      });
    }
  };

  return (
    <main className="page page--feed">
      <div className="feed-layout">
        <section className="feed-column">
          <header className="page-heading page-heading--feed">
            <div><span className="eyebrow">Your circle</span><h1>Home</h1></div>
            <Link className="button button--primary button--compact" to="/create-post"><PlusIcon />Share</Link>
          </header>

          {loading && <><FeedSkeleton /><FeedSkeleton /></>}
          {!loading && error && (
            <EmptyState icon={<ArrowPathIcon />} title="Your feed took a detour" body={error} action={<button className="button button--secondary" onClick={loadFeed}>Try again</button>} />
          )}
          {!loading && !error && posts.length === 0 && (
            <EmptyState icon={<MagnifyingGlassIcon />} title="Your feed is ready for people" body="Follow a few creators or share the first post to start filling this space." action={<div className="button-row"><Link className="button button--primary" to="/search">Find people</Link><Link className="button button--ghost" to="/create-post">Create a post</Link></div>} />
          )}

          {!loading && posts.map((post) => {
            const author = authors[post.user_id] ?? { username: "Snapshare member" };
            const liked = likedPosts.has(post.post_id);
            return (
              <article className="post-card" key={post.post_id}>
                <header className="post-card__header">
                  <Link to={`/${author.username}`} className="user-line"><Avatar src={author.profile_picture_url} name={author.username} size="sm" /><span><strong>{author.username}</strong><small>{getRelativeDate(post.updated_at || post.created_at)}</small></span></Link>
                  <Link className="post-card__open" to={`/post/${post.post_id}`} aria-label="Open post">•••</Link>
                </header>
                <Carousel images={post.file_url?.length ? post.file_url : post.image_url ? [post.image_url] : []} label={`Post by ${author.username}`} />
                <div className="post-card__body">
                  <div className="post-card__actions">
                    <button className={`reaction-button ${liked ? "reaction-button--active" : ""}`} onClick={() => toggleLike(post.post_id)} aria-label={liked ? "Unlike post" : "Like post"}>{liked ? <HeartSolid /> : <HeartIcon />}</button>
                    <Link className="reaction-button" to={`/post/${post.post_id}`} aria-label="View comments"><ChatBubbleOvalLeftIcon /></Link>
                    <button className="reaction-button" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/post/${post.post_id}`); toast.success("Post link copied"); }} aria-label="Share post"><ArrowUpTrayIcon /></button>
                    <span className="post-card__likes">{likes[post.post_id] ?? 0} {(likes[post.post_id] ?? 0) === 1 ? "like" : "likes"}</span>
                  </div>
                  <p className="post-card__caption"><Link to={`/${author.username}`}>{author.username}</Link> {post.caption}</p>
                  <Link className="post-card__comments" to={`/post/${post.post_id}`}>View conversation</Link>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="feed-sidebar">
          <div className="side-card side-card--accent">
            <span className="eyebrow">A little nudge</span>
            <h2>What made today feel like yours?</h2>
            <p>Turn one ordinary moment into a memory your friends can keep.</p>
            <Link to="/create-post">Create a post <span>↗</span></Link>
          </div>
          <div className="side-card">
            <div className="side-card__heading"><h2>People to discover</h2><Link to="/search">See all</Link></div>
            <div className="suggestion-list">
              {suggestions.length ? suggestions.map((profile) => (
                <div className="suggestion" key={profile.user_id}>
                  <Link to={`/${profile.username}`}><Avatar src={profile.profile_picture_url} name={profile.username} size="sm" /></Link>
                  <Link className="suggestion__name" to={`/${profile.username}`}><strong>{profile.username}</strong><small>{profile.user_bio || "New to your orbit"}</small></Link>
                  <button onClick={() => followSuggestion(profile)} disabled={followingSuggestions.has(profile.user_id)}>{followingSuggestions.has(profile.user_id) ? "Following…" : "Follow"}</button>
                </div>
              )) : <p className="muted-copy">You&apos;re all caught up.</p>}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
