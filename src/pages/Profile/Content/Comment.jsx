import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PaperAirplaneIcon, PencilIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth, supabase } from "../../../auth/Auth";
import Avatar from "../../../components/Avatar/Avatar";
import { getRelativeDate } from "../../../utils/DateFormatter";
import PropTypes from "prop-types";

export default function Comment({ postId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [authors, setAuthors] = useState({});
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase.from("comments_test").select("id, user_id, comment_text, created_at, updated_at").eq("post_id", postId).order("created_at", { ascending: true });
    if (error) return;
    const rows = data ?? [];
    setComments(rows);
    const ids = [...new Set(rows.map((comment) => comment.user_id))];
    if (!ids.length) return setAuthors({});
    const { data: profiles } = await supabase.from("public_profiles").select("user_id, username, profile_picture_url").in("user_id", ids);
    setAuthors(Object.fromEntries((profiles ?? []).map((profile) => [profile.user_id, profile])));
  }, [postId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const submit = async (event) => {
    event.preventDefault();
    const comment = text.trim();
    if (!comment) return;
    setSending(true);
    const query = editingId
      ? supabase.from("comments_test").update({ comment_text: comment, updated_at: new Date().toISOString() }).eq("id", editingId).eq("user_id", user.id)
      : supabase.from("comments_test").insert({ post_id: postId, user_id: user.id, comment_text: comment });
    const { error } = await query;
    setSending(false);
    if (error) return toast.error("Comment couldn't be saved.");
    setText("");
    setEditingId(null);
    await fetchComments();
  };

  const edit = (comment) => { setEditingId(comment.id); setText(comment.comment_text); };
  const cancelEdit = () => { setEditingId(null); setText(""); };
  const remove = async (commentId) => {
    const { error } = await supabase.from("comments_test").delete().eq("id", commentId).eq("user_id", user.id);
    if (error) return toast.error("Comment couldn't be deleted.");
    setComments((current) => current.filter((comment) => comment.id !== commentId));
  };

  return (
    <section className="comments">
      <div className="comments__heading"><h3>Conversation</h3><span>{comments.length}</span></div>
      <div className="comment-list">
        {comments.length ? comments.map((comment) => {
          const author = authors[comment.user_id] ?? { username: comment.user_id === user.id ? "You" : "Snapshare member" };
          return <article className="comment-row" key={comment.id}><Link to={comment.user_id === user.id ? "/profile" : `/${author.username}`}><Avatar src={author.profile_picture_url} name={author.username} size="xs" /></Link><div><div className="comment-row__meta"><Link to={comment.user_id === user.id ? "/profile" : `/${author.username}`}>{author.username}</Link><span>{getRelativeDate(comment.updated_at || comment.created_at)}</span></div><p>{comment.comment_text}</p></div>{comment.user_id === user.id && <div className="comment-row__actions"><button onClick={() => edit(comment)} aria-label="Edit comment"><PencilIcon /></button><button onClick={() => remove(comment.id)} aria-label="Delete comment"><TrashIcon /></button></div>}</article>;
        }) : <p className="comments__empty">No comments yet. Start the conversation.</p>}
      </div>
      <form className="comment-composer" onSubmit={submit}><input value={text} maxLength="280" onChange={(event) => setText(event.target.value)} placeholder={editingId ? "Update your comment" : "Add a thoughtful comment"} aria-label="Comment" />{editingId && <button type="button" className="comment-composer__cancel" onClick={cancelEdit} aria-label="Cancel editing"><XMarkIcon /></button>}<button type="submit" disabled={!text.trim() || sending} aria-label={editingId ? "Update comment" : "Post comment"}><PaperAirplaneIcon /></button></form>
    </section>
  );
}

Comment.propTypes = { postId: PropTypes.number.isRequired };
