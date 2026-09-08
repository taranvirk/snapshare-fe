import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, BookmarkIcon, FlagIcon, HeartIcon, TrashIcon } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolid, HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import { useAuth, supabase } from "../../auth/Auth";
import Avatar from "../../components/Avatar/Avatar";
import Carousel from "../../components/Carousel/Carousel";
import Loader from "../../components/Loader/Loader";
import Modal from "../../components/Modal/Modal";
import { getDate, getRelativeDate } from "../../utils/DateFormatter";
import Comment from "../Profile/Content/Comment";
import ErrorPage from "../Error/ErrorPage";
import { likePost, savePost, unlikePost, unsavePost } from "../../lib/postInteractionService";

export default function PostPage() {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [author, setAuthor] = useState(null);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const loadPost = useCallback(async () => {
    const { data: postRow, error } = await supabase.from("posts").select("*").eq("post_id", postId).maybeSingle();
    if (error || !postRow) { setNotFound(true); setLoading(false); return; }
    setPost(postRow);
    const [{ data: profile }, { data: likeRow }, { data: likedRows }, { data: savedRows }] = await Promise.all([
      supabase.from("public_profiles").select("user_id, username, profile_picture_url").eq("user_id", postRow.user_id).maybeSingle(),
      supabase.from("likes").select("like_count").eq("post_id", postId).maybeSingle(),
      supabase.from("user_likes").select("post_id").eq("post_id", postId).eq("user_id", user.id),
      supabase.from("post_saves").select("post_id").eq("post_id", postId).eq("user_id", user.id),
    ]);
    setAuthor(profile ?? { username: "Snapshare member" });
    setLikes(likeRow?.like_count ?? 0);
    setLiked(Boolean(likedRows?.length));
    setSaved(Boolean(savedRows?.length));
    setLoading(false);
  }, [postId, user.id]);

  useEffect(() => { loadPost(); }, [loadPost]);

  const toggleLike = async () => {
    const previous = { liked, likes };
    const nextCount = Math.max(0, likes + (liked ? -1 : 1));
    setLiked(!liked);
    setLikes(nextCount);
    try {
      if (liked) await unlikePost(user.id, postId);
      else await likePost(user.id, postId);
    } catch {
      setLiked(previous.liked);
      setLikes(previous.likes);
      toast.error("That like didn't stick.");
    }
  };

  const toggleSave = async () => {
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      if (wasSaved) await unsavePost(user.id, postId);
      else await savePost(user.id, postId);
      toast.success(wasSaved ? "Removed from saved posts." : "Post saved.");
    } catch {
      setSaved(wasSaved);
      toast.error("Couldn't update your saved posts.");
    }
  };

  const submitReport = async () => {
    const reason = reportReason === "other" ? customReason.trim() : reportReason;
    if (!reason) return toast.error("Choose a reason for your report.");
    const { error } = await supabase.from("reports").insert({ post_id: postId, report_reason: reason, user_id: user.id });
    if (error) return toast.error("Report couldn't be submitted.");
    setShowReport(false); setReportReason(""); setCustomReason(""); toast.success("Thanks. We received your report.");
  };

  const deletePost = async () => {
    const { error } = await supabase.from("posts").delete().eq("post_id", postId).eq("user_id", user.id);
    if (error) return toast.error("Post couldn't be deleted.");
    toast.success("Post deleted.");
    navigate("/profile");
  };

  if (loading) return <Loader />;
  if (notFound) return <ErrorPage errorCode="404" />;
  const ownPost = post.user_id === user.id;

  return (
    <main className="page page--post">
      <button className="back-link" onClick={() => navigate(-1)}><ArrowLeftIcon />Back</button>
      <article className="post-detail">
        <section className="post-detail__media"><Carousel images={post.file_url?.length ? post.file_url : post.image_url ? [post.image_url] : []} cover label={`Post by ${author.username}`} /></section>
        <section className="post-detail__content">
          <header className="post-detail__header"><Link to={ownPost ? "/profile" : `/${author.username}`} className="user-line"><Avatar src={author.profile_picture_url} name={author.username} size="sm" /><span><strong>{author.username}</strong><small>{getRelativeDate(post.updated_at || post.created_at)}</small></span></Link>{ownPost ? <button className="icon-button icon-button--danger" onClick={() => setShowDelete(true)} aria-label="Delete post"><TrashIcon /></button> : <button className="icon-button" onClick={() => setShowReport(true)} aria-label="Report post"><FlagIcon /></button>}</header>
          <div className="post-detail__caption"><p>{post.caption}</p><span>{getDate(post.updated_at || post.created_at)}</span></div>
          <div className="post-detail__reactions"><button className={liked ? "active" : ""} onClick={toggleLike}>{liked ? <HeartSolid /> : <HeartIcon />}<span>{likes} {likes === 1 ? "like" : "likes"}</span></button><button className={saved ? "active saved" : ""} onClick={toggleSave}>{saved ? <BookmarkSolid /> : <BookmarkIcon />}<span>{saved ? "Saved" : "Save"}</span></button></div>
          <Comment postId={Number(postId)} />
        </section>
      </article>

      <Modal isVisible={showReport} onClose={() => setShowReport(false)} action={submitReport} actionMsg="Submit report">
        <div className="dialog-body"><span className="eyebrow">Help keep Snapshare safe</span><h2>Report this post</h2><p>Reports are private. Tell us what’s wrong and we’ll take a look.</p><label><span>Reason</span><select value={reportReason} onChange={(event) => setReportReason(event.target.value)}><option value="">Choose a reason</option><option value="spam">Spam</option><option value="inappropriate">Inappropriate content</option><option value="abusive">Abusive or harmful</option><option value="false information">False information</option><option value="other">Something else</option></select></label>{reportReason === "other" && <label><span>Tell us more</span><textarea autoFocus rows="3" value={customReason} onChange={(event) => setCustomReason(event.target.value)} /></label>}</div>
      </Modal>

      <Modal isVisible={showDelete} onClose={() => setShowDelete(false)} action={deletePost} actionMsg="Delete post" destructive>
        <div className="dialog-body"><span className="eyebrow eyebrow--danger">This can’t be undone</span><h2>Delete this post?</h2><p>The post and its conversation will be removed from your profile.</p></div>
      </Modal>
    </main>
  );
}
