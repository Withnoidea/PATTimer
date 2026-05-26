// PTA Timer - Content Script
// Ultra-Compact Floating Timer Widget
// Focus Precision Design System v2.0

let timerDisplay = null;
let currentProblemId = null;
let isFixed = false;
let isPaused = false;
let countdownData = null;
let countdownPauseTime = 0;
let timerPauseTime = 0;
let timerPauseOffset = 0;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let isExamMode = false; // 考试模式标志
let examStartTime = null; // 考试开始时间
let timerCompleted = false;
let lastDetectedUrl = null;
let routeObserver = null;
let routeCheckInterval = null;
let routeDetectionTimer = null;
let submissionResultObserver = null;
let submissionResultCheckTimer = null;
let timerDisplayUpdateTimer = null;

// ============================================
// Initialization
// ============================================
function init() {
  chrome.storage.local.get(['timerFixed', 'timerPosition'], (result) => {
    if (result.timerFixed !== undefined) {
      isFixed = result.timerFixed;
    }

    detectProblemPage();

    setTimeout(() => {
      if (timerDisplay && result.timerPosition && !isFixed) {
        timerDisplay.style.left = result.timerPosition.x + 'px';
        timerDisplay.style.top = result.timerPosition.y + 'px';
        timerDisplay.style.right = 'auto';
      }
    }, 100);
  });

  isPaused = false;
  timerPauseTime = 0;
  timerPauseOffset = 0;
  countdownPauseTime = 0;

  startRouteDetection();
}

// ============================================
// Message Listener
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startCountdown') {
    startCountdown(request.duration);
    sendResponse({ success: true });
  } else if (request.action === 'togglePlayPause') {
    togglePlayPause();
    sendResponse({ success: true });
  } else if (request.action === 'syncPauseState') {
    syncPauseState(request.isPaused);
    sendResponse({ success: true });
  } else if (request.action === 'resetTimer') {
    resetTimer();
    sendResponse({ success: true });
  }
});

// ============================================
// Page Detection
// ============================================
function detectProblemPage() {
  const url = window.location.href;
  lastDetectedUrl = url;

  // 检测考试模式：URL 包含 /exam/ 或 /exams/
  const wasExamMode = isExamMode;
  isExamMode = /\/exams?\//.test(url);

  // 考试模式状态变化时，保存到 storage 供 popup 读取
  if (isExamMode !== wasExamMode) {
    chrome.storage.local.set({ isExamMode: isExamMode });

    if (isExamMode && !examStartTime) {
      // 进入考试模式，记录考试开始时间
      chrome.storage.local.get(['examStartTime'], (result) => {
        if (result.examStartTime) {
          examStartTime = result.examStartTime;
        } else {
          examStartTime = Date.now();
          chrome.storage.local.set({ examStartTime: examStartTime });
        }
      });
    }
  }

  const problemId = extractProblemId(url);
  if (problemId) {
    if (problemId !== currentProblemId) {
      currentProblemId = problemId;
      timerCompleted = false;
      resetLocalTimerState();
      startProblemTimer(problemId);
      createTimerDisplay();
    }

    startSubmissionResultWatcher();
    checkSubmissionResult();
  } else {
    stopSubmissionResultWatcher();
    if (currentProblemId) {
      stopProblemTimer();
      currentProblemId = null;
      timerCompleted = false;
    }
    if (timerDisplay) {
      timerDisplay.style.display = 'none';
    }
  }
}

function extractProblemId(url) {
  const parsedUrl = new URL(url);
  const problemSetProblemId = parsedUrl.searchParams.get('problemSetProblemId');
  if (problemSetProblemId) {
    return problemSetProblemId;
  }

  if (/\/exams?\//.test(parsedUrl.pathname)) {
    return null;
  }

  const pathMatch = parsedUrl.pathname.match(/\/problems\/([^\/\?]+)/);
  return pathMatch ? pathMatch[1] : null;
}

function startRouteDetection() {
  if (!routeObserver) {
    routeObserver = new MutationObserver(scheduleRouteDetection);
    routeObserver.observe(document.body, {
      childList: true
    });
  }

  if (!routeCheckInterval) {
    routeCheckInterval = setInterval(scheduleRouteDetection, 1000);
  }
}

