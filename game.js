/**
 * ------------------------------------------------------------------
 * GAME CONFIGURATION & SPECS
 * Easily modify options, colors, sizes, and toppings here!
 * ------------------------------------------------------------------
 */
const GAME_CONFIG = {
  canvas: {
    baseWidth: 600,
    baseHeight: 600,
  },
  stages: [
    { id: 'dough', label: 'Dough', emoji: '🫓' },
    { id: 'sauce', label: 'Sauce', emoji: '🥫' },
    { id: 'cheese', label: 'Cheese', emoji: '🧀' },
    { id: 'toppings', label: 'Toppings', emoji: '🍕' },
    { id: 'bake', label: 'Bake', emoji: '🔥' },
    { id: 'eat', label: 'Eat!', emoji: '😋' }
  ],
  doughTypes: [
    { id: 'classic', name: 'Classic Crust', color: '#F5D0A9', bakedColor: '#C4813D' },
    { id: 'wheat', name: 'Whole Wheat', color: '#D2B48C', bakedColor: '#8B5A2B' },
    { id: 'thin', name: 'Crispy Crust', color: '#FFE4B5', bakedColor: '#DAA520' }
  ],
  sauces: [
    { id: 'tomato', name: 'Tomato Sauce', color: '#C0392B' },
    { id: 'pesto', name: 'Green Pesto', color: '#27AE60' },
    { id: 'white', name: 'Yummy White', color: '#F4F6F6' }
  ],
  toppings: [
    { id: 'pepperoni', name: 'Pepperoni', emoji: '🍕', color: '#B71C1C', radius: 18 },
    { id: 'mushroom', name: 'Mushroom', emoji: '🍄', color: '#D7CCC8', radius: 16 },
    { id: 'olive', name: 'Olives', emoji: '🫒', color: '#212121', radius: 12 },
    { id: 'pepper', name: 'Peppers', emoji: '🫑', color: '#4CAF50', radius: 16 },
    { id: 'pineapple', name: 'Pineapple', emoji: '🍍', color: '#FBC02D', radius: 16 },
    { id: 'star', name: 'Cheese Star', emoji: '⭐', color: '#FFD54F', radius: 18 }
  ],
  bakingDurationMs: 4000 // Time to bake in milliseconds
};

/**
 * ------------------------------------------------------------------
 * GAME STATE MANAGEMENT
 * ------------------------------------------------------------------
 */
