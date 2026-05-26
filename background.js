// PTA Timer - Background Service Worker
// Manages timer state and session persistence

let timerData = {
  isRunning: false,
  isPaused: false,
  startTime: null,
  pauseStartTime: null,
  pausedDuration: 0,
  currentSession: null,
  totalTime: 0,
  sessions: []
};

let storageLoaded = false;
let storageLoadInProgress = false;
let pendingLoadCallbacks = [];

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  loadStoredData(() => {
    normalizeTimerData();

    switch (request.action) {
      case 'startTimer':
        startTimer(request.problemId, request.problemName);
        sendResponse({ success: true });
        break;
      case 'stopTimer':
        stopTimer(false);
        sendResponse({ success: true });
        break;
      case 'completeTimer':
        stopTimer(true);
        sendResponse({ success: true });
        break;
      case 'togglePauseTimer':
        sendResponse(togglePauseTimer());
        break;
      case 'deleteSession':
        deleteSession(request.sessionIndex);
        sendResponse({ success: true });
        break;
      case 'startCustomExam':
        startCustomExam(request.exam, () => sendResponse({ success: true }));
        break;
      case 'getActiveCustomExam':
        getActiveCustomExam((exam) => sendResponse({ success: true, exam: exam }));
        break;
      case 'setCurrentExamProblem':
        setCurrentExamProblem(request.problemIndex, () => sendResponse({ success: true }));
        break;
      case 'markExamProblemSolved':
        markExamProblemSolved(request.problemId, () => sendResponse({ success: true }));
        break;
      case 'finishCustomExam':
        finishCustomExam(() => sendResponse({ success: true }));
        break;
      case 'clearAllData':
        clearAllData(() => sendResponse({ success: true }));
        break;
      case 'getTimerData':
        sendResponse(timerData);
        break;
      case 'setCountdown':
        setCountdown(request.duration);
        sendResponse({ success: true });
        break;
      case 'getCountdown':
        sendResponse({ countdown: countdownData });
        break;
      default:
        sendResponse({ success: false });
    }
  });
  return true; // Keep message channel open for async responses
});

function loadStoredData(callback) {
  if (storageLoaded) {
    callback();
    return;
  }

  pendingLoadCallbacks.push(callback);
  if (storageLoadInProgress) {
    return;
  }

  storageLoadInProgress = true;
  chrome.storage.local.get(['timerData', 'countdownData'], (result) => {
    if (result.timerData) {
      timerData = { ...timerData, ...result.timerData };
    }
    if (result.countdownData) {
      countdownData = result.countdownData;
      if (countdownData.isRunning) {
        startCountdownLoop();
      }
    }
    storageLoaded = true;
    storageLoadInProgress = false;

    const callbacks = pendingLoadCallbacks;
    pendingLoadCallbacks = [];
    callbacks.forEach((pendingCallback) => pendingCallback());
  });
}

function normalizeTimerData() {
  timerData.sessions = Array.isArray(timerData.sessions) ? timerData.sessions : [];
  timerData.isPaused = Boolean(timerData.isPaused);
  timerData.pausedDuration = Number(timerData.pausedDuration) || 0;
  timerData.pauseStartTime = timerData.pauseStartTime || null;
  timerData.sessions.forEach((session) => {
    if (!session.problemName) {
      session.problemName = session.problemId || '未知题目';
    }
  });
  if (timerData.currentSession && !timerData.currentSession.problemName) {
    timerData.currentSession.problemName = timerData.currentSession.problemId || '计时中...';
  }
}

function startTimer(problemId, problemName) {
  if (timerData.isRunning && timerData.currentSession?.problemId === problemId) {
    if (problemName && timerData.currentSession.problemName !== problemName) {
      timerData.currentSession.problemName = problemName;
      chrome.storage.local.set({ timerData: timerData });
    }
    return;
  }

  if (timerData.isRunning) {
    stopTimer(false);
  }

  timerData.isRunning = true;
  timerData.isPaused = false;
  timerData.startTime = Date.now();
  timerData.pauseStartTime = null;
  timerData.pausedDuration = 0;
  timerData.currentSession = {
    problemId: problemId,
    problemName: problemName || problemId,
    startTime: timerData.startTime,
    endTime: null
  };
  chrome.storage.local.set({ timerData: timerData });
}

function stopTimer(saveSession) {
  if (timerData.isRunning && timerData.currentSession) {
    const endTime = Date.now();
    const pausedDuration = timerData.pausedDuration +
      (timerData.isPaused && timerData.pauseStartTime ? endTime - timerData.pauseStartTime : 0);

    const completedSession = {
      ...timerData.currentSession,
      endTime: endTime,
      duration: Math.max(0, endTime - timerData.currentSession.startTime - pausedDuration)
    };

    timerData.isRunning = false;
    timerData.isPaused = false;

    if (saveSession) {
      timerData.sessions.push(completedSession);
      timerData.totalTime += completedSession.duration;
    }

    timerData.currentSession = null;
    timerData.startTime = null;
    timerData.pauseStartTime = null;
    timerData.pausedDuration = 0;

    chrome.storage.local.set({ timerData: timerData });
  }
}

