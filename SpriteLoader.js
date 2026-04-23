// 精灵图加载器 — 预加载所有游戏精灵
const spriteCache = {};

function loadSprite(name, src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            spriteCache[name] = img;
            resolve(img);
        };
        img.onerror = () => {
            console.warn(`Failed to load sprite: ${src}`);
            resolve(null); // 不阻塞游戏
        };
        img.src = src;
    });
}

export async function loadAllSprites() {
    await Promise.all([
        loadSprite('player', '/sprites/player.png'),
        loadSprite('crawler', '/sprites/crawler.png'),
        loadSprite('golem', '/sprites/golem.png'),
        loadSprite('wraith', '/sprites/wraith.png'),
        loadSprite('boss', '/sprites/boss.png'),
        loadSprite('chest', '/sprites/chest.png'),
    ]);
    console.log('All sprites loaded:', Object.keys(spriteCache));
}

export function getSprite(name) {
    return spriteCache[name] || null;
}
