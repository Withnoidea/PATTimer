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
  let currentProblemIndex = 0; // Current problem in exam mode

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
  const problemSubtitle = document.getElementById('problem-subtitle');
  const problemTitle = document.getElementById('problem-title');
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

  // DOM References - Exam List View
  const examListBackBtn = document.getElementById('exam-list-back-btn');
  const examSearchInput = document.getElementById('exam-search-input');
  const examListScroll = document.getElementById('exam-list-scroll');
  const returnTimerBtn = document.getElementById('return-timer-btn');

  // DOM References - Exam Problems View
  const backToExamsBtn = document.getElementById('back-to-exams-btn');
  const examTitle = document.getElementById('exam-title');
  const examStatusBadge = document.getElementById('exam-status-badge');
  const examDurationText = document.getElementById('exam-duration-text');
  const problemList = document.getElementById('problem-list');
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
  const examModeCloseBtn = document.getElementById('exam-mode-close-btn');

  // DOM References - Settings View
  const settingsBackBtn = document.getElementById('settings-back-btn');
  const clearDataBtn = document.getElementById('clear-data-btn');

  // ============================================
  // Initialize
  // ============================================
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
  backToExamsBtn.addEventListener('click', () => switchView('examList'));
  settingsBackBtn.addEventListener('click', () => switchView('timer'));
  examModeCloseBtn.addEventListener('click', () => switchView('timer'));

  // Timer View Events
  playPauseBtn.addEventListener('click', togglePlayPause);
  resetBtn.addEventListener('click', resetTimer);
  countdownBtn.addEventListener('click', toggleCountdownInput);
  startCountdownBtn.addEventListener('click', startCountdown);
  cancelCountdownBtn.addEventListener('click', () => {
    countdownInputSection.style.display = 'none';
    countdownVisible = false;
  });
  countdownInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startCountdown();
  });

  // Exam Mode Events
  examPlayPauseBtn.addEventListener('click', togglePlayPause);
  examResetBtn.addEventListener('click', resetTimer);
  examPrevBtn.addEventListener('click', () => navigateProblem(-1));
  examNextBtn.addEventListener('click', () => navigateProblem(1));
  examSubmitBtn.addEventListener('click', submitExam);

  // Settings Events
  clearDataBtn.addEventListener('click', clearData);

  // Search
  examSearchInput.addEventListener('input', renderExamList);

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
    chrome.storage.local.get(['isExamMode', 'currentExam', 'currentProblemIndex'], (result) => {
      if (result.isExamMode && result.currentExam) {
        currentExam = result.currentExam;
        currentProblemIndex = result.currentProblemIndex || 0;
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
        timerValue.textContent = timeStr;
        if (examTimerValue) examTimerValue.textContent = timeStr;
        problemTitle.textContent = timerData.currentSession.problemName || timerData.currentSession.problemId || '计时中...';
        problemSubtitle.textContent = timerData.currentSession.problemId || '当前题目';
        updatePlayPauseIcons(timerData.isPaused);
      } else {
        if (currentView === 'timer') {
          timerValue.textContent = '00:00:00';
          problemTitle.textContent = '等待检测...';
          problemSubtitle.textContent = '当前题目';
          updatePlayPauseIcons(false);
        }
      }

      updateSessionsList(timerData.sessions || []);
    });

    updateCountdownDisplay();
    if (currentView === 'examMode') updateExamGlobalTimer();
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
          timerValue.textContent = timeStr;
          if (examTimerValue) examTimerValue.textContent = timeStr;

          const minutes = Math.floor(remaining / 60000);
          timerValue.classList.remove('warning', 'danger');
          if (examTimerValue) examTimerValue.classList.remove('warning', 'danger');
          if (minutes <= 5) {
            timerValue.classList.add('danger');
            if (examTimerValue) examTimerValue.classList.add('danger');
          } else if (minutes <= 10) {
            timerValue.classList.add('warning');
            if (examTimerValue) examTimerValue.classList.add('warning');
          }
        } else {
          timerValue.classList.remove('warning', 'danger');
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
    chrome.runtime.sendMessage({ action: 'togglePauseTimer' }, (response) => {
      if (chrome.runtime.lastError || !response?.success) return;
      updatePlayPauseIcons(response.timerData.isPaused);
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'syncPauseState',
            isPaused: response.timerData.isPaused
          });
        }
      });
      updateTimerDisplay();
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
            timerValue.textContent = '00:00:00';
            timerValue.classList.remove('warning', 'danger');
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
    countdownVisible = !countdownVisible;
    countdownInputSection.style.display = countdownVisible ? 'block' : 'none';
    if (countdownVisible) countdownInput.focus();
  }

  function startCountdown() {
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
      chrome.storage.local.set({ currentProblemIndex: currentProblemIndex });
      updateExamModeDisplay();

      // Navigate to problem page
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
    if (confirm('确定要提交考试吗？提交后将无法继续作答。')) {
      chrome.storage.local.remove(['isExamMode', 'currentExam', 'currentProblemIndex', 'examStartTime', 'examDuration']);
      currentExam = null;
      currentProblemIndex = 0;
      switchView('timer');
    }
  }

  // ============================================
  // Exam Data Management
  // ============================================
  function loadExamData() {
    chrome.storage.local.get(['examSessions'], (result) => {
      if (result.examSessions && result.examSessions.length > 0) {
        examData = result.examSessions;
      } else {
        // Generate from session history
        chrome.runtime.sendMessage({ action: 'getTimerData' }, (timerData) => {
          if (timerData && timerData.sessions && timerData.sessions.length > 0) {
            examData = groupSessionsIntoExams(timerData.sessions);
            chrome.storage.local.set({ examSessions: examData });
          }
        });
      }
    });
  }

  function groupSessionsIntoExams(sessions) {
    // Group sessions by date into "exam" entries
    const groups = {};
    sessions.forEach(s => {
      const date = new Date(s.startTime);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          name: `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} 练习`,
          date: date.toISOString(),
          duration: 0,
          problems: []
        };
      }
      groups[key].problems.push({
        id: s.problemId,
        name: s.problemName || s.problemId,
        duration: s.duration,
        difficulty: ''
      });
      groups[key].duration += s.duration || 0;
    });
    return Object.values(groups).reverse();
  }

  // ============================================
  // Render Exam List
  // ============================================
  function renderExamList() {
    const query = (examSearchInput.value || '').toLowerCase();
    const filtered = examData.filter(e => e.name.toLowerCase().includes(query));

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
    filtered.forEach((exam, index) => {
      const item = document.createElement('div');
      item.className = 'exam-list-item';
      item.innerHTML = `
        <div class="exam-list-item-left">
          <div class="exam-list-icon">
            <span class="material-symbols-outlined">calendar_today</span>
          </div>
          <span class="exam-list-name">${exam.name}</span>
        </div>
        <div class="exam-list-item-right">
          <span class="exam-list-count">${exam.problems.length} 题</span>
          <span class="material-symbols-outlined exam-list-chevron">chevron_right</span>
        </div>
      `;
      item.addEventListener('click', () => {
        currentExam = exam;
        switchView('examProblems');
      });
      examListScroll.appendChild(item);
    });
  }

  // ============================================
  // Render Exam Problems
  // ============================================
  function renderExamProblems() {
    if (!currentExam) return;

    examTitle.textContent = currentExam.name;
    examDurationText.textContent = currentExam.duration
      ? Math.round(currentExam.duration / 60000) + ' min'
      : '未知';
    examStatusBadge.textContent = '已完成';

    problemList.innerHTML = '';
    let totalPoints = currentExam.problems.length * 10;
    let earnedPoints = 0;

    currentExam.problems.forEach((prob, index) => {
      const item = document.createElement('div');
      item.className = 'problem-list-item';
      item.innerHTML = `
        <div class="problem-list-item-left">
          <div class="problem-list-number">${String(index + 1).padStart(2, '0')}</div>
          <div class="problem-list-info">
            <div class="problem-list-name">${prob.name || prob.id || '题目 ' + (index + 1)}</div>
            <div class="problem-list-meta">${prob.duration ? formatTime(prob.duration) : '未计时'}</div>
          </div>
        </div>
        <button class="problem-list-start-btn" data-index="${index}">开始</button>
      `;
      item.querySelector('.problem-list-start-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        startExamMode(index);
      });
      problemList.appendChild(item);
    });

    progressValue.textContent = `${earnedPoints} / ${totalPoints} pts`;
    progressBarFill.style.width = totalPoints > 0 ? (earnedPoints / totalPoints * 100) + '%' : '0%';
    progressPercent.textContent = totalPoints > 0 ? Math.round(earnedPoints / totalPoints * 100) + '%' : '0%';
  }

  // ============================================
  // Start Exam Mode
  // ============================================
  function startExamMode(problemIndex) {
    currentProblemIndex = problemIndex;

    // Save exam mode state
    chrome.storage.local.set({
      isExamMode: true,
      currentExam: currentExam,
      currentProblemIndex: currentProblemIndex,
      examStartTime: Date.now(),
      examDuration: currentExam.duration || (currentExam.problems.length * 30 * 60000)
    });

    switchView('examMode');
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
      .slice(-5)
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
    if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
      chrome.runtime.sendMessage({ action: 'clearAllData' }, () => {
        examData = [];
        currentExam = null;
        currentProblemIndex = 0;
        switchView('timer');
        updateTimerDisplay();
      });
    }
  }

  function deleteSession(sessionIndex) {
    if (!confirm('确定要删除这条记录吗？')) return;

    chrome.runtime.sendMessage({ action: 'deleteSession', sessionIndex: sessionIndex }, () => {
      if (chrome.runtime.lastError) return;
      updateTimerDisplay();
    });
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
    const icon = playPauseBtn.querySelector('.material-symbols-outlined');
    const examIcon = examPlayPauseBtn.querySelector('.material-symbols-outlined');
    icon.textContent = paused ? 'play_arrow' : 'pause';
    if (examIcon) examIcon.textContent = paused ? 'play_arrow' : 'pause';
    playPauseBtn.title = paused ? '继续' : '暂停';
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
