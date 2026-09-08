import { Link } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import PropTypes from "prop-types";

export default function ErrorPage({ errorCode = "404" }) {
  return (
    <main className="error-page">
      <div className="error-page__code">{errorCode}</div>
      <span className="eyebrow">This snap got away</span>
      <h1>We couldn’t find that page.</h1>
      <p>The link may be old, or the post has moved somewhere else.</p>
      <Link className="button button--primary" to="/"><ArrowLeftIcon />Back to your feed</Link>
    </main>
  );
}

ErrorPage.propTypes = { errorCode: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
