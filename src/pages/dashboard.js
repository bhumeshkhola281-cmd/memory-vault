import { apiGet } from '../utils/api.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { renderMemoryCard } from '../components/memoryCard.js';
import { showToast } from '../components/toast.js';
import { formatFileSize } from '../utils/date.js';

export async function renderDashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  document.getElementById('app').innerHTML = `
    ${renderHeader(user)}
    <div class="page container">
      <div class="stats-bar fade-in" id="stats-container">
        <div class="stat-card glass"><div class="stat-value">...</div><div class="stat-label">Total Memories</div></div>
        <div class="stat-card glass"><div class="stat-value">...</div><div class="stat-label">Storage Used</div></div>
        <div class="stat-card glass"><div class="stat-value">...</div><div class="stat-label">Upload Streak</div></div>
      </div>
      
      <div class="controls-bar fade-in" style="animation-delay: 0.1s;">
        <div class="search-input-wrapper">
          <input type="text" id="search-input" placeholder="Search memories...">
        </div>
        <select class="filter-select" id="filter-select">
          <option value="">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="application">Documents</option>
        </select>
        <select class="sort-select" id="sort-select">
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>
      
      <div class="memory-grid" id="memory-grid">
        <!-- Cards injected here -->
      </div>
      
      <div class="pagination" id="pagination"></div>
      
      <div class="fab" onclick="window.location.hash = '#/upload'" title="Upload Memory">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </div>
    </div>
  `;
  
  setupHeaderEvents();
  
  let memories = [];
  let currentPage = 1;
  const limit = 20;
  let totalMemories = 0;
  
  const loadMemories = async () => {
    try {
      const search = document.getElementById('search-input').value;
      const type = document.getElementById('filter-select').value;
      const sort = document.getElementById('sort-select').value;
      
      const res = await apiGet(`/api/memories?page=${currentPage}&limit=${limit}&search=${search}&type=${type}&sort=${sort}`);
      
      memories = res.memories || [];
      totalMemories = res.total || 0;
      
      // Compute stats from available data
      const totalSize = memories.reduce((acc, m) => acc + (m.file_size || 0), 0);
      const lastUploadAt = user.last_upload_at;
      let daysSince = 0;
      if (lastUploadAt) {
        daysSince = Math.floor((Date.now() - new Date(lastUploadAt + 'Z').getTime()) / (1000 * 60 * 60 * 24));
      }
      
      const statsHtml = `
        <div class="stat-card glass"><div class="stat-value">${totalMemories}</div><div class="stat-label">Total Memories</div></div>
        <div class="stat-card glass"><div class="stat-value">${formatFileSize(totalSize)}</div><div class="stat-label">Storage Used</div></div>
        <div class="stat-card glass"><div class="stat-value" style="color: ${daysSince > 5 ? 'var(--warning)' : 'var(--success)'}">${daysSince} Days</div><div class="stat-label">Since Last Upload</div></div>
      `;
      document.getElementById('stats-container').innerHTML = statsHtml;
      
      const grid = document.getElementById('memory-grid');
      grid.innerHTML = '';
      
      if (memories.length === 0) {
        grid.innerHTML = `
          <div class="empty-state fade-in">
            <div class="empty-icon">✨</div>
            <h2>No memories found</h2>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">Capture your first memory to get started.</p>
            <button class="btn btn-primary" onclick="window.location.hash = '#/upload'">Upload Memory</button>
          </div>
        `;
      } else {
        memories.forEach((m, i) => {
          const cardHtml = renderMemoryCard(m);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = cardHtml;
          const cardEl = tempDiv.firstElementChild;
          cardEl.style.animationDelay = `${i * 0.05}s`;
          grid.appendChild(cardEl);
        });
      }
      
      const totalPages = Math.ceil(totalMemories / limit);
      const pag = document.getElementById('pagination');
      if (totalPages > 1) {
        pag.innerHTML = `
          <button class="btn btn-secondary" id="btn-prev" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
          <span>Page ${currentPage} of ${totalPages}</span>
          <button class="btn btn-secondary" id="btn-next" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        `;
        const prev = document.getElementById('btn-prev');
        const next = document.getElementById('btn-next');
        if (prev) prev.onclick = () => { currentPage--; loadMemories(); window.scrollTo(0,0); };
        if (next) next.onclick = () => { currentPage++; loadMemories(); window.scrollTo(0,0); };
      } else {
        pag.innerHTML = '';
      }
      
    } catch (e) {
      showToast('Failed to load memories: ' + e.message, 'error');
    }
  };
  
  let debounceTimer;
  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { currentPage = 1; loadMemories(); }, 300);
  });
  
  document.getElementById('filter-select').addEventListener('change', () => { currentPage = 1; loadMemories(); });
  document.getElementById('sort-select').addEventListener('change', () => { currentPage = 1; loadMemories(); });
  
  loadMemories();
}
