let pauseBtn = document.getElementById('pause-btn');
let addTimeBtn = document.getElementById('add-time-btn');
let removeTimeBtn = document.getElementById('remove-time-btn');

// --- State ---
let currentTime = 0;      // remaining ms set by the user
let endTime = 0;          // absolute timestamp (ms) when timer should end
let rafId = null;         // requestAnimationFrame handle
let isRunning = false;
let totalDuration = 0;    // reference for progress bar
const progressBarActive = document.querySelector('.timer-progress-bar-active');

// --- Persistence ---
function saveState() {
    localStorage.setItem('notionTimerState', JSON.stringify({
        currentTime,
        endTime,
        isRunning,
        totalDuration
    }));
}

function loadState() {
    const saved = localStorage.getItem('notionTimerState');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            currentTime = state.currentTime || 0;
            endTime = state.endTime || 0;
            isRunning = state.isRunning || false;
            totalDuration = state.totalDuration || 0;

            if (isRunning) {
                const remaining = endTime - Date.now();
                if (remaining > 0) {
                    startBtn.classList.add('hidden');
                    pauseBtn.classList.remove('hidden');
                    runLoop();
                } else {
                    timeIsUp();
                }
            } else {
                updateDisplay(currentTime);
            }
        } catch (e) {
            console.error('Failed to load timer state:', e);
        }
    }
}

// --- Timer display element ---
let timerDisplayText = document.getElementById('timer-display-text');
timerDisplayText.addEventListener('click', makeEditable);

function makeEditable() {
    if (isRunning) return;          // don't allow editing while running
    timerDisplayText.textContent = ':';
    timerDisplayText.contentEditable = true;
    timerDisplayText.focus();

    timerDisplayText.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            timerDisplayText.blur();
            applyTime();
        }
    };
}

function applyTime() {
    timerDisplayText.contentEditable = false;

    // Strip non-numeric/non-colon characters first
    const sanitized = timerDisplayText.textContent.replace(/[^0-9:]/g, '').trim();

    // Split into parts by ':'
    const parts = sanitized.split(':');

    let mins = 0;
    let secs = 0;

    if (parts.length >= 2) {
        mins = parseInt(parts[0]) || 0;
        secs = parseInt(parts[1]) || 0;
    } else if (parts.length === 1) {
        mins = parseInt(parts[0]) || 0;
    }

    // Clamp both to 0-59
    mins = Math.min(59, Math.max(0, mins));
    secs = Math.min(59, Math.max(0, secs));

    // Reformat as MM:SS
    timerDisplayText.textContent =
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Save the time in milliseconds
    currentTime = (mins * 60 + secs) * 1000;
    saveState();
}

// Reset
let resetBtn = document.getElementById('reset-btn');
resetBtn.addEventListener('click', resetTimer);

function resetTimer() {
    stopLoop();
    isRunning = false;
    currentTime = 0;
    endTime = 0;
    totalDuration = 0;
    progressBarActive.style.width = '100%';
    timerDisplayText.textContent = '00:00';
    startBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
    saveState();
}

// Start
let startBtn = document.getElementById('start-btn');
startBtn.addEventListener('click', startTimer);

function startTimer() {
    if (isRunning) return;

    if (currentTime <= 0) {
        currentTime = 60 * 1000; // Default to 1 minute
        updateDisplay(currentTime);
    }

    // Calculate the absolute end timestamp
    endTime = Date.now() + currentTime;
    totalDuration = currentTime; // Set baseline for progress bar
    isRunning = true;

    startBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');

    runLoop();
    saveState();
}

// Pause / Resume
pauseBtn.addEventListener('click', () => {
    if (isRunning) {
        // Pause: store remaining time and stop the loop
        currentTime = Math.max(0, endTime - Date.now());
        stopLoop();
        isRunning = false;
        pauseBtn.classList.add('hidden');
        startBtn.classList.remove('hidden');
    } else {
        // Resume: recalculate endTime from remaining time
        endTime = Date.now() + currentTime;
        isRunning = true;
        startBtn.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
        runLoop();
    }
    saveState();
});

// Core countdown loop (timestamp-based)
let lastSecond = -1;

