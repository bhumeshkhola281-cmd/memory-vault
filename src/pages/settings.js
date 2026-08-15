import { apiPut } from '../utils/api.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';

export function applyCustomFonts(user) {
    const savedFonts = JSON.parse(localStorage.getItem('custom_fonts') || '{}');
    if (savedFonts.heading) document.documentElement.style.setProperty('--font-heading', savedFonts.heading);
    if (savedFonts.handwritten) document.documentElement.style.setProperty('--font-handwritten', savedFonts.handwritten);
    if (savedFonts.display) document.documentElement.style.setProperty('--font-display', savedFonts.display);
}

export async function renderSettingsPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const savedFonts = JSON.parse(localStorage.getItem('custom_fonts') || '{}');
    const app = document.getElementById('app');
    
    app.innerHTML = `
        ${renderHeader(user)}
        <div class="page container fade-in">
            <h2>⚙️ Settings</h2>
            
            <div class="glass" style="padding: 24px; margin-top: 20px;">
                <h3>Vault Theme</h3>
                <div style="margin-top: 16px;">
                    <select id="theme-select" class="filter-select">
                        <option value="heirloom">Heirloom (Default)</option>
                        <option value="modern">Modern Minimal</option>
                        <option value="kids">Kids Playroom</option>
                        <option value="travel">Travel Journal</option>
                    </select>
                </div>
            </div>

            <div class="glass" style="padding: 24px; margin-top: 20px;">
                <h3>🔤 Section Typography Options</h3>
                <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 0.9rem;">Choose unique font styles for different parts of your vault:</p>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
                    <div>
                        <label style="display:block; margin-bottom: 6px; font-size: 0.85rem; color: var(--text-secondary);">Page & Section Headings</label>
                        <select id="font-heading-select" class="filter-select" style="width:100%;">
                            <option value="'Cormorant Garamond', Georgia, serif">Cormorant Garamond (Antique Serif)</option>
                            <option value="'Playfair Display', Georgia, serif">Playfair Display (Luxury Serif)</option>
                            <option value="'Outfit', sans-serif">Outfit (Modern Clean)</option>
                            <option value="'Space Grotesk', sans-serif">Space Grotesk (Tech Display)</option>
                            <option value="'Fredoka', cursive">Fredoka (Playful Rounded)</option>
                        </select>
                    </div>

                    <div>
                        <label style="display:block; margin-bottom: 6px; font-size: 0.85rem; color: var(--text-secondary);">Journal & Personal Notes</label>
                        <select id="font-handwritten-select" class="filter-select" style="width:100%;">
                            <option value="'Caveat', cursive">Caveat (Casual Handwriting)</option>
                            <option value="'Dancing Script', cursive">Dancing Script (Calligraphic Cursive)</option>
                            <option value="'Inter', sans-serif">Inter (Clean Sans)</option>
                            <option value="'Cormorant Garamond', serif">Cormorant Garamond (Classic)</option>
                        </select>
                    </div>

                    <div>
                        <label style="display:block; margin-bottom: 6px; font-size: 0.85rem; color: var(--text-secondary);">Cards & Navigation Badges</label>
                        <select id="font-display-select" class="filter-select" style="width:100%;">
                            <option value="'Outfit', sans-serif">Outfit (Modern Display)</option>
                            <option value="'Space Grotesk', sans-serif">Space Grotesk (Tech Display)</option>
                            <option value="'Cormorant Garamond', serif">Cormorant Garamond (Serif)</option>
                            <option value="'Fredoka', cursive">Fredoka (Rounded)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="glass" style="padding: 24px; margin-top: 20px;">
                <h3>Legacy Controls</h3>
                <p style="color: var(--text-secondary); margin-bottom: 16px;">Pass down your vault if inactive for 12 months.</p>
                <div style="display: flex; gap: 16px; align-items: center;">
                    <input type="email" id="legacy-email" placeholder="Legacy Contact Email" value="${user.legacy_email || user.legacy_contact_email || ''}">
                    <button class="btn btn-primary" id="btn-save-legacy">Save</button>
                </div>
            </div>
        </div>
    `;
    setupHeaderEvents();

    const themeSelect = document.getElementById('theme-select');
    themeSelect.value = user.active_skin || 'heirloom';
    
    themeSelect.addEventListener('change', async (e) => {
        const skin = e.target.value;
        document.body.className = 'skin-' + skin;
        try {
            const updatedUser = await apiPut('/api/auth/me/settings', { skin: skin, legacyEmail: user.legacy_email || '' });
            localStorage.setItem('user', JSON.stringify({ ...user, ...updatedUser }));
            showToast('Theme updated', 'success');
        } catch (error) {
            showToast('Error saving theme', 'error');
        }
    });

    const headingSelect = document.getElementById('font-heading-select');
    const handwrittenSelect = document.getElementById('font-handwritten-select');
    const displaySelect = document.getElementById('font-display-select');

    if (savedFonts.heading) headingSelect.value = savedFonts.heading;
    if (savedFonts.handwritten) handwrittenSelect.value = savedFonts.handwritten;
    if (savedFonts.display) displaySelect.value = savedFonts.display;

    const saveFontPrefs = () => {
        const prefs = {
            heading: headingSelect.value,
            handwritten: handwrittenSelect.value,
            display: displaySelect.value
        };
        localStorage.setItem('custom_fonts', JSON.stringify(prefs));
        applyCustomFonts(user);
        showToast('Section typography updated', 'success');
    };

    headingSelect.addEventListener('change', saveFontPrefs);
    handwrittenSelect.addEventListener('change', saveFontPrefs);
    displaySelect.addEventListener('change', saveFontPrefs);

    document.getElementById('btn-save-legacy').addEventListener('click', async () => {
        const email = document.getElementById('legacy-email').value;
        try {
            const updatedUser = await apiPut('/api/auth/me/settings', { skin: user.active_skin || 'heirloom', legacyEmail: email });
            localStorage.setItem('user', JSON.stringify({ ...user, ...updatedUser }));
            showToast('Legacy contact saved', 'success');
        } catch (error) {
            showToast('Error saving legacy contact', 'error');
        }
    });
}
