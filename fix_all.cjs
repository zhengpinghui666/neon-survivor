const fs = require('fs');
const dir = 'C:\\Users\\12\\.gemini\\antigravity\\scratch\\roguelike_game';

// Fix Terrain.js - corrupted first line comment causes parse error
let terrain = fs.readFileSync(dir + '\\Terrain.js', 'utf8');
// Replace entire first line
const tLines = terrain.split('\n');
tLines[0] = '// Terrain system - polygon collision';
if (tLines[1] && tLines[1].includes('多边')) {
    tLines[1] = '// polygon-circle collision utils';
}
terrain = tLines.join('\n');
fs.writeFileSync(dir + '\\Terrain.js', terrain, 'utf8');

// Fix TreasureChest.js - find merged lines
let chest = fs.readFileSync(dir + '\\TreasureChest.js', 'utf8');
// Fix any merged comment+code lines
chest = chest.replace(/\/\/([^\n]*?)\?\s{4,}([a-zA-Z\[{(])/g, (m, c, code) => {
    return '//' + c.replace(/\?/g,'') + '\n    ' + code;
});
fs.writeFileSync(dir + '\\TreasureChest.js', chest, 'utf8');

// Verify all
const { execSync } = require('child_process');
const checkFiles = ['Terrain.js','TreasureChest.js','BreakableCrate.js','main.js','Enemy.js','Boss.js',
                    'Weapons.js','VFX.js','Particle.js','Gem.js','Projectile.js','Player.js'];
for (const f of checkFiles) {
    try {
        execSync('node --check "' + dir + '\\' + f + '"', { encoding: 'utf8' });
        console.log(f + ': OK');
    } catch(e) {
        const line = e.stderr.match(/:(\d+)/);
        console.log(f + ': FAIL at line ' + (line ? line[1] : '?'));
    }
}
