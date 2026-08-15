import { apiGet, apiDelete, apiPost } from '../utils/api.js';
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
        <p>Opening vault...</p>
      </div>
    </div>
  `;
  
  setupHeaderEvents();
  
  try {
    const memory = await apiGet(`/api/memories/${memoryId}`);
    const content = document.getElementById('memory-content');
    
    const descHtml = memory.description
      ? `<div class="memory-desc handwritten">${memory.description.replace(/\n/g, '<br>')}</div>`
      : '<div class="memory-desc" style="color: var(--text-muted); font-style: italic;">No story was told for this moment.</div>';
    
    const voiceHtml = memory.voice_note_path
      ? `<div style="margin-top: 20px; padding: 16px; background: rgba(0,0,0,0.2); border-radius: var(--radius-md);">
          <p style="color: var(--text-secondary); margin-bottom: 8px; font-size: 0.85rem;">🎤 Voice Note</p>
          <audio controls style="width: 100%;">
            <source src="/uploads/${memory.voice_note_path}" type="audio/webm">
          </audio>
        </div>`
      : '';
      
    if (memory.sealed_until && memory.is_sealed) {
      content.innerHTML = `
        <a href="#/dashboard" class="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to Your Vault
        </a>
        <div style="text-align: center; padding: 60px 20px;" class="glass">
          <div style="font-size: 4rem; margin-bottom: 16px;">🔒</div>
          <h2 style="margin-bottom: 8px;">This Memory is Sealed</h2>
          <p style="color: var(--text-secondary); margin-bottom: 16px;">Opens on ${formatDate(memory.sealed_until)}</p>
          <div style="font-family: 'Caveat', cursive, serif; font-size: 1.5rem; color: var(--accent-primary);" id="countdown"></div>
        </div>
      `;
      
      const updateCountdown = () => {
        const unlockDate = new Date(memory.sealed_until + 'Z');
        const now = new Date();
        const diff = unlockDate - now;
        
        if (diff <= 0) {
          window.location.reload();
          return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        
        const el = document.getElementById('countdown');
        if (el) el.textContent = `${days} days, ${hours} hours, ${mins} minutes left`;
      };
      updateCountdown();
      setInterval(updateCountdown, 60000);
      return;
    }
    
    let unlockStyle = '';
    if (memory.sealed_until && !memory.is_sealed) {
      unlockStyle = 'animation: pulse 2s ease-out; box-shadow: 0 0 20px var(--accent-primary);';
    }
    
    content.innerHTML = `
      <a href="#/dashboard" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Back to Your Vault
      </a>
      
      ${renderFilePreview(memory, true)}
      
      <div class="memory-detail-info glass fade-in" style="animation-delay: 0.2s; ${unlockStyle}">
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
            <button class="btn btn-secondary" id="btn-add-chapter">
              ➕ Add to Chapter
            </button>
            <a href="/uploads/${memory.file_path}" download="${memory.file_name}" class="btn btn-secondary" target="_blank">
              ⬇️ Keep a Copy
            </a>
            <button class="btn btn-danger" id="btn-delete">
              🕯️ Let Go
            </button>
          </div>
        </div>
        
        ${descHtml}
        ${voiceHtml}
      </div>
    `;
    
    document.getElementById('btn-delete').addEventListener('click', async () => {
      const confirmed = await showModal({
        title: 'Release This Memory?',
        content: 'Once released, this memory will leave your vault forever. Are you sure?',
        confirmText: 'Release It',
        cancelText: 'Hold On'
      });
      
      if (confirmed) {
        try {
          await apiDelete(`/api/memories/${memoryId}`);
          showToast('Memory released from your vault', 'success');
          window.location.hash = '#/dashboard';
        } catch (e) {
          showToast('Failed to delete: ' + e.message, 'error');
        }
      }
    });
    
    document.getElementById('btn-add-chapter').addEventListener('click', async () => {
      try {
        const albums = await apiGet('/api/memories/albums/all');
        if (!albums || albums.length === 0) {
          showToast('No chapters found. Create one first!', 'info');
          return;
        }
        
        let selectHtml = '<select id="chapter-select" class="filter-select" style="width:100%;">';
        albums.forEach(a => {
          selectHtml += `<option value="${a.id}">${a.title}</option>`;
        });
        selectHtml += '</select>';
        
        let selectedAlbumId = null;
        const confirmed = await showModal({
          title: 'Add to Chapter',
          content: '<p style="margin-bottom:12px;">Select a chapter to add this memory to:</p>' + selectHtml,
          confirmText: 'Add',
          cancelText: 'Cancel',
          onConfirm: () => {
            const selectEl = document.getElementById('chapter-select');
            if (selectEl) selectedAlbumId = selectEl.value;
          }
        });
        
        if (confirmed && selectedAlbumId) {
          await apiPost(`/api/memories/albums/${selectedAlbumId}/memories`, { memoryId: memoryId });
          showToast('Added to chapter', 'success');
        }
      } catch (e) {
        showToast('Error adding to chapter: ' + e.message, 'error');
      }
    });
    
    const hwDesc = document.querySelector('.handwritten');
    if (hwDesc) {
      hwDesc.style.fontFamily = "'Caveat', 'Dancing Script', 'Indie Flower', cursive, serif";
      hwDesc.style.fontSize = "1.2rem";
      hwDesc.style.letterSpacing = "0.5px";
      hwDesc.style.lineHeight = "1.6";
    }
    
  } catch (e) {
    document.getElementById('memory-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <h2>Memory not found in vault</h2>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">This memory may have been released or is locked away.</p>
        <button class="btn btn-primary" onclick="window.location.hash = '#/dashboard'">Return to Your Vault</button>
      </div>
    `;
  }
}
