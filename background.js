// 后台脚本
let timerData = {
  isRunning: false,
  startTime: null,
  currentSession: null,
  totalTime: 0,
  sessions: []
};

// 监听来自content script的消息
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
    
    // 保存到存储
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
    
    // 保存到存储
    chrome.storage.local.set({ timerData: timerData });
  }
}

// 倒计时功能
let countdownData = {
  isRunning: false,
  duration: 0,
  remaining: 0,
  startTime: null
};

function setCountdown(duration) {
  countdownData.duration = duration * 60 * 1000; // 转换为毫秒
  countdownData.remaining = countdownData.duration;
  countdownData.startTime = Date.now();
  countdownData.isRunning = true;
  
  // 开始倒计时
  startCountdown();
  
  chrome.storage.local.set({ countdownData: countdownData });
}

function startCountdown() {
  if (countdownData.isRunning) {
    const elapsed = Date.now() - countdownData.startTime;
    countdownData.remaining = Math.max(0, countdownData.duration - elapsed);
    
    if (countdownData.remaining <= 0) {
      countdownData.isRunning = false;
      // 发送通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'PTA计时器',
        message: '倒计时结束！'
      });
    } else {
      setTimeout(startCountdown, 1000);
    }
    
    chrome.storage.local.set({ countdownData: countdownData });
  }
}

// 初始化时从存储加载数据
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['timerData', 'countdownData'], (result) => {
    if (result.timerData) {
      timerData = result.timerData;
    }
    if (result.countdownData) {
      countdownData = result.countdownData;
      if (countdownData.isRunning) {
        startCountdown();
      }
    }
  });
}); 