function scheduleRouteDetection() {
  if (routeDetectionTimer || window.location.href === lastDetectedUrl) {
    return;
  }

  routeDetectionTimer = setTimeout(() => {
    routeDetectionTimer = null;
    if (window.location.href !== lastDetectedUrl) {
      detectProblemPage();
    }
  }, 200);
}

function startSubmissionResultWatcher() {
  if (submissionResultObserver || timerCompleted) {
    return;
  }

  submissionResultObserver = new MutationObserver(scheduleSubmissionResultCheck);
  submissionResultObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function stopSubmissionResultWatcher() {
  if (submissionResultObserver) {
    submissionResultObserver.disconnect();
    submissionResultObserver = null;
  }

  if (submissionResultCheckTimer) {
    clearTimeout(submissionResultCheckTimer);
    submissionResultCheckTimer = null;
  }
}

function scheduleSubmissionResultCheck() {
  if (submissionResultCheckTimer || timerCompleted) {
    return;
  }

  submissionResultCheckTimer = setTimeout(() => {
    submissionResultCheckTimer = null;
    checkSubmissionResult();
  }, 500);
}

function checkSubmissionResult() {
  if (timerCompleted || !isFullAcceptedSubmissionVisible()) {
    return;
  }

  timerCompleted = true;
  stopSubmissionResultWatcher();
  stopProblemTimer();
  markTimerAsCompleted();
}

function isFullAcceptedSubmissionVisible() {
  const modalBodies = document.querySelectorAll('[data-e2e="modal-body"]');
  for (const body of modalBodies) {
    const modal = body.closest('[data-e2e="modal-mask"], .pc-modal') || body;
    const title = modal.querySelector('.title_H10HL, [class*="title_"]');
    if (!title || !title.textContent.includes('提交结果')) {
      continue;
    }

    const text = body.textContent;
    if (!text.includes('答案正确')) {
      continue;
    }

    const scoreMatch = text.match(/分数\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    if (scoreMatch && Number(scoreMatch[1]) === Number(scoreMatch[2])) {
      return true;
    }
  }

  return false;
}

function resetLocalTimerState() {
  isPaused = false;
  timerPauseTime = 0;
  timerPauseOffset = 0;
  countdownData = null;
  countdownPauseTime = 0;
  chrome.storage.local.remove(['countdownData']);
}

function markTimerAsCompleted() {
  isPaused = true;
  countdownData = null;
  chrome.storage.local.remove(['countdownData']);

  const btn = document.getElementById('pta-play-pause');
  const icon = btn && btn.querySelector('.material-symbols-outlined');
  const statusDot = document.getElementById('pta-status-dot');
  const modeLabel = document.getElementById('pta-mode-label');

  if (icon) icon.textContent = 'check';
  if (btn) btn.title = '已完成';
  if (statusDot) statusDot.classList.add('paused');
  if (modeLabel) {
    modeLabel.textContent = 'DONE';
    modeLabel.style.color = '#16a34a';
  }
}

// ============================================
// Timer Control
// ============================================
function startProblemTimer(problemId) {
  chrome.runtime.sendMessage({
    action: 'startTimer',
    problemId: problemId,
    problemName: getProblemName()
  });
}

function stopProblemTimer() {
  chrome.runtime.sendMessage({
    action: 'stopTimer'
  });
}

function getProblemName() {
  const title = document.querySelector('.text-darkest.font-bold.text-lg, h1, [class*="problem"] h1');
  const text = title?.textContent?.trim();
  return text || currentProblemId || '未知题目';
}

function getElapsedTime(timerData) {
  if (!timerData?.currentSession) return 0;
  const now = timerData.isPaused && timerData.pauseStartTime ? timerData.pauseStartTime : Date.now();
  return Math.max(0, now - timerData.currentSession.startTime - (timerData.pausedDuration || 0));
}

function renderPlayPauseState(paused) {
  const btn = document.getElementById('pta-play-pause');
  const icon = btn && btn.querySelector('.material-symbols-outlined');
  const statusDot = document.getElementById('pta-status-dot');
  const modeLabel = document.getElementById('pta-mode-label');

  isPaused = paused;
  if (icon) icon.textContent = paused ? 'play_arrow' : 'pause';
  if (btn) btn.title = paused ? '继续' : '暂停';
  if (statusDot) statusDot.classList.toggle('paused', paused);
  if (modeLabel && !timerCompleted) {
    modeLabel.textContent = paused ? 'PAUSED' : (countdownData && countdownData.isRunning ? 'COUNTDOWN' : 'FOCUS');
    modeLabel.style.color = paused ? '#d97706' : '';
  }
}

// ============================================
// UI Creation - Ultra Compact Widget
// ============================================
function createTimerDisplay() {
  if (timerDisplay) {
    timerDisplay.remove();
  }

  // Load Material Symbols font
  if (!document.querySelector('link[href*="Material+Symbols+Outlined"]')) {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
    document.head.appendChild(fontLink);
  }

  // Load Inter & JetBrains Mono
  if (!document.querySelector('link[href*="JetBrains+Mono"]')) {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap';
    document.head.appendChild(fontLink);
  }

  timerDisplay = document.createElement('div');
  timerDisplay.id = 'pta-timer-display';

  const shortId = currentProblemId ? currentProblemId.substring(0, 7) : '---';
  const examBadgeHtml = isExamMode ? '<span class="timer-exam-badge">EXAM</span>' : '';

  timerDisplay.innerHTML = `
    <!-- Left Branding -->
    <div class="timer-brand">
      <div class="timer-brand-info">
        <div class="timer-brand-row">
          <div class="timer-status-dot" id="pta-status-dot"></div>
          <span class="timer-brand-label">PTA</span>
          ${examBadgeHtml}
        </div>
        <div class="timer-problem-id">
          <span id="pta-problem-label">${shortId}</span>
          <span>•</span>
          <span class="timer-problem-mode" id="pta-mode-label">${isExamMode ? 'EXAM' : 'FOCUS'}</span>
        </div>
      </div>
    </div>

    <!-- Central Display -->
    <div class="timer-center">
      <span class="timer-time-display" id="pta-current-time">00:00:00</span>
      <div class="timer-divider"></div>
      <div class="timer-controls-cluster">
        <button class="timer-ctrl-btn btn-play-pause" id="pta-play-pause" title="暂停">
          <span class="material-symbols-outlined">pause</span>
        </button>
        <button class="timer-ctrl-btn btn-reset" id="pta-reset" title="重置">
          <span class="material-symbols-outlined">replay</span>
        </button>
        <button class="timer-ctrl-btn btn-countdown" id="pta-countdown" title="倒计时">
          <span class="material-symbols-outlined">timer</span>
        </button>
      </div>
      <div class="timer-progress-bar">
        <div class="timer-progress-fill" id="pta-progress-fill"></div>
      </div>
    </div>

    <!-- Right Actions -->
    <div class="timer-actions">
      <button class="timer-action-btn ${isFixed ? 'pinned' : ''}" id="pta-fix-toggle" title="${isFixed ? '取消固定' : '固定'}">
        <span class="material-symbols-outlined">push_pin</span>
      </button>
      <button class="timer-action-btn" id="pta-timer-close" title="关闭">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
  `;

  document.body.appendChild(timerDisplay);

  // Apply fixed state
  if (isFixed) {
    timerDisplay.classList.add('fixed');
  } else {
    addDragFunctionality();
  }

  // Bind events
  bindEvents();

  // Start display update loop
  if (timerDisplayUpdateTimer) {
    clearTimeout(timerDisplayUpdateTimer);
    timerDisplayUpdateTimer = null;
  }
  updateTimerDisplay();
}

// ============================================
// Event Binding
// ============================================
function bindEvents() {
  document.getElementById('pta-timer-close').addEventListener('click', (e) => {
    e.stopPropagation();
    timerDisplay.style.display = 'none';
  });

  document.getElementById('pta-fix-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFix();
  });

  document.getElementById('pta-play-pause').addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause();
  });

  document.getElementById('pta-reset').addEventListener('click', (e) => {
    e.stopPropagation();
    resetTimer();
  });

  document.getElementById('pta-countdown').addEventListener('click', (e) => {
    e.stopPropagation();
    showCountdownDialog();
  });
}

