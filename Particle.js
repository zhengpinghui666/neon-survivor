export class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 180 + 60;
        this.dx = Math.cos(angle) * velocity;
        this.dy = Math.sin(angle) * velocity;
        
        this.lifeTime = 0.4 + Math.random() * 0.5;
        this.maxLifeTime = this.lifeTime;
        this.radius = Math.random() * 3.5 + 1;
        this.type = Math.random() > 0.5 ? 'spark' : 'dot'; // 一半火花一半点
    }
    
    update(dt) {
        this.x += this.dx * dt;
        this.y += this.dy * dt;
        this.dx *= 0.94;
        this.dy *= 0.94;
        this.dy += 40 * dt; // 微重力下
    this.lifeTime -= dt;
    }
    
    draw(ctx) {
        const alpha = Math.max(0, this.lifeTime / this.maxLifeTime);
        ctx.globalAlpha = alpha;
        
        if (this.type === 'spark') {
            // 拖尾火花
            const speed = Math.sqrt(this.dx**2 + this.dy**2);
            if (speed > 5) {
                const tailLen = Math.min(speed * 0.04, 8);
                const tailX = this.x - (this.dx / speed) * tailLen;
                const tailY = this.y - (this.dy / speed) * tailLen;
                
                ctx.beginPath();
                ctx.moveTo(tailX, tailY);
                ctx.lineTo(this.x, this.y);
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.radius * 0.8;
                ctx.shadowBlur = 0;
                ctx.shadowColor = this.color;
                ctx.stroke();
            }
            
            // 亮头
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        } else {
            // 发光圆点
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 0;
            ctx.shadowColor = this.color;
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}
