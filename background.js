// PTA Timer - Background Service Worker
// Manages timer state and session persistence

let timerData = {
  isRunning: false,
  startTime: null,
  currentSession: null,
  totalTime: 0,
  sessions: []
};

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'startTimer':
      startTimer(request.problemId);
      sendResponse({ success: true });
      break;
    case 'stopTimer':
      stopTimer();
      sendResponse({ success: true });
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
  }
  return true; // Keep message channel open for async responses
});

function startTimer(problemId) {
  if (!timerData.isRunning) {
    timerData.isRunning = true;
    timerData.startTime = Date.now();
    timerData.currentSession = {
      problemId: problemId,
      startTime: timerData.startTime,
      endTime: null
    };
    chrome.storage.local.set({ timerData: timerData });
  }
}

function stopTimer() {
  if (timerData.isRunning && timerData.currentSession) {
    timerData.isRunning = false;
    timerData.currentSession.endTime = Date.now();
    timerData.currentSession.duration =
      timerData.currentSession.endTime - timerData.currentSession.startTime;

    timerData.sessions.push(timerData.currentSession);
    timerData.totalTime += timerData.currentSession.duration;

    timerData.currentSession = null;
    timerData.startTime = null;

    chrome.storage.local.set({ timerData: timerData });
  }
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
