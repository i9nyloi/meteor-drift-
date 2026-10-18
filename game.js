const canvas = document.querySelector('#game');
const context = canvas.getContext('2d');
const overlay = document.querySelector('#overlay');
const playButton = document.querySelector('#play-button');
const buttonLabel = document.querySelector('#button-label');
const overlayKicker = document.querySelector('#overlay-kicker');
const overlayTitle = document.querySelector('#overlay-title');
const overlayCopy = document.querySelector('#overlay-copy');
const bestScoreLabel = document.querySelector('#best-score');
const gameStatus = document.querySelector('#game-status');

const width = canvas.width;
const height = canvas.height;
const bestKey = 'meteor-drift-best';
const stars = Array.from({ length: 70 }, () => ({
  x: Math.random() * width,
  y: Math.random() * height,
  radius: Math.random() * 1.5 + .3,
  phase: Math.random() * Math.PI * 2
}));

let bestScore = Number(localStorage.getItem(bestKey)) || 0;
let player;
let meteors = [];
let score;
let elapsed;
let spawnTimer;
let lastTime = 0;
let state = 'ready';
let leftHeld = false;
let rightHeld = false;
let pointerTarget = null;

bestScoreLabel.textContent = String(bestScore).padStart(4, '0');

function resetGame() {
  player = { x: width / 2, y: height - 80, radius: 13, speed: 330 };
  meteors = [];
  score = 0;
  elapsed = 0;
  spawnTimer = 0;
  gameStatus.textContent = 'FLIGHT IN PROGRESS';
  overlay.classList.add('is-hidden');
  state = 'playing';
}

function endGame() {
  state = 'over';
  gameStatus.textContent = 'FLIGHT ENDED';
  const finalScore = Math.floor(score);
  const isRecord = finalScore > bestScore;
  if (isRecord) {
    bestScore = finalScore;
    localStorage.setItem(bestKey, String(bestScore));
    bestScoreLabel.textContent = String(bestScore).padStart(4, '0');
  }
  overlayKicker.textContent = isRecord ? 'NEW FLIGHT RECORD' : 'FLIGHT LOG CLOSED';
  overlayTitle.innerHTML = isRecord ? 'A new<br>high mark.' : 'The sky<br>got you.';
  overlayCopy.innerHTML = `You stayed up for <strong>${finalScore}</strong> points.<br>${isRecord ? 'Your best flight yet.' : 'There is always another opening.'}`;
  buttonLabel.textContent = 'Fly again';
  overlay.classList.remove('is-hidden');
}

function spawnMeteor() {
  const radius = 10 + Math.random() * 17;
  meteors.push({
    x: radius + Math.random() * (width - radius * 2),
    y: -radius,
    radius,
    speed: 130 + Math.random() * 100 + Math.min(elapsed * 5, 220),
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - .5) * 1.8,
    sides: 7 + Math.floor(Math.random() * 3)
  });
}

function update(delta) {
  if (state !== 'playing') return;
  elapsed += delta;
  score += delta * 10;
  spawnTimer += delta;
  const spawnDelay = Math.max(.28, .82 - elapsed * .008);
  if (spawnTimer >= spawnDelay) {
    spawnTimer = 0;
    spawnMeteor();
  }

  if (pointerTarget !== null) {
    player.x += (pointerTarget - player.x) * Math.min(1, delta * 12);
  } else {
    const direction = Number(rightHeld) - Number(leftHeld);
    player.x += direction * player.speed * delta;
  }
  player.x = Math.max(player.radius + 8, Math.min(width - player.radius - 8, player.x));

  for (const meteor of meteors) {
    meteor.y += meteor.speed * delta;
    meteor.rotation += meteor.spin * delta;
    const dx = meteor.x - player.x;
    const dy = meteor.y - player.y;
    if (Math.hypot(dx, dy) < meteor.radius + player.radius - 3) endGame();
  }
  meteors = meteors.filter(meteor => meteor.y < height + meteor.radius);
}

