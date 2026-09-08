import PropTypes from "prop-types";

export default function EmptyState({ icon, title, body, action }) {
  return (
    <section className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">{icon}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </section>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  action: PropTypes.node,
};