class PizzaGame {
  constructor() {
    this.canvas = document.getElementById('pizzaCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Internal resolution
    this.canvas.width = GAME_CONFIG.canvas.baseWidth;
    this.canvas.height = GAME_CONFIG.canvas.baseHeight;

    this.currentStageIndex = 0;
    this.selectedDough = GAME_CONFIG.doughTypes[0];
    this.selectedSauce = GAME_CONFIG.sauces[0];
    this.selectedTopping = GAME_CONFIG.toppings[0];
    
    // Pizza Attributes State
    this.doughScale = 0.3; // Grows from 0.3 to 1.0
    this.isDoughRolled = false;
    this.sauceCoverage = []; // Array of covered dots {x, y, r}
    this.hasCheese = false;
    this.cheeseParticles = [];
    this.placedToppings = []; // Array of { id, x, y, size, rotation }
    
    // Baking & Eating State
    this.bakeProgress = 0; // 0 to 1
    this.isBaked = false;
    this.bites = []; // Array of bite locations

    this.isInteracting = false;
    
    this.initAudio();
    this.initDOM();
    this.initEventListeners();
    this.renderStageUI();
    this.gameLoop();
  }

  // Web Audio API Synth for child-friendly sound effects
  initAudio() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playSound(type) {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;

    if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'splat') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.12);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'bite') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'cheer') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  }

  initDOM() {
    this.stageIndicatorEl = document.getElementById('stage-indicator');
    this.controlsPanelEl = document.getElementById('controls-panel');
    this.instructionBadgeEl = document.getElementById('instruction-badge');
    this.ovenOverlayEl = document.getElementById('oven-overlay');
    this.bakeProgressBarEl = document.getElementById('bake-progress');
    this.resetBtnEl = document.getElementById('reset-btn');
  }

  initEventListeners() {
    // Reset Button
    this.resetBtnEl.addEventListener('click', () => this.resetGame());

    // Pointer event listeners (Mouse & Touch compatible)
    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.canvas.addEventListener('pointerup', () => this.handlePointerUp());
    this.canvas.addEventListener('pointercancel', () => this.handlePointerUp());
  }

  // Get canvas scaled coordinates
  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  /**
   * ------------------------------------------------------------------
   * USER INTERACTIONS
   * ------------------------------------------------------------------
   */
  handlePointerDown(e) {
    this.isInteracting = true;
    const { x, y } = this.getCanvasCoords(e);
    const stage = GAME_CONFIG.stages[this.currentStageIndex].id;

    if (stage === 'dough') {
      if (this.doughScale < 0.95) {
        this.doughScale += 0.12;
        this.playSound('pop');
        if (this.doughScale >= 0.95) {
          this.doughScale = 1.0;
          this.isDoughRolled = true;
          this.instructionBadgeEl.textContent = "Great Rolling! Tap Next ➡️";
        }
      }
    } else if (stage === 'sauce') {
      this.addSauce(x, y);
    } else if (stage === 'cheese') {
      this.addCheese(x, y);
    } else if (stage === 'toppings') {
      this.addTopping(x, y);
    } else if (stage === 'eat') {
      this.takeBite(x, y);
    }
  }

  handlePointerMove(e) {
    if (!this.isInteracting) return;
    const { x, y } = this.getCanvasCoords(e);
    const stage = GAME_CONFIG.stages[this.currentStageIndex].id;

    if (stage === 'sauce') {
      this.addSauce(x, y);
    } else if (stage === 'cheese') {
      this.addCheese(x, y);
    }
  }

  handlePointerUp() {
    this.isInteracting = false;
  }

  addSauce(x, y) {
    const distFromCenter = Math.hypot(x - 300, y - 300);
    if (distFromCenter < 220) {
      this.sauceCoverage.push({ x, y, r: 25 });
      this.playSound('splat');
    }
  }

  addCheese(x, y) {
    const distFromCenter = Math.hypot(x - 300, y - 300);
    if (distFromCenter < 220) {
      for (let i = 0; i < 3; i++) {
        this.cheeseParticles.push({
          x: x + (Math.random() * 30 - 15),
          y: y + (Math.random() * 30 - 15),
          len: 12 + Math.random() * 8,
          angle: Math.random() * Math.PI
        });
      }
      this.hasCheese = true;
      this.playSound('pop');
    }
  }

  addTopping(x, y) {
    const distFromCenter = Math.hypot(x - 300, y - 300);
    if (distFromCenter < 220) {
      this.placedToppings.push({
        topping: this.selectedTopping,
        x,
        y,
        rotation: Math.random() * Math.PI * 2
      });
      this.playSound('pop');
    }
  }

  takeBite(x, y) {
    const distFromCenter = Math.hypot(x - 300, y - 300);
    if (distFromCenter < 250) {
      this.bites.push({ x, y, r: 35 });
      this.playSound('bite');
    }
  }

  /**
   * ------------------------------------------------------------------
   * STAGE UI & CONTROLS RENDERING
   * ------------------------------------------------------------------
   */
  nextStage() {
    if (this.currentStageIndex < GAME_CONFIG.stages.length - 1) {
      this.currentStageIndex++;
      this.renderStageUI();

      if (GAME_CONFIG.stages[this.currentStageIndex].id === 'bake') {
        this.startBaking();
      }
    }
  }

  renderStageUI() {
    // Render top stage navigation
    this.stageIndicatorEl.innerHTML = '';
    GAME_CONFIG.stages.forEach((stg, idx) => {
      const badge = document.createElement('div');
      badge.className = `px-2 py-1 md:px-3 md:py-1 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1 ${
        idx === this.currentStageIndex ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-500'
      }`;
      badge.innerHTML = `<span>${stg.emoji}</span> <span class="hidden md:inline">${stg.label}</span>`;
      this.stageIndicatorEl.appendChild(badge);
    });

    // Render Bottom Panel Controls & Instructions
    const currentStage = GAME_CONFIG.stages[this.currentStageIndex].id;
    this.controlsPanelEl.innerHTML = '';

    if (currentStage === 'dough') {
      this.instructionBadgeEl.textContent = 'Tap to Roll Dough! 🪵';
      GAME_CONFIG.doughTypes.forEach((d) => {
        const btn = document.createElement('button');
        btn.className = `topping-btn px-4 py-2 bg-orange-100 hover:bg-orange-200 rounded-2xl border-2 border-orange-300 text-orange-900 font-bold flex items-center gap-2 ${this.selectedDough.id === d.id ? 'ring-4 ring-orange-400' : ''}`;
        btn.innerHTML = `🫓 ${d.name}`;
        btn.onclick = () => { this.selectedDough = d; this.playSound('pop'); this.renderStageUI(); };
        this.controlsPanelEl.appendChild(btn);
      });
      this.appendNextButton();
    } 
    else if (currentStage === 'sauce') {
      this.instructionBadgeEl.textContent = 'Drag to Spread Sauce! 🥫';
      GAME_CONFIG.sauces.forEach((s) => {
        const btn = document.createElement('button');
        btn.className = `topping-btn px-4 py-2 bg-red-100 hover:bg-red-200 rounded-2xl border-2 border-red-300 text-red-900 font-bold flex items-center gap-2 ${this.selectedSauce.id === s.id ? 'ring-4 ring-red-400' : ''}`;
        btn.innerHTML = `🥫 ${s.name}`;
        btn.onclick = () => { this.selectedSauce = s; this.playSound('pop'); this.renderStageUI(); };
        this.controlsPanelEl.appendChild(btn);
      });
      this.appendNextButton();
    }
    else if (currentStage === 'cheese') {
      this.instructionBadgeEl.textContent = 'Tap/Drag to Add Cheese! 🧀';
      const cheeseBtn = document.createElement('div');
      cheeseBtn.className = 'text-center font-bold text-yellow-600 text-lg';
      cheeseBtn.innerHTML = '✨ Rub over pizza to sprinkle yummy cheese!';
      this.controlsPanelEl.appendChild(cheeseBtn);
      this.appendNextButton();
    }
    else if (currentStage === 'toppings') {
      this.instructionBadgeEl.textContent = 'Tap to Add Toppings! 🍕';
      GAME_CONFIG.toppings.forEach((t) => {
        const btn = document.createElement('button');
        btn.className = `topping-btn px-3 py-2 bg-yellow-50 hover:bg-yellow-100 rounded-2xl border-2 border-yellow-300 text-yellow-900 font-bold flex items-center gap-1 ${this.selectedTopping.id === t.id ? 'ring-4 ring-yellow-400 scale-105' : ''}`;
        btn.innerHTML = `<span class="text-2xl">${t.emoji}</span> <span>${t.name}</span>`;
        btn.onclick = () => { this.selectedTopping = t; this.playSound('pop'); this.renderStageUI(); };
        this.controlsPanelEl.appendChild(btn);
      });
      this.appendNextButton();
    }
    else if (currentStage === 'bake') {
      this.instructionBadgeEl.textContent = 'Baking... 🍕🔥';
    }
    else if (currentStage === 'eat') {
      this.instructionBadgeEl.textContent = 'Tap Pizza to Eat It! 😋';
      const eatBanner = document.createElement('div');
      eatBanner.className = 'text-center font-bold text-green-600 text-xl animate-bounce';
      eatBanner.innerHTML = '🎉 Delicious Pizza! Take bites!';
      this.controlsPanelEl.appendChild(eatBanner);
    }
  }

  appendNextButton() {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'ml-auto bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transform active:scale-95 text-lg flex items-center gap-2';
    nextBtn.innerHTML = '<span>Next</span> ➡️';
    nextBtn.onclick = () => { this.playSound('pop'); this.nextStage(); };
    this.controlsPanelEl.appendChild(nextBtn);
  }

  startBaking() {
    this.ovenOverlayEl.classList.remove('hidden');
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.bakeProgress = Math.min(1, elapsed / GAME_CONFIG.bakingDurationMs);
      this.bakeProgressBarEl.style.width = `${this.bakeProgress * 100}%`;

      if (this.bakeProgress >= 1) {
        clearInterval(interval);
        this.isBaked = true;
        this.ovenOverlayEl.classList.add('hidden');
        this.playSound('cheer');
        this.nextStage();
      }
    }, 50);
  }

  resetGame() {
    this.currentStageIndex = 0;
    this.doughScale = 0.3;
    this.isDoughRolled = false;
    this.sauceCoverage = [];
    this.hasCheese = false;
    this.cheeseParticles = [];
    this.placedToppings = [];
    this.bakeProgress = 0;
    this.isBaked = false;
    this.bites = [];
    this.renderStageUI();
    this.playSound('pop');
  }

  /**
   * ------------------------------------------------------------------
   * CANVAS RENDERING ENGINE
   * ------------------------------------------------------------------
   */
  drawPizza() {
    const ctx = this.ctx;
    const centerX = 300;
    const centerY = 300;
    const maxRadius = 240;
    const currentRadius = maxRadius * this.doughScale;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Draw Dough Crust
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
    // Interpolate dough color when baked
    ctx.fillStyle = this.isBaked ? this.selectedDough.bakedColor : this.selectedDough.color;
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 8;
    ctx.fill();

    // Crust Rim Detail
    ctx.lineWidth = 14 * this.doughScale;
    ctx.strokeStyle = this.isBaked ? '#A0522D' : '#E8B98A';
    ctx.stroke();
    ctx.restore();

    // Inner base area (where sauce and toppings go)
    const innerRadius = currentRadius * 0.88;

    // 2. Draw Sauce Coverage
    if (this.sauceCoverage.length > 0) {
      ctx.save();
      // Clip inside pizza inner radius
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = this.selectedSauce.color;
      this.sauceCoverage.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // 3. Draw Cheese Layer
    if (this.cheeseParticles.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      ctx.clip();

      ctx.strokeStyle = this.isBaked ? '#FFF8DC' : '#FFF9C4';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      
      this.cheeseParticles.forEach(c => {
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + Math.cos(c.angle) * c.len, c.y + Math.sin(c.angle) * c.len);
        ctx.stroke();
      });
      ctx.restore();
    }

    // 4. Draw Toppings
    this.placedToppings.forEach(item => {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rotation);
      
      // Emoji / Icon rendering
      ctx.font = `${item.topping.radius * 2}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.topping.emoji, 0, 0);

      ctx.restore();
    });

    // 5. Draw Bites (Eating Effect)
    if (this.bites.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      this.bites.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  gameLoop() {
    this.drawPizza();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// Initialize game on window load
window.addEventListener('load', () => {
  window.pizzaGame = new PizzaGame();
});