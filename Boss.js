let _bid=0;
export function resetBossIdCounter(){_bid=0;}

export class Boss {
    constructor(x, y, difficulty) {
        this.id = ++_bid + 10000;
        this.x = x;
        this.y = y;
        this.radius = 40;
        this.baseSpeed = 55 + difficulty * 0.5;
        this.speed = this.baseSpeed;
        this.color = '#ffcc00';
        
        const hpScale = 1 + difficulty * 0.04;
        this.hp = Math.floor(500 * hpScale);
        this.maxHp = this.hp;
        this.contactDamage = 12 + Math.floor(difficulty * 0.2);
        
        this.hitFlash = 0;
        this.rotation = 0;
        this.pulsePhase = 0;
        this.facingAngle = 0;
        
        // Special attack system
        this.attackTimer = 3 + Math.random() * 2;
        this.attackCooldown = 4;
        this.currentAttack = null; // 'bulletRing' | 'dash' | 'summon'
        this.attackPhase = 0;
        
        // Bullet ring
        this.bullets = [];
        
        // Dash charge
        this.dashTarget = null;
        this.dashSpeed = 0;
        this.dashTrail = [];
        
        // Enrage at low HP
        this.enraged = false;
        
        // Difficulty-based attack pool
        this.attackPool = ['bulletRing', 'dash'];
        if (difficulty > 60) this.attackPool.push('summon');
        if (difficulty > 120) this.attackPool.push('bulletSpiral');
        
        this.summonRequested = false;
    }

    update(dt, playerX, playerY) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.facingAngle = Math.atan2(dy, dx);
        
        // Enrage below 30% HP
        if (!this.enraged && this.hp < this.maxHp * 0.3) {
            this.enraged = true;
            this.speed = this.baseSpeed * 1.5;
            this.attackCooldown *= 0.6;
            this.color = '#ff4400';
        }
        
        // Attack timer
        this.attackTimer -= dt;
        if (this.attackTimer <= 0 && !this.currentAttack) {
            this.startAttack(playerX, playerY);
        }
        
