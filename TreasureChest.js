// Treasure chest system
export class TreasureChest {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 18;
        this.phase = 0;
        this.collected = false;
        this.openAnim = 0;
        this.particles = [];
        
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                angle: Math.random() * Math.PI * 2,
                r: 15 + Math.random() * 10,
                speed: 0.5 + Math.random() * 0.5,
                size: 1.5 + Math.random() * 1.5,
                alpha: 0.3 + Math.random() * 0.3
            });
        }
    }

    update(dt) {
        this.phase += dt * 3;
        for (let p of this.particles) p.angle += p.speed * dt;
        if (this.collected) this.openAnim += dt * 3;
    }

    draw(ctx) {
        if (this.collected && this.openAnim > 1) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);

        // 地面光圈
        const glowR = this.radius * 2;
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
        glowGrad.addColorStop(0, `rgba(255, 200, 0, ${0.08 + Math.sin(this.phase) * 0.03})`);
        glowGrad.addColorStop(0.6, 'rgba(255, 150, 0, 0.03)');
        glowGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.beginPath();
        ctx.arc(0, 0, glowR, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // 漂浮粒子
        for (let p of this.particles) {
            const px = Math.cos(p.angle) * p.r;
            const py = Math.sin(p.angle) * p.r + Math.sin(this.phase + p.angle) * 3;
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 220, 100, ${p.alpha})`;
            ctx.fill();
        }

        const floatY = Math.sin(this.phase * 0.8) * 3;
        ctx.translate(0, floatY);
        
        if (this.collected) {
            ctx.globalAlpha = 1 - this.openAnim;
            ctx.scale(1 + this.openAnim * 0.5, 1 + this.openAnim * 0.5);
        }

        // 宝箱本体（纯Canvas
    const w = 22, h = 16;
        // 底座
        ctx.beginPath();
        ctx.roundRect(-w/2, -h/2 + 2, w, h - 2, 3);
        ctx.fillStyle = '#1a1200';
        ctx.shadowBlur = 0;
        ctx.shadowColor = '#ffcc00';
        ctx.fill();
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // 盖子
        ctx.beginPath();
        ctx.roundRect(-w/2 - 1, -h/2 - 2, w + 2, 6, [3, 3, 0, 0]);
        ctx.fillStyle = '#221800';
        ctx.fill();
        ctx.strokeStyle = '#ffdd44';
        ctx.lineWidth = 1;
        ctx.stroke();
        // 锁扣
        ctx.beginPath();
        ctx.arc(0, -h/2 + 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffdd44';
        ctx.shadowBlur = 0;
        ctx.shadowColor = '#ffcc00';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -h/2 + 3, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    }
}

// 任务系统
export class MissionSystem {
    constructor() {
        this.currentMission = null;
        this.missionsCompleted = 0;
        this.chest = null;
    }

    startNewMission(killCount) {
        if (this.currentMission && !this.currentMission.completed) return;
        
        const missionTypes = [
            { type: 'kill', target: 15 + this.missionsCompleted * 5, desc: '击杀' },
            { type: 'kill', target: 20 + this.missionsCompleted * 8, desc: '击杀' },
        ];
        
        const m = missionTypes[Math.floor(Math.random() * missionTypes.length)];
        this.currentMission = {
            type: m.type,
            target: m.target,
            progress: 0,
            completed: false,
            desc: `${m.desc} ${m.target} 个敌人`,
            startKillCount: killCount
        };
    }

    updateProgress(killCount) {
        if (!this.currentMission || this.currentMission.completed) return false;
        this.currentMission.progress = killCount - this.currentMission.startKillCount;
        if (this.currentMission.progress >= this.currentMission.target) {
            this.currentMission.completed = true;
            return true;
        }
        return false;
    }

    reset() {
        this.currentMission = null;
        this.missionsCompleted = 0;
        this.chest = null;
    }

    getRandomReward() {
        const rewards = [
            { type: 'heal', desc: '恢复30%生命' },
            { type: 'damage', desc: '攻击?3' },
            { type: 'speed', desc: '移动速度+15' },
            { type: 'magnet', desc: '拾取范围+30' },
            { type: 'crit', desc: '暴击?5%' },
        ];
        return rewards[Math.floor(Math.random() * rewards.length)];
    }
}
