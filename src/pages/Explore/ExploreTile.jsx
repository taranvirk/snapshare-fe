import { useState } from "react";
import { Link } from "react-router-dom";
import { ChatBubbleOvalLeftIcon, HeartIcon, PhotoIcon, PlayIcon } from "@heroicons/react/24/solid";
import PropTypes from "prop-types";
import { recordExploreClick } from "./exploreService";
import { isImage } from "./exploreUtils";

export default function ExploreTile({ post, featured = false }) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const media = post.file_url?.[0] ?? post.image_url;
  const image = isImage(media);

  return (
    <Link
      className={`explore-tile ${featured ? "explore-tile--featured" : ""}`}
      to={`/post/${post.post_id}`}
      onClick={() => { void recordExploreClick(post.post_id).catch(() => undefined); }}
      aria-label={`Open post by ${post.username}`}
    >
      {!media || mediaFailed ? (
        <span className="explore-tile__fallback"><PhotoIcon /><small>Media unavailable</small></span>
      ) : image ? (
        <img src={media} alt={post.caption || `Post by ${post.username}`} loading="lazy" onError={() => setMediaFailed(true)} />
      ) : (
        <><video src={media} muted preload="metadata" playsInline onError={() => setMediaFailed(true)} /><span className="explore-tile__video"><PlayIcon /></span></>
      )}
      {post.file_url?.length > 1 && <span className="explore-tile__stack">{post.file_url.length}</span>}
      <span className="explore-tile__reason">{post.reason}</span>
      <span className="explore-tile__overlay">
        <strong>@{post.username}</strong>
        <span><i><HeartIcon />{post.like_count}</i><i><ChatBubbleOvalLeftIcon />{post.comment_count}</i></span>
      </span>
    </Link>
  );
}

ExploreTile.propTypes = {
  featured: PropTypes.bool,
  post: PropTypes.shape({
    post_id: PropTypes.number.isRequired,
    username: PropTypes.string.isRequired,
    caption: PropTypes.string,
    image_url: PropTypes.string,
    file_url: PropTypes.arrayOf(PropTypes.string),
    reason: PropTypes.string,
    like_count: PropTypes.number,
    comment_count: PropTypes.number,
  }).isRequired,
};
