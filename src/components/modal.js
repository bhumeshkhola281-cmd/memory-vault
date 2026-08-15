export function showModal({title, content, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel'}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const card = document.createElement('div');
    card.className = 'modal-card glass';
    
    card.innerHTML = `
      <h2 class="modal-title">${title}</h2>
      <div class="modal-content-area">${content}</div>
      <div class="modal-actions">
        <button id="modal-cancel" class="btn btn-secondary">${cancelText}</button>
        <button id="modal-confirm" class="btn btn-danger">${confirmText}</button>
      </div>
    `;
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    requestAnimationFrame(() => overlay.classList.add('active'));
    
    const close = (result) => {
      overlay.classList.remove('active');
      setTimeout(() => {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        resolve(result);
      }, 300);
    };
    
    card.querySelector('#modal-cancel').addEventListener('click', () => {
      if (onCancel) onCancel();
      close(false);
    });
    
    card.querySelector('#modal-confirm').addEventListener('click', () => {
      if (onConfirm) onConfirm();
      close(true);
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (onCancel) onCancel();
        close(false);
      }
    });
    
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (onCancel) onCancel();
        close(false);
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
}
