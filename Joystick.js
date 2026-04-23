// 虚拟摇杆 — 触屏控制（修复卡住版）
export class VirtualJoystick {
    constructor(canvas) {
        this.canvas = canvas;
        this.active = false;
        this.baseX = 0;
        this.baseY = 0;
        this.thumbX = 0;
        this.thumbY = 0;
        this.dx = 0;
        this.dy = 0;
        this.baseRadius = 55;
        this.thumbRadius = 24;
        this.maxDist = 50;
        this.opacity = 0;
        this.touchId = null;
        this._deadZone = 8;
        this._lastMoveTime = 0; // 上次 touchmove 时间
        this._watchdog = null;

        this._setupTouch();
    }

    _reset() {
        this.active = false;
        this.dx = 0;
        this.dy = 0;
        this.touchId = null;
        this.opacity = 0;
        if (this._watchdog) {
            clearInterval(this._watchdog);
            this._watchdog = null;
        }
    }

    _startWatchdog() {
        // 每200ms检查：如果超过500ms没收到touchmove且仍active，强制重置
        if (this._watchdog) clearInterval(this._watchdog);
        this._watchdog = setInterval(() => {
            if (!this.active) {
                clearInterval(this._watchdog);
                this._watchdog = null;
                return;
            }
            if (Date.now() - this._lastMoveTime > 800) {
                this._reset();
            }
        }, 200);
    }

    _setupTouch() {
        document.addEventListener('touchstart', (e) => {
            if (this.active) return;
            const touch = e.changedTouches[0];
            this.touchId = touch.identifier;
            this.baseX = touch.clientX;
            this.baseY = touch.clientY;
            this.thumbX = this.baseX;
            this.thumbY = this.baseY;
            this.active = true;
            this.opacity = 0.7;
            this.dx = 0;
            this.dy = 0;
            this._lastMoveTime = Date.now();
            this._startWatchdog();
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!this.active || this.touchId === null) return;
            for (const touch of e.changedTouches) {
                if (touch.identifier !== this.touchId) continue;
                this._lastMoveTime = Date.now();
                
                let ddx = touch.clientX - this.baseX;
                let ddy = touch.clientY - this.baseY;
                let dist = Math.sqrt(ddx * ddx + ddy * ddy);
                
                // 底盘跟随
                if (dist > this.maxDist * 1.5) {
                    const overflow = dist - this.maxDist;
                    this.baseX += (ddx / dist) * overflow * 0.3;
                    this.baseY += (ddy / dist) * overflow * 0.3;
                    ddx = touch.clientX - this.baseX;
                    ddy = touch.clientY - this.baseY;
                    dist = Math.sqrt(ddx * ddx + ddy * ddy);
                }
                
                if (dist > this.maxDist) {
                    ddx = (ddx / dist) * this.maxDist;
                    ddy = (ddy / dist) * this.maxDist;
                    dist = this.maxDist;
                }
                
                this.thumbX = this.baseX + ddx;
                this.thumbY = this.baseY + ddy;
                
                if (dist > this._deadZone) {
                    this.dx = ddx / dist;
                    this.dy = ddy / dist;
                } else {
                    this.dx = 0;
                    this.dy = 0;
                }
                return;
            }
        }, { passive: true });

        const onEnd = (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this.touchId) {
                    this._reset();
                    return;
                }
            }
        };
        document.addEventListener('touchend', onEnd, { passive: true });
        document.addEventListener('touchcancel', onEnd, { passive: true });

        // 备用：pointer 事件兜底
        document.addEventListener('pointerup', () => {
            setTimeout(() => {
                if (this.active) this._reset();
            }, 100);
        }, { passive: true });
        document.addEventListener('pointercancel', () => {
            this._reset();
        }, { passive: true });

        // 页面失焦/切后台时重置
        window.addEventListener('blur', () => this._reset());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this._reset();
        });
    }

    draw(ctx) {
        if (!this.active || this.opacity <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;

        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.maxDist, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(38,231,255,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.thumbX, this.thumbY, this.thumbRadius, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(this.thumbX, this.thumbY, 0, this.thumbX, this.thumbY, this.thumbRadius);
        g.addColorStop(0, 'rgba(38,231,255,0.4)');
        g.addColorStop(1, 'rgba(38,231,255,0.08)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(38,231,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (this.dx !== 0 || this.dy !== 0) {
            ctx.beginPath();
            ctx.moveTo(this.baseX, this.baseY);
            ctx.lineTo(this.thumbX, this.thumbY);
            ctx.strokeStyle = 'rgba(38,231,255,0.15)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
}
