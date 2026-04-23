export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 16;
        this.speed = 250;
        this.color = '#00f0ff';
        
        this.hp = 100;
        this.maxHp = 100;
        this.invincibleTimer = 0;
        this.hitFlashTimer = 0;
        
        this.trail = [];
        this.trailMaxLength = 10;
        this.trailTimer = 0;
        this.dx = 0;
        this.dy = 0;
        this.facingAngle = -Math.PI / 2;
        this.pulsePhase = 0;
        this.isMoving = false;
        this.enginePhase = 0;

        this.keys = {
            w: false, a: false, s: false, d: false,
            ArrowUp: false, ArrowDown: false,
            ArrowLeft: false, ArrowRight: false
        };
        this.setupInputs();
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            if (this.keys.hasOwnProperty(key)) this.keys[key] = true;
        });
        window.addEventListener('keyup', (e) => {
            const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            if (this.keys.hasOwnProperty(key)) this.keys[key] = false;
        });
    }

    takeDamage(amount) {
        if (this.invincibleTimer > 0) return false;
        this.hp -= amount;
        this.invincibleTimer = 0.3;
        this.hitFlashTimer = 0.15;
        if (this.hp < 0) this.hp = 0;
        return true;
    }

    update(dt, joystick) {
        this.dx = 0;
        this.dy = 0;

        // 虚拟摇杆优先
        if (joystick && joystick.active) {
            this.dx = joystick.dx;
            this.dy = joystick.dy;
        } else {
            // 键盘输入
            if (this.keys.w || this.keys.ArrowUp) this.dy -= 1;
            if (this.keys.s || this.keys.ArrowDown) this.dy += 1;
            if (this.keys.a || this.keys.ArrowLeft) this.dx -= 1;
            if (this.keys.d || this.keys.ArrowRight) this.dx += 1;

            if (this.dx !== 0 && this.dy !== 0) {
                const len = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
                this.dx /= len; this.dy /= len;
            }
        }
        
        this.isMoving = (this.dx !== 0 || this.dy !== 0);
        this.x += this.dx * this.speed * dt;
        this.y += this.dy * this.speed * dt;

        if (this.isMoving) {
            const targetAngle = Math.atan2(this.dy, this.dx);
            let diff = targetAngle - this.facingAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.facingAngle += diff * 10 * dt;
        }

        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
        this.pulsePhase += dt * 4;
        this.enginePhase += dt * 15;

        // 尾焰轨迹
        this.trailTimer += dt;
        if (this.trailTimer > 0.03 && this.isMoving) {
            const tailX = this.x - Math.cos(this.facingAngle) * this.radius * 0.6;
            const tailY = this.y - Math.sin(this.facingAngle) * this.radius * 0.6;
            this.trail.push({ x: tailX, y: tailY, alpha: 1.0, r: 4 + Math.random() * 3 });
            if (this.trail.length > this.trailMaxLength) this.trail.shift();
            this.trailTimer = 0;
        }
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].alpha -= dt * 4;
            this.trail[i].r *= 0.97;
            if (this.trail[i].alpha <= 0) this.trail.splice(i, 1);
        }
    }

    draw(ctx) {
        // ── 引擎尾焰 ──
        for (const t of this.trail) {
            const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r);
            grad.addColorStop(0, `rgba(100, 220, 255, ${t.alpha * 0.6})`);
            grad.addColorStop(0.5, `rgba(0, 120, 255, ${t.alpha * 0.2})`);
            grad.addColorStop(1, 'rgba(0, 50, 200, 0)');
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        }

        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 20) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.facingAngle + Math.PI / 2);

        const isHit = this.hitFlashTimer > 0;
        const r = this.radius;
        const glowColor = isHit ? '#ff003c' : '#00f0ff';

        // ── 护盾光圈 ──
        const shieldPulse = 0.15 + Math.sin(this.pulsePhase) * 0.06;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${shieldPulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // ── 战斗机主?──
        // 机身三角
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.15);
        ctx.lineTo(r * 0.55, r * 0.6);
        ctx.lineTo(r * 0.15, r * 0.35);
        ctx.lineTo(-r * 0.15, r * 0.35);
        ctx.lineTo(-r * 0.55, r * 0.6);
        ctx.closePath();

        ctx.fillStyle = isHit ? '#660022' : '#082838';
        ctx.shadowBlur = 0;
        ctx.shadowColor = glowColor;
        ctx.fill();
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // ── 双翼 ──
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(side * r * 0.4, r * 0.1);
            ctx.lineTo(side * r * 0.95, r * 0.5);
            ctx.lineTo(side * r * 0.85, r * 0.65);
            ctx.lineTo(side * r * 0.35, r * 0.35);
            ctx.closePath();
            ctx.fillStyle = isHit ? '#440015' : '#0a1e2e';
            ctx.fill();
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        // ── 引擎喷口 ──
        for (const side of [-1, 1]) {
            const ex = side * r * 0.25;
            const ey = r * 0.45;
            
            // 喷焰
            if (this.isMoving) {
                const flameLen = r * (0.35 + Math.sin(this.enginePhase + side * 2) * 0.12);
                const fGrad = ctx.createLinearGradient(ex, ey, ex, ey + flameLen);
                fGrad.addColorStop(0, 'rgba(0, 200, 255, 0.8)');
                fGrad.addColorStop(0.4, 'rgba(0, 100, 255, 0.4)');
                fGrad.addColorStop(1, 'rgba(0, 50, 200, 0)');
                ctx.beginPath();
                ctx.moveTo(ex - r * 0.07, ey);
                ctx.lineTo(ex, ey + flameLen);
                ctx.lineTo(ex + r * 0.07, ey);
                ctx.fillStyle = fGrad;
                ctx.fill();
            }
        }

        // ── 驾驶?──
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.2, r * 0.15, r * 0.25, 0, 0, Math.PI * 2);
        const cockpitGrad = ctx.createRadialGradient(0, -r * 0.25, 0, 0, -r * 0.2, r * 0.2);
        cockpitGrad.addColorStop(0, isHit ? '#ff6688' : '#00ddff');
        cockpitGrad.addColorStop(1, isHit ? '#880033' : '#004466');
        ctx.fillStyle = cockpitGrad;
        ctx.fill();

        // ── 机头发光?──
        ctx.beginPath();
        ctx.arc(0, -r * 1.05, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.shadowColor = glowColor;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();
        ctx.globalAlpha = 1;
    }
}
