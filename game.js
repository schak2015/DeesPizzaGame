// ==========================================
// GAME CONFIGURATION (Modular Specs)
// ==========================================
const GAME_CONFIG = {
  canvas: { width: 400, height: 600 },
  dough: {
    minRadius: 40,
    maxRadius: 130,
    rollTarget: 100,
    color: '#F4C430',
    crustColor: '#D2B48C'
  },
  sauce: {
    color: '#D32F2F',
    targetAmount: 80
  },
  toppings: [
    { id: 'cheese', name: 'Cheese', emoji: '🧀', color: '#FFD700' },
    { id: 'pepperoni', name: 'Pepperoni', emoji: '🍕', color: '#B71C1C' },
    { id: 'mushroom', name: 'Mushroom', emoji: '🍄', color: '#8D6E63' },
    { id: 'broccoli', name: 'Broccoli', emoji: '🥦', color: '#2E7D32' }
  ],
  oven: {
    bakeTimeMs: 4000
  }
};

// ==========================================
// GAME STATE
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = {
  stage: 'roll', // 'roll' | 'sauce' | 'toppings' | 'bake' | 'done'
  pizzaPos: { x: 200, y: 300 },
  pizzaRadius: GAME_CONFIG.dough.minRadius,
  rollProgress: 0,
  isRolling: false,
  lastRollPos: null,
  sauceAmount: 0,
  selectedTopping: GAME_CONFIG.toppings[0],
  placedToppings: [],
  bakeStartTime: null,
  bakeProgress: 0
};

// Web Audio API helper for sound effects
function playSound(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'roll') {
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'click') {
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'done') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    // Audio context fallback
  }
}

// Convert touch/mouse events into relative canvas coordinates
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

// ==========================================
// INPUT HANDLERS
// ==========================================
function handleStart(e) {
  e.preventDefault();
  const pos = getPos(e);

  // Common Next Button Check for Stage Transitions
  const nextBtnWidth = 260;
  const nextBtnHeight = 60;
  const nextBtnX = (canvas.width - nextBtnWidth) / 2;
  const nextBtnY = canvas.height - 110;

  const hitNextButton = (
    pos.x >= nextBtnX &&
    pos.x <= nextBtnX + nextBtnWidth &&
    pos.y >= nextBtnY &&
    pos.y <= nextBtnY + nextBtnHeight
  );

  // STAGE 1: ROLL DOUGH
  if (gameState.stage === 'roll') {
    if (hitNextButton && gameState.rollProgress >= GAME_CONFIG.dough.rollTarget) {
      playSound('click');
      gameState.stage = 'sauce';
      return;
    }

    const distSq = (pos.x - gameState.pizzaPos.x) ** 2 + (pos.y - gameState.pizzaPos.y) ** 2;
    if (distSq < (gameState.pizzaRadius + 50) ** 2) {
      gameState.isRolling = true;
      gameState.lastRollPos = pos;
    }
  } 

  // STAGE 2: ADD SAUCE
  else if (gameState.stage === 'sauce') {
    if (hitNextButton && gameState.sauceAmount >= GAME_CONFIG.sauce.targetAmount) {
      playSound('click');
      gameState.stage = 'toppings';
      return;
    }
    const distSq = (pos.x - gameState.pizzaPos.x) ** 2 + (pos.y - gameState.pizzaPos.y) ** 2;
    if (distSq < (gameState.pizzaRadius - 10) ** 2) {
      gameState.isRolling = true;
    }
  } 

  // STAGE 3: ADD TOPPINGS
  else if (gameState.stage === 'toppings') {
    if (hitNextButton) {
      playSound('click');
      gameState.stage = 'bake';
      gameState.bakeStartTime = Date.now();
      return;
    }

    // Check topping selector bar at top
    if (pos.y < 90) {
      const toppingWidth = canvas.width / GAME_CONFIG.toppings.length;
      const index = Math.floor(pos.x / toppingWidth);
      if (GAME_CONFIG.toppings[index]) {
        gameState.selectedTopping = GAME_CONFIG.toppings[index];
        playSound('click');
      }
      return;
    }

    // Place topping on pizza
    const distSq = (pos.x - gameState.pizzaPos.x) ** 2 + (pos.y - gameState.pizzaPos.y) ** 2;
    if (distSq < (gameState.pizzaRadius - 15) ** 2) {
      gameState.placedToppings.push({
        x: pos.x,
        y: pos.y,
        item: gameState.selectedTopping
      });
      playSound('click');
    }
  } 

  // STAGE 5: RESTART GAME
  else if (gameState.stage === 'done') {
    if (hitNextButton) {
      playSound('click');
      resetGame();
    }
  }
}

function handleMove(e) {
  e.preventDefault();
  if (!gameState.isRolling) return;

  const pos = getPos(e);

  if (gameState.stage === 'roll') {
    if (gameState.lastRollPos) {
      const dx = pos.x - gameState.lastRollPos.x;
      const dy = pos.y - gameState.lastRollPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        gameState.rollProgress = Math.min(GAME_CONFIG.dough.rollTarget, gameState.rollProgress + dist * 0.4);
        const ratio = gameState.rollProgress / GAME_CONFIG.dough.rollTarget;
        gameState.pizzaRadius = GAME_CONFIG.dough.minRadius + (GAME_CONFIG.dough.maxRadius - GAME_CONFIG.dough.minRadius) * ratio;
        gameState.lastRollPos = pos;
        playSound('roll');
      }
    }
  } else if (gameState.stage === 'sauce') {
    const distSq = (pos.x - gameState.pizzaPos.x) ** 2 + (pos.y - gameState.pizzaPos.y) ** 2;
    if (distSq < (gameState.pizzaRadius - 10) ** 2) {
      gameState.sauceAmount = Math.min(GAME_CONFIG.sauce.targetAmount, gameState.sauceAmount + 1);
      playSound('roll');
    }
  }
}

