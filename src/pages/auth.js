import { apiPost } from '../utils/api.js';
import { subscribeToPush } from '../utils/push.js';
import { showToast } from '../components/toast.js';

export function renderAuthPage() {
  document.getElementById('app').innerHTML = `
    <div class="auth-wrapper page">
      <div class="auth-orbs">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>
      
      <div class="auth-card glass" id="auth-card">
        <div class="auth-header">
          <div class="auth-logo">✦</div>
          <h1 id="auth-title">Welcome Back</h1>
          <p id="auth-subtitle">Sign in to access your memories.</p>
        </div>
        
        <form class="auth-form" id="auth-form">
          <div class="form-group" id="group-name" style="display:none;">
            <label for="input-name">Your Name</label>
            <input type="text" id="input-name" placeholder="Enter your name" autocomplete="name">
          </div>
          <div class="form-group" id="group-name-signin">
            <label for="input-name-signin">Your Name</label>
            <input type="text" id="input-name-signin" placeholder="Enter your name" autocomplete="name" required>
          </div>
          <div class="form-group">
            <p style="margin-bottom:8px; text-align:center; color:var(--text-secondary);">Enter 4-Digit PIN</p>
            <div class="pin-inputs">
              <input type="password" maxlength="1" class="pin-input" data-idx="0" inputmode="numeric" pattern="[0-9]" required>
              <input type="password" maxlength="1" class="pin-input" data-idx="1" inputmode="numeric" pattern="[0-9]" required>
              <input type="password" maxlength="1" class="pin-input" data-idx="2" inputmode="numeric" pattern="[0-9]" required>
              <input type="password" maxlength="1" class="pin-input" data-idx="3" inputmode="numeric" pattern="[0-9]" required>
            </div>
          </div>
          <button type="submit" class="btn-primary" style="width: 100%; justify-content:center;" id="btn-submit">Sign In</button>
        </form>
        
        <div class="auth-switch">
          <span id="switch-text">Don't have an account?</span> <a id="switch-btn" href="javascript:void(0)">Sign Up</a>
        </div>
      </div>
    </div>
  `;
  
  let isSignUp = false;
  
  const card = document.getElementById('auth-card');
  const form = document.getElementById('auth-form');
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const btnSubmit = document.getElementById('btn-submit');
  const groupName = document.getElementById('group-name');
  const groupNameSignin = document.getElementById('group-name-signin');
  const inputName = document.getElementById('input-name');
  const inputNameSignin = document.getElementById('input-name-signin');
  const switchText = document.getElementById('switch-text');
  const switchBtn = document.getElementById('switch-btn');
  const pinInputs = Array.from(document.querySelectorAll('.pin-input'));
  
  // PIN input auto-advance logic
  pinInputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = val;
      if (val.length === 1 && idx < 3) {
        pinInputs[idx + 1].focus();
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && e.target.value === '' && idx > 0) {
        pinInputs[idx - 1].focus();
      }
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 4);
      pasted.split('').forEach((char, i) => {
        if (pinInputs[i]) pinInputs[i].value = char;
      });
      if (pasted.length > 0) {
        pinInputs[Math.min(pasted.length, 3)].focus();
      }
    });
  });
  
  // Toggle Sign In / Sign Up
  switchBtn.addEventListener('click', () => {
    isSignUp = !isSignUp;
    card.classList.remove('shake');
    void card.offsetWidth;
    
    if (isSignUp) {
      title.textContent = 'Create Account';
      subtitle.textContent = 'Start saving your memories today.';
      btnSubmit.textContent = 'Sign Up';
      groupName.style.display = 'block';
      inputName.required = true;
      groupNameSignin.style.display = 'none';
      inputNameSignin.required = false;
      switchText.textContent = 'Already have an account?';
      switchBtn.textContent = 'Sign In';
    } else {
      title.textContent = 'Welcome Back';
      subtitle.textContent = 'Sign in to access your memories.';
      btnSubmit.textContent = 'Sign In';
      groupName.style.display = 'none';
      inputName.required = false;
      groupNameSignin.style.display = 'block';
      inputNameSignin.required = true;
      switchText.textContent = "Don't have an account?";
      switchBtn.textContent = 'Sign Up';
    }
    pinInputs.forEach(i => i.value = '');
    if (isSignUp) inputName.focus();
    else inputNameSignin.focus();
  });
  
  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = pinInputs.map(i => i.value).join('');
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      showToast('Please enter a 4-digit PIN', 'error');
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 500);
      return;
    }
    
    const name = isSignUp ? inputName.value.trim() : inputNameSignin.value.trim();
    if (!name) {
      showToast('Please enter your name', 'error');
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 500);
      return;
    }
    
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="btn-loading">●●●</span>';
    
    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/signin';
      const user = await apiPost(endpoint, { name, pin });
      
      // Server sets HTTP-only session cookie automatically
      // Store user info for UI display
      localStorage.setItem('user', JSON.stringify(user));
      window.setCurrentUser(user);
      
      showToast(isSignUp ? 'Account created! 🎉' : 'Welcome back! 👋', 'success');
      
      subscribeToPush().catch(() => {});
      
      window.location.hash = '#/dashboard';
    } catch (error) {
      card.classList.add('shake');
      showToast(error.message, 'error');
      setTimeout(() => card.classList.remove('shake'), 500);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    }
  });
}
