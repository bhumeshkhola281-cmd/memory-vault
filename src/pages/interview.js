import { apiPostFile } from '../utils/api.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { promptCategories } from '../utils/prompts.js';
import { emojiButton, setupEmojiPickers } from '../components/emojiPicker.js';

export function renderInterviewPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const app = document.getElementById('app');
  
  app.innerHTML = `
    ${renderHeader(user)}
    <div class="page container fade-in">
      <a href="#/dashboard" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Back to Your Vault
      </a>
      
      <div class="glass" style="padding: 30px; margin-top: 20px;">
        <h2 style="margin-bottom: 8px;">Tell Your Story</h2>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">Choose a theme and let the prompt guide your memory.</p>
        
        <div id="interview-content"></div>
      </div>
    </div>
  `;
  
  setupHeaderEvents();
  
  const contentArea = document.getElementById('interview-content');
  
  const renderCategories = () => {
    contentArea.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
        ${promptCategories.map((cat, idx) => `
          <div class="glass category-card" data-idx="${idx}" style="padding: 24px; text-align: center; cursor: pointer; transition: all var(--transition-normal);">
            <div style="font-size: 3rem;">${cat.icon}</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; margin-top: 12px; font-weight: 500;">${cat.name}</div>
            <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 4px;">${cat.prompts.length} prompts</div>
          </div>
        `).join('')}
      </div>
    `;
    
    document.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx, 10);
        renderPrompt(promptCategories[idx]);
      });
    });
  };
  
  const renderPrompt = (category) => {
    let currentPrompt = category.prompts[Math.floor(Math.random() * category.prompts.length)];
    
    contentArea.innerHTML = `
      <div class="fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <button id="btn-back-cat" class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.9rem;">← Categories</button>
          <button id="btn-diff-prompt" class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.9rem;">↻ Different Prompt</button>
        </div>
        
        <div id="prompt-display" style="font-family: 'Caveat', cursive, serif; font-size: 1.8rem; color: var(--accent-primary); min-height: 80px; margin-bottom: 24px; letter-spacing: 0.5px; line-height: 1.3;"></div>
        
        <form id="story-form">
          <div style="position: relative;">
            <textarea id="story-text" rows="6" placeholder="Tell your story..." required style="width: 100%; background: var(--bg-glass); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-md); padding: 16px; padding-right: 40px; color: var(--text-primary); font-family: inherit; font-size: 1rem; margin-bottom: 16px; resize: vertical;"></textarea>
            ${emojiButton('story-text')}
          </div>
          
          <div style="margin-bottom: 24px; padding: 12px; background: rgba(0,0,0,0.1); border-radius: var(--radius-md);">
            <label style="display: block; font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 8px;">Attach a photo (optional)</label>
            <input type="file" id="story-file" accept="image/*" style="font-size: 0.9rem;">
          </div>
          
          <button type="submit" class="btn btn-primary" id="btn-seal" style="width: 100%; justify-content: center; font-size: 1.1rem; padding: 12px;">Seal This Memory</button>
        </form>
      </div>
    `;
    
    document.getElementById('btn-back-cat').addEventListener('click', renderCategories);
    setupEmojiPickers();
    
    const displayElement = document.getElementById('prompt-display');
    let typeInterval;
    
    const typePrompt = (text) => {
      clearInterval(typeInterval);
      displayElement.textContent = '';
      let i = 0;
      typeInterval = setInterval(() => {
        if (i < text.length) {
          displayElement.textContent += text.charAt(i);
          i++;
        } else {
          clearInterval(typeInterval);
        }
      }, 50);
    };
    
    document.getElementById('btn-diff-prompt').addEventListener('click', () => {
      let newPrompt;
      do {
        newPrompt = category.prompts[Math.floor(Math.random() * category.prompts.length)];
      } while (newPrompt === currentPrompt && category.prompts.length > 1);
      currentPrompt = newPrompt;
      typePrompt(currentPrompt);
    });
    
    typePrompt(currentPrompt);
    
    document.getElementById('story-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const storyText = document.getElementById('story-text').value;
      if (!storyText.trim()) return;
      
      const btnSeal = document.getElementById('btn-seal');
      btnSeal.disabled = true;
      btnSeal.textContent = 'Sealing...';
      
      const title = storyText.substring(0, 50) + (storyText.length > 50 ? '...' : '');
      const description = currentPrompt;
      const fileInput = document.getElementById('story-file');
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      
      if (fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]);
      } else {
        const textBlob = new Blob([storyText], { type: 'text/plain' });
        formData.append('file', textBlob, 'story.txt');
      }
      
      // We also need to save the story text itself somewhere if there's a file attached, 
      // but if they attach a photo, maybe the story text goes in a separate field? 
      // Actually, if there's a file, we could put the story text in the description or wait. 
      // The user spec says: "create a FormData with the text as a file (create a Blob), title = first 50 chars of response, description = the prompt question."
      // Let's assume if there's a file attached, the text is the "description" or something. Wait, user specifically said:
      // "create a FormData with the text as a file (create a Blob), title = first 50 chars of response, description = the prompt question."
      // We will also append the storyText to the description if there is a file, or just use the Blob. Let's strictly follow the blob requirement but handle the file if provided.
      // Actually, I'll just append it to description as well so it's visible if it's an image.
      if (fileInput.files.length > 0) {
        formData.set('description', currentPrompt + '\n\n' + storyText);
      }
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/memories', true);
      xhr.withCredentials = true;
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          showToast('Memory preserved from your story', 'success');
          setTimeout(() => {
            window.location.hash = '#/dashboard';
          }, 1500);
        } else {
          btnSeal.disabled = false;
          btnSeal.textContent = 'Seal This Memory';
          let msg = 'Could not preserve story';
          try { msg = JSON.parse(xhr.responseText).message || msg; } catch(e){}
          showToast(msg, 'error');
        }
      };
      
      xhr.onerror = () => {
        btnSeal.disabled = false;
        btnSeal.textContent = 'Seal This Memory';
        showToast('Connection lost while preserving', 'error');
      };
      
      xhr.send(formData);
    });
  };
  
  renderCategories();
}
