import { useEffect } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";

export default function Modal({ isVisible, onClose, children, action, actionMsg = "Confirm", cancelMsg = "Cancel", destructive = false }) {
  useEffect(() => {
    if (!isVisible) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.section role="dialog" aria-modal="true" className="dialog-card" initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        {children}
        {(action || cancelMsg) && (
          <footer className="dialog-actions">
            {cancelMsg && <button className="button button--ghost" onClick={onClose}>{cancelMsg}</button>}
            {action && <button className={`button ${destructive ? "button--danger" : "button--primary"}`} onClick={action}>{actionMsg}</button>}
          </footer>
        )}
      </motion.section>
    </div>
  );
}

Modal.propTypes = {
  isVisible: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  action: PropTypes.func,
  actionMsg: PropTypes.string,
  cancelMsg: PropTypes.string,
  destructive: PropTypes.bool,
};
