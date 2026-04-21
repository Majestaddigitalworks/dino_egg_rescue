const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const savedCountEl = document.getElementById("savedCount");
const babyCountEl = document.getElementById("babyCount");
const livesCountEl = document.getElementById("livesCount");
const capturedEggCountEl = document.getElementById("capturedEggCount");
const capturedBabyCountEl = document.getElementById("capturedBabyCount");
const timeCountEl = document.getElementById("timeCount");
const arrivalCountEl = document.getElementById("arrivalCount");
const stayCountEl = document.getElementById("stayCount");
const nextRaidCountEl = document.getElementById("nextRaidCount");
const startBtn = document.getElementById("startBtn");
const startScreen = document.getElementById("startScreen");

const btnUp = document.getElementById("btnUp");
const btnDown = document.getElementById("btnDown");
const btnLeft = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");

// Images
const bigDinoImg = new Image();
bigDinoImg.src = "assets/big_dino.png";

const bigDinoOpenImg = new Image();
bigDinoOpenImg.src = "assets/big_dino_openjaw.png";

const babyDinoImg = new Image();
babyDinoImg.src = "assets/baby_dino.png";

const eggImg = new Image();
eggImg.src = "assets/egg.png";

const hatchEggImg = new Image();
hatchEggImg.src = "assets/hatch_egg.png";

const badHunterImg = new Image();
badHunterImg.src = "assets/bad_hunter.png";

// State
let animationId = null;
let gameRunning = false;
let frameCount = 0;
let secondClock = 0;

const keys = {};

const WORLD = {
  width: 4200,
  skyH: 430,
  groundY: 510
};

const camera = {
  x: 0
};

const dino = {
  x: 300,
  y: 420,
  w: 120,
  h: 120,
  speed: 6.8, // faster
  dir: 1
};

let eggs = [];
let babies = [];

let rescuedEggs = 0;
let lives = 3;
let totalCapturedEggs = 0;
let totalCapturedBabies = 0;
let raidCapturedEggs = 0;
let raidCapturedBabies = 0;
let gameOver = false;
let win = false;
let totalTime = 90;

let hatchEffect = {
  active: false,
  x: 0,
  y: 0,
  timer: 0
};

const raid = {
  interval: 20,
  activeTime: 16,
  countdown: 20,
  activeCountdown: 16,
  nextRaidCountdown: 20,
  state: "waiting"
};

const hunter = {
  x: WORLD.width + 300,
  y: 420,
  w: 430,
  h: 170,
  speed: 2.5,
  dir: -1,
  targetType: null,
  targetIndex: -1,
  stealCooldown: 0
};

// Input keyboard
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// Restart
if (startBtn) {
  startBtn.addEventListener("click", () => {
    startGame();
  });
}

// Fullscreen start
if (startScreen) {
  startScreen.addEventListener("click", startGameFullscreen);
  startScreen.addEventListener("touchstart", startGameFullscreen, { passive: true });
}

// Touch controls
function bindTouchButton(button, keyName) {
  if (!button) return;

  const press = (e) => {
    e.preventDefault();
    keys[keyName] = true;
  };

  const release = (e) => {
    e.preventDefault();
    keys[keyName] = false;
  };

  button.addEventListener("touchstart", press, { passive: false });
  button.addEventListener("touchend", release, { passive: false });
  button.addEventListener("touchcancel", release, { passive: false });

  button.addEventListener("mousedown", press);
  button.addEventListener("mouseup", release);
  button.addEventListener("mouseleave", release);
}

bindTouchButton(btnUp, "ArrowUp");
bindTouchButton(btnDown, "ArrowDown");
bindTouchButton(btnLeft, "ArrowLeft");
bindTouchButton(btnRight, "ArrowRight");

// Helpers
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = String(Math.floor(safe / 60)).padStart(2, "0");
  const s = String(safe % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function rectsCollide(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function worldToScreenX(x) {
  return x - camera.x;
}

async function startGameFullscreen() {
  if (startScreen && startScreen.style.display === "none") return;

  const el = document.documentElement;

  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  } catch (err) {
    // ignore
  }

  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock("landscape");
    }
  } catch (err) {
    // ignore
  }

  if (startScreen) {
    startScreen.style.display = "none";
  }

  startGame();
}

