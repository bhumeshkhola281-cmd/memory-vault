import { apiGet, apiPost } from '../utils/api.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';

export async function renderAlbumsPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const app = document.getElementById('app');
    app.innerHTML = `
        ${renderHeader(user)}
        <div class="page container fade-in" id="albums-content">
            <div class="controls-bar">
                <h2 style="flex:1;">📚 Chapters</h2>
                <button class="btn btn-primary" id="btn-create-album">Create Chapter</button>
            </div>
            <div id="albums-grid" class="memory-grid">
                <p>Loading chapters...</p>
            </div>
        </div>
    `;
    setupHeaderEvents();

    const fetchAlbums = async () => {
        try {
            const albums = await apiGet('/api/memories/albums/all');
            const grid = document.getElementById('albums-grid');
            if (!albums || albums.length === 0) {
                grid.innerHTML = '<p>No chapters yet.</p>';
            } else {
                grid.innerHTML = albums.map(a => `
                    <div class="memory-card glass" onclick="window.location.hash = '#/album/${a.id}'">
                        <div class="memory-info">
                            <h3 class="memory-title">${a.title}</h3>
                            <div class="memory-meta">
                                <span>${a.memory_count || 0} memories</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (e) {
            console.error(e);
            document.getElementById('albums-grid').innerHTML = '<p>Error loading chapters.</p>';
        }
    };

    await fetchAlbums();

    document.getElementById('btn-create-album').addEventListener('click', async () => {
        const title = prompt('Enter chapter title:');
        if (title && title.trim()) {
            try {
                await apiPost('/api/memories/albums', { title: title.trim() });
                fetchAlbums();
            } catch (e) {
                alert('Error creating chapter');
            }
        }
    });
}
