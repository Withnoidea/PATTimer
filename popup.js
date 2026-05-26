// PTA Timer - Popup Script
// Multi-View: Timer, Exam List, Exam Problems, Exam Mode, Settings

document.addEventListener('DOMContentLoaded', function () {
  // ============================================
  // State
  // ============================================
  let currentView = 'timer';
  let countdownVisible = false;
  let examData = []; // Loaded exam sessions
  let currentExam = null; // Currently selected exam
  let activeCustomExam = null;
  let currentProblemIndex = 0; // Current problem in exam mode
  let pendingConfirmAction = null;
  let selectedProblemIds = new Set();
  let customExamSelectionMode = false;

  // ============================================
  // Views
  // ============================================
  const views = {
    timer: document.getElementById('view-timer'),
    examList: document.getElementById('view-exam-list'),
    examProblems: document.getElementById('view-exam-problems'),
    examMode: document.getElementById('view-exam-mode'),
    settings: document.getElementById('view-settings')
  };

  // ============================================
  // DOM References - Timer View
  // ============================================
  const timerValue = document.getElementById('timer-value');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const resetBtn = document.getElementById('reset-btn');
  const countdownBtn = document.getElementById('countdown-btn');
  const countdownInputSection = document.getElementById('countdown-input-section');
  const countdownInput = document.getElementById('countdown-input');
  const startCountdownBtn = document.getElementById('start-countdown-btn');
  const cancelCountdownBtn = document.getElementById('cancel-countdown-btn');
  const sessionsList = document.getElementById('sessions-list');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const navExamsBtn = document.getElementById('nav-exams-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const confirmOverlay = document.getElementById('delete-confirm-overlay');
  const confirmCancel = document.getElementById('delete-confirm-cancel');
  const confirmOk = document.getElementById('delete-confirm-ok');
  const confirmTitle = document.getElementById('delete-confirm-title');
  const confirmMessage = document.querySelector('.confirm-message');
  const confirmIcon = document.querySelector('.confirm-icon .material-symbols-outlined');

  // DOM References - Exam List View
  const examListBackBtn = document.getElementById('exam-list-back-btn');
  const examSearchInput = document.getElementById('exam-search-input');
  const examListScroll = document.getElementById('exam-list-scroll');
  const returnTimerBtn = document.getElementById('return-timer-btn');
  const loadCurrentPageProblemsBtn = document.getElementById('load-current-page-problems-btn');

  // DOM References - Exam Problems View
  const backToExamsBtn = document.getElementById('back-to-exams-btn');
  const examTitle = document.getElementById('exam-title');
  const examStatusBadge = document.getElementById('exam-status-badge');
  const examDurationText = document.getElementById('exam-duration-text');
  const examDurationMeta = examDurationText?.closest('.exam-duration');
  const problemList = document.getElementById('problem-list');
  const customExamToolbar = document.getElementById('custom-exam-toolbar');
  const customExamCount = document.getElementById('custom-exam-count');
  const customExamDurationInput = document.getElementById('custom-exam-duration-input');
  const selectAllProblemsBtn = document.getElementById('select-all-problems-btn');
  const createCustomExamBtn = document.getElementById('create-custom-exam-btn');
  const deleteCustomExamBtn = document.getElementById('delete-custom-exam-btn');
  const progressValue = document.getElementById('progress-value');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressPercent = document.getElementById('progress-percent');

  // DOM References - Exam Mode View
  const examGlobalTimer = document.getElementById('exam-global-timer');
  const examGlobalProgress = document.getElementById('exam-global-progress');
  const examProblemIndex = document.getElementById('exam-problem-index');
  const examProblemName = document.getElementById('exam-problem-name');
  const examProblemDifficulty = document.getElementById('exam-problem-difficulty');
  const examTimerValue = document.getElementById('exam-timer-value');
  const examPlayPauseBtn = document.getElementById('exam-play-pause-btn');
  const examResetBtn = document.getElementById('exam-reset-btn');
  const examPrevBtn = document.getElementById('exam-prev-btn');
  const examNextBtn = document.getElementById('exam-next-btn');
  const examSubmitBtn = document.getElementById('exam-submit-btn');
  const examCancelBtn = document.getElementById('exam-cancel-btn');
  const examModeCloseBtn = document.getElementById('exam-mode-close-btn');

  // DOM References - Settings View
  const settingsBackBtn = document.getElementById('settings-back-btn');
  const clearDataBtn = document.getElementById('clear-data-btn');
  const autoStartToggle = document.getElementById('auto-start-toggle');
  const notificationToggle = document.getElementById('notification-toggle');

  // ============================================
  // Initialize
  // ============================================
  loadSettings();
  loadExamData();
  updateTimerDisplay();
  setInterval(updateTimerDisplay, 1000);
  checkExamMode();

  // ============================================
  // Navigation Events
  // ============================================
  navExamsBtn.addEventListener('click', () => switchView('examList'));
  settingsBtn.addEventListener('click', () => switchView('settings'));
  examListBackBtn.addEventListener('click', () => switchView('timer'));
  returnTimerBtn.addEventListener('click', () => switchView('timer'));
  loadCurrentPageProblemsBtn.addEventListener('click', loadCurrentPageProblems);
  backToExamsBtn.addEventListener('click', () => switchView('examList'));
  settingsBackBtn.addEventListener('click', () => switchView('timer'));
  examModeCloseBtn.addEventListener('click', () => switchView('examList'));

  // Timer View Events
  playPauseBtn?.addEventListener('click', togglePlayPause);
  resetBtn?.addEventListener('click', resetTimer);
  countdownBtn?.addEventListener('click', toggleCountdownInput);
  startCountdownBtn?.addEventListener('click', startCountdown);
  cancelCountdownBtn?.addEventListener('click', () => {
    countdownInputSection.style.display = 'none';
  });
  countdownInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startCountdown();
  });

  // Exam Mode Events
  examPlayPauseBtn.addEventListener('click', togglePlayPause);
  examResetBtn.addEventListener('click', resetTimer);
  examPrevBtn.addEventListener('click', () => navigateProblem(-1));
  examNextBtn.addEventListener('click', () => navigateProblem(1));
  examSubmitBtn.addEventListener('click', submitExam);
  examCancelBtn.addEventListener('click', confirmDeleteCustomExam);

  // Settings Events
  autoStartToggle.addEventListener('change', saveSettings);
  notificationToggle.addEventListener('change', saveSettings);
  clearDataBtn.addEventListener('click', clearData);
  confirmCancel.addEventListener('click', closeConfirm);
  confirmOk.addEventListener('click', confirmPendingAction);
  confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) closeConfirm();
  });

  selectAllProblemsBtn.addEventListener('click', toggleSelectAllProblems);
  createCustomExamBtn.addEventListener('click', confirmCreateCustomExam);
  deleteCustomExamBtn.addEventListener('click', confirmDeleteCustomExam);

  // Search
  examSearchInput.addEventListener('input', renderExamList);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.activeCustomExam) {
      activeCustomExam = changes.activeCustomExam.newValue || null;
      currentExam = activeCustomExam || currentExam;
      if (currentView === 'examList') {
        renderExamList();
      }
      if (currentView === 'examProblems') {
        renderExamProblems();
      }
    }
  });

  // ============================================
  // Settings
  // ============================================
  function loadSettings() {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = {
        autoStart: result.settings?.autoStart !== false,
        notifications: result.settings?.notifications !== false
      };
      autoStartToggle.checked = settings.autoStart;
      notificationToggle.checked = settings.notifications;
    });
  }

  function saveSettings() {
    chrome.storage.local.set({
      settings: {
        autoStart: autoStartToggle.checked,
        notifications: notificationToggle.checked
      }
    });
  }

  // ============================================
  // View Switching
  // ============================================
  function switchView(view) {
    currentView = view;
    Object.values(views).forEach(v => v.style.display = 'none');

    switch (view) {
      case 'timer':
        views.timer.style.display = 'flex';
        break;
      case 'examList':
        views.examList.style.display = 'flex';
        renderExamList();
        break;
      case 'examProblems':
        views.examProblems.style.display = 'flex';
        renderExamProblems();
        break;
      case 'examMode':
        views.examMode.style.display = 'flex';
        updateExamModeDisplay();
        break;
      case 'settings':
        views.settings.style.display = 'flex';
        break;
    }
  }

  // ============================================
  // Check if we should show exam mode
  // ============================================
  function checkExamMode() {
    chrome.storage.local.get(['activeCustomExam', 'isExamMode', 'currentExam', 'currentProblemIndex'], (result) => {
      activeCustomExam = result.activeCustomExam || null;
      const storedExam = activeCustomExam || result.currentExam;
      if (result.isExamMode && storedExam) {
        currentExam = storedExam;
        currentProblemIndex = storedExam.currentProblemIndex || result.currentProblemIndex || 0;
        switchView('examMode');
      }
    });
  }

  // ============================================
  // Timer Display Update
  // ============================================
  function updateTimerDisplay() {
    chrome.runtime.sendMessage({ action: 'getTimerData' }, (timerData) => {
      if (chrome.runtime.lastError || !timerData) {
        statusDot.classList.remove('connected');
        statusText.textContent = '未连接';
        return;
      }

      statusDot.classList.add('connected');
      statusText.textContent = '已连接';

      if (timerData.isRunning && timerData.currentSession) {
        const currentTime = getElapsedTime(timerData);
        const timeStr = formatTime(currentTime);
        if (timerValue) timerValue.textContent = timeStr;
        updateExamProblemTimer(timerData);
        updatePlayPauseIcons(timerData.isPaused);
      } else if (currentView === 'examMode') {
        updateExamProblemTimer(timerData);
        updatePlayPauseIcons(false);
      } else if (currentView === 'timer') {
        if (timerValue) {
          timerValue.textContent = '00:00:00';
          timerValue.classList.remove('warning', 'danger');
        }
        updatePlayPauseIcons(false);
      }

      updateSessionsList(timerData.sessions || []);
    });

    updateCountdownDisplay();
    if (currentView === 'examMode') updateExamGlobalTimer();
  }

  function updateExamProblemTimer(timerData) {
    if (!examTimerValue) return;

    chrome.storage.local.get(['examStartTime', 'examDuration'], (result) => {
      const elapsed = result.examStartTime ? Date.now() - result.examStartTime : 0;
      const duration = Number(result.examDuration) || Number(currentExam?.duration) || 0;
      const remaining = duration > 0 ? Math.max(0, duration - elapsed) : 0;
      const minutes = Math.floor(remaining / 60000);

      examTimerValue.textContent = formatTime(remaining);
      examTimerValue.classList.remove('warning', 'danger');
      if (duration > 0 && minutes <= 5) {
        examTimerValue.classList.add('danger');
      } else if (duration > 0 && minutes <= 10) {
        examTimerValue.classList.add('warning');
      }
    });
  }

  // ============================================
  // Countdown Display
  // ============================================
  function updateCountdownDisplay() {
    chrome.storage.local.get(['countdownData'], (result) => {
      if (result.countdownData && result.countdownData.isRunning) {
        const countdown = result.countdownData;
        const elapsed = Date.now() - countdown.startTime;
        const remaining = Math.max(0, countdown.duration - elapsed);

        if (remaining > 0) {
          const timeStr = formatCountdownTime(remaining);
          if (timerValue) timerValue.textContent = timeStr;
          if (examTimerValue) examTimerValue.textContent = timeStr;

          const minutes = Math.floor(remaining / 60000);
          timerValue?.classList.remove('warning', 'danger');
          if (examTimerValue) examTimerValue.classList.remove('warning', 'danger');
          if (minutes <= 5) {
            timerValue?.classList.add('danger');
            if (examTimerValue) examTimerValue.classList.add('danger');
          } else if (minutes <= 10) {
            timerValue?.classList.add('warning');
            if (examTimerValue) examTimerValue.classList.add('warning');
          }
        } else {
          timerValue?.classList.remove('warning', 'danger');
          if (examTimerValue) examTimerValue.classList.remove('warning', 'danger');
        }
      }
    });
  }

  // ============================================
  // Exam Global Timer
  // ============================================
  function updateExamGlobalTimer() {
    chrome.storage.local.get(['examStartTime', 'examDuration'], (result) => {
      if (result.examStartTime && result.examDuration) {
        const elapsed = Date.now() - result.examStartTime;
        const remaining = Math.max(0, result.examDuration - elapsed);
        examGlobalTimer.textContent = formatTime(remaining);
        const progress = ((result.examDuration - remaining) / result.examDuration) * 100;
        examGlobalProgress.style.width = Math.min(100, progress) + '%';
      } else if (result.examStartTime) {
        const elapsed = Date.now() - result.examStartTime;
        examGlobalTimer.textContent = formatTime(elapsed);
      }
    });
  }

  // ============================================
  // Exam Mode Display
  // ============================================
  function updateExamModeDisplay() {
    if (!currentExam || !currentExam.problems) return;
    const prob = currentExam.problems[currentProblemIndex];
    if (prob) {
      examProblemIndex.textContent = `题目 ${currentProblemIndex + 1}/${currentExam.problems.length}`;
      examProblemName.textContent = prob.name || prob.id || '未知题目';
      examProblemDifficulty.textContent = prob.difficulty || '';
    }
  }

  // ============================================
  // Timer Controls
  // ============================================
  function togglePlayPause() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0]) return;

      chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePlayPause' }, () => {
        if (chrome.runtime.lastError) {
          chrome.runtime.sendMessage({ action: 'togglePauseTimer' }, (response) => {
            if (chrome.runtime.lastError || !response?.success) return;
            updatePlayPauseIcons(response.timerData.isPaused);
            updateTimerDisplay();
          });
          return;
        }

        setTimeout(updateTimerDisplay, 120);
      });
    });
  }

  function resetTimer() {
    if (confirm('确定要重置当前计时吗？')) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'resetTimer' }, () => {
            if (chrome.runtime.lastError) {
              chrome.runtime.sendMessage({ action: 'stopTimer' });
              chrome.storage.local.remove(['countdownData']);
            }
            if (timerValue) {
              timerValue.textContent = '00:00:00';
              timerValue.classList.remove('warning', 'danger');
            }
            if (examTimerValue) {
              examTimerValue.textContent = '00:00:00';
              examTimerValue.classList.remove('warning', 'danger');
            }
            updatePlayPauseIcons(false);
            setTimeout(updateTimerDisplay, 100);
          });
        }
      });
    }
  }

  function toggleCountdownInput() {
    if (!countdownInputSection || !countdownInput) return;
    countdownVisible = !countdownVisible;
    countdownInputSection.style.display = countdownVisible ? 'block' : 'none';
    if (countdownVisible) countdownInput.focus();
  }

  function startCountdown() {
    if (!countdownInput || !countdownInputSection) return;
    const duration = parseInt(countdownInput.value);
    if (duration && duration > 0) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'startCountdown',
            duration: duration
          });
        }
      });
      countdownInput.value = '';
      countdownInputSection.style.display = 'none';
      countdownVisible = false;
    } else {
      countdownInput.style.borderColor = 'var(--error)';
      setTimeout(() => { countdownInput.style.borderColor = ''; }, 1500);
    }
  }

  // ============================================
  // Exam Navigation
  // ============================================
  function navigateProblem(direction) {
    if (!currentExam || !currentExam.problems) return;
    const newIndex = currentProblemIndex + direction;
    if (newIndex >= 0 && newIndex < currentExam.problems.length) {
      currentProblemIndex = newIndex;
      chrome.runtime.sendMessage({ action: 'setCurrentExamProblem', problemIndex: currentProblemIndex });
      updateExamModeDisplay();

      const prob = currentExam.problems[currentProblemIndex];
      if (prob && prob.url) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs[0]) {
            chrome.tabs.update(tabs[0].id, { url: prob.url });
          }
        });
      }
    }
  }

  function submitExam() {
    showConfirm({
      icon: 'task_alt',
      title: '提交考试？',
      message: '提交后将结束当前自定义考试，题目完成状态会保留到做题记录中。',
      confirmText: '提交',
      onConfirm: () => {
        chrome.runtime.sendMessage({ action: 'finishCustomExam' }, () => {
          activeCustomExam = null;
          currentExam = null;
          currentProblemIndex = 0;
          switchView('timer');
          refreshActiveTabHighlights();
        });
      }
    });
  }

  // ============================================
  // Exam Data Management
  // ============================================
  function loadExamData() {
    chrome.storage.local.get(['activeCustomExam'], (result) => {
      activeCustomExam = result.activeCustomExam || null;
      examData = [];
      chrome.storage.local.remove(['examSessions']);
      if (currentView === 'examList') renderExamList();
    });
  }

  // ============================================
  // Current Page Problem Selection
  // ============================================
  function loadCurrentPageProblems() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;

      chrome.tabs.sendMessage(tabs[0].id, { action: 'getCurrentPageProblems' }, (response) => {
        if (chrome.runtime.lastError || !response?.problems?.length) {
          showConfirm({
            icon: 'info',
            title: '未找到题目列表',
            message: '请先打开 PTA 的题目列表或考试题目列表页面，再从当前页面选择题目。',
            confirmText: '知道了',
            onConfirm: () => {}
          });
          return;
        }

        chrome.storage.local.remove(['customExamSelectionPreview'], refreshActiveTabHighlights);
        customExamSelectionMode = true;
        currentExam = {
          id: `selection-${Date.now()}`,
          name: '当前页面题目',
          mode: 'selection',
          date: new Date().toISOString(),
          duration: response.problems.length * 30 * 60000,
          problems: response.problems.map((problem) => ({
            ...problem,
            status: 'pending',
            selected: false,
            solvedAt: null
          }))
        };
        selectedProblemIds = new Set();
        switchView('examProblems');
      });
    });
  }

  function getProblemKey(problem, index) {
    return problem.id || String(index);
  }

  function toggleProblemSelection(problem, index) {
    const key = getProblemKey(problem, index);
    if (selectedProblemIds.has(key)) {
      selectedProblemIds.delete(key);
    } else {
      selectedProblemIds.add(key);
    }
    syncSelectionPreview();
    renderExamProblems();
  }

  function toggleSelectAllProblems() {
    if (!currentExam?.problems) return;

    if (selectedProblemIds.size === currentExam.problems.length) {
      selectedProblemIds.clear();
    } else {
      selectedProblemIds = new Set(currentExam.problems.map((problem, index) => getProblemKey(problem, index)));
    }
    syncSelectionPreview();
    renderExamProblems();
  }

  function syncSelectionPreview() {
    if (!customExamSelectionMode || !currentExam?.problems) return;

    const selectedProblems = currentExam.problems
      .filter((problem, index) => selectedProblemIds.has(getProblemKey(problem, index)))
      .map((problem) => ({ ...problem, status: 'pending' }));

    if (selectedProblems.length === 0) {
      chrome.storage.local.remove(['customExamSelectionPreview'], refreshActiveTabHighlights);
      return;
    }

    chrome.storage.local.set({
      customExamSelectionPreview: {
        id: 'selection-preview',
        mode: 'selection-preview',
        problems: selectedProblems
      }
    }, refreshActiveTabHighlights);
  }

  function confirmCreateCustomExam() {
    if (!selectedProblemIds.size) return;

    const durationMinutes = getCustomExamDurationMinutes();
    customExamDurationInput.value = String(durationMinutes);
    showConfirm({
      icon: 'timer',
      title: '创建自定义考试？',
      message: `将使用选中的 ${selectedProblemIds.size} 道题创建一场 ${durationMinutes} 分钟的计时考试。`,
      confirmText: '开始',
      onConfirm: createCustomExamFromSelection
    });
  }

  function getCustomExamDurationMinutes() {
    const fallback = selectedProblemIds.size * 30;
    const value = Number(customExamDurationInput.value);
    const minutes = Number.isFinite(value) && value > 0 ? value : fallback;
    return Math.max(1, Math.min(999, Math.round(minutes)));
  }

  function confirmDeleteCustomExam() {
    showConfirm({
      icon: 'delete',
      title: customExamSelectionMode ? '取消当前选择？' : '删除当前考试？',
      message: customExamSelectionMode
        ? '将退出当前页面题目选择，并清除网站题目列表上的选中状态。'
        : '将删除当前自定义考试设置，并清除网站题目列表上的蓝色/绿色状态。',
      confirmText: customExamSelectionMode ? '取消选择' : '删除',
      onConfirm: deleteCustomExam
    });
  }

  function deleteCustomExam() {
    const finishDelete = () => {
      customExamSelectionMode = false;
      activeCustomExam = null;
      selectedProblemIds.clear();
      currentExam = null;
      currentProblemIndex = 0;
      switchView('examList');
      refreshActiveTabHighlights();
    };

    if (customExamSelectionMode) {
      chrome.storage.local.remove(['customExamSelectionPreview'], finishDelete);
      return;
    }

    chrome.runtime.sendMessage({ action: 'finishCustomExam' }, finishDelete);
  }

  function createCustomExamFromSelection() {
    const durationMinutes = getCustomExamDurationMinutes();
    const selectedProblems = currentExam.problems
      .filter((problem, index) => selectedProblemIds.has(getProblemKey(problem, index)))
      .map((problem) => ({
        ...problem,
        status: problem.status === 'solved' ? 'solved' : 'pending',
        selected: true,
        solvedAt: problem.solvedAt || null
      }));

    currentExam = {
      id: `custom-${Date.now()}`,
      name: `自定义考试 · ${selectedProblems.length} 题`,
      mode: 'custom',
      startedAt: Date.now(),
      duration: durationMinutes * 60000,
      currentProblemIndex: 0,
      problems: selectedProblems
    };
    customExamSelectionMode = false;
    selectedProblemIds.clear();
    startExamMode(0);
  }

  // ============================================
  // Render Exam List
  // ============================================
  function renderExamList() {
    const query = (examSearchInput.value || '').toLowerCase();
    const exams = activeCustomExam ? [activeCustomExam] : examData;
    const filtered = exams.filter(e => e.name.toLowerCase().includes(query));

    if (filtered.length === 0) {
      examListScroll.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined icon-empty">assignment</span>
          <span class="empty-text">${query ? '未找到匹配的考试' : '暂无考试记录'}</span>
        </div>
      `;
      return;
    }

    examListScroll.innerHTML = '';
    filtered.forEach((exam) => {
      const isActive = activeCustomExam?.id === exam.id;
      const item = document.createElement('div');
      item.className = `exam-list-item${isActive ? ' active-exam' : ''}`;
      item.innerHTML = `
        <div class="exam-list-item-left">
          <div class="exam-list-icon">
            <span class="material-symbols-outlined">${isActive ? 'timer' : 'calendar_today'}</span>
          </div>
          <div class="exam-list-copy">
            <span class="exam-list-name">${exam.name}</span>
            ${isActive ? '<span class="exam-list-subtitle">进行中的考试</span>' : ''}
          </div>
        </div>
        <div class="exam-list-item-right">
          <span class="exam-list-count">${exam.problems.length} 题</span>
          ${isActive ? '<button class="exam-list-delete-btn" title="取消考试"><span class="material-symbols-outlined">close</span></button>' : ''}
          <span class="material-symbols-outlined exam-list-chevron">chevron_right</span>
        </div>
      `;
      item.addEventListener('click', () => {
        currentExam = exam;
        currentProblemIndex = exam.currentProblemIndex || 0;
        switchView(isActive ? 'examMode' : 'examProblems');
      });
      item.querySelector('.exam-list-delete-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        currentExam = exam;
        confirmDeleteCustomExam();
      });
      examListScroll.appendChild(item);
    });
  }

  // ============================================
  // Render Exam Problems
  // ============================================
  function renderExamProblems() {
    if (!currentExam) return;

    const isCustomExam = currentExam.mode === 'custom';
    examTitle.textContent = currentExam.name;
    examDurationText.textContent = currentExam.duration
      ? Math.round(currentExam.duration / 60000) + ' min'
      : '未知';
    examStatusBadge.textContent = customExamSelectionMode ? '选择题目' : isCustomExam ? '进行中' : '已完成';
    if (examDurationMeta) examDurationMeta.style.display = customExamSelectionMode || isCustomExam ? 'none' : '';
    customExamToolbar.style.display = (customExamSelectionMode || isCustomExam) ? 'flex' : 'none';
    customExamDurationInput.style.display = customExamSelectionMode ? '' : 'none';
    selectAllProblemsBtn.style.display = customExamSelectionMode ? '' : 'none';
    createCustomExamBtn.style.display = customExamSelectionMode ? '' : 'none';
    deleteCustomExamBtn.style.display = isCustomExam ? '' : 'none';
    deleteCustomExamBtn.textContent = '删除考试';

    if (customExamSelectionMode) {
      customExamCount.textContent = `已选择 ${selectedProblemIds.size} 题`;
      selectAllProblemsBtn.textContent = selectedProblemIds.size === currentExam.problems.length ? '取消全选' : '全选';
      createCustomExamBtn.disabled = selectedProblemIds.size === 0;
    } else if (isCustomExam) {
      const solvedCount = currentExam.problems.filter((problem) => problem.status === 'solved').length;
      customExamCount.textContent = `已完成 ${solvedCount}/${currentExam.problems.length} 题`;
    }

    problemList.innerHTML = '';
    const totalProblems = currentExam.problems.length;
    const solvedCount = currentExam.problems.filter((problem) => problem.status === 'solved').length;

    currentExam.problems.forEach((prob, index) => {
      const key = getProblemKey(prob, index);
      const selected = selectedProblemIds.has(key);
      const solved = prob.status === 'solved' || Boolean(prob.duration);
      const item = document.createElement('div');
      item.className = 'problem-list-item';
      if (customExamSelectionMode && selected) item.classList.add('selected');
      if (isCustomExam && !solved) item.classList.add('pending');
      if (solved) item.classList.add('solved');

      const statusText = solved ? '已完成' : (customExamSelectionMode && selected) || isCustomExam ? '待完成' : '';
      const statusClass = solved ? 'green' : statusText ? 'blue' : '';
      const actionText = customExamSelectionMode ? (selected ? '已选' : '选择') : '开始';

      item.innerHTML = `
        <div class="problem-list-item-left">
          <div class="problem-list-number">${String(prob.displayIndex || index + 1).padStart(2, '0')}</div>
          <div class="problem-list-info">
            <div class="problem-list-name">${prob.name || prob.id || '题目 ' + (index + 1)}</div>
            <div class="problem-list-meta">
              <span>${prob.duration ? formatTime(prob.duration) : (prob.id || '未计时')}</span>
              ${statusText ? `<span class="problem-status-badge ${statusClass}">${statusText}</span>` : ''}
            </div>
          </div>
        </div>
        <button class="problem-list-start-btn" data-index="${index}">${actionText}</button>
      `;

      item.addEventListener('click', () => {
        if (customExamSelectionMode) toggleProblemSelection(prob, index);
      });
      item.querySelector('.problem-list-start-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (customExamSelectionMode) {
          toggleProblemSelection(prob, index);
        } else {
          startExamMode(index);
        }
      });
      problemList.appendChild(item);
    });

    progressValue.textContent = `${solvedCount} / ${totalProblems} 题`;
    progressBarFill.style.width = totalProblems > 0 ? (solvedCount / totalProblems * 100) + '%' : '0%';
    progressPercent.textContent = totalProblems > 0 ? Math.round(solvedCount / totalProblems * 100) + '%' : '0%';
  }

  // ============================================
  // Start Exam Mode
  // ============================================
  function startExamMode(problemIndex) {
    currentProblemIndex = problemIndex;
    currentExam.currentProblemIndex = currentProblemIndex;

    const startExam = () => {
      switchView('examMode');
      navigateToCurrentProblem();
      refreshActiveTabHighlights();
    };

    if (currentExam.mode === 'custom') {
      chrome.runtime.sendMessage({ action: 'startCustomExam', exam: currentExam }, startExam);
      return;
    }

    chrome.storage.local.set({
      isExamMode: true,
      currentExam: currentExam,
      currentProblemIndex: currentProblemIndex,
      examStartTime: Date.now(),
      examDuration: currentExam.duration || (currentExam.problems.length * 30 * 60000)
    }, startExam);
  }

  function navigateToCurrentProblem() {
    const prob = currentExam?.problems?.[currentProblemIndex];
    if (!prob?.url) return;

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.update(tabs[0].id, { url: prob.url });
      }
    });
  }

  function refreshActiveTabHighlights() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'refreshProblemHighlights' });
      }
    });
  }

  // ============================================
  // Sessions List
  // ============================================
  function updateSessionsList(sessions) {
    if (!sessions || sessions.length === 0) {
      sessionsList.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined icon-empty">history</span>
          <span class="empty-text">暂无记录</span>
        </div>
      `;
      return;
    }

    const recentSessions = sessions
      .map((session, sessionIndex) => ({ session, sessionIndex }))
      .reverse();
    sessionsList.innerHTML = '';
    recentSessions.forEach(({ session, sessionIndex }, index) => {
      const item = document.createElement('div');
      item.className = 'session-item';

      const left = document.createElement('div');
      left.className = 'session-item-left';

      const number = document.createElement('div');
      number.className = 'session-number';
      number.textContent = String(recentSessions.length - index).padStart(2, '0');

      const info = document.createElement('div');
      info.className = 'session-info';

      const name = document.createElement('div');
      name.className = 'session-problem-id';
      name.textContent = session.problemName || session.problemId || '未知题目';

      const date = document.createElement('div');
      date.className = 'session-date';
      date.textContent = `${formatSessionDate(session.endTime)} · ${session.problemId || '未知 ID'}`;

      const right = document.createElement('div');
      right.className = 'session-item-right';

      const time = document.createElement('span');
      time.className = 'session-time';
      time.textContent = formatTime(session.duration);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'session-delete-btn';
      deleteBtn.title = '删除记录';
      deleteBtn.innerHTML = '<span class="material-symbols-outlined">delete</span>';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSession(sessionIndex);
      });

      info.appendChild(name);
      info.appendChild(date);
      left.appendChild(number);
      left.appendChild(info);
      right.appendChild(time);
      right.appendChild(deleteBtn);
      item.appendChild(left);
      item.appendChild(right);
      sessionsList.appendChild(item);
    });
  }

  // ============================================
  // Clear Data
  // ============================================
  function clearData() {
    showConfirm({
      icon: 'delete_forever',
      title: '清除所有数据？',
      message: '将删除所有做题记录、倒计时和当前计时状态，此操作无法恢复。',
      confirmText: '清除',
      onConfirm: performClearData
    });
  }

  function performClearData() {
    chrome.runtime.sendMessage({ action: 'clearAllData' }, () => {
      examData = [];
      currentExam = null;
      currentProblemIndex = 0;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'resetTimer' }, () => {
            updateTimerDisplay();
          });
        } else {
          updateTimerDisplay();
        }
      });
      switchView('timer');
    });
  }

  function deleteSession(sessionIndex) {
    showConfirm({
      icon: 'delete',
      title: '删除这条记录？',
      message: '删除后无法恢复，确定要继续吗？',
      confirmText: '删除',
      onConfirm: () => {
        chrome.runtime.sendMessage({ action: 'deleteSession', sessionIndex: sessionIndex }, () => {
          if (chrome.runtime.lastError) return;
          updateTimerDisplay();
        });
      }
    });
  }

  function showConfirm({ icon, title, message, confirmText, onConfirm }) {
    pendingConfirmAction = onConfirm;
    confirmIcon.textContent = icon;
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmOk.textContent = confirmText;
    confirmOverlay.classList.add('visible');
    confirmOverlay.setAttribute('aria-hidden', 'false');
    confirmOk.focus();
  }

  function closeConfirm() {
    pendingConfirmAction = null;
    confirmOverlay.classList.remove('visible');
    confirmOverlay.setAttribute('aria-hidden', 'true');
  }

  function confirmPendingAction() {
    const action = pendingConfirmAction;
    closeConfirm();
    if (action) action();
  }

  // ============================================
  // Utility Functions
  // ============================================
  function getElapsedTime(timerData) {
    if (!timerData?.currentSession) return 0;
    const now = timerData.isPaused && timerData.pauseStartTime ? timerData.pauseStartTime : Date.now();
    return Math.max(0, now - timerData.currentSession.startTime - (timerData.pausedDuration || 0));
  }

  function updatePlayPauseIcons(paused) {
    const icon = playPauseBtn?.querySelector('.material-symbols-outlined');
    const examIcon = examPlayPauseBtn?.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = paused ? 'play_arrow' : 'pause';
    if (examIcon) examIcon.textContent = paused ? 'play_arrow' : 'pause';
    if (playPauseBtn) playPauseBtn.title = paused ? '继续' : '暂停';
    if (examPlayPauseBtn) examPlayPauseBtn.title = paused ? '继续' : '暂停';
  }

  function formatTime(ms) {
    if (!ms || ms < 0) return '00:00:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }

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

  function formatSessionDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${mins}`;
  }
});
