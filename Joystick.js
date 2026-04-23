// 虚拟摇杆 — 触屏控制（优化版）
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
        this.baseRadius = 55;
        this.thumbRadius = 24;
        this.maxDist = 50;
        this.opacity = 0;
        this.touchId = null;
        this._deadZone = 8; // 像素死区

        this._setupTouch();
    }

    _setupTouch() {
        // 绑定到 document 而非 canvas，防止 HUD 元素拦截触摸
        const getPos = (touch) => {
            return { x: touch.clientX, y: touch.clientY };
        };

        document.addEventListener('touchstart', (e) => {
            if (this.active) return;
            // 只响应屏幕左半区的触摸（右半区留给其他UI）
            const touch = e.changedTouches[0];
            if (touch.clientX > window.innerWidth * 0.6) return;
            
            this.touchId = touch.identifier;
            const pos = getPos(touch);
            this.baseX = pos.x;
            this.baseY = pos.y;
            this.thumbX = this.baseX;
            this.thumbY = this.baseY;
            this.active = true;
            this.opacity = 0.7;
            this.dx = 0;
            this.dy = 0;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!this.active) return;
            for (const touch of e.changedTouches) {
                if (touch.identifier !== this.touchId) continue;
                const pos = getPos(touch);
                let ddx = pos.x - this.baseX;
                let ddy = pos.y - this.baseY;
                let dist = Math.sqrt(ddx * ddx + ddy * ddy);
                
                // 允许底盘跟随：如果拉得太远，底盘也跟着移动
                if (dist > this.maxDist * 1.5) {
                    const overflow = dist - this.maxDist;
                    this.baseX += (ddx / dist) * overflow * 0.3;
                    this.baseY += (ddy / dist) * overflow * 0.3;
                    ddx = pos.x - this.baseX;
                    ddy = pos.y - this.baseY;
                    dist = Math.sqrt(ddx * ddx + ddy * ddy);
                }
                
                if (dist > this.maxDist) {
                    ddx = (ddx / dist) * this.maxDist;
                    ddy = (ddy / dist) * this.maxDist;
                    dist = this.maxDist;
                }
                
                this.thumbX = this.baseX + ddx;
                this.thumbY = this.baseY + ddy;
                
                // 更小的死区确保灵敏
                if (dist > this._deadZone) {
                    this.dx = ddx / dist;
                    this.dy = ddy / dist;
                } else {
                    this.dx = 0;
                    this.dy = 0;
                }
            }
        }, { passive: true });

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
        document.addEventListener('touchend', onEnd, { passive: true });
        document.addEventListener('touchcancel', onEnd, { passive: true });
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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 方向指示圈
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.maxDist, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(38, 231, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 摇杆头
        ctx.beginPath();
        ctx.arc(this.thumbX, this.thumbY, this.thumbRadius, 0, Math.PI * 2);
        const thumbGrad = ctx.createRadialGradient(
            this.thumbX, this.thumbY, 0,
            this.thumbX, this.thumbY, this.thumbRadius
        );
        thumbGrad.addColorStop(0, 'rgba(38, 231, 255, 0.4)');
        thumbGrad.addColorStop(1, 'rgba(38, 231, 255, 0.08)');
        ctx.fillStyle = thumbGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(38, 231, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 方向指示线
        if (this.dx !== 0 || this.dy !== 0) {
            ctx.beginPath();
            ctx.moveTo(this.baseX, this.baseY);
            ctx.lineTo(this.thumbX, this.thumbY);
            ctx.strokeStyle = 'rgba(38, 231, 255, 0.15)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
}
