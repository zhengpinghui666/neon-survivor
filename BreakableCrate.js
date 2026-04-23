// Breakable crate - random powerup drops
export class BreakableCrate {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 14;
        this.hp = 1;
        this.phase = Math.random() * Math.PI * 2;
        this.rotation = Math.random() * 0.3 - 0.15;
        this.destroyed = false;
        this.shimmer = Math.random() * Math.PI * 2;
    }

    update(dt) {
        this.phase += dt * 2;
        this.shimmer += dt * 4;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.destroyed = true;
            return this.getRandomDrop();
        }
        return null;
    }

    getRandomDrop() {
        const drops = [
            { type: 'fullHeal', name: 'HP MAX', desc: 'Full heal', color: '#ff3366', chance: 15 },
            { type: 'magnetAll', name: 'MAGNET', desc: 'Attract all XP', color: '#ffaa00', chance: 15 },
            { type: 'shield', name: 'SHIELD', desc: '3s invincible', color: '#00ccff', chance: 10 },
            { type: 'damageUp', name: 'ATK UP', desc: 'ATK+5', color: '#ff6600', chance: 15 },
            { type: 'speedUp', name: 'SPD UP', desc: 'SPD+20', color: '#66ff66', chance: 15 },
            { type: 'xpBoost', name: 'XP BOOST', desc: '15s 2x XP', color: '#aa66ff', chance: 10 },
            { type: 'crateExplosion', name: 'BOOM', desc: 'Screen clear', color: '#ff0044', chance: 8 },
            { type: 'multiShot', name: 'MULTI', desc: 'Bullet+1', color: '#00ffaa', chance: 7 },
            { type: 'critUp', name: 'CRIT UP', desc: 'Crit+5%', color: '#ffdd00', chance: 5 },
        ];

        const totalWeight = drops.reduce((s, d) => s + d.chance, 0);
        let roll = Math.random() * totalWeight;
        for (const drop of drops) {
            roll -= drop.chance;
            if (roll <= 0) return drop;
        }
        return drops[0];
    }

    draw(ctx) {
        if (this.destroyed) return;
        const r = this.radius;
        const floatY = Math.sin(this.phase * 0.8) * 2;

        ctx.save();
        ctx.translate(this.x, this.y + floatY);
        ctx.rotate(this.rotation);

        // glow
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2);
        glowGrad.addColorStop(0, 'rgba(255, 200, 100, 0.06)');
        glowGrad.addColorStop(1, 'rgba(255, 150, 50, 0)');
        ctx.beginPath();
        ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // box
        const hw = r, hh = r * 0.9;
        ctx.beginPath();
        ctx.roundRect(-hw, -hh, hw * 2, hh * 2, 3);
        ctx.fillStyle = '#1a1200';
        ctx.fill();
        ctx.strokeStyle = '#cc8800';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // cross
        ctx.strokeStyle = '#886600';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0);
        ctx.moveTo(0, -hh); ctx.lineTo(0, hh);
        ctx.stroke();

        // question mark
        ctx.font = `bold ${r}px Outfit`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(255, 220, 100, ${0.4 + Math.sin(this.shimmer) * 0.15})`;
        ctx.fillText('?', 0, 1);

        ctx.restore();
    }
}

// Drop pickup effect
export class DropEffect {
    constructor(x, y, drop) {
        this.x = x;
        this.y = y;
        this.drop = drop;
        this.life = 1.5;
        this.maxLife = 1.5;
    }

    update(dt) {
        this.life -= dt;
        this.y -= dt * 30;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const alpha = Math.min(1, this.life / 0.5);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 13px Outfit';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.drop.color;
        ctx.fillText(this.drop.name, this.x, this.y);
        ctx.restore();
    }
}
