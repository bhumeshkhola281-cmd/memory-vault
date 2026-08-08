export function renderHeader(user) {
  const userName = user?.name || 'User';
  return `
    <header class="app-header glass">
      <div class="container">
        <a href="#/dashboard" class="brand">
          <span>Memory Vault</span> <span style="font-size: 1.2rem;">✦</span>
        </a>
        <div class="header-actions">
          <span class="user-name">Hi, ${userName}</span>
          <a href="#/upload" class="btn btn-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Upload
          </a>
          <button id="btn-signout" class="btn btn-secondary">Sign Out</button>
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
