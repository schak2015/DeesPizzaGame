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
    { id: 'butter', name: 'Butter', emoji: '🧈', color: '#FDE68A', radius: 17 },
    { id: 'apples', name: 'Apples', emoji: '🍏', color: '#4CAF50', radius: 17 },
    { id: 'gummies', name: 'Gummies', emoji: '🍬', color: '#EC4899', radius: 18 },
    { id: 'star', name: 'Cheese Star', emoji: '⭐', color: '#FFD54F', radius: 18 }
  ],
  bakingDurationMs: 4000
};

/**
 * ------------------------------------------------------------------
 * GAME STATE MANAGEMENT
 * ------------------------------------------------------------------
 */
class PizzaGame {
  constructor() {
    this.canvas = document.getElementById('pizzaCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    if (!this.canvas || !this.ctx) {
      console.error('Pizza canvas not found or unavailable.');
      return;
    }

    this.canvas.width = GAME_CONFIG.canvas.baseWidth;
    this.canvas.height = GAME_CONFIG.canvas.baseHeight;
    this.canvas.style.width = 'min(88vw, 520px)';
    this.canvas.style.height = 'min(88vw, 520px)';
    this.canvas.style.maxWidth = '520px';
    this.canvas.style.maxHeight = '520px';

    this.currentStageIndex = 0;
    this.selectedDough = GAME_CONFIG.doughTypes[0];
    this.selectedSauce = GAME_CONFIG.sauces[0];
    this.selectedTopping = GAME_CONFIG.toppings[0];

    this.doughScale = 0.3;
    this.isDoughRolled = false;
    this.sauceCoverage = [];
    this.hasCheese = false;
    this.cheeseParticles = [];
    this.placedToppings = [];
    this.bakeProgress = 0;
    this.isBaked = false;
    this.bites = [];
    this.isInteracting = false;

    this.initAudio();
    this.initDOM();
    this.initEventListeners();
    this.renderStageUI();
    this.gameLoop();
  }

