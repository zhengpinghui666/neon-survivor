// 队伍系统 WebSocket 服务器
// 支持房间创建/加入、玩家状态同步

import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 4200;

// MIME types
const MIME = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon', '.webp': 'image/webp',
};

// ═══ 用户数据管理 (MongoDB Atlas) ═══
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || '';
let db = null;
let usersCol = null;

async function connectDB() {
    if (!MONGO_URI) {
        console.log('⚠️  未设置 MONGO_URI，用户数据仅保存在内存中');
        return;
    }
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db('neon_survivor');
        usersCol = db.collection('users');
        // 创建手机号唯一索引
        await usersCol.createIndex({ phone: 1 }, { unique: true });
        console.log('✅ MongoDB 连接成功');
    } catch(e) {
        console.error('❌ MongoDB 连接失败:', e.message);
    }
}

// 内存缓存 (兜底)
let usersCache = new Map();

async function getUser(phone) {
    if (usersCol) {
        return await usersCol.findOne({ phone });
    }
    return usersCache.get(phone) || null;
}

async function saveUser(user) {
    if (usersCol) {
        await usersCol.updateOne({ phone: user.phone }, { $set: user }, { upsert: true });
    }
    usersCache.set(user.phone, user);
}

// 读取POST body
function readBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch(e) { resolve(null); }
        });
    });
}

// 静态文件服务 + API
const distDir = join(__dirname, 'dist');
const httpServer = createServer(async (req, res) => {
    // ─── API 路由 ───
    if (req.method === 'POST' && req.url === '/api/login') {
        const data = await readBody(req);
        if (!data?.phone || !/^1\d{10}$/.test(data.phone)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '请输入有效的手机号' }));
            return;
        }
        try {
            let user = await getUser(data.phone);
            if (!user) {
                user = { phone: data.phone, gold: 0, upgrades: {}, stats: { totalKills: 0, bestTime: 0, gamesPlayed: 0 }, createdAt: Date.now() };
                console.log(`🆕 新用户注册: ${data.phone}`);
            }
            user.lastLogin = Date.now();
            await saveUser(user);
            // 移除 MongoDB 内部字段
            const { _id, ...cleanUser } = user;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, user: cleanUser }));
        } catch(e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '服务器错误' }));
        }
        return;
    }

    if (req.method === 'POST' && req.url === '/api/save') {
        const data = await readBody(req);
        if (!data?.phone) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '缺少手机号' }));
            return;
        }
        try {
            let user = await getUser(data.phone);
            if (!user) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '用户不存在' }));
                return;
            }
            if (data.gold !== undefined) user.gold = data.gold;
            if (data.upgrades) user.upgrades = data.upgrades;
            if (data.stats) user.stats = { ...user.stats, ...data.stats };
            await saveUser(user);
            const { _id, ...cleanUser } = user;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, user: cleanUser }));
        } catch(e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '服务器错误' }));
        }
        return;
    }

    // ─── 静态文件 ───
    let url = req.url === '/' ? '/index.html' : req.url;
    url = url.split('?')[0];
    const filePath = join(distDir, url);
    
    if (!existsSync(filePath)) {
        const indexPath = join(distDir, 'index.html');
        if (existsSync(indexPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(readFileSync(indexPath));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
        return;
    }
    
    const ext = extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 
        'Content-Type': mime,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
    });
    res.end(readFileSync(filePath));
});

// WebSocket 服务器
const wss = new WebSocketServer({ server: httpServer });

// 房间管理
const rooms = new Map(); // roomCode -> { host, players: Map<id, {ws, state}>, gameState }
let nextPlayerId = 1;

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉容易混淆的字符
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(code) ? generateRoomCode() : code;
}

