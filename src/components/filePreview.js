export function renderFilePreview(memory, isFullScreen = false) {
  const isImage = memory.file_type?.startsWith('image/');
  const isVideo = memory.file_type?.startsWith('video/');
  const isAudio = memory.file_type?.startsWith('audio/');
  const isPdf = memory.file_type === 'application/pdf';
  const url = memory.url || '/uploads/' + (memory.file_path || '');
  
  const cls = isFullScreen ? 'preview-container fullscreen' : 'preview-container';
  
  if (isImage) {
    return `<div class="${cls}"><img src="${url}" alt="${memory.title}"></div>`;
  } else if (isVideo) {
    return `<div class="${cls}">
      <video controls ${isFullScreen ? 'autoplay' : ''}>
        <source src="${url}" type="${memory.file_type}">
        Your browser does not support the video tag.
      </video>
    </div>`;
  } else if (isAudio) {
    return `<div class="${cls}" style="padding: 20px; background: rgba(0,0,0,0.2); border-radius: var(--radius-lg);">
      <div style="text-align:center; font-size: 3rem; margin-bottom: 20px;">🎵</div>
      <audio controls style="width: 100%;">
        <source src="${url}" type="${memory.file_type}">
        Your browser does not support the audio element.
      </audio>
    </div>`;
  } else if (isPdf) {
    return `<div class="${cls}">
      <iframe src="${url}" width="100%" height="${isFullScreen ? '600px' : '300px'}" style="border:none; border-radius: var(--radius-md);"></iframe>
    </div>`;
  } else {
    return `<div class="${cls}" style="text-align:center; padding: 40px; background: rgba(0,0,0,0.2); border-radius: var(--radius-lg);">
      <div style="font-size: 4rem; margin-bottom: 20px;">📄</div>
      <a href="${url}" download class="btn btn-primary" target="_blank">Download File</a>
    </div>`;
  }
}
