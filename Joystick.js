// 虚拟摇杆 — 触屏控制
export class VirtualJoystick {
    constructor(canvas) {
        this.canvas = canvas;
        this.active = false;
        this.baseX = 0;
        this.baseY = 0;
        this.thumbX = 0;
        this.thumbY = 0;
        this.dx = 0; // 归一化方向
        this.dy = 0;
        this.baseRadius = 60;
        this.thumbRadius = 26;
        this.maxDist = 55;
        this.opacity = 0;
        this.touchId = null;

        this._setupTouch();
    }

    _setupTouch() {
        const c = this.canvas;
        
        c.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.active) return;
            const touch = e.changedTouches[0];
            this.touchId = touch.identifier;
            const rect = c.getBoundingClientRect();
            this.baseX = touch.clientX - rect.left;
            this.baseY = touch.clientY - rect.top;
            this.thumbX = this.baseX;
            this.thumbY = this.baseY;
            this.active = true;
            this.opacity = 0.6;
            this.dx = 0;
            this.dy = 0;
        }, { passive: false });

        c.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.active) return;
            for (const touch of e.changedTouches) {
                if (touch.identifier !== this.touchId) continue;
                const rect = c.getBoundingClientRect();
                let tx = touch.clientX - rect.left;
                let ty = touch.clientY - rect.top;
                
                let ddx = tx - this.baseX;
                let ddy = ty - this.baseY;
                let dist = Math.sqrt(ddx * ddx + ddy * ddy);
                
                if (dist > this.maxDist) {
                    ddx = (ddx / dist) * this.maxDist;
                    ddy = (ddy / dist) * this.maxDist;
                    dist = this.maxDist;
                }
                
                this.thumbX = this.baseX + ddx;
                this.thumbY = this.baseY + ddy;
                
                if (dist > 3) {
                    this.dx = ddx / dist;
                    this.dy = ddy / dist;
                } else {
                    this.dx = 0;
                    this.dy = 0;
                }
            }
        }, { passive: false });

        const onEnd = (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this.touchId) {
                    this.active = false;
                    this.dx = 0;
                    this.dy = 0;
                    this.touchId = null;
                    this.opacity = 0;
                }
            }
        };
        c.addEventListener('touchend', onEnd, { passive: false });
        c.addEventListener('touchcancel', onEnd, { passive: false });
    }

    // 在 HUD 层绘制（不受相机平移影响）
    draw(ctx) {
        if (!this.active || this.opacity <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;

        // 底盘
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 方向指示圈
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.maxDist, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 摇杆头
        ctx.beginPath();
        ctx.arc(this.thumbX, this.thumbY, this.thumbRadius, 0, Math.PI * 2);
        const thumbGrad = ctx.createRadialGradient(
            this.thumbX, this.thumbY, 0,
            this.thumbX, this.thumbY, this.thumbRadius
        );
        thumbGrad.addColorStop(0, 'rgba(0, 220, 255, 0.35)');
        thumbGrad.addColorStop(1, 'rgba(0, 150, 255, 0.1)');
        ctx.fillStyle = thumbGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}