function togglePauseTimer() {
  if (!timerData.isRunning || !timerData.currentSession) {
    return { success: false, timerData: timerData };
  }

  if (timerData.isPaused) {
    timerData.pausedDuration += Date.now() - timerData.pauseStartTime;
    timerData.pauseStartTime = null;
    timerData.isPaused = false;
  } else {
    timerData.pauseStartTime = Date.now();
    timerData.isPaused = true;
  }

  chrome.storage.local.set({ timerData: timerData });
  return { success: true, timerData: timerData };
}

function deleteSession(sessionIndex) {
  if (!Number.isInteger(sessionIndex) || !timerData.sessions[sessionIndex]) {
    return;
  }

  const [session] = timerData.sessions.splice(sessionIndex, 1);
  timerData.totalTime = Math.max(0, timerData.totalTime - (session.duration || 0));
  chrome.storage.local.set({ timerData: timerData });
}

function startCustomExam(exam, callback) {
  if (!exam) {
    callback();
    return;
  }

  const activeExam = {
    ...exam,
    currentProblemIndex: exam.currentProblemIndex || 0,
    problems: Array.isArray(exam.problems) ? exam.problems : []
  };

  chrome.storage.local.remove(['customExamSelectionPreview'], () => {
    chrome.storage.local.set({
      activeCustomExam: activeExam,
      isExamMode: true,
      currentExam: activeExam,
      currentProblemIndex: activeExam.currentProblemIndex,
      examStartTime: activeExam.startedAt,
      examDuration: activeExam.duration
    }, callback);
  });
}

function getActiveCustomExam(callback) {
  chrome.storage.local.get(['activeCustomExam'], (result) => {
    callback(result.activeCustomExam || null);
  });
}

function setCurrentExamProblem(problemIndex, callback) {
  chrome.storage.local.get(['activeCustomExam', 'currentExam'], (result) => {
    const index = Number(problemIndex) || 0;
    const updates = { currentProblemIndex: index };

    if (result.activeCustomExam) {
      updates.activeCustomExam = { ...result.activeCustomExam, currentProblemIndex: index };
    }
    if (result.currentExam?.mode === 'custom') {
      updates.currentExam = { ...result.currentExam, currentProblemIndex: index };
    }

    chrome.storage.local.set(updates, callback);
  });
}

function markExamProblemSolved(problemId, callback) {
  if (!problemId) {
    callback();
    return;
  }

  chrome.storage.local.get(['activeCustomExam', 'currentExam'], (result) => {
    if (!result.activeCustomExam?.problems) {
      callback();
      return;
    }

    const solvedAt = Date.now();
    const latestSession = [...timerData.sessions].reverse().find((session) => session.problemId === problemId);
    const updateProblems = (problems) => problems.map((problem) => {
      if (problem.id !== problemId) {
        return problem;
      }
      return {
        ...problem,
        status: 'solved',
        solvedAt: solvedAt,
        duration: latestSession?.duration || problem.duration || 0
      };
    });

    const activeCustomExam = {
      ...result.activeCustomExam,
      problems: updateProblems(result.activeCustomExam.problems)
    };
    const updates = { activeCustomExam: activeCustomExam };

    if (result.currentExam?.mode === 'custom') {
      updates.currentExam = {
        ...result.currentExam,
        problems: updateProblems(result.currentExam.problems || [])
      };
    }

    chrome.storage.local.set(updates, callback);
  });
}

function finishCustomExam(callback) {
  chrome.storage.local.remove([
    'activeCustomExam',
    'customExamSelectionPreview',
    'isExamMode',
    'currentExam',
    'currentProblemIndex',
    'examStartTime',
    'examDuration'
  ], callback);
}

function clearAllData(callback) {
  chrome.storage.local.clear(() => {
    timerData = {
      isRunning: false,
      isPaused: false,
      startTime: null,
      pauseStartTime: null,
      pausedDuration: 0,
      currentSession: null,
      totalTime: 0,
      sessions: []
    };
    countdownData = {
      isRunning: false,
      duration: 0,
      remaining: 0,
      startTime: null
    };
    storageLoaded = true;
    callback();
  });
}

// Countdown
let countdownData = {
  isRunning: false,
  duration: 0,
  remaining: 0,
  startTime: null
};

function setCountdown(duration) {
  countdownData.duration = duration * 60 * 1000;
  countdownData.remaining = countdownData.duration;
  countdownData.startTime = Date.now();
  countdownData.isRunning = true;

  startCountdownLoop();
  chrome.storage.local.set({ countdownData: countdownData });
}

function startCountdownLoop() {
  if (countdownData.isRunning) {
    const elapsed = Date.now() - countdownData.startTime;
    countdownData.remaining = Math.max(0, countdownData.duration - elapsed);

    if (countdownData.remaining <= 0) {
      countdownData.isRunning = false;
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'PTA Timer',
        message: '倒计时结束！'
      });
    } else {
      setTimeout(startCountdownLoop, 1000);
    }

    chrome.storage.local.set({ countdownData: countdownData });
  }
}

// Load persisted data on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['timerData', 'countdownData'], (result) => {
    if (result.timerData) {
      timerData = result.timerData;
    }
    if (result.countdownData) {
      countdownData = result.countdownData;
      if (countdownData.isRunning) {
        startCountdownLoop();
      }
    }
  });
});

// Also load on install/update
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['timerData'], (result) => {
    if (result.timerData) {
      timerData = result.timerData;
    }
  });
});
