// 弹窗脚本
document.addEventListener('DOMContentLoaded', function() {
  // 初始化显示
  updateDisplay();
  
  // 绑定事件
  document.getElementById('start-countdown').addEventListener('click', startCountdown);
  document.getElementById('reset-timer').addEventListener('click', resetTimer);
  document.getElementById('clear-data').addEventListener('click', clearData);
  
  // 每秒更新显示
  setInterval(updateDisplay, 1000);
});

// 更新显示
function updateDisplay() {
  // 获取计时器数据
  chrome.runtime.sendMessage({ action: 'getTimerData' }, (timerData) => {
    // 更新当前时间
    if (timerData.isRunning && timerData.currentSession) {
      const currentTime = Date.now() - timerData.currentSession.startTime;
      document.getElementById('current-time').textContent = formatTime(currentTime);
    } else {
      document.getElementById('current-time').textContent = '00:00:00';
    }
    
    // 更新会话列表
    updateSessionsList(timerData.sessions);
  });
  
  // 更新倒计时显示
  updateCountdownDisplay();
}

// 开始倒计时
function startCountdown() {
  const input = document.getElementById('countdown-input');
  const duration = parseInt(input.value);
  
  if (duration && duration > 0) {
    // 发送消息给content script开始倒计时
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'startCountdown',
        duration: duration
      });
    });
    
    input.value = '';
  } else {
    alert('请输入有效的时间（分钟）');
  }
}

// 更新倒计时显示
function updateCountdownDisplay() {
  chrome.storage.local.get(['countdownData'], (result) => {
    const countdownDisplay = document.getElementById('countdown-display');
    
    if (result.countdownData && result.countdownData.isRunning) {
      const countdown = result.countdownData;
      const elapsed = Date.now() - countdown.startTime;
      const remaining = Math.max(0, countdown.duration - elapsed);
      
      if (remaining <= 0) {
        countdownDisplay.textContent = '倒计时结束';
        countdownDisplay.style.display = 'block';
        countdownDisplay.className = 'countdown-display';
      } else {
        countdownDisplay.textContent = formatCountdownTime(remaining);
        countdownDisplay.style.display = 'block';
        
        // 根据剩余时间设置样式
        const minutes = Math.floor(remaining / 60000);
        countdownDisplay.className = 'countdown-display';
        
        if (minutes <= 5) {
          countdownDisplay.classList.add('danger');
        } else if (minutes <= 10) {
          countdownDisplay.classList.add('warning');
        }
      }
    } else {
      countdownDisplay.textContent = '未设置';
      countdownDisplay.style.display = 'none';
    }
  });
}

// 重置计时器
function resetTimer() {
  if (confirm('确定要重置当前计时吗？')) {
    chrome.runtime.sendMessage({ action: 'stopTimer' });
    
    // 同时清除倒计时
    chrome.storage.local.remove(['countdownData']);
  }
}

// 清除数据
function clearData() {
  if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
    chrome.storage.local.clear(() => {
      updateDisplay();
    });
  }
}

// 更新会话列表
function updateSessionsList(sessions) {
  const sessionsList = document.getElementById('sessions-list');
  
  if (sessions.length === 0) {
    sessionsList.innerHTML = '<div class="session-item"><div class="session-id">暂无记录</div></div>';
    return;
  }
  
  // 显示最近5个会话
  const recentSessions = sessions.slice(-5).reverse();
  sessionsList.innerHTML = '';
  
  recentSessions.forEach(session => {
    const sessionItem = document.createElement('div');
    sessionItem.className = 'session-item';
    sessionItem.innerHTML = `
      <div class="session-id">题目: ${session.problemId}</div>
      <div class="session-time">时间: ${formatTime(session.duration)}</div>
    `;
    sessionsList.appendChild(sessionItem);
  });
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