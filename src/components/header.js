export function renderHeader(user) {
  const userName = user?.name || 'User';
  return `
    <header class="app-header glass">
      <div class="container">
        <a href="#/dashboard" class="brand">
          <span>Memory Vault</span> <span style="font-size: 1.2rem;">✦</span>
        </a>
        <div class="header-actions">
          <a href="#/albums" class="btn btn-secondary" style="border: none;">📚 Chapters</a>
          <a href="#/settings" class="btn btn-secondary" style="border: none;">⚙️ Settings</a>
          <span class="user-name">Hi, ${userName}</span>
          <a href="#/journal" class="btn btn-primary" style="font-size: 0.85rem; padding: 8px 18px;">📖 Journal</a>
          <a href="#/upload" class="btn btn-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>
            Preserve Memory
          </a>
          <button id="btn-signout" class="btn btn-secondary">Lock Vault</button>
        </div>
      </div>
    </header>
  `;
}

export function setupHeaderEvents() {
  const btnSignout = document.getElementById('btn-signout');
  if (btnSignout) {
    btnSignout.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
      } catch (e) {}
      localStorage.removeItem('user');
      window.clearCurrentUser();
      window.location.hash = '#/auth';
    });
  }
}
