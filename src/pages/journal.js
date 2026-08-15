import { apiGet, apiPostFile } from '../utils/api.js';
import { renderHeader, setupHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { emojiButton, setupEmojiPickers } from '../components/emojiPicker.js';

export function renderJournalPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const prompts = [
    { icon: '🙏', text: "What's one thing today you'd want to remember?" },
    { icon: '👁️', text: 'Describe a texture, smell, or sound from today.' },
    { icon: '🔀', text: 'If today had a surprise ending, what would it be?' },
    { icon: '📸', text: "Look at your last photo. What's the story behind it?" }
  ];
  const todayPrompt = prompts[Math.floor(Date.now() / 86400000) % prompts.length];

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  document.getElementById('app').innerHTML = `
    ${renderHeader(user)}
    <div class="page container fade-in">
      <div style="max-width: 800px; margin: 0 auto;">
        
        <!-- Section A: Today's Entry Form -->
        <div class="glass" style="padding: 30px; margin-bottom: 24px;">
          <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.5rem; margin-bottom: 16px;">Today — ${dateString}</h2>
          
          <div style="background: rgba(0,0,0,0.1); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px; display: flex; gap: 12px; align-items: flex-start;">
            <div style="font-size: 1.5rem;">${todayPrompt.icon}</div>
            <div style="font-family: var(--font-handwritten); font-size: 1.2rem;">${todayPrompt.text}</div>
          </div>

          <div class="journal-tabs">
            <button class="journal-tab active" data-tab="write">✍️ Write</button>
            <button class="journal-tab" data-tab="voice">🎤 Voice</button>
            <button class="journal-tab" data-tab="snapshot">📷 Snapshot</button>
          </div>

          <form id="journal-form">
            <!-- Write Tab -->
            <div id="tab-write" class="tab-content" style="position: relative;">
              <textarea id="journal-text" rows="5" placeholder="Just start typing... one sentence is enough." style="width: 100%; padding-right: 40px; font-family: var(--font-handwritten); font-size: 1.1rem; line-height: 1.6;"></textarea>
              ${emojiButton('journal-text')}
            </div>

            <!-- Voice Tab -->
            <div id="tab-voice" class="tab-content" style="display: none; padding: 20px; border: 1px dashed var(--border-glass); border-radius: var(--radius-md); text-align: center;">
              <div id="voice-status" style="margin-bottom: 16px; color: var(--text-secondary);">Record your thoughts...</div>
              <button type="button" class="btn btn-secondary" id="btn-record-journal" style="margin: 0 auto;">🎤 Start Recording</button>
              <audio id="voice-playback-journal" controls style="width: 100%; margin-top: 16px; display: none;"></audio>
            </div>

            <!-- Snapshot Tab -->
            <div id="tab-snapshot" class="tab-content" style="display: none; border: 1px dashed var(--border-glass); border-radius: var(--radius-md); padding: 20px;">
              <input type="file" id="journal-photo" accept="image/*" style="margin-bottom: 16px; width: 100%;">
              <div style="position: relative;">
                <textarea id="journal-caption" rows="2" placeholder="Add a short caption..." style="width: 100%; padding-right: 40px; font-family: var(--font-handwritten); font-size: 1.1rem;"></textarea>
                ${emojiButton('journal-caption')}
              </div>
            </div>

            <div class="mood-pills">
              <button type="button" class="mood-pill" data-mood="Serene">🌿 Serene</button>
              <button type="button" class="mood-pill" data-mood="Inspired">✨ Inspired</button>
              <button type="button" class="mood-pill" data-mood="Cozy">☕ Cozy</button>
              <button type="button" class="mood-pill" data-mood="Energetic">⚡ Energetic</button>
              <button type="button" class="mood-pill" data-mood="Reflective">🕯️ Reflective</button>
              <button type="button" class="mood-pill" data-mood="Heavy">🌧️ Heavy</button>
            </div>

            <button type="submit" class="btn btn-primary" id="btn-seal-journal" style="width: 100%; justify-content: center;">Seal Today</button>
          </form>
        </div>

        <!-- Section B: Calendar View -->
        <div class="glass" style="padding: 30px;">
          <div class="cal-nav">
            <button id="cal-prev">&lt;</button>
            <span id="cal-month-label">Month Year</span>
            <button id="cal-next">&gt;</button>
          </div>
          
          <div class="cal-grid">
            <div class="cal-header">MON</div>
            <div class="cal-header">TUE</div>
            <div class="cal-header">WED</div>
            <div class="cal-header">THU</div>
            <div class="cal-header">FRI</div>
            <div class="cal-header">SAT</div>
            <div class="cal-header">SUN</div>
          </div>
          <div id="cal-days" class="cal-grid" style="margin-top: 0;"></div>
          
          <div id="entry-viewer" class="entry-viewer glass" style="display: none;"></div>
        </div>

      </div>
    </div>
  `;

  setupHeaderEvents();
  setupEmojiPickers();

  // Tab switching
  let activeTab = 'write';
  document.querySelectorAll('.journal-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.journal-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeTab = e.target.dataset.tab;
      
      document.getElementById('tab-write').style.display = 'none';
      document.getElementById('tab-voice').style.display = 'none';
      document.getElementById('tab-snapshot').style.display = 'none';
      
      document.getElementById('tab-' + activeTab).style.display = 'block';
    });
  });

  // Mood selection
  let selectedMood = null;
  document.querySelectorAll('.mood-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.mood-pill').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      selectedMood = e.target.dataset.mood;
    });
  });

  // Voice recording
  let mediaRecorder = null;
  let audioChunks = [];
  let recordedBlob = null;
  const btnRecord = document.getElementById('btn-record-journal');
  const voiceStatus = document.getElementById('voice-status');
  const voicePlayback = document.getElementById('voice-playback-journal');

  btnRecord.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      btnRecord.textContent = '🎤 Record Again';
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
        voiceStatus.textContent = 'Voice note ready';
        voiceStatus.style.color = 'var(--success)';
        stream.getTracks().forEach(t => t.stop());
      };
      
      mediaRecorder.start();
      btnRecord.textContent = '⏹ Stop Recording';
      btnRecord.style.background = 'var(--error)';
      voiceStatus.textContent = 'Listening...';
      voiceStatus.style.color = 'var(--error)';
    } catch (err) {
      showToast('Microphone access denied', 'error');
    }
  });

  // Submit form
  document.getElementById('journal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('type', activeTab);
    formData.append('prompt', todayPrompt.text);
    if (selectedMood) formData.append('mood', selectedMood);
    
    if (activeTab === 'write') {
      const text = document.getElementById('journal-text').value;
      if (!text.trim()) { showToast('Please write something', 'error'); return; }
      formData.append('content', text);
    } else if (activeTab === 'voice') {
      if (!recordedBlob) { showToast('Please record a voice note', 'error'); return; }
      formData.append('file', recordedBlob, 'journal-voice.webm');
    } else if (activeTab === 'snapshot') {
      const fileInput = document.getElementById('journal-photo');
      if (!fileInput.files.length) { showToast('Please select a photo', 'error'); return; }
      formData.append('file', fileInput.files[0]);
      formData.append('content', document.getElementById('journal-caption').value);
    }
    
    const btn = document.getElementById('btn-seal-journal');
    const origText = btn.textContent;
    btn.textContent = 'Sealing...';
    btn.disabled = true;

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/journal', true);
      xhr.withCredentials = true;
      
      xhr.onload = () => {
        btn.textContent = origText;
        btn.disabled = false;
        if (xhr.status >= 200 && xhr.status < 300) {
          if (activeTab === 'write') showToast('One line is all it takes. Sealed. ✦', 'success');
          else if (activeTab === 'voice') showToast('Your voice, preserved forever.', 'success');
          else showToast("A moment captured. That's enough.", 'success');
          
          document.getElementById('journal-form').reset();
          recordedBlob = null;
          voicePlayback.style.display = 'none';
          document.querySelectorAll('.mood-pill').forEach(b => b.classList.remove('active'));
          selectedMood = null;
          
          loadCalendar();
        } else {
          showToast('Failed to seal entry', 'error');
        }
      };
      
      xhr.onerror = () => {
        btn.textContent = origText;
        btn.disabled = false;
        showToast('Connection error', 'error');
      };
      
      xhr.send(formData);
    } catch (err) {
      btn.textContent = origText;
      btn.disabled = false;
      showToast('An error occurred', 'error');
    }
  });

  // Calendar Logic
  let currentCalDate = new Date();
  
  const renderCalendarGrid = (entries) => {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    
    document.getElementById('cal-month-label').textContent = currentCalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // JS days are 0 (Sun) to 6 (Sat). We want Mon(0) to Sun(6).
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;
    
    const daysContainer = document.getElementById('cal-days');
    daysContainer.innerHTML = '';
    
    // Empty cells
    for (let i = 0; i < startDayOfWeek; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      daysContainer.appendChild(cell);
    }
    
    // Days
    const todayStr = new Date().toISOString().split('T')[0];
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entry = entries.find(e => e.date === dateStr || (e.created_at && e.created_at.startsWith(dateStr)));
      
      if (dateStr === todayStr) {
        cell.classList.add('today');
      }
      
      let html = `<div class="cal-num">${d}</div>`;
      
      if (entry) {
        cell.classList.add('has-entry');
        let icon = '';
        if (entry.mood === 'Serene') icon = '🌿';
        else if (entry.mood === 'Inspired') icon = '✨';
        else if (entry.mood === 'Cozy') icon = '☕';
        else if (entry.mood === 'Energetic') icon = '⚡';
        else if (entry.mood === 'Reflective') icon = '🕯️';
        else if (entry.mood === 'Heavy') icon = '🌧️';
        else icon = '📝';
        
        if (entry.type === 'voice') icon += '🎤';
        if (entry.type === 'snapshot') icon += '📷';
        
        html += `<div class="cal-mood">${icon}</div>`;
        
        cell.addEventListener('click', () => {
          const viewer = document.getElementById('entry-viewer');
          viewer.style.display = 'block';
          const entryDate = new Date(entry.created_at || dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          
          let contentHtml = '';
          const photoUrl = entry.gdrive_photo_id ? `/api/gdrive/stream/${entry.gdrive_photo_id}` : (entry.photo_path ? '/uploads/' + entry.photo_path : entry.file_url);
          const voiceUrl = entry.gdrive_voice_id ? `/api/gdrive/stream/${entry.gdrive_voice_id}` : (entry.voice_note_path ? '/uploads/' + entry.voice_note_path : entry.file_url);

          if (entry.entry_type === 'voice' || entry.type === 'voice' || entry.voice_note_path) {
            contentHtml = `
              <p style="margin-bottom:8px; font-weight:600;">🎤 Voice Note</p>
              <audio controls src="${voiceUrl}" style="width: 100%; margin-bottom:12px;"></audio>
              <p>${entry.content || ''}</p>
            `;
          } else if (entry.entry_type === 'snapshot' || entry.type === 'snapshot' || entry.photo_path) {
            contentHtml = `
              <img src="${photoUrl}" style="max-width: 100%; border-radius: var(--radius-sm); margin-bottom: 8px;">
              <p>${entry.content || ''}</p>
            `;
          } else {
            contentHtml = `<p>${entry.content || ''}</p>`;
          }
          
          viewer.innerHTML = `
            <div class="entry-viewer-date">${entryDate} ${icon}</div>
            <div class="entry-viewer-content">${contentHtml}</div>
          `;
        });
      }
      
      cell.innerHTML = html;
      daysContainer.appendChild(cell);
    }
  };

  const loadCalendar = async () => {
    try {
      const year = currentCalDate.getFullYear();
      const month = currentCalDate.getMonth() + 1; // 1-12
      const data = await apiGet(`/api/journal/month/${year}/${month}`);
      renderCalendarGrid(data || []);
    } catch (e) {
      console.error(e);
      renderCalendarGrid([]);
    }
  };

  document.getElementById('cal-prev').addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    document.getElementById('entry-viewer').style.display = 'none';
    loadCalendar();
  });
  
  document.getElementById('cal-next').addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    document.getElementById('entry-viewer').style.display = 'none';
    loadCalendar();
  });

  loadCalendar();
}