function updateHud() {
  if (savedCountEl) savedCountEl.textContent = rescuedEggs;
  if (babyCountEl) babyCountEl.textContent = babies.length;
  if (livesCountEl) livesCountEl.textContent = lives;
  if (capturedEggCountEl) capturedEggCountEl.textContent = totalCapturedEggs;
  if (capturedBabyCountEl) capturedBabyCountEl.textContent = totalCapturedBabies;
  if (timeCountEl) timeCountEl.textContent = formatTime(totalTime);

  if (!arrivalCountEl || !stayCountEl || !nextRaidCountEl) return;

  if (raid.state === "waiting") {
    arrivalCountEl.textContent = formatTime(raid.countdown);
    stayCountEl.textContent = formatTime(raid.activeTime);
    nextRaidCountEl.textContent = formatTime(raid.countdown);
  } else if (raid.state === "arriving" || raid.state === "active") {
    arrivalCountEl.textContent = "00:00";
    stayCountEl.textContent = formatTime(raid.activeCountdown);
    nextRaidCountEl.textContent = formatTime(raid.interval);
  } else {
    arrivalCountEl.textContent = "00:00";
    stayCountEl.textContent = "00:00";
    nextRaidCountEl.textContent = formatTime(raid.nextRaidCountdown);
  }
}

function spawnEgg() {
  eggs.push({
    x: rand(500, WORLD.width - 500),
    y: rand(472, 545),
    w: 50,
    h: 66
  });
}

function startHatch(x, y) {
  hatchEffect.active = true;
  hatchEffect.x = x;
  hatchEffect.y = y;
  hatchEffect.timer = 38;
}

function addBaby() {
  babies.push({
    x: dino.x - 80,
    y: dino.y + 52,
    w: 62,
    h: 62
  });
}

function resetHunter() {
  hunter.x = WORLD.width + 300;
  hunter.y = 420;
  hunter.targetType = null;
  hunter.targetIndex = -1;
  hunter.stealCooldown = 0;
  hunter.dir = -1;
}

function resetRaidCycle() {
  raid.state = "waiting";
  raid.countdown = raid.interval;
  raid.activeCountdown = raid.activeTime;
  raid.nextRaidCountdown = raid.interval;
  raidCapturedEggs = 0;
  raidCapturedBabies = 0;
  resetHunter();
}

function startGame() {
  eggs = [];
  babies = [];

  dino.x = 300;
  dino.y = 420;
  dino.dir = 1;

  camera.x = 0;

  rescuedEggs = 0;
  lives = 3;
  totalCapturedEggs = 0;
  totalCapturedBabies = 0;
  raidCapturedEggs = 0;
  raidCapturedBabies = 0;
  gameOver = false;
  win = false;
  totalTime = 90;

  hatchEffect.active = false;
  hatchEffect.timer = 0;

  frameCount = 0;
  secondClock = 0;

  resetRaidCycle();

  for (let i = 0; i < 7; i++) {
    spawnEgg();
  }

  updateHud();
  gameRunning = true;

  if (animationId) cancelAnimationFrame(animationId);
  loop();
}

// Player
function moveDino() {
  if (keys["ArrowUp"] || keys["w"] || keys["W"]) dino.y -= dino.speed;
  if (keys["ArrowDown"] || keys["s"] || keys["S"]) dino.y += dino.speed;

  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
    dino.x -= dino.speed;
    dino.dir = -1;
  }

  if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
    dino.x += dino.speed;
    dino.dir = 1;
  }

  dino.x = clamp(dino.x, 60, WORLD.width - 180);
  dino.y = clamp(dino.y, 390, 530);
}

function updateCamera() {
  const targetX = dino.x - canvas.width * 0.35;
  camera.x = clamp(targetX, 0, WORLD.width - canvas.width);
}

function updateEggs() {
  const dinoBox = { x: dino.x, y: dino.y, w: dino.w, h: dino.h };

  for (let i = eggs.length - 1; i >= 0; i--) {
    const egg = eggs[i];
    const eggBox = { x: egg.x, y: egg.y, w: egg.w, h: egg.h };

    if (rectsCollide(dinoBox, eggBox)) {
      rescuedEggs++;
      eggs.splice(i, 1);
      startHatch(egg.x, egg.y);

      if (rescuedEggs % 3 === 0) {
        addBaby();
      }

      spawnEgg();
      updateHud();
    }
  }
}

function updateBabies() {
  let targetX = dino.x - dino.dir * 70;
  let targetY = dino.y + 55;

  babies.forEach((baby, index) => {
    const dx = targetX - baby.x;
    const dy = targetY - baby.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const spacing = 75 + index * 6;

    if (distance > spacing) {
      baby.x += dx * 0.11;
      baby.y += dy * 0.11;
    }

    baby.y = clamp(baby.y, 450, 565);

    // babies face the direction we are walking
    baby.dir = dino.dir;

    targetX = baby.x - dino.dir * 62;
    targetY = baby.y + 6;
  });
}

