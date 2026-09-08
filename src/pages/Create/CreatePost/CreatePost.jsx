import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { ArrowUpTrayIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth, supabase } from "../../../auth/Auth";

const MAX_FILES = 6;
const MAX_CAPTION = 500;

export default function CreatePost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length) toast.error("Use images or videos under 15 MB.");
    setFiles((current) => {
      const remaining = MAX_FILES - current.length;
      if (acceptedFiles.length > remaining) toast.error(`You can add up to ${MAX_FILES} files.`);
      return [...current, ...acceptedFiles.slice(0, remaining).map((file) => ({ file, preview: URL.createObjectURL(file) }))];
    });
  }, []);

  useEffect(() => () => files.forEach(({ preview }) => URL.revokeObjectURL(preview)), [files]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    maxFiles: MAX_FILES,
    maxSize: 15 * 1024 * 1024,
    accept: { "image/*": [], "video/*": [] },
  });

  const remainingCharacters = MAX_CAPTION - caption.length;
  const canPublish = files.length > 0 && caption.trim() && !submitting;
  const heroPreview = useMemo(() => files[0], [files]);

  const removeFile = (preview) => {
    URL.revokeObjectURL(preview);
    setFiles((current) => current.filter((item) => item.preview !== preview));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!files.length) return toast.error("Add at least one photo or video.");
    if (!caption.trim()) return toast.error("Give your post a caption.");

    setSubmitting(true);
    setProgress(5);
    try {
      const { data: postRows, error: postError } = await supabase.from("posts").insert({ user_id: user.id, caption: caption.trim() }).select("post_id");
      if (postError) throw postError;
      const postId = postRows[0].post_id;
      const urls = [];

      for (let index = 0; index < files.length; index += 1) {
        const { file } = files[index];
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${user.id}/${postId}/${Date.now()}-${index}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("Upload").upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("Upload").getPublicUrl(path);
        urls.push(data.publicUrl);
        setProgress(Math.round(((index + 1) / files.length) * 80) + 10);
      }

      const { error: updateError } = await supabase.from("posts").update({ file_url: urls }).eq("post_id", postId).eq("user_id", user.id);
      if (updateError) throw updateError;
      setProgress(100);
      toast.success("Your post is live.");
      navigate(`/post/${postId}`);
    } catch (error) {
      toast.error(error.message || "Your post couldn't be published.");
      setSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <main className="page">
      <header className="page-heading page-heading--centered"><div><span className="eyebrow">Make something memorable</span><h1>Create a post</h1><p>Add up to six photos or videos and tell the story behind them.</p></div></header>

      <form className="create-card" onSubmit={handleSubmit}>
        <section className="create-media" {...getRootProps()}>
          <input {...getInputProps()} />
          {heroPreview ? (
            <div className="create-preview">
              {heroPreview.file.type.startsWith("image/") ? <img src={heroPreview.preview} alt="Post preview" /> : <video src={heroPreview.preview} controls />}
              <button type="button" className="button button--glass create-preview__replace" onClick={open}><PhotoIcon />Add media</button>
            </div>
          ) : (
            <button type="button" className={`dropzone ${isDragActive ? "dropzone--active" : ""}`} onClick={open}>
              <span className="dropzone__icon"><ArrowUpTrayIcon /></span>
              <strong>{isDragActive ? "Drop it right here" : "Choose photos or videos"}</strong>
              <small>or drag them here · JPG, PNG, WEBP, MP4 · 15 MB max</small>
              <span className="button button--secondary">Browse files</span>
            </button>
          )}
        </section>

        <section className="create-details">
          <div className="field-group">
            <div className="field-label"><label htmlFor="caption">Caption</label><span className={remainingCharacters < 40 ? "field-count field-count--low" : "field-count"}>{remainingCharacters}</span></div>
            <textarea id="caption" rows="7" maxLength={MAX_CAPTION} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="What’s the story behind this moment?" />
          </div>

          {files.length > 0 && (
            <div className="upload-tray">
              <div className="field-label"><span>Media</span><span>{files.length}/{MAX_FILES}</span></div>
              <div className="upload-grid">
                {files.map(({ file, preview }, index) => (
                  <div className={`upload-thumb ${index === 0 ? "upload-thumb--active" : ""}`} key={preview}>
                    {file.type.startsWith("image/") ? <img src={preview} alt={file.name} /> : <video src={preview} muted />}
                    <button type="button" onClick={() => removeFile(preview)} aria-label={`Remove ${file.name}`}><XMarkIcon /></button>
                    {index === 0 && <span>Cover</span>}
                  </div>
                ))}
                {files.length < MAX_FILES && <button type="button" className="upload-add" onClick={open}><PhotoIcon /><span>Add</span></button>}
              </div>
            </div>
          )}

          <div className="create-tips"><strong>A good post feels like you.</strong><span>Use an inviting cover, add a little context, and keep it genuine.</span></div>

          {submitting && <div className="progress"><span style={{ width: `${progress}%` }} /></div>}
          <div className="create-actions"><button className="button button--ghost" type="button" onClick={() => navigate(-1)}>Cancel</button><button className="button button--primary" type="submit" disabled={!canPublish}>{submitting ? `Publishing ${progress}%` : "Publish post"}</button></div>
        </section>
      </form>
    </main>
  );
}
