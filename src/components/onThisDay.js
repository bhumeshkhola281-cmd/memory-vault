import { apiGet } from '../utils/api.js';
import { formatRelative } from '../utils/date.js';

export function renderOnThisDay() {
  const today = new Date();
  const options = { month: 'long', day: 'numeric' };
  const dateString = today.toLocaleDateString(undefined, options);

  return `
    <div class="on-this-day-section fade-in" style="margin-bottom: 24px;">
      <h3 style="margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
        📅 On This Day
      </h3>
      <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 12px;">${dateString}</p>
      <div id="on-this-day-content" style="display: flex; gap: 16px; overflow-x: auto; padding: 10px 0;">
        <span style="color: var(--text-muted); font-style: italic;">Checking your vault...</span>
      </div>
    </div>
  `;
}

export async function loadOnThisDay() {
  const content = document.getElementById('on-this-day-content');
  if (!content) return;

  try {
    const res = await apiGet('/api/memories/on-this-day');
    const memories = res.memories || [];

    if (memories.length === 0) {
      content.innerHTML = '<span style="color: var(--text-secondary); font-style: italic; padding: 12px; background: rgba(255,255,255,0.05); border-radius: var(--radius-md);">No memories from this day yet. Keep preserving!</span>';
      return;
    }

    content.innerHTML = memories.map((m, i) => {
      let thumbHtml = '';
      if (m.file_type && m.file_type.startsWith('image/')) {
        thumbHtml = `<img src="/uploads/${m.file_path}" alt="thumbnail" style="width: 50px; height: 50px; border-radius: var(--radius-sm); object-fit: cover;">`;
      } else {
        thumbHtml = `<div style="width: 50px; height: 50px; border-radius: var(--radius-sm); background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">📄</div>`;
      }

      const yearDiff = new Date().getFullYear() - new Date(m.created_at + 'Z').getFullYear();
      const yearsText = yearDiff > 0 ? `${yearDiff} year${yearDiff > 1 ? 's' : ''} ago` : 'Earlier today';

      return `
        <div class="glass polaroid-card" style="min-width: 200px; padding: 12px; border-radius: var(--radius-md); cursor: pointer; display: flex; gap: 12px; align-items: center; animation: fade-in 0.5s ease forwards; animation-delay: ${i * 0.1}s; opacity: 0; transform: scale(0.95);" onclick="window.location.hash = '#/memory/${m.id}'">
          ${thumbHtml}
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${m.title}">${m.title}</div>
            <div style="color: var(--text-secondary); font-size: 0.8rem; font-family: 'Caveat', cursive, serif;">${yearsText}</div>
          </div>
        </div>
      `;
    }).join('');
    
    // Add simple inline keyframes for the polaroid-card animation if not already present
    if (!document.getElementById('polaroid-style')) {
      const style = document.createElement('style');
      style.id = 'polaroid-style';
      style.textContent = `
        @keyframes fade-in {
          to { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
  } catch (err) {
    content.innerHTML = '<span style="color: var(--error);">Failed to load On This Day memories.</span>';
  }
}
