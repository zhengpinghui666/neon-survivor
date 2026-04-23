// Terrain system - polygon collision
// polygon-circle collision utils

// 将本地顶点转换为世界坐标
function toWorld(localVerts, x, y, rotation) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return localVerts.map(v => ({
        x: x + v.x * cos - v.y * sin,
        y: y + v.x * sin + v.y * cos
    }));
}

// 点到线段最近点
function closestPointOnSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { x: ax, y: ay };
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return { x: ax + t * dx, y: ay + t * dy };
}

// 点是否在多边形内部（射线法）
function pointInPolygon(px, py, verts) {
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
        const xi = verts[i].x, yi = verts[i].y;
        const xj = verts[j].x, yj = verts[j].y;
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

// polygon-circle collision, returns push vector or null
function polygonCirclePush(verts, cx, cy, cr) {
    let minDist = Infinity;
    let pushX = 0, pushY = 0;
    
    const isInside = pointInPolygon(cx, cy, verts);
    
    // 检查每条边
    for (let i = 0; i < verts.length; i++) {
        const j = (i + 1) % verts.length;
        const closest = closestPointOnSegment(cx, cy, verts[i].x, verts[i].y, verts[j].x, verts[j].y);
        const dx = cx - closest.x;
        const dy = cy - closest.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDist) {
            minDist = dist;
            if (dist > 0) {
                pushX = dx / dist;
                pushY = dy / dist;
            } else {
                // 点在边上，用边的法线
                const ex = verts[j].x - verts[i].x;
                const ey = verts[j].y - verts[i].y;
                const eLen = Math.sqrt(ex * ex + ey * ey);
                pushX = -ey / eLen;
                pushY = ex / eLen;
            }
        }
    }
    
    if (isInside) {
        // push circle out to nearest edge
        const pushDist = minDist + cr;
        return { x: pushX * pushDist, y: pushY * pushDist };
    } else if (minDist < cr) {
        // 圆心在外但边和圆重叠
        const pushDist = cr - minDist;
        return { x: pushX * pushDist, y: pushY * pushDist };
    }
    
    return null; // no collision
}


// ====== Terrain ======

export class Terrain {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.phase = Math.random() * Math.PI * 2;
        this.rotation = Math.random() * Math.PI * 2;

        switch (size) {
            case 'small':
                this.radius = 18 + Math.random() * 8;
                this.variant = Math.random() < 0.5 ? 'crystal' : 'rock';
                break;
            case 'medium':
                this.radius = 35 + Math.random() * 15;
                this.variant = Math.random() < 0.5 ? 'boulder' : 'ruin';
                break;
            case 'large':
                this.radius = 60 + Math.random() * 30;
                this.variant = Math.random() < 0.5 ? 'megacrystal' : 'asteroid';
                break;
            case 'wall':
                this.w = 120 + Math.random() * 100;
                this.h = 16 + Math.random() * 10;
                this.radius = Math.max(this.w, this.h) * 0.5;
                this.variant = 'wall';
                break;
        }