wss.on('connection', (ws) => {
    const playerId = nextPlayerId++;
    let currentRoom = null;
    let playerName = '玩家' + playerId;

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch(e) { return; }

        switch (msg.type) {
            case 'create_room': {
                const code = generateRoomCode();
                playerName = msg.name || playerName;
                const room = {
                    code,
                    hostId: playerId,
                    players: new Map(),
                    difficulty: 'normal',
                    started: false,
                };
                room.players.set(playerId, { ws, name: playerName, ready: false, state: null });
                rooms.set(code, room);
                currentRoom = code;
                
                ws.send(JSON.stringify({
                    type: 'room_created',
                    code,
                    playerId,
                    playerName,
                }));
                broadcastRoomState(room);
                console.log(`[房间创建] ${code} 房主: ${playerName}`);
                break;
            }

            case 'join_room': {
                const code = (msg.code || '').toUpperCase();
                const room = rooms.get(code);
                if (!room) {
                    ws.send(JSON.stringify({ type: 'error', msg: '房间不存在' }));
                    return;
                }
                if (room.players.size >= 4) {
                    ws.send(JSON.stringify({ type: 'error', msg: '房间已满 (最多4人)' }));
                    return;
                }
                if (room.started) {
                    ws.send(JSON.stringify({ type: 'error', msg: '游戏已开始' }));
                    return;
                }
                playerName = msg.name || playerName;
                room.players.set(playerId, { ws, name: playerName, ready: false, state: null });
                currentRoom = code;
                
                ws.send(JSON.stringify({
                    type: 'room_joined',
                    code,
                    playerId,
                    playerName,
                    hostId: room.hostId,
                }));
                broadcastRoomState(room);
                console.log(`[加入房间] ${code} ${playerName} (${room.players.size}/4)`);
                break;
            }

            case 'set_ready': {
                const room = rooms.get(currentRoom);
                if (!room) return;
                const p = room.players.get(playerId);
                if (p) { p.ready = msg.ready; broadcastRoomState(room); }
                break;
            }

            case 'set_difficulty': {
                const room = rooms.get(currentRoom);
                if (!room || room.hostId !== playerId) return;
                room.difficulty = msg.difficulty || 'normal';
                broadcastRoomState(room);
                break;
            }

            case 'start_game': {
                const room = rooms.get(currentRoom);
                if (!room || room.hostId !== playerId) return;
                room.started = true;
                broadcast(room, { type: 'game_start', difficulty: room.difficulty, seed: Math.floor(Math.random() * 999999) });
                console.log(`[游戏开始] ${currentRoom}`);
                break;
            }

            case 'player_state': {
                // 转发玩家状态给同房间其他人
                const room = rooms.get(currentRoom);
                if (!room) return;
                const p = room.players.get(playerId);
                if (p) p.state = msg.state;
                // 广播给其他玩家
                for (const [pid, player] of room.players) {
                    if (pid !== playerId && player.ws.readyState === 1) {
                        player.ws.send(JSON.stringify({
                            type: 'peer_state',
                            playerId,
                            name: playerName,
                            state: msg.state,
                        }));
                    }
                }
                break;
            }

            case 'player_dead': {
                const room = rooms.get(currentRoom);
                if (!room) return;
                broadcast(room, { type: 'peer_dead', playerId, name: playerName });
                break;
            }

            case 'chat': {
                const room = rooms.get(currentRoom);
                if (!room) return;
                broadcast(room, { type: 'chat', playerId, name: playerName, text: msg.text });
                break;
            }

            // 房主广播敌人状态给所有队友
            case 'enemy_state': {
                const room = rooms.get(currentRoom);
                if (!room || room.hostId !== playerId) return;
                const data = JSON.stringify({ type: 'enemy_state', d: msg.d });
                for (const [pid, player] of room.players) {
                    if (pid !== playerId && player.ws.readyState === 1) {
                        player.ws.send(data);
                    }
                }
                break;
            }

            // 队友的伤害转发给房主
            case 'player_hit': {
                const room = rooms.get(currentRoom);
                if (!room) return;
                const host = room.players.get(room.hostId);
                if (host && host.ws.readyState === 1) {
                    host.ws.send(JSON.stringify({ type: 'player_hit', enemyId: msg.enemyId, damage: msg.damage, playerId }));
                }
                break;
            }

            // 房主广播伤害特效给所有人
            case 'hit_effect': {
                const room = rooms.get(currentRoom);
                if (!room) return;
                const data = JSON.stringify({ type: 'hit_effect', d: msg.d });
                for (const [pid, player] of room.players) {
                    if (pid !== playerId && player.ws.readyState === 1) {
                        player.ws.send(data);
                    }
                }
                break;
            }
        }
    });

    ws.on('close', () => {
        if (currentRoom) {
            const room = rooms.get(currentRoom);
            if (room) {
                room.players.delete(playerId);
                console.log(`[离开房间] ${currentRoom} ${playerName}`);
                if (room.players.size === 0) {
                    rooms.delete(currentRoom);
                    console.log(`[房间销毁] ${currentRoom}`);
                } else {
                    // 如果房主离开，转移房主
                    if (room.hostId === playerId) {
                        room.hostId = room.players.keys().next().value;
                        console.log(`[房主转移] ${currentRoom} -> 玩家${room.hostId}`);
                    }
                    broadcastRoomState(room);
                }
            }
        }
    });

    ws.on('error', () => {});
});

function broadcast(room, msg) {
    const data = JSON.stringify(msg);
    for (const [, player] of room.players) {
        if (player.ws.readyState === 1) player.ws.send(data);
    }
}

function broadcastRoomState(room) {
    const players = [];
    for (const [id, p] of room.players) {
        players.push({ id, name: p.name, ready: p.ready, isHost: id === room.hostId });
    }
    broadcast(room, {
        type: 'room_state',
        code: room.code,
        hostId: room.hostId,
        difficulty: room.difficulty,
        players,
        started: room.started,
    });
}

// 启动服务器
(async () => {
    await connectDB();
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🎮 霓虹幸存者 - 队伍服务器`);
        console.log(`   本地:     http://localhost:${PORT}`);
        console.log(`   数据库:   ${MONGO_URI ? 'MongoDB Atlas ✅' : '内存模式 (数据不持久)'}`);
        console.log(`   等待玩家连接...\n`);
    });
})();