        // Execute current attack
        if (this.currentAttack) {
            this.updateAttack(dt, playerX, playerY);
        } else {
            // Normal chase
            if (dist > 0) {
                this.x += (dx / dist) * this.speed * dt;
                this.y += (dy / dist) * this.speed * dt;
            }
        }
        
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            if (b.life <= 0) this.bullets.splice(i, 1);
        }
        
        // Dash trail fade
        for (let i = this.dashTrail.length - 1; i >= 0; i--) {
            this.dashTrail[i].life -= dt * 3;
            if (this.dashTrail[i].life <= 0) this.dashTrail.splice(i, 1);
        }
        
        this.rotation += (this.enraged ? 1.5 : 0.8) * dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;
        this.pulsePhase += dt * (this.enraged ? 5 : 3);
        
        this.summonRequested = false;
    }
    
    startAttack(playerX, playerY) {
        const type = this.attackPool[Math.floor(Math.random() * this.attackPool.length)];
        this.currentAttack = type;
        this.attackPhase = 0;
        
        if (type === 'dash') {
            // Wind up for dash
            this.dashTarget = { x: playerX, y: playerY };
            this.dashSpeed = 0;
        }
    }
    
    updateAttack(dt, playerX, playerY) {
        this.attackPhase += dt;
        
        switch (this.currentAttack) {
            case 'bulletRing':
                if (this.attackPhase > 0.5 && this.bullets.length === 0) {
                    // Fire ring of bullets
                    const count = this.enraged ? 16 : 10;
                    const speed = 180;
                    for (let i = 0; i < count; i++) {
                        const a = (Math.PI * 2 / count) * i;
                        this.bullets.push({
                            x: this.x, y: this.y,
                            vx: Math.cos(a) * speed,
                            vy: Math.sin(a) * speed,
                            life: 3, radius: 5,
                            color: this.enraged ? '#ff4400' : '#ffcc00'
                        });
                    }
                }
                if (this.attackPhase > 1.5) {
                    this.endAttack();
                }
                break;
                
            case 'bulletSpiral':
                // Continuous spiral bullets
                const interval = this.enraged ? 0.08 : 0.12;
                const bulletsPerTick = Math.floor(this.attackPhase / interval) - Math.floor((this.attackPhase - dt) / interval);
                for (let i = 0; i < bulletsPerTick; i++) {
                    const spiralAngle = this.attackPhase * 5 + (i * 0.3);
                    this.bullets.push({
                        x: this.x, y: this.y,
                        vx: Math.cos(spiralAngle) * 160,
                        vy: Math.sin(spiralAngle) * 160,
                        life: 2.5, radius: 4,
                        color: '#ff8800'
                    });
                }
                if (this.attackPhase > 2.5) this.endAttack();
                break;
                
            case 'dash':
                if (this.attackPhase < 0.8) {
                    // Wind up - slow down and flash
                    this.speed = this.baseSpeed * 0.2;
                } else if (this.attackPhase < 1.6) {
                    // DASH!
                    if (this.dashTarget) {
                        const ddx = this.dashTarget.x - this.x;
                        const ddy = this.dashTarget.y - this.y;
                        const dd = Math.sqrt(ddx*ddx + ddy*ddy);
                        if (dd > 10) {
                            const dashVel = 800;
                            this.x += (ddx/dd) * dashVel * dt;
                            this.y += (ddy/dd) * dashVel * dt;
                            // trail
                            this.dashTrail.push({ x: this.x, y: this.y, life: 1 });
                        }
                    }
                } else {
                    this.speed = this.enraged ? this.baseSpeed * 1.5 : this.baseSpeed;
                    this.endAttack();
                }
                break;
                
            case 'summon':
                if (this.attackPhase > 0.5 && !this.summonRequested) {
                    this.summonRequested = true;
                }
                if (this.attackPhase > 1.0) this.endAttack();
                break;
        }
    }
    
    endAttack() {
        this.currentAttack = null;
        this.attackTimer = this.attackCooldown * (0.8 + Math.random() * 0.4);
    }

    draw(ctx) {
        const r = this.radius;
        const isHit = this.hitFlash > 0;
        const mainColor = this.enraged ? '#ff4400' : '#ffcc00';
        const glowColor = this.enraged ? '#ff2200' : '#ffaa00';

        // Dash trail
        for (const t of this.dashTrail) {
            ctx.beginPath();
            ctx.arc(t.x, t.y, r * 0.7 * t.life, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 100, 0, ${t.life * 0.15})`;
            ctx.fill();
        }
        
        // Dash windup indicator
        if (this.currentAttack === 'dash' && this.attackPhase < 0.8) {
            const warn = this.attackPhase / 0.8;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r * (1.5 + warn), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 0, 0, ${warn * 0.4})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Bullets
        for (const b of this.bullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = b.color;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // danger aura
        const dangerGrad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.5);
        dangerGrad.addColorStop(0, this.enraged ? 'rgba(255,50,0,0.06)' : 'rgba(255,100,0,0.04)');
        dangerGrad.addColorStop(1, 'rgba(255,200,0,0)');
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = dangerGrad;
        ctx.fill();

        // outer rotating dodecagon
        ctx.save();
        ctx.rotate(this.rotation);
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
            const a = (Math.PI / 6) * i;
            const pr = r * (1.15 + (i % 2 === 0 ? 0 : 0.1));
            const px = Math.cos(a) * pr;
            const py = Math.sin(a) * pr;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = isHit ? 'rgba(255,255,255,0.3)' : `${mainColor}33`;
        ctx.lineWidth = this.enraged ? 1.5 : 1;
        ctx.stroke();
        ctx.restore();

        // inner hex
        ctx.save();
        ctx.rotate(-this.rotation * 1.5);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            ctx.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
        }
        ctx.closePath();
        ctx.strokeStyle = isHit ? 'rgba(255,255,255,0.2)' : `${mainColor}22`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();

        // main body
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = isHit ? '#332200' : '#1a0e00';
        ctx.fill();
        ctx.strokeStyle = isHit ? '#ffffff' : mainColor;
        ctx.lineWidth = this.enraged ? 3 : 2;
        ctx.stroke();

        // radial lines
        ctx.strokeStyle = isHit ? 'rgba(255,255,255,0.15)' : `${mainColor}1a`;
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i + this.rotation * 0.2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
            ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
            ctx.stroke();
        }

        // center eye
        const eyeR = r * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
        const irisGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, eyeR);
        irisGrad.addColorStop(0, '#ffffff');
        irisGrad.addColorStop(0.3, this.enraged ? '#ff6666' : '#ffaa00');
        irisGrad.addColorStop(0.7, this.enraged ? '#ff0000' : '#ff6600');
        irisGrad.addColorStop(1, this.enraged ? '#880000' : '#cc2200');
        ctx.fillStyle = irisGrad;
        ctx.fill();

        // pupil
        const pupilX = Math.cos(this.facingAngle) * eyeR * 0.2;
        const pupilY = Math.sin(this.facingAngle) * eyeR * 0.2;
        ctx.beginPath();
        ctx.ellipse(pupilX, pupilY, eyeR * 0.2, eyeR * 0.35, this.facingAngle, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pupilX - eyeR * 0.08, pupilY - eyeR * 0.08, eyeR * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();

        // pulse ring
        const pulseR = r * 0.9 + Math.sin(this.pulsePhase) * 3;
        ctx.beginPath();
        ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `${mainColor}${Math.floor(25 + Math.sin(this.pulsePhase) * 12).toString(16).padStart(2,'0')}`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // enrage indicator
        if (this.enraged) {
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.1 + Math.sin(this.pulsePhase * 2) * 4, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.15 + Math.sin(this.pulsePhase * 2) * 0.1})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();

        // HP bar
        const barW = r * 3.5;
        const barH = 6;
        const bx = this.x - barW / 2;
        const by = this.y - r - 22;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        const hpRatio = this.hp / this.maxHp;
        const hpGrad = ctx.createLinearGradient(bx, by, bx + barW * hpRatio, by);
        hpGrad.addColorStop(0, this.enraged ? '#ff4444' : '#ffe066');
        hpGrad.addColorStop(1, this.enraged ? '#cc0000' : '#ff8800');
        ctx.fillStyle = hpGrad;
        ctx.fillRect(bx, by, barW * hpRatio, barH);

        ctx.font = '800 11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.strokeText('BOSS', this.x, by - 5);
        ctx.fillStyle = mainColor;
        ctx.fillText('BOSS', this.x, by - 5);
    }
}
