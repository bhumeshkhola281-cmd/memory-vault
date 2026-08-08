import { formatRelative, formatFileSize } from '../utils/date.js';

export function renderMemoryCard(memory) {
  const isImage = memory.file_type?.startsWith('image/');
  const isVideo = memory.file_type?.startsWith('video/');
  const isAudio = memory.file_type?.startsWith('audio/');
  
  let thumbHtml = '';
  let iconHtml = '';
  
  if (isImage) {
    thumbHtml = `<img src="${memory.url || '/uploads/'+memory.file_path}" alt="${memory.title}" loading="lazy">`;
    iconHtml = `🖼️ Image`;
  } else if (isVideo) {
    thumbHtml = `
      <video preload="metadata" muted>
        <source src="${memory.url || '/uploads/'+memory.file_path}" type="${memory.file_type}">
      </video>
      <div class="memory-thumb-icon">▶️</div>
    `;
    iconHtml = `🎥 Video`;
  } else if (isAudio) {
    thumbHtml = `<div class="memory-thumb-icon">🎵</div>`;
    iconHtml = `🎵 Audio`;
  } else {
    thumbHtml = `<div class="memory-thumb-icon">📄</div>`;
    iconHtml = `📄 Document`;
  }

  return `
    <div class="memory-card glass fade-in" onclick="window.location.hash = '#/memory/${memory.id}'">
      <div class="memory-thumb">
        ${thumbHtml}
        <div class="memory-type-badge">${iconHtml}</div>
      </div>
      <div class="memory-info">
        <h3 class="memory-title" title="${memory.title}">${memory.title}</h3>
        <div class="memory-meta">
          <span>${formatRelative(memory.created_at || new Date().toISOString())}</span>
          <span>${formatFileSize(memory.file_size)}</span>
        </div>
      </div>
    </div>
  `;
}
