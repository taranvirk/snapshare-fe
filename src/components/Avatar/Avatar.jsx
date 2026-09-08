import PropTypes from "prop-types";

export default function Avatar({ src, name = "Snapshare member", size = "md", className = "" }) {
  const initial = name.trim().charAt(0).toUpperCase() || "S";
  return (
    <span className={`avatar avatar--${size} ${className}`} aria-label={name}>
      {src ? <img src={src} alt="" /> : <span aria-hidden="true">{initial}</span>}
    </span>
  );
}

Avatar.propTypes = {
  src: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
  className: PropTypes.string,
};