function updateHatchEffect() {
  if (hatchEffect.active) {
    hatchEffect.timer--;
    if (hatchEffect.timer <= 0) {
      hatchEffect.active = false;
    }
  }
}

// Hunter
function chooseHunterTarget() {
  let nearestType = null;
  let nearestIndex = -1;
  let nearestDistance = Infinity;

  for (let i = 0; i < babies.length; i++) {
    const b = babies[i];
    const d = dist(hunter.x + 210, hunter.y + 90, b.x, b.y);
    if (d < nearestDistance) {
      nearestDistance = d;
      nearestType = "baby";
      nearestIndex = i;
    }
  }

  for (let i = 0; i < eggs.length; i++) {
    const e = eggs[i];
    const d = dist(hunter.x + 210, hunter.y + 90, e.x, e.y);
    if (d < nearestDistance) {
      nearestDistance = d;
      nearestType = "egg";
      nearestIndex = i;
    }
  }

  hunter.targetType = nearestType;
  hunter.targetIndex = nearestIndex;
}

function hunterCaptureZone() {
  return {
    x: hunter.x + 245,
    y: hunter.y + 52,
    w: 150,
    h: 92
  };
}

function hunterScareZone() {
  return {
    x: hunter.x + 90,
    y: hunter.y + 25,
    w: 130,
    h: 110
  };
}

// roar only while truck is actually on screen / active
function shouldRoarAtHunter() {
  return raid.state === "arriving" || raid.state === "active";
}

function updateHunterAI() {
  if (hunter.stealCooldown > 0) hunter.stealCooldown--;

  chooseHunterTarget();

  if (hunter.targetType === "egg" && eggs[hunter.targetIndex]) {
    const egg = eggs[hunter.targetIndex];
    const targetX = egg.x - 250;
    hunter.dir = targetX < hunter.x ? -1 : 1;
    hunter.x += Math.sign(targetX - hunter.x) * hunter.speed;

    const zone = hunterCaptureZone();
    if (
      rectsCollide(zone, { x: egg.x, y: egg.y, w: egg.w, h: egg.h }) &&
      hunter.stealCooldown <= 0
    ) {
      eggs.splice(hunter.targetIndex, 1);
      totalCapturedEggs++;
      raidCapturedEggs++;
      hunter.stealCooldown = 45;
      spawnEgg();
      updateHud();
    }
  } else if (hunter.targetType === "baby" && babies[hunter.targetIndex]) {
    const baby = babies[hunter.targetIndex];
    const targetX = baby.x - 250;
    hunter.dir = targetX < hunter.x ? -1 : 1;
    hunter.x += Math.sign(targetX - hunter.x) * hunter.speed;

    const zone = hunterCaptureZone();
    if (
      rectsCollide(zone, { x: baby.x, y: baby.y, w: baby.w, h: baby.h }) &&
      hunter.stealCooldown <= 0
    ) {
      babies.splice(hunter.targetIndex, 1);
      totalCapturedBabies++;
      raidCapturedBabies++;
      hunter.stealCooldown = 45;
      updateHud();
    }
  } else {
    hunter.x -= hunter.speed;
    hunter.dir = -1;
  }

  hunter.x = clamp(hunter.x, 200, WORLD.width - 440);

  const dinoBox = { x: dino.x, y: dino.y, w: dino.w, h: dino.h };
  const scareZone = hunterScareZone();

  if (rectsCollide(dinoBox, scareZone)) {
    raid.state = "leaving";
    raid.nextRaidCountdown = raid.interval;
    updateHud();
  }
}

function updateRaidCyclePerSecond() {
  if (raid.state === "waiting") {
    raid.countdown--;
    raid.nextRaidCountdown = raid.countdown;

    if (raid.countdown <= 0) {
      raid.state = "arriving";
    }
  } else if (raid.state === "active") {
    raid.activeCountdown--;

    if (raid.activeCountdown <= 0) {
      raid.state = "leaving";
      raid.nextRaidCountdown = raid.interval;
    }
  } else if (raid.state === "leaving") {
    raid.nextRaidCountdown--;
    if (raid.nextRaidCountdown < 0) raid.nextRaidCountdown = 0;
  }
}