function drawBackground(time) {
  context.fillStyle = '#101a16';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(201, 227, 174, .055)';
  context.lineWidth = 1;
  for (let x = 40; x < width; x += 40) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
  }
  for (let y = 40; y < height; y += 40) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
  }
  for (const star of stars) {
    const glow = .25 + (Math.sin(time * .001 + star.phase) + 1) * .25;
    context.globalAlpha = glow;
    context.fillStyle = '#e8e7dc';
    context.beginPath(); context.arc(star.x, star.y, star.radius, 0, Math.PI * 2); context.fill();
  }
  context.globalAlpha = 1;
}

function drawShip() {
  context.save();
  context.translate(player.x, player.y);
  context.fillStyle = 'rgba(250, 118, 94, .22)';
  context.beginPath(); context.ellipse(0, 15, 8, 15, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#ccf36c';
  context.beginPath();
  context.moveTo(0, -17); context.lineTo(12, 12); context.lineTo(0, 7); context.lineTo(-12, 12);
  context.closePath(); context.fill();
  context.fillStyle = '#18231e';
  context.beginPath(); context.arc(0, 0, 3, 0, Math.PI * 2); context.fill();
  context.restore();
}

function drawMeteor(meteor) {
  context.save();
  context.translate(meteor.x, meteor.y);
  context.rotate(meteor.rotation);
  context.fillStyle = '#fa765e';
  context.strokeStyle = '#ffc09b';
  context.lineWidth = 1.5;
  context.beginPath();
  for (let index = 0; index < meteor.sides; index++) {
    const angle = (index / meteor.sides) * Math.PI * 2;
    const variation = index % 2 ? .79 : 1;
    const x = Math.cos(angle) * meteor.radius * variation;
    const y = Math.sin(angle) * meteor.radius * variation;
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.closePath(); context.fill(); context.stroke();
  context.fillStyle = 'rgba(16, 25, 21, .28)';
  context.beginPath(); context.arc(-meteor.radius * .18, meteor.radius * .1, meteor.radius * .22, 0, Math.PI * 2); context.fill();
  context.restore();
}

function draw(time) {
  drawBackground(time);
  for (const meteor of meteors) drawMeteor(meteor);
  if (player) drawShip();
  if (state === 'playing') {
    context.fillStyle = '#e8e7dc';
    context.font = '500 15px monospace';
    context.textAlign = 'left';
    context.fillText(String(Math.floor(score)).padStart(4, '0'), 18, 29);
    context.fillStyle = 'rgba(232, 231, 220, .55)';
    context.font = '10px monospace';
    context.textAlign = 'right';
    context.fillText('POINTS', width - 18, 28);
  }
}

function frame(time) {
  const delta = Math.min((time - lastTime) / 1000 || 0, .04);
  lastTime = time;
  update(delta);
  draw(time);
  requestAnimationFrame(frame);
}

function setDirection(key, pressed) {
  if (key === 'ArrowLeft' || key.toLowerCase() === 'a') leftHeld = pressed;
  if (key === 'ArrowRight' || key.toLowerCase() === 'd') rightHeld = pressed;
}

document.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  setDirection(event.key, true);
  if ((event.key === ' ' || event.key === 'Enter') && state !== 'playing') resetGame();
});
document.addEventListener('keyup', event => setDirection(event.key, false));
window.addEventListener('blur', () => { leftHeld = false; rightHeld = false; });
playButton.addEventListener('click', resetGame);
canvas.addEventListener('pointerdown', event => {
  canvas.setPointerCapture(event.pointerId);
  pointerTarget = (event.offsetX / canvas.clientWidth) * width;
});
canvas.addEventListener('pointermove', event => {
  if (event.buttons || event.pointerType === 'touch') pointerTarget = (event.offsetX / canvas.clientWidth) * width;
});
canvas.addEventListener('pointerup', () => { pointerTarget = null; });
canvas.addEventListener('pointercancel', () => { pointerTarget = null; });
requestAnimationFrame(frame);
