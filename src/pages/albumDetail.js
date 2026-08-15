import { apiGet } from '../utils/api.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';

export async function renderAlbumDetailPage(albumId) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const app = document.getElementById('app');
    app.innerHTML = `
        ${renderHeader(user)}
        <div class="page container fade-in" id="album-content">
            <p>Loading chapter...</p>
        </div>
    `;
    setupHeaderEvents();

    try {
        const album = await apiGet(`/api/memories/albums/${albumId}`);
        const content = document.getElementById('album-content');
        
        content.innerHTML = `
            <div class="controls-bar">
                <a href="#/albums" class="back-link" style="margin: 0; padding-right: 16px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back
                </a>
                <h1 class="album-header" style="flex:1; margin:0;">${album.title}</h1>
                <button class="btn btn-primary" onclick="window.print()">Export to Book 🖨️</button>
            </div>
            <div class="memory-grid">
                ${album.memories && album.memories.length > 0 ? album.memories.map(m => `
                    <div class="memory-card glass" onclick="window.location.hash = '#/memory/${m.id}'">
                        <div class="memory-thumb">
                            ${m.file_type && m.file_type.startsWith('image') ? `<img src="/uploads/${m.file_path}" alt="${m.title}">` : '<div class="memory-thumb-icon">📄</div>'}
                        </div>
                        <div class="memory-info">
                            <h3 class="memory-title">${m.title}</h3>
                            ${m.description ? `<p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${m.description}</p>` : ''}
                        </div>
                    </div>
                `).join('') : '<p>No memories in this chapter.</p>'}
            </div>
        `;
    } catch (e) {
        document.getElementById('album-content').innerHTML = '<p>Error loading chapter.</p>';
    }
}
