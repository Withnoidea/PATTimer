// 内容脚本
let timerDisplay = null;
let currentProblemId = null;
let isFixed = false; // 是否固定计时器
let isPaused = false; // 是否暂停
let countdownData = null; // 倒计时数据
let countdownPauseTime = 0; // 倒计时暂停时的时间点
let timerPauseTime = 0; // 正计时暂停时的时间点
let timerPauseOffset = 0; // 正计时暂停的时间偏移量
let isDragging = false; // 是否正在拖动
let dragOffset = { x: 0, y: 0 }; // 拖动偏移量

// 检测页面变化
const observer = new MutationObserver(() => {
  detectProblemPage();
});

// 初始化
function init() {
  // 先加载保存的固定状态和位置
  chrome.storage.local.get(['timerFixed', 'timerPosition'], (result) => {
    if (result.timerFixed !== undefined) {
      isFixed = result.timerFixed;
    }
    
    // 然后检测页面
    detectProblemPage();
    
    // 在创建计时器后应用保存的位置
    setTimeout(() => {
      if (timerDisplay && result.timerPosition && !isFixed) {
        timerDisplay.style.left = result.timerPosition.x + 'px';
        timerDisplay.style.top = result.timerPosition.y + 'px';
      }
    }, 100);
  });
  
  // 重置暂停相关变量
  isPaused = false;
  timerPauseTime = 0;
  timerPauseOffset = 0;
  countdownPauseTime = 0;
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startCountdown') {
    startCountdown(request.duration);
    sendResponse({ success: true });
  }
});

// 检测是否为题目页面
function detectProblemPage() {
  const url = window.location.href;
  
  // 检测是否为题目页面 - 只在URL包含"problem"时触发
  if (url.includes('problem')) {
    const problemId = extractProblemId(url);
    if (problemId && problemId !== currentProblemId) {
      currentProblemId = problemId;
      startProblemTimer(problemId);
      createTimerDisplay();
    }
  } else {
    // 不在题目页面时停止计时并隐藏界面
    if (currentProblemId) {
      stopProblemTimer();
      currentProblemId = null;
    }
    // 隐藏计时器界面
    if (timerDisplay) {
      timerDisplay.style.display = 'none';
    }
  }
}

// 提取题目ID
function extractProblemId(url) {
  // 尝试多种可能的题目ID提取方式
  let problemId = null;
  
  // 方式1: 从problemSetProblemId参数提取
  const problemSetMatch = url.match(/problemSetProblemId=([^&]+)/);
  if (problemSetMatch) {
    problemId = problemSetMatch[1];
  }
  
  // 方式2: 从URL路径中提取
  if (!problemId) {
    const pathMatch = url.match(/\/problems\/([^\/\?]+)/);
    if (pathMatch) {
      problemId = pathMatch[1];
    }
  }
  
  // 方式3: 从exam/problems路径提取
  if (!problemId) {
    const examMatch = url.match(/\/exam\/problems\/[^\/]+\?[^=]*=([^&]+)/);
    if (examMatch) {
      problemId = examMatch[1];
    }
  }
  
  return problemId;
}

// 开始题目计时
function startProblemTimer(problemId) {
  chrome.runtime.sendMessage({
    action: 'startTimer',
    problemId: problemId
  });
}

// 停止题目计时
function stopProblemTimer() {
  chrome.runtime.sendMessage({
    action: 'stopTimer'
  });
}

