import { renderAuthPage } from './pages/auth.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderUploadPage } from './pages/upload.js';
import { renderMemoryPage } from './pages/memory.js';
import { apiGet } from './utils/api.js';
import { registerServiceWorker } from './utils/push.js';

let currentUser = null;

export function getCurrentUser() {
  return currentUser;
}

const router = async () => {
  const hash = window.location.hash || '#/auth';
  
  // Check session via cookie (server-side session)
  if (!currentUser) {
    try {
      currentUser = await apiGet('/api/auth/me');
      localStorage.setItem('user', JSON.stringify(currentUser));
      registerServiceWorker();
    } catch (e) {
      currentUser = null;
      localStorage.removeItem('user');
    }
  }
  
  const isAuthenticated = !!currentUser;
  
  if (!isAuthenticated && hash !== '#/auth') {
    window.location.hash = '#/auth';
    return;
  }
  
  if (isAuthenticated && hash === '#/auth') {
    window.location.hash = '#/dashboard';
    return;
  }
  
  const app = document.getElementById('app');
  app.innerHTML = '';
  
  if (hash === '#/auth') {
    renderAuthPage();
  } else if (hash === '#/dashboard') {
    renderDashboard();
  } else if (hash === '#/upload') {
    renderUploadPage();
  } else if (hash.startsWith('#/memory/')) {
    const id = hash.split('/')[2];
    renderMemoryPage(id);
  } else {
    window.location.hash = '#/dashboard';
  }
};

window.addEventListener('hashchange', router);

window.navigate = (hash) => {
  window.location.hash = hash;
};

window.setCurrentUser = (user) => {
  currentUser = user;
};

window.clearCurrentUser = () => {
  currentUser = null;
  localStorage.removeItem('user');
};

window.addEventListener('DOMContentLoaded', () => {
  router();
});