// ============================================
// Drag Functionality
// ============================================
function addDragFunctionality() {
  if (!timerDisplay) return;

  timerDisplay.addEventListener('mousedown', (e) => {
    if (isFixed) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

    isDragging = true;
    const rect = timerDisplay.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    timerDisplay.style.transition = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || isFixed) return;

    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    const maxX = window.innerWidth - timerDisplay.offsetWidth;
    const maxY = window.innerHeight - timerDisplay.offsetHeight;

    timerDisplay.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    timerDisplay.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    timerDisplay.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      timerDisplay.style.transition = '';

      const rect = timerDisplay.getBoundingClientRect();
      chrome.storage.local.set({
        timerPosition: { x: rect.left, y: rect.top }
      });
    }
  });
}

// ============================================
// Toggle Fix
// ============================================
function toggleFix() {
  isFixed = !isFixed;
  const fixBtn = document.getElementById('pta-fix-toggle');

  if (isFixed) {
    fixBtn.classList.add('pinned');
    fixBtn.title = '取消固定';
    timerDisplay.classList.add('fixed');
  } else {
    fixBtn.classList.remove('pinned');
    fixBtn.title = '固定';
    timerDisplay.classList.remove('fixed');
    addDragFunctionality();
  }

  chrome.storage.local.set({ timerFixed: isFixed });
}

