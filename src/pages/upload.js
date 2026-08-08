import { apiPostFile } from '../utils/api.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { renderFilePreview } from '../components/filePreview.js';
import { formatFileSize } from '../utils/date.js';

export function renderUploadPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  document.getElementById('app').innerHTML = `
    ${renderHeader(user)}
    <div class="page container fade-in">
      <a href="#/dashboard" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Back to Dashboard
      </a>
      
      <div class="upload-container glass" style="padding: 30px; margin-top: 20px;">
        <h2 style="margin-bottom: 24px; font-size: 1.8rem;">Upload Memory</h2>
        
        <div id="drop-zone" class="drop-zone">
          <div class="drop-icon">☁️</div>
          <div class="drop-text">Drag & drop your files here</div>
          <div class="drop-divider">or</div>
          <button type="button" class="btn btn-secondary" id="btn-browse">Browse Files</button>
          <input type="file" id="file-input">
        </div>
        
        <form id="upload-form" class="upload-form" style="display: none;">
          <div id="file-preview-area"></div>
          
          <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: var(--radius-md); font-size: 0.9rem;">
            <div><strong>File:</strong> <span id="info-name"></span></div>
            <div><strong>Size:</strong> <span id="info-size"></span></div>
          </div>
          
          <div>
            <label style="display:block; margin-bottom: 8px; color: var(--text-secondary);">Title</label>
            <input type="text" id="input-title" required placeholder="Give it a title...">
          </div>
          
          <div>
            <label style="display:block; margin-bottom: 8px; color: var(--text-secondary);">Description (Optional)</label>
            <textarea id="input-desc" rows="3" placeholder="Add some context..."></textarea>
          </div>
          
          <button type="submit" class="btn btn-primary" id="btn-upload" style="width: 100%; justify-content: center;">Upload to Vault</button>
          
          <div id="progress-container" class="progress-container">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" id="progress-fill"></div>
            </div>
            <div class="progress-text" id="progress-text">0%</div>
          </div>
        </form>
      </div>
    </div>
  `;
  
  setupHeaderEvents();
  
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const btnBrowse = document.getElementById('btn-browse');
  const uploadForm = document.getElementById('upload-form');
  const inputTitle = document.getElementById('input-title');
  const infoName = document.getElementById('info-name');
  const infoSize = document.getElementById('info-size');
  const previewArea = document.getElementById('file-preview-area');
  
  let selectedFile = null;
  const MAX_SIZE = 100 * 1024 * 1024;
  
  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.size > MAX_SIZE) {
      showToast('File size exceeds 100MB limit', 'error');
      return;
    }
    
    selectedFile = file;
    dropZone.style.display = 'none';
    uploadForm.style.display = 'flex';
    
    infoName.textContent = file.name;
    infoSize.textContent = formatFileSize(file.size);
    
    const nameWithoutExt = file.name.split('.').slice(0, -1).join('.');
    inputTitle.value = nameWithoutExt || file.name;
    
    const url = URL.createObjectURL(file);
    const mockMemory = { file_type: file.type, url, title: file.name };
    previewArea.innerHTML = renderFilePreview(mockMemory, false);
  };
  
  btnBrowse.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });
  
  uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    
    const btnUpload = document.getElementById('btn-upload');
    const progContainer = document.getElementById('progress-container');
    const progFill = document.getElementById('progress-fill');
    const progText = document.getElementById('progress-text');
    
    btnUpload.style.display = 'none';
    progContainer.style.display = 'block';
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', inputTitle.value);
    formData.append('description', document.getElementById('input-desc').value);
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/memories', true);
    xhr.withCredentials = true;
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progFill.style.width = percent + '%';
        progText.textContent = percent + '%';
      }
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        progFill.style.background = 'var(--success)';
        progText.textContent = 'Upload Complete! ✨';
        showToast('Memory saved successfully', 'success');
        setTimeout(() => {
          window.location.hash = '#/dashboard';
        }, 1500);
      } else {
        btnUpload.style.display = 'flex';
        progContainer.style.display = 'none';
        let msg = 'Upload failed';
        try { msg = JSON.parse(xhr.responseText).message || msg; } catch(e){}
        showToast(msg, 'error');
      }
    };
    
    xhr.onerror = () => {
      btnUpload.style.display = 'flex';
      progContainer.style.display = 'none';
      showToast('Network error during upload', 'error');
    };
    
    xhr.send(formData);
  });
}
