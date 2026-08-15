export function showVaultAnimation(onComplete) {
  const overlay = document.createElement('div');
  overlay.className = 'vault-overlay';
  
  overlay.innerHTML = `
    <style>
      .vault-overlay {
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.5s ease;
        perspective: 1000px;
      }
      .vault-dial {
        width: 160px;
        height: 160px;
        border: 12px solid #555;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        color: white;
        background: #222;
        box-shadow: 0 0 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.8);
        transition: opacity 0.5s ease;
        position: relative;
      }
      .vault-dial::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: repeating-conic-gradient(from 0deg, transparent 0deg 10deg, rgba(255,255,255,0.1) 10deg 12deg);
      }
      .dial-spinning {
        animation: spin 2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(1080deg); }
      }
      .vault-door {
        position: absolute;
        width: 320px;
        height: 420px;
        background: #2a2a2a;
        border: 8px solid #444;
        border-radius: 12px;
        display: none;
        transform-origin: left center;
        transition: transform 1s ease-in-out;
        box-shadow: inset 0 0 50px rgba(0,0,0,0.9);
      }
      .vault-door.open {
        transform: rotateY(-105deg);
      }
      .vault-interior {
        position: absolute;
        width: 320px;
        height: 420px;
        background: #111;
        border: 8px solid #333;
        border-radius: 12px;
        display: none;
        box-shadow: inset 0 0 100px rgba(0,0,0,1);
      }
    </style>
    <div class="vault-interior" id="vault-interior"></div>
    <div class="vault-door" id="vault-door"></div>
    <div class="vault-dial dial-spinning" id="vault-dial">
      <span id="vault-number" style="z-index: 1;">3</span>
    </div>
  `;
  document.body.appendChild(overlay);

  const numberEl = overlay.querySelector('#vault-number');
  const dial = overlay.querySelector('#vault-dial');
  const door = overlay.querySelector('#vault-door');
  const interior = overlay.querySelector('#vault-interior');

  let start = null;
  const numbers = ['3', '7', '9'];
  
  function step(timestamp) {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    
    if (progress < 600) {
      numberEl.textContent = numbers[0];
    } else if (progress < 1200) {
      numberEl.textContent = numbers[1];
    } else {
      numberEl.textContent = numbers[2];
    }

    if (progress < 2000) {
      requestAnimationFrame(step);
    } else {
      dial.style.opacity = '0';
      setTimeout(() => {
        dial.style.display = 'none';
        interior.style.display = 'block';
        door.style.display = 'block';
        
        void door.offsetWidth; // trigger reflow
        door.classList.add('open');
        
        setTimeout(() => {
          overlay.style.opacity = '0';
          setTimeout(() => {
            if (document.body.contains(overlay)) {
              document.body.removeChild(overlay);
            }
            if (onComplete) onComplete();
          }, 500);
        }, 1000);
      }, 500);
    }
  }

  requestAnimationFrame(step);
}