function runLoop() {
    rafId = requestAnimationFrame(() => {
        const remaining = endTime - Date.now();

        if (remaining <= 0) {
            timeIsUp();
            return;
        }

        // Convert remaining ms to MM:SS for display
        const totalSecs = Math.ceil(remaining / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        timerDisplayText.textContent =
            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        // Update progress bar (only once per second for a 'ticking' wave feel)
        if (totalSecs !== lastSecond) {
            const progress = Math.min(100, Math.max(0, (remaining / totalDuration) * 100));
            progressBarActive.style.width = `${progress}%`;
            lastSecond = totalSecs;
        }

        runLoop(); // schedule next frame
    });
}

function stopLoop() {
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}

// --- Time is up ---
function timeIsUp() {
    stopLoop();
    isRunning = false;
    currentTime = 0;
    endTime = 0;
    totalDuration = 0;
    progressBarActive.style.width = '0%';
    timerDisplayText.textContent = '00:00';
    startBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
    saveState();
}

// Add / Remove one minute
const ONE_MINUTE = 60 * 1000;

function updateDisplay(ms) {
    const totalSecs = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    timerDisplayText.textContent =
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

addTimeBtn.addEventListener('click', () => {
    if (isRunning) {
        // Shift the end timestamp forward by 1 minute
        endTime += ONE_MINUTE;
        totalDuration += ONE_MINUTE; // Increase total too to keep progress relative
    } else {
        // Cap at 59:59
        currentTime = Math.min(currentTime + ONE_MINUTE, 59 * 60000 + 59000);
        updateDisplay(currentTime);
    }
    saveState();
});

removeTimeBtn.addEventListener('click', () => {
    if (isRunning) {
        // Shift the end timestamp back by 1 minute (don't go below 0)
        const remaining = endTime - Date.now();
        if (remaining > ONE_MINUTE) {
            endTime -= ONE_MINUTE;
            // Also reduce totalDuration but don't let it go below ONE_MINUTE or current remaining
            totalDuration = Math.max(remaining - ONE_MINUTE, totalDuration - ONE_MINUTE);
        }
    } else {
        // Don't go below 0
        currentTime = Math.max(0, currentTime - ONE_MINUTE);
        updateDisplay(currentTime);
    }
    saveState();
});

// Initialize state
loadState();

// function updateDisplay() {
//     let mins = Math.floor(timeLeft / 60);
//     let secs = timeLeft % 60;
//     timerDisplayText.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
// }

// function startTimer() {
//     if (timeLeft > 0) {
//         startBtn.classList.add('hidden');
//         pauseBtn.classList.remove('hidden');
//         timerId = setInterval(() => {
//             timeLeft--;
//             updateDisplay();
//             if (timeLeft <= 0) {
//                 stopTimer();
//             }
//         }, 1000);
//     }
// }

// function stopTimer() {
//     clearInterval(timerId);
//     timerId = null;
//     startBtn.classList.remove('hidden');
//     pauseBtn.classList.add('hidden');
// }

// function makeEditable() {
//     timerDisplayText.contentEditable = true;
//     timerDisplayText.focus();
//     stopTimer();

//     const finishEdit = () => {
//         timerDisplayText.contentEditable = false;
//         let text = timerDisplayText.textContent.trim();
//         let parts = text.split(':');
        
//         let mins = 0;
//         let secs = 0;

//         if (parts.length === 2) {
//             mins = parseInt(parts[0]) || 0;
//             secs = parseInt(parts[1]) || 0;
//         } else if (parts.length === 1) {
//             mins = parseInt(parts[0]) || 0;
//         }

//         mins = Math.max(0, mins);
//         secs = Math.max(0, Math.min(secs, 59));
        
//         timeLeft = (mins * 60) + secs;
//         updateDisplay();
//     };

//     timerDisplayText.onblur = finishEdit;
//     timerDisplayText.onkeydown = (e) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             timerDisplayText.blur();
//         }
//     };
// }

// timerDisplayText.addEventListener('click', makeEditable);

// startBtn.addEventListener('click', startTimer);
// pauseBtn.addEventListener('click', stopTimer);

// resetBtn.addEventListener('click', () => {
//     stopTimer();
//     timeLeft = 0;
//     updateDisplay();
// });

// addTimeBtn.addEventListener('click', () => {
//     timeLeft += 60;
//     updateDisplay();
// });

// removeTimeBtn.addEventListener('click', () => {
//     if (timeLeft >= 60) {
//         timeLeft -= 60;
//         updateDisplay();
//     }
// });