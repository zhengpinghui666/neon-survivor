const fs = require('fs');
const dir = 'C:\\Users\\12\\.gemini\\antigravity\\scratch\\roguelike_game';
const files = ['Enemy.js','Particle.js','Gem.js','Projectile.js','Weapons.js',
               'Terrain.js','TreasureChest.js','VFX.js','Player.js','Boss.js',
               'BreakableCrate.js','main.js'];

for (const f of files) {
    const path = dir + '\\' + f;
    if (!fs.existsSync(path)) continue;
    let content = fs.readFileSync(path, 'utf8');
    let changed = false;
    
    // Fix merged comment+code lines: // comment?    code -> // comment\n    code
    // Pattern: a line that has //...? followed by multiple spaces then code
    const merged = content.replace(/\/\/([^\n]*?)\?\s{4,}([a-zA-Z\[{(])/g, (match, comment, code) => {
        changed = true;
        return '//' + comment.replace(/\?/g,'') + '\n    ' + code;
    });
    content = merged;
    
    // Remove stray replacement chars
    content = content.replace(/\uFFFD/g, '');
    
    fs.writeFileSync(path, content, 'utf8');
    if (changed) console.log('Fixed merged lines in: ' + f);
    else console.log('No merges found in: ' + f);
}
