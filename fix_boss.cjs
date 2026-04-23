const fs = require('fs');
const path = 'C:\\Users\\12\\.gemini\\antigravity\\scratch\\roguelike_game\\Boss.js';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Fix lines 166 and 169 (0-indexed: 165, 168)
lines[165] = "        ctx.strokeText('BOSS', this.x, by - 5);";
lines[166] = "        ctx.shadowBlur = 0;";
lines[167] = "        ctx.fillStyle = '#ffcc00';";
lines[168] = "        ctx.fillText('BOSS', this.x, by - 5);";
lines[169] = "        ctx.shadowBlur = 0;";

content = lines.join('\n');
fs.writeFileSync(path, content, 'utf8');

const { execSync } = require('child_process');
try {
    execSync('node --check "' + path + '"', { encoding: 'utf8' });
    console.log('Boss.js: PASSED');
} catch(e) { console.log('Boss.js: FAIL - ' + e.stderr.split('\n').slice(0,5).join('\n')); }
