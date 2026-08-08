import { apiGet, apiDelete } from '../utils/api.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { renderFilePreview } from '../components/filePreview.js';
import { showModal } from '../components/modal.js';
import { formatDate, formatFileSize } from '../utils/date.js';

export async function renderMemoryPage(memoryId) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  document.getElementById('app').innerHTML = `
    ${renderHeader(user)}
    <div class="page container fade-in memory-detail-page" id="memory-content">
      <div style="text-align:center; padding: 100px;">
        <div class="empty-icon" style="animation: pulse 1s infinite;">⏳</div>
        <p>Loading memory...</p>
      </div>
    </div>
  `;
  
  setupHeaderEvents();
  
  try {
    const memory = await apiGet(`/api/memories/${memoryId}`);
    const content = document.getElementById('memory-content');
    
    content.innerHTML = `
      <a href="#/dashboard" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Back to Dashboard
      </a>
      
      ${renderFilePreview(memory, true)}
      
      <div class="memory-detail-info glass fade-in" style="animation-delay: 0.2s;">
        <div class="memory-detail-header">
          <div>
            <h1 class="memory-detail-title">${memory.title}</h1>
            <div class="memory-detail-meta">
              <span>📅 ${formatDate(memory.created_at)}</span>
              <span>💾 ${formatFileSize(memory.file_size)}</span>
              <span style="text-transform: uppercase;">🏷️ ${memory.file_type?.split('/')[0]}</span>
            </div>
          </div>
          <div class="memory-detail-actions">
            <a href="/uploads/${memory.file_path}" download="${memory.file_name}" class="btn btn-secondary" target="_blank">
              ⬇️ Download
            </a>
            <button class="btn btn-danger" id="btn-delete">
              🗑️ Delete
            </button>
          </div>
        </div>
        
        ${memory.description ? `<div class="memory-desc">${memory.description.replace(/\\n/g, '<br>')}</div>` : '<div class="memory-desc" style="color: var(--text-muted); font-style: italic;">No description provided.</div>'}
      </div>
    `;
    
    document.getElementById('btn-delete').addEventListener('click', async () => {
      const confirmed = await showModal({
        title: 'Delete Memory?',
        content: 'Are you sure you want to delete this memory? This action cannot be undone.',
        confirmText: 'Yes, Delete',
        cancelText: 'Keep it'
      });
      
      if (confirmed) {
        try {
          await apiDelete(`/api/memories/${memoryId}`);
          showToast('Memory deleted', 'success');
          window.location.hash = '#/dashboard';
        } catch (e) {
          showToast('Failed to delete: ' + e.message, 'error');
        }
      }
    });
    
  } catch (e) {
    document.getElementById('memory-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <h2>Memory not found</h2>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">The memory might have been deleted or you don't have access.</p>
        <button class="btn btn-primary" onclick="window.location.hash = '#/dashboard'">Back to Dashboard</button>
      </div>
    `;
  }
}
