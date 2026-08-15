import { formatRelative, formatFileSize } from '../utils/date.js';
import { renderMemoryCard } from './memoryCard.js';

export function renderTimelineView(memories) {
  if (!memories || !memories.length) return '';
  
  const grouped = memories.reduce((acc, m) => {
    const year = new Date(m.created_at + 'Z').getFullYear() || 'Unknown';
    if (!acc[year]) acc[year] = [];
    acc[year].push(m);
    return acc;
  }, {});
  
  const years = Object.keys(grouped).sort((a,b) => b - a);
  let html = '<div class="timeline-view" style="position: relative; padding-left: 40px;">';
  
  years.forEach(year => {
    html += `
      <div class="timeline-year" style="position: relative; margin-bottom: 40px;">
        <div class="year-badge" style="position: absolute; left: -50px; top: 0; background: var(--primary); color: white; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold; z-index: 1; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">${year}</div>
        <div style="border-left: 2px solid var(--border); padding-left: 30px; margin-left: -25px; min-height: 100px; padding-top: 10px;">
          <div class="memory-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
            ${grouped[year].map(m => `
              <div onclick="window.location.hash = '#/memory/${m.id}'" style="cursor: pointer; transform: scale(0.9); transform-origin: top left; width: 111%;">
                ${renderMemoryCard(m).replace('class="memory-card glass fade-in"', 'class="memory-card glass fade-in" style="pointer-events: none;"')}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

export function renderBookshelfView(memories) {
  if (!memories || !memories.length) return '';
  
  const grouped = memories.reduce((acc, m) => {
    const year = new Date(m.created_at + 'Z').getFullYear() || 'Unknown';
    if (!acc[year]) acc[year] = [];
    acc[year].push(m);
    return acc;
  }, {});
  
  const colors = {
    image: '#e74c3c', // warm red
    video: '#2980b9', // deep blue
    audio: '#27ae60', // forest green
    application: '#f1c40f', // gold
    default: '#95a5a6'
  };
  
  const years = Object.keys(grouped).sort((a,b) => b - a);
  let html = '<div class="bookshelf-view" style="padding: 20px;">';
  
  years.forEach(year => {
    html += `
      <div class="bookshelf-year" style="margin-bottom: 60px; position: relative;">
        <div class="year-tag" style="position: absolute; left: -15px; top: 120px; background: #8B4513; color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.9rem; box-shadow: 2px 2px 5px rgba(0,0,0,0.5); z-index: 10; font-weight: bold;">${year}</div>
        <div class="shelf" style="display: flex; align-items: flex-end; gap: 6px; border-bottom: 24px solid #8B4513; padding-bottom: 0; padding-left: 50px; min-height: 160px; border-radius: 4px; box-shadow: 0 10px 20px rgba(0,0,0,0.3), inset 0 2px 5px rgba(255,255,255,0.2);">
          ${grouped[year].map(m => {
            const type = m.file_type?.split('/')[0] || 'default';
            let color = colors[type] || colors.default;
            if (type === 'application') color = colors.application;
            const height = 110 + (m.title.length % 40); // slightly varied height
            return `
              <div onclick="window.location.hash = '#/memory/${m.id}'" class="book-spine" style="
                width: 45px; 
                height: ${height}px; 
                background: ${color}; 
                border-radius: 4px 4px 0 0; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                cursor: pointer;
                box-shadow: inset -3px 0 8px rgba(0,0,0,0.3), inset 3px 0 4px rgba(255,255,255,0.3), 3px 0 6px rgba(0,0,0,0.4);
                transition: transform 0.2s ease, filter 0.2s ease;
              " onmouseover="this.style.transform='translateY(-15px)'; this.style.filter='brightness(1.1)';" onmouseout="this.style.transform='translateY(0)'; this.style.filter='brightness(1)';" title="${m.title}">
                <div style="writing-mode: vertical-rl; text-orientation: mixed; color: white; font-size: 0.85rem; padding: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-height: 90%; font-weight: 600; text-shadow: 1px 1px 3px rgba(0,0,0,0.6); letter-spacing: 1px;">
                  ${m.title}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}