  initAudio() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      this.audioCtx = null;
    }
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
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
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
    if (this.resetBtnEl) {
      this.resetBtnEl.addEventListener('click', () => this.resetGame());
    }

    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.canvas.addEventListener('pointerup', () => this.handlePointerUp());
    this.canvas.addEventListener('pointercancel', () => this.handlePointerUp());
    this.canvas.addEventListener('pointerleave', () => this.handlePointerUp());
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  handlePointerDown(e) {
    this.isInteracting = true;
    const { x, y } = this.getCanvasCoords(e);
    const stage = GAME_CONFIG.stages[this.currentStageIndex].id;

    if (stage === 'dough') {
      if (this.doughScale < 0.95) {
        this.doughScale = Math.min(1, this.doughScale + 0.12);
        this.playSound('pop');

        if (this.doughScale >= 0.95) {
          this.doughScale = 1;
          this.isDoughRolled = true;
          if (this.instructionBadgeEl) {
            this.instructionBadgeEl.textContent = 'Great Rolling! Tap Next ➡️';
          }
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
      this.sauceCoverage.push({ x, y, r: 22 + Math.random() * 10 });
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
          angle: Math.random() * Math.PI,
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
        rotation: Math.random() * Math.PI * 2,
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

  nextStage() {
    if (this.currentStageIndex < GAME_CONFIG.stages.length - 1) {
      this.currentStageIndex += 1;
      this.renderStageUI();

      if (GAME_CONFIG.stages[this.currentStageIndex].id === 'bake') {
        this.startBaking();
      }
    }
  }

  renderStageUI() {
    if (this.stageIndicatorEl) {
      this.stageIndicatorEl.innerHTML = '';
      GAME_CONFIG.stages.forEach((stage, index) => {
        const badge = document.createElement('div');
        badge.className = `px-2 py-1 md:px-3 md:py-1 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1 ${
          index === this.currentStageIndex ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-500'
        }`;
        badge.innerHTML = `<span>${stage.emoji}</span> <span class="hidden md:inline">${stage.label}</span>`;
        badge.style.minWidth = index === this.currentStageIndex ? '74px' : '42px';
        this.stageIndicatorEl.appendChild(badge);
      });
    }

    const currentStage = GAME_CONFIG.stages[this.currentStageIndex].id;

    if (this.controlsPanelEl) {
      this.controlsPanelEl.innerHTML = '';
      this.controlsPanelEl.classList.remove('selection-grid');
      this.controlsPanelEl.style.gap = '0.6rem';
      this.controlsPanelEl.style.justifyContent = 'center';
      this.controlsPanelEl.style.alignItems = 'center';

      if (currentStage === 'dough') {
        if (this.instructionBadgeEl) {
          this.instructionBadgeEl.textContent = 'Tap to Roll Dough! 🪵';
          this.instructionBadgeEl.style.display = 'block';
        }

        GAME_CONFIG.doughTypes.forEach((dough) => {
          const btn = document.createElement('button');
          btn.className = `topping-btn px-4 py-2 bg-orange-100 hover:bg-orange-200 rounded-2xl border-2 border-orange-300 text-orange-900 font-bold flex items-center gap-2 ${this.selectedDough.id === dough.id ? 'ring-4 ring-orange-400' : ''}`;
          btn.style.minHeight = '54px';
          btn.innerHTML = `🫓 ${dough.name}`;
          btn.onclick = () => {
            this.selectedDough = dough;
            this.playSound('pop');
            this.renderStageUI();
          };
          this.controlsPanelEl.appendChild(btn);
        });
        this.appendNextButton();
      } else if (currentStage === 'sauce') {
        if (this.instructionBadgeEl) {
          this.instructionBadgeEl.textContent = 'Drag to Spread Sauce! 🥫';
          this.instructionBadgeEl.style.display = 'block';
        }

        GAME_CONFIG.sauces.forEach((sauce) => {
          const btn = document.createElement('button');
          btn.className = `topping-btn px-4 py-2 bg-red-100 hover:bg-red-200 rounded-2xl border-2 border-red-300 text-red-900 font-bold flex items-center gap-2 ${this.selectedSauce.id === sauce.id ? 'ring-4 ring-red-400' : ''}`;
          btn.style.minHeight = '54px';
          btn.innerHTML = `🥫 ${sauce.name}`;
          btn.onclick = () => {
            this.selectedSauce = sauce;
            this.playSound('pop');
            this.renderStageUI();
          };
          this.controlsPanelEl.appendChild(btn);
        });
        this.appendNextButton();
      } else if (currentStage === 'cheese') {
        if (this.instructionBadgeEl) {
          this.instructionBadgeEl.textContent = 'Tap/Drag to Add Cheese! 🧀';
          this.instructionBadgeEl.style.display = 'block';
        }

        const cheeseBtn = document.createElement('div');
        cheeseBtn.className = 'text-center font-bold text-yellow-600 text-lg';
        cheeseBtn.style.padding = '0.8rem 1rem';
        cheeseBtn.innerHTML = '✨ Rub over pizza to sprinkle yummy cheese!';
        this.controlsPanelEl.appendChild(cheeseBtn);
        this.appendNextButton();
      } else if (currentStage === 'toppings') {
        if (this.instructionBadgeEl) {
          this.instructionBadgeEl.textContent = 'Tap to Add Toppings! 🍕';
          this.instructionBadgeEl.style.display = 'block';
        }

        this.controlsPanelEl.classList.add('selection-grid');
        this.controlsPanelEl.style.display = 'grid';
        this.controlsPanelEl.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
        this.controlsPanelEl.style.alignItems = 'stretch';
        this.controlsPanelEl.style.justifyItems = 'stretch';

        GAME_CONFIG.toppings.forEach((topping) => {
          const btn = document.createElement('button');
          btn.className = `topping-btn px-2 py-2 bg-yellow-50 hover:bg-yellow-100 rounded-2xl border-2 border-yellow-300 text-yellow-900 font-bold flex items-center justify-center gap-1 ${this.selectedTopping.id === topping.id ? 'ring-4 ring-yellow-400 scale-105' : ''}`;
          btn.style.minHeight = '54px';
          btn.style.width = '100%';
          btn.innerHTML = `<span class="text-xl md:text-2xl">${topping.emoji}</span> <span class="text-xs md:text-sm">${topping.name}</span>`;
          btn.onclick = () => {
            this.selectedTopping = topping;
            this.playSound('pop');
            this.renderStageUI();
          };
          this.controlsPanelEl.appendChild(btn);
        });

        const nextWrap = document.createElement('div');
        nextWrap.className = 'col-span-2';
        nextWrap.style.width = '100%';
        nextWrap.appendChild(this.createNextButton());
        this.controlsPanelEl.appendChild(nextWrap);
      } else if (currentStage === 'bake') {
        if (this.instructionBadgeEl) {
          this.instructionBadgeEl.textContent = 'Baking... 🍕🔥';
          this.instructionBadgeEl.style.display = 'none';
        }
      } else if (currentStage === 'eat') {
        if (this.instructionBadgeEl) {
          this.instructionBadgeEl.textContent = 'Tap Pizza to Eat It! 😋';
          this.instructionBadgeEl.style.display = 'block';
        }

        const eatBanner = document.createElement('div');
        eatBanner.className = 'text-center font-bold text-green-600 text-xl animate-bounce';
        eatBanner.style.padding = '0.8rem 1rem';
        eatBanner.innerHTML = '🎉 Delicious Pizza! Take bites!';
        this.controlsPanelEl.appendChild(eatBanner);
      }
    }
  }

  createNextButton() {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'w-full bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transform active:scale-95 text-lg flex items-center justify-center gap-2';
    nextBtn.style.minHeight = '54px';
    nextBtn.innerHTML = '<span>Next</span> ➡️';
    nextBtn.onclick = () => {
      this.playSound('pop');
      this.nextStage();
    };
    return nextBtn;
  }

  appendNextButton() {
    const nextBtn = this.createNextButton();
    if (this.controlsPanelEl) {
      this.controlsPanelEl.appendChild(nextBtn);
    }
  }

  startBaking() {
    if (this.ovenOverlayEl) {
      this.ovenOverlayEl.classList.remove('hidden');
    }

    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.bakeProgress = Math.min(1, elapsed / GAME_CONFIG.bakingDurationMs);

      if (this.bakeProgressBarEl) {
        this.bakeProgressBarEl.style.width = `${this.bakeProgress * 100}%`;
      }

      if (this.bakeProgress >= 1) {
        clearInterval(intervalId);
        this.isBaked = true;

        if (this.ovenOverlayEl) {
          this.ovenOverlayEl.classList.add('hidden');
        }

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

  drawPizza() {
    const ctx = this.ctx;
    const centerX = 300;
    const centerY = 300;
    const maxRadius = 220;
    const currentRadius = maxRadius * this.doughScale;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#9ED5FF';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, currentRadius * 1.07, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.isBaked ? this.selectedDough.bakedColor : this.selectedDough.color;
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 8;
    ctx.fill();

    ctx.lineWidth = 14 * this.doughScale;
    ctx.strokeStyle = this.isBaked ? '#A0522D' : '#E8B98A';
    ctx.stroke();
    ctx.restore();

    const innerRadius = currentRadius * 0.88;

    if (this.sauceCoverage.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = this.selectedSauce.color;
      this.sauceCoverage.forEach((sauceDot) => {
        ctx.beginPath();
        ctx.arc(sauceDot.x, sauceDot.y, sauceDot.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    if (this.cheeseParticles.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      ctx.clip();

      ctx.strokeStyle = this.isBaked ? '#FFF8DC' : '#FFF9C4';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';

      this.cheeseParticles.forEach((piece) => {
        ctx.beginPath();
        ctx.moveTo(piece.x, piece.y);
        ctx.lineTo(piece.x + Math.cos(piece.angle) * piece.len, piece.y + Math.sin(piece.angle) * piece.len);
        ctx.stroke();
      });
      ctx.restore();
    }

    this.placedToppings.forEach((item) => {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rotation);
      ctx.font = `${item.topping.radius * 2}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.topping.emoji, 0, 0);
      ctx.restore();
    });

    if (this.bites.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      this.bites.forEach((bite) => {
        ctx.beginPath();
        ctx.arc(bite.x, bite.y, bite.r, 0, Math.PI * 2);
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

window.addEventListener('load', () => {
  window.pizzaGame = new PizzaGame();
});