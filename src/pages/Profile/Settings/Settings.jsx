import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, ArrowRightOnRectangleIcon, EnvelopeIcon, TrashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth, supabase } from "../../../auth/Auth";
import Avatar from "../../../components/Avatar/Avatar";
import Loader from "../../../components/Loader/Loader";
import Modal from "../../../components/Modal/Modal";
import { API_URL } from "../../../lib/config";
import { getDate } from "../../../utils/DateFormatter";

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(() => localStorage.getItem("snapshare-email-updates") !== "false");

  useEffect(() => {
    let active = true;
    supabase.from("users123").select("user_id, username, profile_picture_url").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (active) { setProfile(data); setLoading(false); }
    });
    return () => { active = false; };
  }, [user.id]);

  const toggleUpdates = () => {
    const next = !emailUpdates;
    setEmailUpdates(next);
    localStorage.setItem("snapshare-email-updates", String(next));
    toast.success(next ? "Email updates enabled." : "Email updates muted.");
  };

  const sendPasswordReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/settings` });
    if (error) return toast.error("Couldn't send the reset email.");
    toast.success("Password reset email sent.");
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/deleteUser/${user.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Account deletion failed");
      await signOut();
      navigate("/");
    } catch (error) {
      toast.error("Couldn't delete your account. Make sure the backend is running.");
      setDeleting(false);
      setShowDelete(false);
    }
  };

  if (loading) return <Loader />;
  const provider = user.app_metadata?.provider || user.identities?.[0]?.provider || "email";

  return (
    <main className="page page--narrow settings-page">
      <button className="back-link" onClick={() => navigate(-1)}><ArrowLeftIcon />Back</button>
      <header className="page-heading"><div><span className="eyebrow">Make Snapshare yours</span><h1>Settings</h1><p>Manage your account, preferences, and sign-in details.</p></div></header>

      <section className="settings-card settings-profile">
        <Avatar src={profile?.profile_picture_url} name={profile?.username || user.email} size="lg" />
        <div><span className="eyebrow">Signed in as</span><h2>{profile?.username || "Snapshare member"}</h2><p>{user.email}</p></div>
        <Link className="button button--secondary" to="/profile">Edit profile</Link>
      </section>

      <section className="settings-card">
        <div className="settings-card__heading"><h2>Account</h2><p>Your sign-in and account details.</p></div>
        <dl className="settings-list"><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Joined</dt><dd>{getDate(user.created_at)}</dd></div><div><dt>Sign-in method</dt><dd className="capitalize">{provider}</dd></div></dl>
        <button className="settings-action" onClick={sendPasswordReset}><span><EnvelopeIcon /><span><strong>Reset password</strong><small>Send a secure reset link to your email</small></span></span><span>→</span></button>
      </section>

      <section className="settings-card">
        <div className="settings-card__heading"><h2>Notifications</h2><p>Choose how often Snapshare reaches out.</p></div>
        <div className="toggle-row"><span><strong>Email updates</strong><small>Occasional account and activity updates</small></span><button role="switch" aria-checked={emailUpdates} className={`toggle ${emailUpdates ? "toggle--active" : ""}`} onClick={toggleUpdates}><span /></button></div>
      </section>

      <section className="settings-card">
        <div className="settings-card__heading"><h2>Session</h2><p>Leave this device or remove your account.</p></div>
        <button className="settings-action" onClick={signOut}><span><ArrowRightOnRectangleIcon /><span><strong>Sign out</strong><small>You can sign back in at any time</small></span></span><span>→</span></button>
        <button className="settings-action settings-action--danger" onClick={() => setShowDelete(true)}><span><TrashIcon /><span><strong>Delete account</strong><small>Permanently remove your profile and content</small></span></span><span>→</span></button>
      </section>

      <Modal isVisible={showDelete} onClose={() => setShowDelete(false)} action={deleteAccount} actionMsg={deleting ? "Deleting…" : "Delete account"} destructive>
        <div className="dialog-body"><span className="eyebrow eyebrow--danger">Permanent action</span><h2>Delete your account?</h2><p>Your posts, messages, comments, and profile will be permanently removed. This cannot be undone.</p></div>
      </Modal>
    </main>
  );
}