// 创建计时器显示界面
function createTimerDisplay() {
  if (timerDisplay) {
    timerDisplay.remove();
  }
  
  timerDisplay = document.createElement('div');
  timerDisplay.id = 'pta-timer-display';
  timerDisplay.innerHTML = `
    <div class="timer-header">
      <span>计时器</span>
      <div class="timer-controls">
        <button id="pta-fix-toggle" title="固定/取消固定">📌</button>
        <button id="pta-timer-close" title="关闭">×</button>
      </div>
    </div>
    <div class="timer-content">
      <div class="timer-time" id="pta-current-time">00:00:00</div>
      <div class="timer-buttons">
        <button id="pta-play-pause" class="btn-play">⏸️</button>
        <button id="pta-reset" class="btn-reset">🔄</button>
        <button id="pta-countdown" class="btn-countdown">⏰</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(timerDisplay);
  
  // 应用保存的固定状态
  if (isFixed) {
    timerDisplay.classList.add('fixed');
    const fixButton = document.getElementById('pta-fix-toggle');
    fixButton.textContent = '📍';
    fixButton.title = '取消固定';
  } else {
    // 未固定时添加拖动功能
    addDragFunctionality();
  }
  
  // 绑定事件
  document.getElementById('pta-timer-close').addEventListener('click', () => {
    timerDisplay.style.display = 'none';
  });
  
  document.getElementById('pta-fix-toggle').addEventListener('click', () => {
    toggleFix();
  });
  
  document.getElementById('pta-play-pause').addEventListener('click', () => {
    togglePlayPause();
  });
  
  document.getElementById('pta-reset').addEventListener('click', () => {
    resetTimer();
  });
  
  document.getElementById('pta-countdown').addEventListener('click', () => {
    showCountdownDialog();
  });
  
  // 开始更新显示
  updateTimerDisplay();
}

// 添加拖动功能
function addDragFunctionality() {
  if (!timerDisplay) return;
  
  // 添加拖动样式
  timerDisplay.style.cursor = 'move';
  timerDisplay.style.userSelect = 'none';
  
  // 鼠标按下事件
  timerDisplay.addEventListener('mousedown', (e) => {
    if (isFixed) return; // 固定时不能拖动
    
    // 如果点击的是按钮，不开始拖动
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      return;
    }
    
    isDragging = true;
    const rect = timerDisplay.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    // 添加拖动时的样式
    timerDisplay.style.opacity = '0.8';
    timerDisplay.style.zIndex = '10000';
  });
  
  // 鼠标移动事件
  document.addEventListener('mousemove', (e) => {
    if (!isDragging || isFixed) return;
    
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    
    // 确保不超出屏幕边界
    const maxX = window.innerWidth - timerDisplay.offsetWidth;
    const maxY = window.innerHeight - timerDisplay.offsetHeight;
    
    timerDisplay.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    timerDisplay.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
  });
  
  // 鼠标释放事件
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      timerDisplay.style.opacity = '1';
      timerDisplay.style.zIndex = '9999';
      
      // 保存位置到存储
      const rect = timerDisplay.getBoundingClientRect();
      chrome.storage.local.set({
        timerPosition: {
          x: rect.left,
          y: rect.top
        }
      });
    }
  });
}

// 移除拖动功能
function removeDragFunctionality() {
  if (!timerDisplay) return;
  
  timerDisplay.style.cursor = 'default';
  timerDisplay.style.userSelect = 'auto';
  
  // 移除事件监听器（通过重新创建元素来清除）
  const newTimerDisplay = timerDisplay.cloneNode(true);
  timerDisplay.parentNode.replaceChild(newTimerDisplay, timerDisplay);
  timerDisplay = newTimerDisplay;
  
  // 重新绑定按钮事件
  document.getElementById('pta-timer-close').addEventListener('click', () => {
    timerDisplay.style.display = 'none';
  });
  
  document.getElementById('pta-fix-toggle').addEventListener('click', () => {
    toggleFix();
  });
  
  document.getElementById('pta-play-pause').addEventListener('click', () => {
    togglePlayPause();
  });
  
  document.getElementById('pta-reset').addEventListener('click', () => {
    resetTimer();
  });
  
  document.getElementById('pta-countdown').addEventListener('click', () => {
    showCountdownDialog();
  });
}

// 切换固定状态
function toggleFix() {
  isFixed = !isFixed;
  const fixButton = document.getElementById('pta-fix-toggle');
  
  if (isFixed) {
    fixButton.textContent = '📍';
    fixButton.title = '取消固定';
    timerDisplay.classList.add('fixed');
    
    // 移除拖动功能
    removeDragFunctionality();
  } else {
    fixButton.textContent = '📌';
    fixButton.title = '固定';
    timerDisplay.classList.remove('fixed');
    
    // 添加拖动功能
    addDragFunctionality();
  }
  
  // 保存固定状态到存储
  chrome.storage.local.set({ timerFixed: isFixed });
}

// 切换播放/暂停状态
function togglePlayPause() {
  isPaused = !isPaused;
  const playPauseButton = document.getElementById('pta-play-pause');
  
  if (isPaused) {
    playPauseButton.textContent = '▶️';
    playPauseButton.title = '继续';
    
    // 记录暂停时间
    timerPauseTime = Date.now();
    
    // 如果倒计时正在运行，记录暂停时间
    if (countdownData && countdownData.isRunning) {
      countdownPauseTime = Date.now();
    }
  } else {
    playPauseButton.textContent = '⏸️';
    playPauseButton.title = '暂停';
    
    // 计算暂停时间偏移量
    if (timerPauseTime > 0) {
      const pauseDuration = Date.now() - timerPauseTime;
      timerPauseOffset += pauseDuration;
      timerPauseTime = 0;
    }
    
    // 如果倒计时正在运行，调整开始时间
    if (countdownData && countdownData.isRunning && countdownPauseTime > 0) {
      const pauseDuration = Date.now() - countdownPauseTime;
      countdownData.startTime += pauseDuration;
      countdownPauseTime = 0;
      
      // 更新存储的倒计时数据
      chrome.storage.local.set({ countdownData: countdownData });
    }
  }
}

// 重置计时器
function resetTimer() {
  if (confirm('确定要重置当前计时吗？')) {
    // 停止当前计时
    chrome.runtime.sendMessage({ action: 'stopTimer' });
    
    // 重置暂停状态
    isPaused = false;
    timerPauseTime = 0;
    timerPauseOffset = 0;
    const playPauseButton = document.getElementById('pta-play-pause');
    playPauseButton.textContent = '⏸️';
    playPauseButton.title = '暂停';
    
    // 清除倒计时
    countdownData = null;
    countdownPauseTime = 0;
    chrome.storage.local.remove(['countdownData']);
    
    // 重新开始计时
    if (currentProblemId) {
      startProblemTimer(currentProblemId);
    }
  }
}

// 显示倒计时设置对话框
function showCountdownDialog() {
  const duration = prompt('请输入倒计时时间（分钟）:', '30');
  if (duration && !isNaN(duration) && duration > 0) {
    startCountdown(parseInt(duration));
  }
}

// 开始倒计时
function startCountdown(minutes) {
  countdownData = {
    duration: minutes * 60 * 1000, // 转换为毫秒
    startTime: Date.now(),
    isRunning: true
  };
  
  // 重置暂停状态
  isPaused = false;
  countdownPauseTime = 0;
  timerPauseTime = 0;
  timerPauseOffset = 0;
  const playPauseButton = document.getElementById('pta-play-pause');
  playPauseButton.textContent = '⏸️';
  playPauseButton.title = '暂停';
  
  // 保存倒计时数据
  chrome.storage.local.set({ countdownData: countdownData });
}

// 更新计时器显示
function updateTimerDisplay() {
  if (!timerDisplay) return;
  
  // 更新倒计时显示
  updateCountdownDisplay();
  
  // 如果没有倒计时，显示正计时
  if (!countdownData || !countdownData.isRunning) {
    chrome.runtime.sendMessage({ action: 'getTimerData' }, (timerData) => {
      if (timerData.isRunning && timerData.currentSession) {
        let currentTime;
        
        if (isPaused && timerPauseTime > 0) {
          // 如果暂停了，显示暂停时的时间
          currentTime = timerPauseTime - timerData.currentSession.startTime - timerPauseOffset;
        } else {
          // 正常运行或继续后
          currentTime = Date.now() - timerData.currentSession.startTime - timerPauseOffset;
        }
        
        document.getElementById('pta-current-time').textContent = formatTime(currentTime);
      }
    });
  }
  
  // 每秒更新一次
  setTimeout(updateTimerDisplay, 1000);
}

// 更新倒计时显示
function updateCountdownDisplay() {
  if (!countdownData || !countdownData.isRunning) {
    // 尝试从存储中加载倒计时数据
    chrome.storage.local.get(['countdownData'], (result) => {
      if (result.countdownData && result.countdownData.isRunning) {
        countdownData = result.countdownData;
        updateCountdownDisplay();
      }
    });
    return;
  }
  
  const currentTime = Date.now();
  let elapsed;
  
  if (isPaused && countdownPauseTime > 0) {
    // 如果暂停了，使用暂停时的时间
    elapsed = countdownPauseTime - countdownData.startTime;
  } else {
    // 正常运行或继续后
    elapsed = currentTime - countdownData.startTime;
  }
  
  const remaining = Math.max(0, countdownData.duration - elapsed);
  
  if (remaining <= 0) {
    // 倒计时结束
    countdownData.isRunning = false;
    
    // 显示通知
    if (Notification.permission === 'granted') {
      new Notification('PTA计时器', {
        body: '倒计时结束！',
        icon: 'icons/icon48.png'
      });
    } else {
      alert('倒计时结束！');
    }
    
    // 清除存储的倒计时数据
    chrome.storage.local.remove(['countdownData']);
    
    // 重置暂停状态
    isPaused = false;
    countdownPauseTime = 0;
    const playPauseButton = document.getElementById('pta-play-pause');
    playPauseButton.textContent = '⏸️';
    playPauseButton.title = '暂停';
  } else {
    // 显示剩余时间在正计时位置
    const timeDisplay = document.getElementById('pta-current-time');
    timeDisplay.textContent = formatCountdownTime(remaining);
    
    // 根据剩余时间设置样式
    const minutes = Math.floor(remaining / 60000);
    timeDisplay.className = 'timer-time';
    
    if (minutes <= 5) {
      timeDisplay.classList.add('danger');
    } else if (minutes <= 10) {
      timeDisplay.classList.add('warning');
    }
  }
}

// 格式化倒计时时间
function formatCountdownTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 格式化时间
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
} 