function updateHunterMovement() {
  if (raid.state === "arriving") {
    hunter.x -= hunter.speed + 1.8;

    if (hunter.x <= camera.x + canvas.width - 460) {
      raid.state = "active";
      raid.activeCountdown = raid.activeTime;
    }
  } else if (raid.state === "active") {
    updateHunterAI();
  } else if (raid.state === "leaving") {
    hunter.x += hunter.speed + 3;

    if (hunter.x > camera.x + canvas.width + 500) {
      if (raidCapturedEggs + raidCapturedBabies >= 8) {
        lives--;
      }

      if (lives <= 0) {
        gameOver = true;
        gameRunning = false;
      } else {
        resetRaidCycle();
      }
      updateHud();
    }
  }
}

function updateGamePerSecond() {
  totalTime--;

  if (totalTime <= 0) {
    totalTime = 0;
    gameRunning = false;
    gameOver = true;
    win = rescuedEggs >= 12;
  }

  updateRaidCyclePerSecond();
  updateHud();
}

// Drawing
function drawSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.skyH);
  sky.addColorStop(0, "#67c6ff");
  sky.addColorStop(1, "#b8ecff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, WORLD.skyH);
}

function drawCloud(x, y, s, parallax) {
  const sx = x - camera.x * parallax;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.beginPath();
  ctx.arc(sx, y, 22 * s, 0, Math.PI * 2);
  ctx.arc(sx + 26 * s, y - 12 * s, 28 * s, 0, Math.PI * 2);
  ctx.arc(sx + 58 * s, y, 20 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawMountains() {
  ctx.fillStyle = "#7eb2c9";

  for (let i = 0; i < 8; i++) {
    const baseX = i * 520 - camera.x * 0.35;
    ctx.beginPath();
    ctx.moveTo(baseX - 120, 470);
    ctx.lineTo(baseX + 80, 360 + (i % 2) * 20);
    ctx.lineTo(baseX + 300, 470);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#97c66e";
  ctx.fillRect(0, 470, canvas.width, 55);
}

function drawTrees() {
  for (let i = 0; i < 14; i++) {
    const baseX = i * 320 + 80 - camera.x * 0.65;
    const scale = i % 3 === 0 ? 1.45 : 0.95;

    ctx.fillStyle = "#6b4526";
    ctx.fillRect(baseX, 440 + (1.4 - scale) * 35, 14 * scale, 70 * scale);

    ctx.fillStyle = "#7dc442";
    ctx.beginPath();
    ctx.arc(baseX + 7 * scale, 425 + (1.4 - scale) * 35, 34 * scale, 0, Math.PI * 2);
    ctx.arc(baseX - 18 * scale, 450 + (1.4 - scale) * 35, 28 * scale, 0, Math.PI * 2);
    ctx.arc(baseX + 28 * scale, 448 + (1.4 - scale) * 35, 28 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#98d85f";
    ctx.beginPath();
    ctx.arc(baseX - 8 * scale, 420 + (1.4 - scale) * 35, 18 * scale, 0, Math.PI * 2);
    ctx.arc(baseX + 20 * scale, 430 + (1.4 - scale) * 35, 16 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround() {
  ctx.fillStyle = "#7eb13b";
  ctx.fillRect(0, WORLD.groundY, canvas.width, 55);

  ctx.fillStyle = "#6f4b1f";
  ctx.fillRect(0, 565, canvas.width, 155);

  ctx.fillStyle = "#59401d";
  for (let i = -1; i < 22; i++) {
    const x = i * 80 - (camera.x % 80);
    ctx.beginPath();
    ctx.arc(x + 18, 635, 16, 0, Math.PI * 2);
    ctx.arc(x + 48, 675, 11, 0, Math.PI * 2);
    ctx.arc(x + 72, 612, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#8ccb45";
  for (let i = -1; i < 60; i++) {
    const x = i * 24 - (camera.x % 24);
    ctx.fillRect(x, WORLD.groundY - 6, 12, 6);
  }
}

function drawShadow(screenX, y, w, h, alpha = 0.16) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(screenX + w / 2, y + h - 5, w * 0.32, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEgg(egg) {
  const sx = worldToScreenX(egg.x);
  if (sx < -100 || sx > canvas.width + 100) return;

  drawShadow(sx, egg.y, egg.w, egg.h, 0.12);
  ctx.drawImage(eggImg, sx, egg.y, egg.w, egg.h);
}

function drawHatch() {
  if (!hatchEffect.active) return;
  const sx = worldToScreenX(hatchEffect.x);
  const pop = Math.sin(hatchEffect.timer * 0.45) * 3;
  drawShadow(sx - 6, hatchEffect.y - 4 + pop, 62, 62, 0.13);
  ctx.drawImage(hatchEggImg, sx - 6, hatchEffect.y - 4 + pop, 62, 62);
}

function drawBigDino() {
  const sx = worldToScreenX(dino.x);

  // tiny roar bounce
  const roaring = shouldRoarAtHunter();
  const jawFrame = Math.floor(frameCount / 18) % 2 === 0; // slower, more natural
  const currentDinoImg = roaring && jawFrame ? bigDinoOpenImg : bigDinoImg;
  const roarOffsetY = roaring ? Math.sin(frameCount * 0.18) * 2 : 0;

  drawShadow(sx, dino.y, dino.w, dino.h, 0.15);

  ctx.save();
  if (dino.dir === -1) {
    ctx.translate(sx + dino.w, dino.y + roarOffsetY);
    ctx.scale(-1, 1);
    ctx.drawImage(currentDinoImg, 0, 0, dino.w, dino.h);
  } else {
    ctx.drawImage(currentDinoImg, sx, dino.y + roarOffsetY, dino.w, dino.h);
  }
  ctx.restore();
}

function drawBabies() {
  babies.forEach((baby) => {
    const sx = worldToScreenX(baby.x);
    if (sx < -100 || sx > canvas.width + 100) return;

    drawShadow(sx, baby.y, baby.w, baby.h, 0.14);

    const facing = baby.dir || dino.dir;

    ctx.save();
    if (facing === -1) {
      ctx.translate(sx + baby.w, baby.y);
      ctx.scale(-1, 1);
      ctx.drawImage(babyDinoImg, 0, 0, baby.w, baby.h);
    } else {
      ctx.drawImage(babyDinoImg, sx, baby.y, baby.w, baby.h);
    }
    ctx.restore();
  });
}

function drawHunterTruck() {
  if (raid.state === "waiting") return;

  const sx = worldToScreenX(hunter.x);
  drawShadow(sx, hunter.y + 15, hunter.w, hunter.h, 0.18);

  ctx.save();
  if (hunter.dir === 1) {
    ctx.translate(sx + hunter.w, hunter.y);
    ctx.scale(-1, 1);
    ctx.drawImage(badHunterImg, 0, 0, hunter.w, hunter.h);
  } else {
    ctx.drawImage(badHunterImg, sx, hunter.y, hunter.w, hunter.h);
  }
  ctx.restore();

  const eggsToDraw = Math.min(raidCapturedEggs, 10);
  for (let i = 0; i < eggsToDraw; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const ex = sx + 268 + col * 35 + row * 10;
    const ey = hunter.y + 70 - row * 24;
    ctx.drawImage(eggImg, ex, ey, 34, 42);
  }

  const babiesToDraw = Math.min(raidCapturedBabies, 6);
  for (let i = 0; i < babiesToDraw; i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const bx = sx + 286 + col * 46;
    const by = hunter.y + 110 - row * 20;
    ctx.drawImage(babyDinoImg, bx, by, 34, 34);
  }
}

function drawOverlay() {
  if (!gameOver) return;

  ctx.fillStyle = "rgba(0,0,0,0.40)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 62px Arial";
  ctx.fillText(win ? "You Win!" : (totalTime <= 0 ? "Time Up!" : "Game Over"), canvas.width / 2, 280);

  ctx.font = "32px Arial";
  ctx.fillText("Press Start / Restart to play again", canvas.width / 2, 340);
  ctx.textAlign = "left";
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawSky();
  drawCloud(180, 160, 1.4, 0.12);
  drawCloud(800, 220, 1.2, 0.12);
  drawCloud(1450, 140, 1.55, 0.12);
  drawCloud(2300, 190, 1.25, 0.12);
  drawMountains();
  drawTrees();
  drawGround();

  eggs.forEach(drawEgg);
  drawHatch();
  drawBabies();
  drawBigDino();
  drawHunterTruck();
  drawOverlay();
}

// Loop
function loop() {
  frameCount++;

  if (gameRunning) {
    moveDino();
    updateBabies();
    updateEggs();
    updateHatchEffect();
    updateCamera();
    updateHunterMovement();

    secondClock++;
    if (secondClock >= 60) {
      secondClock = 0;
      updateGamePerSecond();
    }
  }

  drawScene();
  animationId = requestAnimationFrame(loop);
}

// Boot
drawScene();
updateHud();
