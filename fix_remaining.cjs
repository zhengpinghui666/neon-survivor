const fs = require('fs');
const dir = 'C:\\Users\\12\\.gemini\\antigravity\\scratch\\roguelike_game';

// Fix Enemy.js line 90 - merged comment+function
let enemy = fs.readFileSync(dir + '\\Enemy.js', 'utf8');
enemy = enemy.replace(
    /\/\/ 射线法判断点是否在多边形.*?_pointInPoly/,
    '// point in poly\n    _pointInPoly'
);
fs.writeFileSync(dir + '\\Enemy.js', enemy, 'utf8');
console.log('Fixed Enemy.js');

// Fix Boss.js line 166 - corrupted boss text string
let boss = fs.readFileSync(dir + '\\Boss.js', 'utf8');
boss = boss.replace(/'[^']*BOSS [^']*'/, "'★ BOSS ★'");
fs.writeFileSync(dir + '\\Boss.js', boss, 'utf8');
console.log('Fixed Boss.js');

// Verify syntax
const { execSync } = require('child_process');
try {
    execSync('node --check "' + dir + '\\Enemy.js"', { encoding: 'utf8' });
    console.log('Enemy.js: PASSED');
} catch(e) { console.log('Enemy.js: FAIL - ' + e.message.split('\n')[0]); }

try {
    execSync('node --check "' + dir + '\\Boss.js"', { encoding: 'utf8' });
    console.log('Boss.js: PASSED');
} catch(e) { console.log('Boss.js: FAIL - ' + e.message.split('\n')[0]); }

try {
    execSync('node --check "' + dir + '\\main.js"', { encoding: 'utf8' });
    console.log('main.js: PASSED');
} catch(e) { console.log('main.js: FAIL - ' + e.message.split('\n')[0]); }
