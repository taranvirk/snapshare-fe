import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";

export default function PrivateRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

PrivateRoute.propTypes = { user: PropTypes.object, children: PropTypes.node.isRequired };