function handleEnd(e) {
  e.preventDefault();
  gameState.isRolling = false;
  gameState.lastRollPos = null;
}

function resetGame() {
  gameState = {
    stage: 'roll',
    pizzaPos: { x: 200, y: 300 },
    pizzaRadius: GAME_CONFIG.dough.minRadius,
    rollProgress: 0,
    isRolling: false,
    lastRollPos: null,
    sauceAmount: 0,
    selectedTopping: GAME_CONFIG.toppings[0],
    placedToppings: [],
    bakeStartTime: null,
    bakeProgress: 0
  };
}

// Attach Event Listeners
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);

canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd, { passive: false });

// ==========================================
// RENDER LOOP
// ==========================================
function update() {
  if (gameState.stage === 'bake') {
    const elapsed = Date.now() - gameState.bakeStartTime;
    gameState.bakeProgress = Math.min(1, elapsed / GAME_CONFIG.oven.bakeTimeMs);
    if (gameState.bakeProgress >= 1) {
      gameState.stage = 'done';
      playSound('done');
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw Table Background
  ctx.fillStyle = gameState.stage === 'bake' ? '#3e2723' : '#87CEEB';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw Pizza Base (Crust)
  ctx.save();
  ctx.beginPath();
  ctx.arc(gameState.pizzaPos.x, gameState.pizzaPos.y, gameState.pizzaRadius, 0, Math.PI * 2);
  ctx.fillStyle = GAME_CONFIG.dough.crustColor;
  ctx.fill();

  // 3. Draw Dough Inside
  ctx.beginPath();
  ctx.arc(gameState.pizzaPos.x, gameState.pizzaPos.y, Math.max(0, gameState.pizzaRadius - 10), 0, Math.PI * 2);
  ctx.fillStyle = GAME_CONFIG.dough.color;
  ctx.fill();

  // 4. Draw Sauce
  if (gameState.sauceAmount > 0) {
    const sauceRadius = (gameState.pizzaRadius - 12) * (gameState.sauceAmount / GAME_CONFIG.sauce.targetAmount);
    ctx.beginPath();
    ctx.arc(gameState.pizzaPos.x, gameState.pizzaPos.y, sauceRadius, 0, Math.PI * 2);
    ctx.fillStyle = GAME_CONFIG.sauce.color;
    ctx.fill();
  }

  // 5. Draw Placed Toppings
  gameState.placedToppings.forEach(t => {
    ctx.font = '28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.item.emoji, t.x, t.y);
  });

  // 6. Draw Oven Bake Effect Overlay
  if (gameState.stage === 'bake') {
    ctx.fillStyle = `rgba(255, 100, 0, ${0.4 * (1 - gameState.bakeProgress)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.restore();

  // 7. Draw Stage UI & Next Buttons
  drawUI();
}

function drawUI() {
  ctx.save();
  const btnWidth = 260;
  const btnHeight = 60;
  const btnX = (canvas.width - btnWidth) / 2;
  const btnY = canvas.height - 110;

  // --- STAGE 1: ROLL ---
  if (gameState.stage === 'roll') {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Rub dough to roll it!', canvas.width / 2, 45);

    if (gameState.rollProgress >= GAME_CONFIG.dough.rollTarget) {
      drawNextButton(btnX, btnY, btnWidth, btnHeight, 'Great Rolling! Tap Next ➡️');
    }
  }

  // --- STAGE 2: SAUCE ---
  else if (gameState.stage === 'sauce') {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Rub to spread red sauce!', canvas.width / 2, 45);

    if (gameState.sauceAmount >= GAME_CONFIG.sauce.targetAmount) {
      drawNextButton(btnX, btnY, btnWidth, btnHeight, 'Tasty Sauce! Tap Next ➡️');
    }
  }

  // --- STAGE 3: TOPPINGS ---
  else if (gameState.stage === 'toppings') {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Pick topping top, tap pizza!', canvas.width / 2, 25);

    // Render topping selector tabs
    const toppingWidth = canvas.width / GAME_CONFIG.toppings.length;
    GAME_CONFIG.toppings.forEach((t, i) => {
      const x = i * toppingWidth;
      ctx.fillStyle = (gameState.selectedTopping.id === t.id) ? '#FFF' : '#E0E0E0';
      ctx.fillRect(x + 2, 35, toppingWidth - 4, 45);
      ctx.strokeStyle = '#999';
      ctx.strokeRect(x + 2, 35, toppingWidth - 4, 45);

      ctx.font = '24px Arial';
      ctx.fillText(t.emoji, x + toppingWidth / 2, 65);
    });

    drawNextButton(btnX, btnY, btnWidth, btnHeight, 'Bake Pizza! 🔥');
  }

  // --- STAGE 4: BAKE ---
  else if (gameState.stage === 'bake') {
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Baking in the Oven... 🔥', canvas.width / 2, 50);

    // Progress Bar
    ctx.fillStyle = '#555';
    ctx.fillRect(50, canvas.height - 80, 300, 24);
    ctx.fillStyle = '#FF9800';
    ctx.fillRect(50, canvas.height - 80, 300 * gameState.bakeProgress, 24);
  }

  // --- STAGE 5: DONE ---
  else if (gameState.stage === 'done') {
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('YUMMY! Pizza is Ready! 🍕', canvas.width / 2, 50);

    drawNextButton(btnX, btnY, btnWidth, btnHeight, 'Make Another Pizza! 🔄');
  }

  ctx.restore();
}

function drawNextButton(x, y, w, h, text) {
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, 30);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, y + h / 2);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start Game Loop
gameLoop();