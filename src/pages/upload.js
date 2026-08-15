import { apiPostFile } from '../utils/api.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { renderFilePreview } from '../components/filePreview.js';
import { formatFileSize } from '../utils/date.js';
import { emojiButton, setupEmojiPickers } from '../components/emojiPicker.js';

export function renderUploadPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  document.getElementById('app').innerHTML = `
    ${renderHeader(user)}
    <div class="page container fade-in">
      <a href="#/dashboard" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Back to Your Vault
      </a>
      
      <div class="upload-container glass" style="padding: 30px; margin-top: 20px;">
        <h2 style="margin-bottom: 24px; font-size: 1.8rem;">Preserve a Memory</h2>
        
        <div id="drop-zone" class="drop-zone">
          <div class="drop-icon">🕊️</div>
          <div class="drop-text">Drop your moment here</div>
          <div class="drop-divider">or</div>
          <button type="button" class="btn btn-secondary" id="btn-browse">Choose from Device</button>
          <input type="file" id="file-input">
        </div>
        
        <form id="upload-form" class="upload-form" style="display: none;">
          <div id="file-preview-area"></div>
          
          <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: var(--radius-md); font-size: 0.9rem;">
            <div><strong>File:</strong> <span id="info-name"></span></div>
            <div><strong>Size:</strong> <span id="info-size"></span></div>
          </div>
          
          <div style="margin-top: 16px;">
            <label style="display:block; margin-bottom: 8px; color: var(--text-secondary);">🎤 Voice Note (Optional)</label>
            <div id="voice-section" style="display: flex; gap: 12px; align-items: center;">
              <button type="button" class="btn btn-secondary" id="btn-record" style="min-width: 140px;">🎤 Record</button>
              <span id="voice-status" style="color: var(--text-muted); font-size: 0.85rem;">No voice note</span>
            </div>
            <audio id="voice-playback" controls style="width: 100%; margin-top: 10px; display: none;"></audio>
          </div>
          
          <div>
            <label style="display:block; margin-bottom: 8px; color: var(--text-secondary);">Title</label>
            <div style="position: relative;">
              <input type="text" id="input-title" required placeholder="Give it a title..." style="padding-right: 40px;">
              ${emojiButton('input-title')}
            </div>
          </div>
          
          <div>
            <label style="display:block; margin-bottom: 8px; color: var(--text-secondary);">Description (Optional)</label>
            <div style="position: relative;">
              <textarea id="input-desc" rows="3" placeholder="Add some context..." style="padding-right: 40px;"></textarea>
              ${emojiButton('input-desc')}
            </div>
          </div>
          
          <div>
            <label style="display:block; margin-bottom: 8px; color: var(--text-secondary);">🔒 Seal Until (Optional)</label>
            <input type="date" id="input-seal-date" style="width: 100%;">
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Set a future date to create a time capsule. The memory will be locked until then.</p>
          </div>
          
          <button type="submit" class="btn btn-primary" id="btn-upload" style="width: 100%; justify-content: center;">Seal in Vault</button>
          
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
  setupEmojiPickers();
  
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const btnBrowse = document.getElementById('btn-browse');
  const uploadForm = document.getElementById('upload-form');
  const inputTitle = document.getElementById('input-title');
  const infoName = document.getElementById('info-name');
  const infoSize = document.getElementById('info-size');
  const previewArea = document.getElementById('file-preview-area');
  
  let selectedFile = null;
  const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('input-seal-date').min = tomorrow.toISOString().split('T')[0];
  
  let mediaRecorder = null;
  let audioChunks = [];
  let recordedBlob = null;

  const btnRecord = document.getElementById('btn-record');
  const voiceStatus = document.getElementById('voice-status');
  const voicePlayback = document.getElementById('voice-playback');

  btnRecord.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      btnRecord.textContent = '🎤 Record';
      btnRecord.style.background = '';
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(recordedBlob);
        voicePlayback.src = url;
        voicePlayback.style.display = 'block';
        voiceStatus.textContent = 'Voice note recorded ✓';
        voiceStatus.style.color = 'var(--success)';
        stream.getTracks().forEach(t => t.stop());
      };
      
      mediaRecorder.start();
      btnRecord.textContent = '⏹ Stop';
      btnRecord.style.background = 'var(--error)';
      voiceStatus.textContent = 'Recording...';
      voiceStatus.style.color = 'var(--error)';
    } catch (err) {
      showToast('Microphone access denied', 'error');
    }
  });
  
  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.size > MAX_SIZE) {
      showToast('This moment is too large (25 MB max per upload)', 'error');
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
    
    if (recordedBlob) {
      formData.append('voiceNote', recordedBlob, 'voice-note.webm');
    }
    const sealDate = document.getElementById('input-seal-date').value;
    if (sealDate) {
      formData.append('sealed_until', sealDate);
    }
    
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
        progText.textContent = 'Memory Preserved! ✨';
        showToast('Sealed in your vault forever', 'success');
        setTimeout(() => {
          window.location.hash = '#/dashboard';
        }, 1500);
      } else {
        btnUpload.style.display = 'flex';
        progContainer.style.display = 'none';
        let msg = 'Could not preserve this memory';
        try {
          const data = JSON.parse(xhr.responseText);
          msg = data.error || data.message || msg;
        } catch(e){}
        showToast(msg, 'error');
      }
    };
    
    xhr.onerror = () => {
      btnUpload.style.display = 'flex';
      progContainer.style.display = 'none';
      let msg = 'Connection lost while preserving';
      try {
        const data = JSON.parse(xhr.responseText);
        msg = data.error || data.message || msg;
      } catch(e){}
      showToast(msg, 'error');
    };

    xhr.ontimeout = () => {
      btnUpload.style.display = 'flex';
      progContainer.style.display = 'none';
      showToast('Upload timed out. Please try with a faster connection.', 'error');
    };
    
    xhr.send(formData);
  });
}