        // 生成碰撞多边形（本地坐标
    this.localPoly = this._buildCollisionPoly();
        // to world coords
        // rock/boulder 的绘制在顶点中直接烘焙了rotation，所以toWorld不再旋转
        const needsRotation = !['rock', 'boulder'].includes(this.variant);
        this.worldPoly = toWorld(this.localPoly, this.x, this.y, needsRotation ? this.rotation : 0);
    }

    // 按绘制形状生成碰撞多边形
    _buildCollisionPoly() {
        const r = this.radius;
        switch (this.variant) {
            case 'crystal':
                return [
                    { x: 0, y: -r },
                    { x: r * 0.5, y: -r * 0.2 },
                    { x: r * 0.4, y: r * 0.6 },
                    { x: -r * 0.4, y: r * 0.6 },
                    { x: -r * 0.5, y: -r * 0.2 },
                ];

            case 'rock': {
                const pts = [];
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 / 6) * i + this.rotation;
                    const rr = r * (0.7 + Math.sin(i * 2.7 + 1.3) * 0.3);
                    pts.push({ x: Math.cos(angle) * rr, y: Math.sin(angle) * rr });
                }
                return pts;
            }

            case 'boulder': {
                const pts = [];
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 / 8) * i + this.rotation;
                    const rr = r * (0.75 + Math.sin(i * 3.1 + 0.7) * 0.25);
                    pts.push({ x: Math.cos(angle) * rr, y: Math.sin(angle) * rr });
                }
                return pts;
            }

            case 'ruin':
                // 遗迹底座为主碰撞
    return [
                    { x: -r * 0.9, y: -r * 0.15 },
                    { x: r * 0.9, y: -r * 0.15 },
                    { x: r * 0.9, y: r * 0.15 },
                    { x: -r * 0.9, y: r * 0.15 },
                ];

            case 'megacrystal': {
                // 水晶簇的外轮廓包围盒
                const pts = [];
                const offsets = [
                    { ox: 0, oy: 0, h: r * 1.1, w: r * 0.3 },
                    { ox: r * 0.35, oy: r * 0.1, h: r * 0.7, w: r * 0.22 },
                    { ox: -r * 0.3, oy: r * 0.15, h: r * 0.65, w: r * 0.2 },
                ];
                // 用主晶体 + 偏移晶体的外边界构建凸包近似
                const minX = -r * 0.5, maxX = r * 0.57;
                const minY = -r * 1.1, maxY = r * 0.45;
                // 简化为六边形轮
    return [
                    { x: 0, y: minY },
                    { x: maxX, y: minY * 0.3 },
                    { x: maxX, y: maxY },
                    { x: maxX * 0.3, y: maxY },
                    { x: minX, y: maxY },
                    { x: minX, y: minY * 0.3 },
                ];
            }

            case 'asteroid': {
                const pts = [];
                for (let i = 0; i < 10; i++) {
                    const angle = (Math.PI * 2 / 10) * i;
                    const rr = r * (0.7 + Math.sin(i * 2.1 + 0.5) * 0.2 + Math.cos(i * 3.7) * 0.1);
                    pts.push({ x: Math.cos(angle) * rr, y: Math.sin(angle) * rr });
                }
                return pts;
            }

            case 'wall':
                // 墙壁矩形
                return [
                    { x: -this.w / 2, y: -this.h / 2 },
                    { x: this.w / 2, y: -this.h / 2 },
                    { x: this.w / 2, y: this.h / 2 },
                    { x: -this.w / 2, y: this.h / 2 },
                ];

            default:
                return [
                    { x: -r, y: -r },
                    { x: r, y: -r },
                    { x: r, y: r },
                    { x: -r, y: r },
                ];
        }
    }

    update(dt) {
        this.phase += dt * 0.8;
    }

    pushOut(entity) {
        const push = polygonCirclePush(this.worldPoly, entity.x, entity.y, entity.radius);
        if (push) {
            entity.x += push.x;
            entity.y += push.y;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        switch (this.variant) {
            case 'crystal': this.drawCrystal(ctx); break;
            case 'rock': this.drawRock(ctx); break;
            case 'boulder': this.drawBoulder(ctx); break;
            case 'ruin': this.drawRuin(ctx); break;
            case 'megacrystal': this.drawMegaCrystal(ctx); break;
            case 'asteroid': this.drawAsteroid(ctx); break;
            case 'wall': this.drawWall(ctx); break;
        }
        
        ctx.restore();
    }

    // ── water ──
    drawCrystal(ctx) {
        const r = this.radius;
        ctx.rotate(this.rotation);
        
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.5, -r * 0.2);
        ctx.lineTo(r * 0.4, r * 0.6);
        ctx.lineTo(-r * 0.4, r * 0.6);
        ctx.lineTo(-r * 0.5, -r * 0.2);
        ctx.closePath();
        ctx.fillStyle = '#0a1a2a';
        ctx.shadowBlur = 0;
        ctx.shadowColor = '#00aadd';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 180, 255, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-r * 0.15, -r * 0.6);
        ctx.lineTo(r * 0.1, r * 0.3);
        ctx.strokeStyle = `rgba(100, 220, 255, ${0.2 + Math.sin(this.phase) * 0.1})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // ── rock ──
    drawRock(ctx) {
        const r = this.radius;
        ctx.beginPath();
        const pts = 6;
        for (let i = 0; i < pts; i++) {
            const angle = (Math.PI * 2 / pts) * i + this.rotation;
            const rr = r * (0.7 + Math.sin(i * 2.7 + 1.3) * 0.3);
            const px = Math.cos(angle) * rr;
            const py = Math.sin(angle) * rr;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = '#1a1a22';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 100, 130, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // ── 中型巨石 ──
    drawBoulder(ctx) {
        const r = this.radius;
        
        ctx.beginPath();
        ctx.ellipse(0, r * 0.2, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fill();

        ctx.beginPath();
        const pts = 8;
        for (let i = 0; i < pts; i++) {
            const angle = (Math.PI * 2 / pts) * i + this.rotation;
            const rr = r * (0.75 + Math.sin(i * 3.1 + 0.7) * 0.25);
            const px = Math.cos(angle) * rr;
            const py = Math.sin(angle) * rr;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        const boulderGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
        boulderGrad.addColorStop(0, '#2a2a35');
        boulderGrad.addColorStop(1, '#0e0e15');
        ctx.fillStyle = boulderGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(120, 120, 150, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(60, 60, 80, 0.3)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, -r * 0.4);
        ctx.lineTo(r * 0.1, 0);
        ctx.lineTo(r * 0.4, r * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.1, 0);
        ctx.lineTo(-r * 0.1, r * 0.3);
        ctx.stroke();
    }

    // ── 中型遗迹 ──
    drawRuin(ctx) {
        const r = this.radius;
        ctx.rotate(this.rotation);
        
        ctx.beginPath();
        ctx.roundRect(-r * 0.9, -r * 0.15, r * 1.8, r * 0.3, 3);
        ctx.fillStyle = '#151520';
        ctx.fill();
        ctx.strokeStyle = 'rgba(80, 100, 80, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        for (const pos of [-0.6, -0.2, 0.2, 0.55]) {
            const h = r * (0.5 + Math.random() * 0.6);
            const px = r * pos;
            ctx.beginPath();
            ctx.roundRect(px - r * 0.08, -r * 0.15 - h, r * 0.16, h, 2);
            ctx.fillStyle = '#1a1a28';
            ctx.fill();
            ctx.strokeStyle = 'rgba(100, 120, 100, 0.25)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        const runeGlow = 0.15 + Math.sin(this.phase * 1.5) * 0.08;
        ctx.beginPath();
        ctx.arc(0, -r * 0.3, r * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 150, ${runeGlow})`;
        ctx.shadowBlur = 0;
        ctx.shadowColor = '#00ff88';
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // ── 大型巨晶 ──
    drawMegaCrystal(ctx) {
        const r = this.radius;
        
        const baseGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.2);
        baseGrad.addColorStop(0, 'rgba(0, 150, 255, 0.06)');
        baseGrad.addColorStop(1, 'rgba(0, 80, 200, 0)');
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = baseGrad;
        ctx.fill();

        const crystals = [
            { ox: 0, oy: 0, h: r * 1.1, w: r * 0.3, rot: 0 },
            { ox: r * 0.35, oy: r * 0.1, h: r * 0.7, w: r * 0.22, rot: 0.3 },
            { ox: -r * 0.3, oy: r * 0.15, h: r * 0.65, w: r * 0.2, rot: -0.25 },
            { ox: r * 0.1, oy: -r * 0.1, h: r * 0.5, w: r * 0.18, rot: 0.15 },
        ];

        for (const c of crystals) {
            ctx.save();
            ctx.translate(c.ox, c.oy);
            ctx.rotate(c.rot + this.rotation);
            
            ctx.beginPath();
            ctx.moveTo(0, -c.h);
            ctx.lineTo(c.w, -c.h * 0.2);
            ctx.lineTo(c.w * 0.8, c.h * 0.3);
            ctx.lineTo(-c.w * 0.8, c.h * 0.3);
            ctx.lineTo(-c.w, -c.h * 0.2);
            ctx.closePath();
            
            const cGrad = ctx.createLinearGradient(-c.w, -c.h, c.w, c.h * 0.3);
            cGrad.addColorStop(0, '#1a4466');
            cGrad.addColorStop(0.5, '#0a2238');
            cGrad.addColorStop(1, '#051520');
            ctx.fillStyle = cGrad;
            ctx.shadowBlur = 0;
            ctx.shadowColor = '#0088cc';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(-c.w * 0.2, -c.h * 0.7);
            ctx.lineTo(c.w * 0.1, c.h * 0.1);
            ctx.strokeStyle = `rgba(150, 230, 255, ${0.15 + Math.sin(this.phase + c.ox) * 0.08})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
            
            ctx.restore();
        }
        ctx.shadowBlur = 0;
    }

    // ── asteroid ──
    drawAsteroid(ctx) {
        const r = this.radius;
        
        ctx.beginPath();
        ctx.ellipse(r * 0.1, r * 0.15, r * 0.85, r * 0.4, 0.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fill();

        ctx.beginPath();
        const pts = 10;
        for (let i = 0; i < pts; i++) {
            const angle = (Math.PI * 2 / pts) * i;
            const rr = r * (0.7 + Math.sin(i * 2.1 + 0.5) * 0.2 + Math.cos(i * 3.7) * 0.1);
            const px = Math.cos(angle) * rr;
            const py = Math.sin(angle) * rr;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        const astGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
        astGrad.addColorStop(0, '#2a2535');
        astGrad.addColorStop(0.5, '#1a1520');
        astGrad.addColorStop(1, '#0a0810');
        ctx.fillStyle = astGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 80, 130, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const craters = [
            { cx: -r * 0.25, cy: -r * 0.2, cr: r * 0.18 },
            { cx: r * 0.3, cy: r * 0.1, cr: r * 0.12 },
            { cx: -r * 0.1, cy: r * 0.35, cr: r * 0.1 },
        ];
        for (const c of craters) {
            ctx.beginPath();
            ctx.arc(c.cx, c.cy, c.cr, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 10, 0.3)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(60, 50, 80, 0.25)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        ctx.strokeStyle = `rgba(180, 100, 255, ${0.1 + Math.sin(this.phase) * 0.05})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, -r * 0.1);
        ctx.quadraticCurveTo(0, -r * 0.3, r * 0.4, 0);
        ctx.stroke();
    }

    // ── wall ──
    drawWall(ctx) {
        ctx.rotate(this.rotation);
        const hw = this.w / 2;
        const hh = this.h / 2;

        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(-hw + 3, -hh + 3, this.w, this.h);

        ctx.beginPath();
        ctx.roundRect(-hw, -hh, this.w, this.h, 4);
        const wallGrad = ctx.createLinearGradient(-hw, -hh, -hw, hh);
        wallGrad.addColorStop(0, '#1e1e2a');
        wallGrad.addColorStop(1, '#0e0e18');
        ctx.fillStyle = wallGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(80, 80, 120, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(40, 40, 60, 0.3)';
        ctx.lineWidth = 0.5;
        const brickW = 25;
        for (let row = 0; row < Math.ceil(this.h / 8); row++) {
            const y = -hh + row * 8;
            ctx.beginPath();
            ctx.moveTo(-hw, y);
            ctx.lineTo(hw, y);
            ctx.stroke();
            const offset = (row % 2) * brickW * 0.5;
            for (let col = 0; col < Math.ceil(this.w / brickW); col++) {
                const bx = -hw + col * brickW + offset;
                ctx.beginPath();
                ctx.moveTo(bx, y);
                ctx.lineTo(bx, y + 8);
                ctx.stroke();
            }
        }

        ctx.strokeStyle = `rgba(100, 100, 180, ${0.1 + Math.sin(this.phase) * 0.04})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-hw, -hh);
        ctx.lineTo(hw, -hh);
        ctx.stroke();
    }
}

// 生成多样化的地形布局
export function generateTerrain(playerX, playerY) {
    const terrains = [];
    const safeRadius = 180;
    
    function randPos(range) {
        let x, y;
        do {
            x = playerX + (Math.random() - 0.5) * range * 2;
            y = playerY + (Math.random() - 0.5) * range * 2;
        } while (Math.sqrt((x - playerX) ** 2 + (y - playerY) ** 2) < safeRadius);
        return { x, y };
    }

    for (let i = 0; i < 6; i++) {
        const pos = randPos(2000);
        terrains.push(new Terrain(pos.x, pos.y, 'large'));
    }
    for (let i = 0; i < 5; i++) {
        const pos = randPos(1800);
        terrains.push(new Terrain(pos.x, pos.y, 'wall'));
    }
    for (let i = 0; i < 12; i++) {
        const pos = randPos(1800);
        terrains.push(new Terrain(pos.x, pos.y, 'medium'));
    }
    for (let i = 0; i < 18; i++) {
        const pos = randPos(2200);
        terrains.push(new Terrain(pos.x, pos.y, 'small'));
    }

    return terrains;
}
