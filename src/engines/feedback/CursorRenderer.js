// src/engines/feedback/CursorRenderer.js
// 手势光标视觉渲染器：拖尾、状态光环、捏合冲击波、蓄力环、挥手流光

const STATE_COLORS = {
  pointing: '#00f3ff',
  pinching: '#fffd75',
  fist: '#ff2a6d',
  open: '#b892ff',
  swiping: '#00f3ff'
};

const STATE_LABELS = {
  pointing: '指向',
  pinching: '捏合',
  fist: '握拳',
  open: '张开',
  swiping: '挥手'
};

export class CursorRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.rafId = null;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.pos = { x: 0.5, y: 0.5 };
    this.lastPos = { x: 0.5, y: 0.5 };
    this.velocity = { x: 0, y: 0 };
    this.state = 'pointing';
    this.direction = '';

    this.trail = []; // 拖尾粒子
    this.rings = []; // 冲击波环
    this.arrows = []; // 挥手箭头
    this.charge = { fist: 0, open: 0 }; // 蓄力进度

    this.lastTrailTime = 0;
    this.isActive = false;
  }

  init(canvas) {
    if (this.canvas) return this;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', this.onResize);
    this.isActive = true;
    this.render(performance.now());
    return this;
  }

  onResize = () => {
    this.resize();
  };

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(rect.width, window.innerWidth);
    const h = Math.max(rect.height, window.innerHeight);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setPosition(x, y) {
    this.lastPos = { ...this.pos };
    this.pos = { x, y };
    this.velocity = {
      x: (this.pos.x - this.lastPos.x) * window.innerWidth,
      y: (this.pos.y - this.lastPos.y) * window.innerHeight
    };
  }

  setState(state, direction = '') {
    if (this.state !== state || this.direction !== direction) {
      this.state = state || 'pointing';
      this.direction = direction || '';
    }
  }

  onPinchStart() {
    this.spawnRing(1.0, STATE_COLORS.pinching, 0.35);
  }

  onPinchComplete() {
    this.spawnRing(2.2, '#ffffff', 0.55);
    this.spawnRing(1.5, STATE_COLORS.pinching, 0.45);
  }

  onFistProgress(progress) {
    this.charge.fist = progress;
  }

  onOpenProgress(progress) {
    this.charge.open = progress;
  }

  onSwipe(direction) {
    const color = direction === 'right' ? '#00f3ff' : '#b892ff';
    this.arrows.push({
      direction,
      x: this.pos.x,
      y: this.pos.y,
      life: 1.0,
      color,
      size: 0
    });
  }

  spawnRing(intensity, color, alpha) {
    this.rings.push({
      x: this.pos.x,
      y: this.pos.y,
      radius: 12,
      maxRadius: 80 * intensity,
      life: 1.0,
      decay: 0.035,
      color,
      alpha,
      width: 3 * intensity
    });
  }

  spawnTrailParticle() {
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (speed < 2) return;

    const count = Math.min(3, Math.floor(speed / 40) + 1);
    for (let i = 0; i < count; i++) {
      this.trail.push({
        x: this.pos.x + (Math.random() - 0.5) * 0.008,
        y: this.pos.y + (Math.random() - 0.5) * 0.008,
        vx: (Math.random() - 0.5) * 0.0005,
        vy: (Math.random() - 0.5) * 0.0005,
        life: 1.0,
        decay: 0.04 + Math.random() * 0.03,
        size: 2 + Math.random() * 3,
        color: STATE_COLORS[this.state] || STATE_COLORS.pointing
      });
    }
  }

  toScreen(p) {
    return {
      x: p.x * window.innerWidth,
      y: p.y * window.innerHeight
    };
  }

  render(now) {
    if (!this.isActive || !this.ctx) return;
    this.rafId = requestAnimationFrame((t) => this.render(t));

    const dt = 16.67;

    // 生成拖尾
    if (now - this.lastTrailTime > 16) {
      this.spawnTrailParticle();
      this.lastTrailTime = now;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    this.ctx.clearRect(0, 0, w, h);

    // 绘制拖尾
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      p.life -= p.decay;
      if (p.life <= 0) {
        this.trail.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      const pos = this.toScreen(p);
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color + Math.floor(p.life * 120).toString(16).padStart(2, '0');
      this.ctx.fill();
    }

    // 绘制冲击波环
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= r.decay;
      if (r.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      r.radius += (r.maxRadius - r.radius) * 0.12;
      const pos = this.toScreen(r);
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = r.color + Math.floor(r.life * r.alpha * 255).toString(16).padStart(2, '0');
      this.ctx.lineWidth = r.width * r.life;
      this.ctx.stroke();
    }

    // 绘制挥手箭头
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.life -= 0.025;
      a.size += (1.0 - a.size) * 0.12;
      if (a.life <= 0) {
        this.arrows.splice(i, 1);
        continue;
      }
      const pos = this.toScreen(a);
      const dx = a.direction === 'right' ? 1 : -1;
      this.ctx.save();
      this.ctx.translate(pos.x, pos.y);
      this.ctx.globalAlpha = a.life;
      this.ctx.strokeStyle = a.color;
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(-30 * a.size * dx, -15 * a.size);
      this.ctx.lineTo(0, 0);
      this.ctx.lineTo(-30 * a.size * dx, 15 * a.size);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 绘制主光标
    const cursorPos = this.toScreen(this.pos);
    const color = STATE_COLORS[this.state] || STATE_COLORS.pointing;

    // 外圈光晕
    const glow = this.ctx.createRadialGradient(cursorPos.x, cursorPos.y, 0, cursorPos.x, cursorPos.y, 40);
    glow.addColorStop(0, color + '44');
    glow.addColorStop(1, color + '00');
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(cursorPos.x, cursorPos.y, 40, 0, Math.PI * 2);
    this.ctx.fill();

    // 蓄力环（fist / open）
    const chargeProgress = Math.max(this.charge.fist, this.charge.open);
    if (chargeProgress > 0.05) {
      const chargeColor = this.charge.fist > this.charge.open ? STATE_COLORS.fist : STATE_COLORS.open;
      const radius = 24 + chargeProgress * 12;
      this.ctx.beginPath();
      this.ctx.arc(cursorPos.x, cursorPos.y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chargeProgress);
      this.ctx.strokeStyle = chargeColor + Math.floor(180 + chargeProgress * 75).toString(16).padStart(2, '0');
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }

    // 主圆点
    this.ctx.beginPath();
    this.ctx.arc(cursorPos.x, cursorPos.y, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = color + 'ee';
    this.ctx.fill();

    // 内核
    this.ctx.beginPath();
    this.ctx.arc(cursorPos.x, cursorPos.y, 4, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();

    // 状态文字（光标下方）
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = color;
    const label = STATE_LABELS[this.state] + (this.direction ? (this.direction === 'right' ? ' ›' : ' ‹') : '');
    this.ctx.fillText(label, cursorPos.x, cursorPos.y + 32);
  }

  dispose() {
    this.isActive = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.canvas = null;
    this.ctx = null;
  }
}
