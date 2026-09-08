import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MagnifyingGlassIcon, PhotoIcon, UserGroupIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../auth/Auth";
import Avatar from "../../components/Avatar/Avatar";
import EmptyState from "../../components/EmptyState/EmptyState";

function isImage(url = "") { return /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url); }

export default function Search() {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [authors, setAuthors] = useState({});
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDiscovery() {
      try {
        const [{ data: userRows, error: usersError }, { data: postRows, error: postsError }] = await Promise.all([
          supabase.from("public_profiles").select("user_id, username, user_bio, profile_picture_url").order("username").limit(60),
          supabase.from("posts").select("*").order("post_id", { ascending: false }).limit(60),
        ]);
        if (usersError || postsError) throw usersError || postsError;
        if (!active) return;
        const profiles = userRows ?? [];
        setUsers(profiles);
        setPosts(postRows ?? []);
        setAuthors(Object.fromEntries(profiles.map((profile) => [profile.user_id, profile])));
      } catch (loadError) {
        if (active) setError(loadError.message || "Discovery is unavailable right now.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDiscovery();
    return () => { active = false; };
  }, []);

  const normalized = query.trim().toLowerCase();
  const filteredUsers = useMemo(() => users.filter((profile) => !normalized || profile.username?.toLowerCase().includes(normalized) || profile.user_bio?.toLowerCase().includes(normalized)), [normalized, users]);
  const filteredPosts = useMemo(() => posts.filter((post) => !normalized || post.caption?.toLowerCase().includes(normalized) || authors[post.user_id]?.username?.toLowerCase().includes(normalized)), [authors, normalized, posts]);

  return (
    <main className="page page--wide">
      <header className="discover-header">
        <span className="eyebrow">Find your next favorite</span>
        <h1>Discover</h1>
        <p>Search people, ideas, and the moments being shared right now.</p>
        <label className="search-box">
          <MagnifyingGlassIcon />
          <input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people and posts" aria-label="Search people and posts" />
          {query && <button onClick={() => setQuery("")} aria-label="Clear search"><XMarkIcon /></button>}
        </label>
        <div className="filter-tabs" role="tablist">
          {[{ id: "all", label: "Everything" }, { id: "people", label: "People" }, { id: "posts", label: "Posts" }].map(({ id, label }) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
        </div>
      </header>

      {loading && <div className="discovery-loading"><span className="spinner" />Loading discovery</div>}
      {!loading && error && <EmptyState icon={<MagnifyingGlassIcon />} title="Discovery took a break" body={error} />}

      {!loading && !error && (tab === "all" || tab === "people") && (
        <section className="discovery-section">
          <div className="section-heading"><div><span className="section-heading__icon"><UserGroupIcon /></span><h2>{normalized ? "People" : "People worth meeting"}</h2></div><span>{filteredUsers.length} results</span></div>
          {filteredUsers.length ? <div className="people-grid">{filteredUsers.slice(0, tab === "all" ? 8 : 40).map((profile) => (
            <Link className="person-card" to={`/${profile.username}`} key={profile.user_id}><Avatar src={profile.profile_picture_url} name={profile.username} size="lg" /><div><strong>{profile.username}</strong><p>{profile.user_bio || "Sharing life, one snap at a time."}</p></div><span>View profile ↗</span></Link>
          ))}</div> : <EmptyState icon={<UserGroupIcon />} title="No people found" body="Try a shorter name or a different spelling." />}
        </section>
      )}

      {!loading && !error && (tab === "all" || tab === "posts") && (
        <section className="discovery-section">
          <div className="section-heading"><div><span className="section-heading__icon"><PhotoIcon /></span><h2>{normalized ? "Posts" : "Fresh from the community"}</h2></div><span>{filteredPosts.length} results</span></div>
          {filteredPosts.length ? <div className="post-grid">{filteredPosts.slice(0, tab === "all" ? 12 : 60).map((post) => {
            const media = post.file_url?.[0] ?? post.image_url;
            const author = authors[post.user_id];
            return <Link className="post-tile" to={`/post/${post.post_id}`} key={post.post_id}>{media ? (isImage(media) ? <img src={media} alt={post.caption || "Post"} /> : <video src={media} muted preload="metadata" />) : <span className="post-tile__empty"><PhotoIcon /></span>}<div className="post-tile__overlay"><strong>{author?.username || "Snapshare member"}</strong><p>{post.caption}</p></div></Link>;
          })}</div> : <EmptyState icon={<PhotoIcon />} title="No posts found" body="Try another keyword or browse everything." />}
        </section>
      )}
    </main>
  );
}
