// Elite Enemy - stronger variant that drops evolution cards

let _elid=0;
export function resetEliteIdCounter(){_elid=0;}

export class EliteEnemy {
    constructor(x, y, surviveTime) {
        this.id = ++_elid + 20000;
        this.x = x;
        this.y = y;
        this.isElite = true;

        // Type selection based on time
        const types = [
            { name: 'Warden', color: '#ff44aa', baseHp: 120, speed: 45, radius: 22 },
            { name: 'Ravager', color: '#ff8800', baseHp: 90, speed: 75, radius: 18 },
            { name: 'Titan', color: '#8844ff', baseHp: 200, speed: 30, radius: 28 },
        ];
        const type = types[Math.floor(Math.random() * types.length)];

        this.name = type.name;
        this.color = type.color;
        this.radius = type.radius;
        this.speed = type.speed + surviveTime * 0.15;

        const timeScale = 1 + surviveTime * 0.02;
        this.hp = Math.floor(type.baseHp * timeScale);
        this.maxHp = this.hp;

        this.hitFlash = 0;
        this.rotation = 0;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.auraPhase = 0;

        // Drops evolution card on death
        this.dropsEvoCard = true;
    }

    update(dt, playerX, playerY, terrains) {
        let dx = playerX - this.x;
        let dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            dx /= dist; dy /= dist;
            this.x += dx * this.speed * dt;
            this.y += dy * this.speed * dt;
        }
        // Terrain collision
        if (terrains) {
            for (const t of terrains) {
                if (t.collideCircle) {
                    const push = t.collideCircle(this.x, this.y, this.radius);
                    if (push) { this.x += push.x; this.y += push.y; }
                }
            }
        }
        this.rotation += 1.5 * dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;
        this.pulsePhase += dt * 4;
        this.auraPhase += dt * 2;
    }

    draw(ctx) {
        const r = this.radius;
        const isHit = this.hitFlash > 0;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Elite aura - pulsing ring
        const auraR = r * 2 + Math.sin(this.auraPhase) * 5;
        const auraGrad = ctx.createRadialGradient(0, 0, r, 0, 0, auraR);
        auraGrad.addColorStop(0, this.color + '33');
        auraGrad.addColorStop(1, this.color + '00');
        ctx.beginPath();
        ctx.arc(0, 0, auraR, 0, Math.PI * 2);
        ctx.fillStyle = auraGrad;
        ctx.fill();

        // Rotating triangle markers
        ctx.save();
        ctx.rotate(this.rotation);
        for (let i = 0; i < 3; i++) {
            const a = (Math.PI * 2 / 3) * i;
            const tx = Math.cos(a) * (r * 1.4);
            const ty = Math.sin(a) * (r * 1.4);
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(a + 0.5) * 5, ty + Math.sin(a + 0.5) * 5);
            ctx.lineTo(tx + Math.cos(a - 0.5) * 5, ty + Math.sin(a - 0.5) * 5);
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        ctx.restore();

        // Main body
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = isHit ? '#ffffff' : this.color + 'cc';
        ctx.fill();
        ctx.strokeStyle = isHit ? '#fff' : this.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner pattern - X mark
        ctx.strokeStyle = '#00000055';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-r*0.4, -r*0.4); ctx.lineTo(r*0.4, r*0.4);
        ctx.moveTo(r*0.4, -r*0.4); ctx.lineTo(-r*0.4, r*0.4);
        ctx.stroke();

        // Crown/star on top
        ctx.fillStyle = '#ffdd00';
        const crownY = -r - 6;
        ctx.beginPath();
        ctx.moveTo(0, crownY - 5);
        ctx.lineTo(3, crownY);
        ctx.lineTo(0, crownY + 2);
        ctx.lineTo(-3, crownY);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // HP bar
        const barW = r * 2.5;
        const barH = 4;
        const bx = this.x - barW / 2;
        const by = this.y - r - 14;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = this.color;
        ctx.fillRect(bx, by, barW * hpRatio, barH);

        // ELITE label
        ctx.font = 'bold 9px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffdd00';
        ctx.fillText('ELITE', this.x, by - 3);
    }
}