// ============================================
// Play/Pause
// ============================================
function togglePlayPause() {
  if (timerCompleted) return;

  chrome.runtime.sendMessage({ action: 'togglePauseTimer' }, (response) => {
    if (chrome.runtime.lastError || !response?.success) return;
    syncPauseState(response.timerData.isPaused);
  });
}

function syncPauseState(paused) {
  renderPlayPauseState(paused);

  if (paused) {
    if (countdownData && countdownData.isRunning) {
      countdownPauseTime = Date.now();
    }
  } else if (countdownData && countdownData.isRunning && countdownPauseTime > 0) {
    const pauseDuration = Date.now() - countdownPauseTime;
    countdownData.startTime += pauseDuration;
    countdownPauseTime = 0;
    chrome.storage.local.set({ countdownData: countdownData });
  }
}

// ============================================
// Reset Timer
// ============================================
function resetTimer() {
  chrome.runtime.sendMessage({ action: 'stopTimer' });

  timerCompleted = false;
  startSubmissionResultWatcher();
  isPaused = false;
  timerPauseTime = 0;
  timerPauseOffset = 0;
  countdownData = null;
  countdownPauseTime = 0;
  chrome.storage.local.remove(['countdownData']);

  const btn = document.getElementById('pta-play-pause');
  const icon = btn.querySelector('.material-symbols-outlined');
  icon.textContent = 'pause';
  btn.title = '暂停';

  const statusDot = document.getElementById('pta-status-dot');
  statusDot.classList.remove('paused');

  const modeLabel = document.getElementById('pta-mode-label');
  modeLabel.textContent = 'FOCUS';
  modeLabel.style.color = '';

  const timeDisplay = document.getElementById('pta-current-time');
  timeDisplay.textContent = '00:00:00';
  timeDisplay.classList.remove('warning', 'danger');

  const progressFill = document.getElementById('pta-progress-fill');
  progressFill.style.width = '0%';
  progressFill.classList.remove('warning', 'danger');

  if (currentProblemId) {
    startProblemTimer(currentProblemId);
  }
}

