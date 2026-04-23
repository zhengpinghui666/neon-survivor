// 伤害飘字 — 带描边、缩放弹跳、暴击特效
export class DamageNumber {
    constructor(x, y, value, color = '#ffffff') {
        this.x = x;
        this.y = y;
        this.value = typeof value === 'number' ? Math.round(value) : value;
        this.color = color;
        this.isCrit = (color === '#ff003c');
        this.isSpecial = (typeof value === 'string'); // "BOSS KILL!" 等
        
        this.dy = -130 - Math.random() * 40;
        this.dx = (Math.random() - 0.5) * 70;
        
        this.lifeTime = this.isSpecial ? 1.2 : 0.7;
        this.maxLifeTime = this.lifeTime;
        this.scale = this.isCrit ? 2.2 : (this.isSpecial ? 2.5 : 1.6);
        this.rotation = (Math.random() - 0.5) * 0.3;
    }

    update(dt) {
        this.x += this.dx * dt;
        this.y += this.dy * dt;
        this.dy += 150 * dt; // 重力
        this.dx *= 0.98;
        this.lifeTime -= dt;
        
        const progress = 1 - (this.lifeTime / this.maxLifeTime);
        if (progress < 0.15) {
            // 弹出
            this.scale = (this.isCrit ? 1.4 : 1.0) + (1 - progress / 0.15) * (this.isCrit ? 0.8 : 0.6);
        } else if (progress < 0.3) {
            // 回弹
            const t = (progress - 0.15) / 0.15;
            this.scale = (this.isCrit ? 1.4 : 1.0) + Math.sin(t * Math.PI) * 0.15;
        } else {
            this.scale = this.isCrit ? 1.4 : 1.0;
        }
        
        if (this.isSpecial) this.scale = 2.0 + Math.sin(progress * Math.PI) * 0.4;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.lifeTime / this.maxLifeTime);
        const fontSize = Math.floor((this.isSpecial ? 20 : 15) * this.scale);
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * (1 - alpha)); // 旋转逐渐归零
        
        ctx.globalAlpha = alpha;
        ctx.font = `800 ${fontSize}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = String(this.value);
        
        // 外描边 (黑色)
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, 0, 0);
        
        // 内描边 (颜色)
        if (this.isCrit || this.isSpecial) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.strokeText(text, 0, 0);
        }
        
        // 填充
        if (this.isCrit) {
            // 暴击渐变
            const grad = ctx.createLinearGradient(0, -fontSize/2, 0, fontSize/2);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.5, '#ff003c');
            grad.addColorStop(1, '#aa0022');
            ctx.fillStyle = grad;
        } else if (this.isSpecial) {
            const grad = ctx.createLinearGradient(0, -fontSize/2, 0, fontSize/2);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.5, '#ffcc00');
            grad.addColorStop(1, '#ff8800');
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = this.color;
        }
        
        ctx.shadowBlur = this.isCrit ? 15 : 6;
        ctx.shadowColor = this.color;
        ctx.fillText(text, 0, 0);
        
        ctx.shadowBlur = 0;
        ctx.restore();
        ctx.globalAlpha = 1;
    }
}
