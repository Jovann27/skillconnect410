import './layout-styles.css';

const SuccessPopup = ({
  isOpen,
  onClose,
  title = 'Success!',
  message = 'Operation completed successfully.',
  confirmText = 'OK'
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="popup-overlay" onClick={handleBackdropClick}>
      <div className="popup-content success-popup">
        <div className="popup-header">
          <div className="success-icon">✓</div>
          <h3>{title}</h3>
        </div>
        <div className="popup-body">
          <p>{message}</p>
        </div>
        <div className="popup-footer">
          <button
            className="popup-button confirm-button"
            onClick={onClose}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessPopup;
