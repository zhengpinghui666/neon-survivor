const fs = require('fs');
const path = 'C:\\Users\\12\\.gemini\\antigravity\\scratch\\roguelike_game\\Terrain.js';
let content = fs.readFileSync(path, 'utf8');

// Fix line 37: corrupted comment with ? in middle
content = content.replace('// 多边?圆碰撞检测，返回推出向量 {x, y} ?null', '// polygon-circle collision, returns push vector or null');

// Fix line 69: corrupted comment
content = content.replace('// 圆心在多边形??推到最近边 + 半径', '// push circle out to nearest edge');

// Fix line 78: CRITICAL - } got absorbed into comment
content = content.replace('return null; // 不碰?}', 'return null; // no collision\n}');

// Fix line 81
content = content.replace(/\/\/ ══════ 地形\?══════/g, '// ====== Terrain ======');

// Fix line 114: merged comment+code  
content = content.replace('// 转换到世界坐?        //', '// to world coords\n        //');

// Fix remaining cosmetic ? in comments
content = content.replace('// ── 小水?──', '// ── water ──');
content = content.replace('// ── 小岩?──', '// ── rock ──');
content = content.replace('// ── 大型小行?──', '// ── asteroid ──');
content = content.replace('// ── 长墙?──', '// ── wall ──');

// Remove any remaining isolated ? in comments (not in code)
// Fix: "碰撞多边形（本地坐标?" pattern
content = content.replace(/本地坐标\?/g, '本地坐标');
content = content.replace(/主碰撞\?/g, '主碰撞体');
content = content.replace(/六边形轮\?/g, '六边形轮廓');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed Terrain.js');

// Verify with acorn-like check
try {
    // Use Function constructor as a rough syntax check
    new Function(content.replace(/export /g, '').replace(/import /g, '// import '));
    console.log('Syntax check: PASSED');
} catch(e) {
    console.log('Syntax check: FAIL -', e.message);
}
