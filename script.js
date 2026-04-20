const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// LOAD IMAGES
const bigDinoImg = new Image();
bigDinoImg.src = "assets/big_dino.png";

const eggImg = new Image();
eggImg.src = "assets/egg.png";

const hatchImg = new Image();
hatchImg.src = "assets/hatch_egg.png";

const babyImg = new Image();
babyImg.src = "assets/baby_dino.png";

const dino = { x: 60, y: 200, w: 60, h: 60, speed: 5 };
let egg = { x: 300, y: 200, size: 40, state: "normal", timer: 0 };

let babies = [];
let score = 0;

const keys = {};

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

function moveDino() {
  if (keys["ArrowUp"]) dino.y -= dino.speed;
  if (keys["ArrowDown"]) dino.y += dino.speed;
  if (keys["ArrowLeft"]) dino.x -= dino.speed;
  if (keys["ArrowRight"]) dino.x += dino.speed;

  dino.x = Math.max(0, Math.min(canvas.width - dino.w, dino.x));
  dino.y = Math.max(0, Math.min(canvas.height - dino.h, dino.y));
}

function spawnEgg() {
  egg.x = Math.random() * (canvas.width - 60) + 20;
  egg.y = Math.random() * (canvas.height - 60) + 20;
  egg.state = "normal";
  egg.timer = 0;
}

function checkHit() {
  return (
    dino.x < egg.x + egg.size &&
    dino.x + dino.w > egg.x &&
    dino.y < egg.y + egg.size &&
    dino.y + dino.h > egg.y
  );
}

function updateEgg() {
  if (egg.state === "hatching") {
    egg.timer++;
    if (egg.timer > 30) {
      babies.push({ x: dino.x, y: dino.y });
      spawnEgg();
      score++;
    }
  }
}

function drawEgg() {
  if (egg.state === "normal") {
    ctx.drawImage(eggImg, egg.x, egg.y, 40, 50);
  } else {
    ctx.drawImage(hatchImg, egg.x, egg.y, 50, 50);
  }
}

function drawDino() {
  ctx.drawImage(bigDinoImg, dino.x, dino.y, dino.w, dino.h);
}

function drawBabies() {
  babies.forEach((b, i) => {
    // follow effect
    b.x += (dino.x - b.x) * 0.05;
    b.y += (dino.y - b.y) * 0.05;

    ctx.drawImage(babyImg, b.x - (i * 10), b.y + 40, 30, 30);
  });
}

function gameLoop() {
  moveDino();

  if (checkHit() && egg.state === "normal") {
    egg.state = "hatching";
  }

  updateEgg();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawEgg();
  drawDino();
  drawBabies();

  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Saved: " + score, 10, 25);

  requestAnimationFrame(gameLoop);
}

spawnEgg();
gameLoop();