// ============================================
// Countdown Dialog
// ============================================
function showCountdownDialog() {
  // Remove existing dialog
  const existing = document.querySelector('.timer-countdown-dialog');
  if (existing) existing.remove();

  const dialog = document.createElement('div');
  dialog.className = 'timer-countdown-dialog';
  dialog.innerHTML = `
    <div class="timer-countdown-panel">
      <h3>设置倒计时</h3>
      <input type="number" id="pta-countdown-input" placeholder="输入分钟数" min="1" max="999" autofocus>
      <div class="timer-countdown-actions">
        <button class="btn-cancel" id="pta-countdown-cancel">取消</button>
        <button class="btn-confirm" id="pta-countdown-confirm">开始</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  const input = document.getElementById('pta-countdown-input');
  const confirmBtn = document.getElementById('pta-countdown-confirm');
  const cancelBtn = document.getElementById('pta-countdown-cancel');

  setTimeout(() => input.focus(), 100);

  confirmBtn.addEventListener('click', () => {
    const value = parseInt(input.value);
    if (value && value > 0) {
      startCountdown(value);
      dialog.remove();
    } else {
      input.style.borderColor = '#ab0b1c';
      setTimeout(() => { input.style.borderColor = ''; }, 1500);
    }
  });

  cancelBtn.addEventListener('click', () => dialog.remove());

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.remove();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmBtn.click();
    if (e.key === 'Escape') dialog.remove();
  });
}

// ============================================
// Countdown Logic
// ============================================
function startCountdown(minutes) {
  countdownData = {
    duration: minutes * 60 * 1000,
    startTime: Date.now(),
    isRunning: true
  };

  isPaused = false;
  countdownPauseTime = 0;
  timerPauseTime = 0;
  timerPauseOffset = 0;

  const btn = document.getElementById('pta-play-pause');
  const icon = btn.querySelector('.material-symbols-outlined');
  icon.textContent = 'pause';
  btn.title = '暂停';

  const modeLabel = document.getElementById('pta-mode-label');
  modeLabel.textContent = 'COUNTDOWN';

  chrome.storage.local.set({ countdownData: countdownData });
}

// ============================================
// Display Update Loop
// ============================================
function updateTimerDisplay() {
  if (!timerDisplay || timerDisplay.style.display === 'none') {
    timerDisplayUpdateTimer = setTimeout(updateTimerDisplay, 1000);
    return;
  }

  updateCountdownDisplay();

  if (!countdownData || !countdownData.isRunning) {
    chrome.runtime.sendMessage({ action: 'getTimerData' }, (timerData) => {
      if (chrome.runtime.lastError) return;
      if (timerData && timerData.isRunning && timerData.currentSession) {
        const problemName = getProblemName();
        if (problemName && problemName !== currentProblemId && problemName !== timerData.currentSession.problemName) {
          chrome.runtime.sendMessage({
            action: 'startTimer',
            problemId: currentProblemId,
            problemName: problemName
          });
        }

        renderPlayPauseState(timerData.isPaused);
        const timeEl = document.getElementById('pta-current-time');
        if (timeEl) {
          timeEl.textContent = formatTime(getElapsedTime(timerData));
        }
      }
    });
  }

  timerDisplayUpdateTimer = setTimeout(updateTimerDisplay, 1000);
}

function updateCountdownDisplay() {
  if (!countdownData || !countdownData.isRunning) {
    chrome.storage.local.get(['countdownData'], (result) => {
      if (result.countdownData && result.countdownData.isRunning) {
        countdownData = result.countdownData;
        updateCountdownDisplay();
      }
    });
    return;
  }

  let elapsed;
  if (isPaused && countdownPauseTime > 0) {
    elapsed = countdownPauseTime - countdownData.startTime;
  } else {
    elapsed = Date.now() - countdownData.startTime;
  }

  const remaining = Math.max(0, countdownData.duration - elapsed);
  const timeDisplay = document.getElementById('pta-current-time');
  const progressFill = document.getElementById('pta-progress-fill');

  if (remaining <= 0) {
    countdownData.isRunning = false;

    if (Notification.permission === 'granted') {
      new Notification('PTA Timer', {
        body: '倒计时结束！',
        icon: chrome.runtime.getURL('icons/icon48.png')
      });
    } else {
      alert('倒计时结束！');
    }

    chrome.storage.local.remove(['countdownData']);
    isPaused = false;
    countdownPauseTime = 0;

    if (timeDisplay) {
      timeDisplay.classList.remove('warning', 'danger');
    }
    if (progressFill) {
      progressFill.style.width = '100%';
      progressFill.classList.remove('warning', 'danger');
    }

    const modeLabel = document.getElementById('pta-mode-label');
    if (modeLabel) modeLabel.textContent = 'FOCUS';
  } else {
    if (timeDisplay) {
      timeDisplay.textContent = formatCountdownTime(remaining);

      const minutes = Math.floor(remaining / 60000);
      timeDisplay.classList.remove('warning', 'danger');
      if (minutes <= 5) {
        timeDisplay.classList.add('danger');
      } else if (minutes <= 10) {
        timeDisplay.classList.add('warning');
      }
    }

    // Update progress bar
    if (progressFill) {
      const progress = ((countdownData.duration - remaining) / countdownData.duration) * 100;
      progressFill.style.width = progress + '%';

      const minutes = Math.floor(remaining / 60000);
      progressFill.classList.remove('warning', 'danger');
      if (minutes <= 5) {
        progressFill.classList.add('danger');
      } else if (minutes <= 10) {
        progressFill.classList.add('warning');
      }
    }
  }
}

// ============================================
// Utility Functions
// ============================================
function formatCountdownTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatTime(ms) {
  if (!ms || ms < 0) return '00:00:00';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

// ============================================
// Bootstrap
// ============================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
