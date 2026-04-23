const {execSync}=require('child_process');
const files=['main.js','Boss.js','BreakableCrate.js','Enemy.js','Weapons.js',
             'VFX.js','Terrain.js','TreasureChest.js','Particle.js','Gem.js',
             'Projectile.js','Player.js'];
const dir = 'C:\\Users\\12\\.gemini\\antigravity\\scratch\\roguelike_game\\';
let ok=0, fail=0;
for(const f of files){
    try{
        // Use Function constructor for basic syntax check
        const content = require('fs').readFileSync(dir+f,'utf8');
        const cleaned = content.replace(/export\s+(class|function|const|let|var|default)/g, '$1')
                               .replace(/import\s+.*?from\s+['"].*?['"]/g, '');
        new Function(cleaned);
        ok++;
        console.log(f+': OK');
    } catch(e) {
        fail++;
        console.log(f+': FAIL - '+e.message.split('\n')[0]);
    }
}
console.log('\n'+ok+' OK, '+fail+' FAIL');
