const setupScreen = document.getElementById("setupScreen");
const playScreen = document.getElementById("playScreen");
const resultScreen = document.getElementById("resultScreen");

const minTimeInput = document.getElementById("minTime");
const maxTimeInput = document.getElementById("maxTime");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const bomb = document.getElementById("bomb");
const statusText = document.getElementById("statusText");
const backgroundGlow = document.getElementById("backgroundGlow");

let explodeTime = 0;        // 실제 폭발 시간(초)
let warningStartTime = 0;   // 경고 시작 시간(초)

let gameStartTime = 0;
let animationFrameId = null;

let warningStarted = false;
let exploded = false;
let nextBeepAt = 0;

// 오디오용
let audioCtx = null;
let backgroundInterval = null;

/**
 * 화면 전환
 */
function showScreen(screenElement) {
  [setupScreen, playScreen, resultScreen].forEach((screen) => {
    screen.classList.remove("active");
  });

  screenElement.classList.add("active");
}

/**
 * 최소~최대 사이 랜덤 숫자
 */
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * 입력값 검증
 */
function validateInput(min, max) {
  if (Number.isNaN(min) || Number.isNaN(max)) {
    alert("숫자를 입력해주세요.");
    return false;
  }

  if (min < 3 || max < 3) {
    alert("최소 3초 이상으로 설정해주세요.");
    return false;
  }

  if (min > 300 || max > 300) {
    alert("최대 300초 이하로 설정해주세요.");
    return false;
  }

  if (min >= max) {
    alert("최대 시간은 최소 시간보다 커야 합니다.");
    return false;
  }

  return true;
}

/**
 * Web Audio 초기화
 */
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

/**
 * 짧은 톤 재생
 */
function playTone(frequency, duration, type = "sine", volume = 0.05) {
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    audioCtx.currentTime + duration
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
}

/**
 * 기본 배경음 느낌의 반복 비프
 * 너무 강하지 않게 낮은 톤으로만 깔아줌
 */
function startBackgroundSound() {
  stopBackgroundSound();

  backgroundInterval = setInterval(() => {
    if (!exploded) {
      playTone(180, 0.08, "triangle", 0.018);
    }
  }, 1400);
}

/**
 * 배경음 정지
 */
function stopBackgroundSound() {
  if (backgroundInterval) {
    clearInterval(backgroundInterval);
    backgroundInterval = null;
  }
}

/**
 * 경고 비프음
 */
function playBeep() {
  playTone(880, 0.08, "square", 0.06);
}

/**
 * 폭발음
 */
function playExplosionSound() {
  if (!audioCtx) return;

  // 낮아지는 노이즈 느낌 대신 여러 톤 겹쳐서 간단 폭발음 흉내
  playTone(140, 0.35, "sawtooth", 0.08);
  playTone(90, 0.45, "square", 0.06);
  playTone(60, 0.55, "triangle", 0.05);
}

/**
 * 모바일 진동
 */
function vibrateExplosion() {
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 200, 100, 300]);
  }
}

/**
 * 게임 상태 초기화
 */
function resetGameVisual() {
  bomb.classList.remove("shake-warning", "explode");
  bomb.classList.add("shake-normal");

  backgroundGlow.classList.remove("warning-bg");
  statusText.textContent = "휴대폰을 옆 사람에게 넘기세요";
}

/**
 * 게임 시작
 */
function startGame() {
  const min = Number(minTimeInput.value);
  const max = Number(maxTimeInput.value);

  if (!validateInput(min, max)) {
    return;
  }

  initAudio();

  explodeTime = randomBetween(min, max);

  // 폭발 시간의 50% ~ 85% 사이에서 경고 시작
  warningStartTime = randomBetween(explodeTime * 0.5, explodeTime * 0.85);

  gameStartTime = performance.now();
  warningStarted = false;
  exploded = false;
  nextBeepAt = 0;

  resetGameVisual();
  showScreen(playScreen);
  startBackgroundSound();

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  animationFrameId = requestAnimationFrame(updateGame);
}

/**
 * 폭발 처리
 */
function explodeGame() {
  exploded = true;

  stopBackgroundSound();
  bomb.classList.remove("shake-normal", "shake-warning");
  bomb.classList.add("explode");

  statusText.textContent = "💥 터졌습니다!";
  playExplosionSound();
  vibrateExplosion();

  setTimeout(() => {
    showScreen(resultScreen);
  }, 900);
}

/**
 * 메인 루프
 */
function updateGame(now) {
  if (exploded) return;

  const elapsedSeconds = (now - gameStartTime) / 1000;

  // 경고 시작
  if (!warningStarted && elapsedSeconds >= warningStartTime) {
    warningStarted = true;
    bomb.classList.remove("shake-normal");
    bomb.classList.add("shake-warning");
    backgroundGlow.classList.add("warning-bg");
    statusText.textContent = "조심하세요...";
    nextBeepAt = now;
  }

  // 경고음 점점 빨라짐 + 약간 랜덤
  if (warningStarted && now >= nextBeepAt) {
    playBeep();

    const progress =
      (elapsedSeconds - warningStartTime) / (explodeTime - warningStartTime);

    let interval = 1200 - progress * 850;
    interval += randomBetween(-120, 120);
    interval = Math.max(220, interval);

    nextBeepAt = now + interval;
  }

  // 폭발
  if (elapsedSeconds >= explodeTime) {
    explodeGame();
    return;
  }

  animationFrameId = requestAnimationFrame(updateGame);
}

/**
 * 다시 하기
 */
function restartGame() {
  stopBackgroundSound();

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  showScreen(setupScreen);
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartGame);