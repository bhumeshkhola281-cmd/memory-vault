// Returns HTML string for an emoji toggle button
export function emojiButton(targetInputId) {
  return `<button type="button" class="emoji-btn" data-target="${targetInputId}" title="Add emoji">😀</button>`;
}

// Call this after DOM is ready to attach click handlers to all .emoji-btn buttons
export function setupEmojiPickers() {
  // A curated subset of popular emojis
  const emojis = [
    '😀','😂','🥰','😍','🤗','😎','🥺','😢','❤️','🔥',
    '✨','💫','🌟','⭐','🎉','🎊','💪','👏','🙏','✌️',
    '🌿','☀️','🌙','🌈','🌸','🍃','☕','🍕','🎵','📸',
    '💭','💡','📖','✍️','🏠','✈️','🎁','💎','🕯️','🔐'
  ];
  
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Remove any existing picker
      document.querySelectorAll('.emoji-popup').forEach(p => p.remove());
      
      const targetId = btn.dataset.target;
      const popup = document.createElement('div');
      popup.className = 'emoji-popup glass';
      popup.innerHTML = emojis.map(em => `<span class="emoji-item">${em}</span>`).join('');
      
      btn.parentElement.style.position = 'relative';
      btn.parentElement.appendChild(popup);
      
      popup.addEventListener('click', (ev) => {
        if (ev.target.classList.contains('emoji-item')) {
          const input = document.getElementById(targetId);
          if (input) {
            const start = input.selectionStart || input.value.length;
            const before = input.value.substring(0, start);
            const after = input.value.substring(input.selectionEnd || start);
            input.value = before + ev.target.textContent + after;
            input.focus();
            input.selectionStart = input.selectionEnd = start + ev.target.textContent.length;
          }
          popup.remove();
        }
      });
      
      // Close on outside click
      setTimeout(() => {
        document.addEventListener('click', function closePopup(e2) {
          if (!popup.contains(e2.target)) {
            popup.remove();
            document.removeEventListener('click', closePopup);
          }
        });
      }, 10);
    });
  });
}
