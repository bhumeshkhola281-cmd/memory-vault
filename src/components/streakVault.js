export function renderStreakVault(streak) {
  if (!streak) return '';
  
  const { current = 0, longest = 0, vaultLevel = 'empty', vaultLabel = 'Empty Box', graceDaysRemaining = 0 } = streak;
  
  const icons = {
    empty: '📦',
    tin: '🗄️',
    wooden: '🧰',
    leather: '👝',
    gilded: '✨',
    room: '🏛️',
    walkin: '🔐',
    grand: '👑'
  };

  const icon = icons[vaultLevel] || '📦';
  
  let graceHtml = '';
  if (graceDaysRemaining > 0) {
    graceHtml = `<div class="streak-grace">${graceDaysRemaining} grace days remaining this month</div>`;
  }

  return `
    <div class="streak-card glass">
      <div class="streak-icon level-${vaultLevel}">${icon}</div>
      <div class="streak-info">
        <div class="streak-count">${current} Day Streak</div>
        <div class="streak-label">${vaultLabel} Vault (Longest: ${longest})</div>
        <div class="streak-identity">You're someone who shows up for your own story</div>
        ${graceHtml}
      </div>
    </div>
  `;
}
