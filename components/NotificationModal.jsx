import React from 'react';

function NotificationModal({ isOpen, onClose, title, message, type = 'success' }) {
  if (!isOpen) return null;

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  const typeLabels = {
    success: 'Успешно',
    error: 'Ошибка',
    info: 'Информация',
    warning: 'Внимание'
  };

  const buttonLabels = {
    success: 'Отлично',
    error: 'Понятно',
    info: 'Закрыть',
    warning: 'Понял'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-glass" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-content">
          <div className={`modal-icon ${type}`}>
            <span style={{ fontSize: '32px' }}>{icons[type] || 'ℹ️'}</span>
          </div>
          <h3 className="modal-title">{title || typeLabels[type] || 'Уведомление'}</h3>
          <p className="modal-message">{message}</p>
          <button className="btn-modal btn-primary" onClick={onClose}>
            {buttonLabels[type] || 'Закрыть'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationModal;
