const fs = require('fs');
const path = 'C:\\Users\\12\\.gemini\\antigravity\\scratch\\roguelike_game\\TreasureChest.js';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
// Line 1 is merged: "// comment ... export class TreasureChest {"
// Split it properly
lines[0] = '// Treasure chest system\nexport class TreasureChest {';
content = lines.join('\n');
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed TreasureChest.js line 1');
