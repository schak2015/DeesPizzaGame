const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let player = { x: 180, y: 500, size: 40 };

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'orange';
  ctx.fillRect(player.x, player.y, player.size, player.size);
}

function move(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  player.x = (clientX - rect.left) * (canvas.width / rect.width) - player.size / 2;
  draw();
}

canvas.addEventListener('mousemove', move);
canvas.addEventListener('touchmove', move);
draw();