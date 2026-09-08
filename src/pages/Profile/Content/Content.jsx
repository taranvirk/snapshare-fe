import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookmarkIcon, Cog6ToothIcon, HeartIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth, supabase } from "../../../auth/Auth";
import Avatar from "../../../components/Avatar/Avatar";
import EmptyState from "../../../components/EmptyState/EmptyState";
import Loader from "../../../components/Loader/Loader";

function isImage(url = "") { return /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url); }
function websiteHref(value = "") { return /^https?:\/\//i.test(value) ? value : `https://${value}`; }

export default function Content() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ username: "", user_bio: "", website: "", profile_picture_url: "" });
  const [draft, setDraft] = useState(profile);
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [view, setView] = useState("posts");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [peopleModal, setPeopleModal] = useState(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: profileRow, error: profileError }, { data: postRows }, { data: followerRows }, { data: followingRows }, { data: likeRows }, { data: saveRows }] = await Promise.all([
        supabase.from("users123").select("user_id, username, email, user_bio, profile_picture_url, website, created_at, updated_at").eq("user_id", user.id).maybeSingle(),
        supabase.from("posts").select("*").eq("user_id", user.id).order("post_id", { ascending: false }),
        supabase.from("followers").select("follower_id").eq("following_id", user.id),
        supabase.from("followers").select("following_id").eq("follower_id", user.id),
        supabase.from("user_likes").select("post_id").eq("user_id", user.id),
        supabase.from("post_saves").select("post_id").eq("user_id", user.id),
      ]);
      if (profileError) throw profileError;

      const safeProfile = profileRow ?? { username: "", user_bio: "", website: "", profile_picture_url: "" };
      setProfile(safeProfile);
      setDraft(safeProfile);
      setEditing(!profileRow);
      setPosts(postRows ?? []);

      const followerIds = followerRows?.map((row) => row.follower_id) ?? [];
      const followingIds = followingRows?.map((row) => row.following_id) ?? [];
      const likedIds = likeRows?.map((row) => row.post_id) ?? [];
      const savedIds = saveRows?.map((row) => row.post_id) ?? [];
      const [followerProfiles, followingProfiles, likedPostRows, savedPostRows] = await Promise.all([
        followerIds.length ? supabase.from("public_profiles").select("user_id, username, profile_picture_url, user_bio").in("user_id", followerIds) : Promise.resolve({ data: [] }),
        followingIds.length ? supabase.from("public_profiles").select("user_id, username, profile_picture_url, user_bio").in("user_id", followingIds) : Promise.resolve({ data: [] }),
        likedIds.length ? supabase.from("posts").select("*").in("post_id", likedIds).order("post_id", { ascending: false }) : Promise.resolve({ data: [] }),
        savedIds.length ? supabase.from("posts").select("*").in("post_id", savedIds).order("post_id", { ascending: false }) : Promise.resolve({ data: [] }),
      ]);
      setFollowers(followerProfiles.data ?? []);
      setFollowing(followingProfiles.data ?? []);
      setLikedPosts(likedPostRows.data ?? []);
      setSavedPosts(savedPostRows.data ?? []);
    } catch (error) {
      toast.error(error.message || "Couldn't load your profile.");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const username = draft.username.trim();
    if (!/^[a-zA-Z0-9._]{3,30}$/.test(username)) return toast.error("Use 3–30 letters, numbers, dots, or underscores for your username.");
    setSaving(true);
    const payload = { user_id: user.id, email: user.email, username, user_bio: draft.user_bio?.trim() || "", website: draft.website?.trim() || "", profile_picture_url: draft.profile_picture_url?.trim() || "" };
    const { error } = await supabase.from("users123").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error(error.message || "Profile couldn't be saved.");
    setProfile(payload);
    setDraft(payload);
    setEditing(false);
    toast.success("Profile updated.");
  };

  if (loading) return <Loader />;
  const visiblePosts = view === "posts" ? posts : view === "liked" ? likedPosts : savedPosts;
  const modalPeople = peopleModal === "followers" ? followers : following;

  return (
    <main className="page page--profile">
      <section className="profile-hero">
        <div className="profile-hero__art"><span className="profile-orbit profile-orbit--one" /><span className="profile-orbit profile-orbit--two" /></div>
        <div className="profile-hero__content">
          <Avatar src={profile.profile_picture_url} name={profile.username || user.email} size="xl" className="profile-avatar" />
          {editing ? (
            <form className="profile-edit-form" onSubmit={saveProfile}>
              <div className="profile-edit-form__heading"><div><span className="eyebrow">Make it yours</span><h1>{profile.username ? "Edit profile" : "Create your profile"}</h1></div>{profile.username && <button className="icon-button" type="button" onClick={() => { setDraft(profile); setEditing(false); }} aria-label="Cancel editing"><XMarkIcon /></button>}</div>
              <div className="form-grid">
                <label><span>Username</span><input value={draft.username || ""} onChange={(event) => setDraft({ ...draft, username: event.target.value })} placeholder="your.name" required /></label>
                <label><span>Profile image URL</span><input value={draft.profile_picture_url || ""} onChange={(event) => setDraft({ ...draft, profile_picture_url: event.target.value })} placeholder="https://…" type="url" /></label>
                <label className="form-grid__wide"><span>Bio</span><textarea rows="3" maxLength="160" value={draft.user_bio || ""} onChange={(event) => setDraft({ ...draft, user_bio: event.target.value })} placeholder="What are you into lately?" /></label>
                <label className="form-grid__wide"><span>Website</span><input value={draft.website || ""} onChange={(event) => setDraft({ ...draft, website: event.target.value })} placeholder="your-site.com" /></label>
              </div>
              <div className="profile-edit-form__actions"><button className="button button--primary" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button></div>
            </form>
          ) : (
            <div className="profile-summary">
              <div className="profile-summary__top"><div><span className="eyebrow">Your corner of Snapshare</span><h1>{profile.username}</h1></div><div className="button-row"><button className="button button--secondary" onClick={() => setEditing(true)}>Edit profile</button><Link className="icon-button" to="/settings" aria-label="Settings"><Cog6ToothIcon /></Link></div></div>
              <p className="profile-summary__bio">{profile.user_bio || "Add a bio so people know what makes your world interesting."}</p>
              {profile.website && <a className="profile-website" href={websiteHref(profile.website)} target="_blank" rel="noreferrer">{profile.website} ↗</a>}
              <div className="profile-stats"><div><strong>{posts.length}</strong><span>posts</span></div><button onClick={() => setPeopleModal("followers")}><strong>{followers.length}</strong><span>followers</span></button><button onClick={() => setPeopleModal("following")}><strong>{following.length}</strong><span>following</span></button></div>
            </div>
          )}
        </div>
      </section>

      {!editing && (
        <section className="profile-gallery">
          <div className="profile-tabs"><button className={view === "posts" ? "active" : ""} onClick={() => setView("posts")}><PhotoIcon />Posts</button><button className={view === "liked" ? "active" : ""} onClick={() => setView("liked")}><HeartIcon />Liked</button><button className={view === "saved" ? "active" : ""} onClick={() => setView("saved")}><BookmarkIcon />Saved</button></div>
          {visiblePosts.length ? <div className="post-grid post-grid--profile">{visiblePosts.map((post) => {
            const media = post.file_url?.[0] ?? post.image_url;
            return <Link className="post-tile" to={`/post/${post.post_id}`} key={post.post_id}>{media ? (isImage(media) ? <img src={media} alt={post.caption || "Post"} /> : <video src={media} muted preload="metadata" />) : <span className="post-tile__empty"><PhotoIcon /></span>}<div className="post-tile__overlay"><p>{post.caption}</p></div></Link>;
          })}</div> : <EmptyState icon={view === "posts" ? <PhotoIcon /> : view === "liked" ? <HeartIcon /> : <BookmarkIcon />} title={view === "posts" ? "No posts yet" : view === "liked" ? "Nothing liked yet" : "Nothing saved yet"} body={view === "posts" ? "Share a moment and it will appear on your profile." : view === "liked" ? "Posts you like will be collected here." : "Save a post and it will be collected here."} action={view === "posts" ? <Link className="button button--primary" to="/create-post">Create your first post</Link> : null} />}
        </section>
      )}

      {peopleModal && <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPeopleModal(null)}><section className="dialog-card people-dialog"><header><div><span className="eyebrow">Your circle</span><h2>{peopleModal === "followers" ? "Followers" : "Following"}</h2></div><button className="icon-button" onClick={() => setPeopleModal(null)} aria-label="Close"><XMarkIcon /></button></header><div>{modalPeople.length ? modalPeople.map((person) => <Link to={`/${person.username}`} className="people-dialog__row" onClick={() => setPeopleModal(null)} key={person.user_id}><Avatar src={person.profile_picture_url} name={person.username} size="sm" /><span><strong>{person.username}</strong><small>{person.user_bio || "Snapshare member"}</small></span><i>→</i></Link>) : <p className="muted-copy people-dialog__empty">No one here yet.</p>}</div></section></div>}
    </main>
  );
}
