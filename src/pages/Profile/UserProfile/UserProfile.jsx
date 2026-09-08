import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ChatBubbleLeftRightIcon, PhotoIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth, supabase } from "../../../auth/Auth";
import Avatar from "../../../components/Avatar/Avatar";
import EmptyState from "../../../components/EmptyState/EmptyState";
import Loader from "../../../components/Loader/Loader";
import ErrorPage from "../../Error/ErrorPage";
import { followErrorMessage, followUser, unfollowUser } from "../../../lib/followService";

function isImage(url = "") { return /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url); }
function websiteHref(value = "") { return /^https?:\/\//i.test(value) ? value : `https://${value}`; }

export default function UserProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      setLoading(true);
      const { data: profileRow, error } = await supabase.from("public_profiles").select("*").eq("username", username).maybeSingle();
      if (!active) return;
      if (error || !profileRow) { setNotFound(true); setLoading(false); return; }
      setProfile(profileRow);
      const [{ data: postRows }, { data: followerRows }, { data: followingRows }, { data: relationRows }] = await Promise.all([
        supabase.from("posts").select("*").eq("user_id", profileRow.user_id).order("post_id", { ascending: false }),
        supabase.from("followers").select("follower_id").eq("following_id", profileRow.user_id),
        supabase.from("followers").select("following_id").eq("follower_id", profileRow.user_id),
        supabase.from("followers").select("following_id").eq("follower_id", user.id).eq("following_id", profileRow.user_id),
      ]);
      if (!active) return;
      setPosts(postRows ?? []);
      setCounts({ followers: followerRows?.length ?? 0, following: followingRows?.length ?? 0 });
      setFollowing(Boolean(relationRows?.length));
      setLoading(false);
    }
    loadUser();
    return () => { active = false; };
  }, [user.id, username]);

  const toggleFollow = async () => {
    if (!profile || working) return;
    setWorking(true);
    const wasFollowing = following;
    try {
      if (wasFollowing) await unfollowUser(user.id, profile.user_id);
      else await followUser(user.id, profile.user_id);
      setFollowing(!wasFollowing);
      setCounts((current) => ({ ...current, followers: Math.max(0, current.followers + (wasFollowing ? -1 : 1)) }));
    } catch (error) {
      toast.error(followErrorMessage(error));
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <Loader />;
  if (notFound) return <ErrorPage errorCode="404" />;
  if (profile.user_id === user.id) return <Navigate to="/profile" replace />;

  return (
    <main className="page page--profile">
      <section className="profile-hero profile-hero--public">
        <div className="profile-hero__art"><span className="profile-orbit profile-orbit--one" /><span className="profile-orbit profile-orbit--two" /></div>
        <div className="profile-hero__content">
          <Avatar src={profile.profile_picture_url} name={profile.username} size="xl" className="profile-avatar" />
          <div className="profile-summary">
            <div className="profile-summary__top"><div><span className="eyebrow">Snapshare profile</span><h1>{profile.username}</h1></div><div className="button-row"><button className={`button ${following ? "button--secondary" : "button--primary"}`} onClick={toggleFollow} disabled={working}><UserPlusIcon />{following ? "Following" : "Follow"}</button><button className="button button--ghost" onClick={() => navigate("/direct-message", { state: { userId: profile.user_id } })}><ChatBubbleLeftRightIcon />Message</button></div></div>
            <p className="profile-summary__bio">{profile.user_bio || "Sharing life, one snap at a time."}</p>
            {profile.website && <a className="profile-website" href={websiteHref(profile.website)} target="_blank" rel="noreferrer">{profile.website} ↗</a>}
            <div className="profile-stats"><div><strong>{posts.length}</strong><span>posts</span></div><div><strong>{counts.followers}</strong><span>followers</span></div><div><strong>{counts.following}</strong><span>following</span></div></div>
          </div>
        </div>
      </section>

      <section className="profile-gallery">
        <div className="profile-tabs"><span className="active"><PhotoIcon />Posts</span></div>
        {posts.length ? <div className="post-grid post-grid--profile">{posts.map((post) => {
          const media = post.file_url?.[0] ?? post.image_url;
          return <Link className="post-tile" to={`/post/${post.post_id}`} key={post.post_id}>{media ? (isImage(media) ? <img src={media} alt={post.caption || "Post"} /> : <video src={media} muted preload="metadata" />) : <span className="post-tile__empty"><PhotoIcon /></span>}<div className="post-tile__overlay"><p>{post.caption}</p></div></Link>;
        })}</div> : <EmptyState icon={<PhotoIcon />} title="No posts yet" body={`${profile.username} hasn’t shared anything yet.`} />}
      </section>
    </main>
  );
}
