const fs = require('fs');
const path = 'C:\\Users\\12\\.gemini\\antigravity\\scratch\\roguelike_game\\main.js';
let content = fs.readFileSync(path, 'utf8');

// Fix corrupted replacement char sequences
// Pattern: a replacement char (U+FFFD) followed by ? that ate a real character
content = content.replace(/\uFFFD/g, '');

// Fix specific known broken strings
// Difficulty labels
content = content.replace("label: '\u7B80?,", "label: '\u7B80\u5355',");

// Combo display
content = content.replace(/`\?\$\{comboCount\}/g, '`\u2B50${comboCount}');

// Boss warning  
content = content.replace("'\? BOSS \u6765\u88AD \?'", "'\u2605 BOSS \u6765\u88AD \u2605'");

// XP boost message
content = content.replace("'\u53CC\u500D\u7ECF?5s!'", "'\u53CC\u500D\u7ECF\u9A8C15s!'");

// Upgrade descriptions - fix truncated strings
content = content.replace(/\u57FA\u7840\u653B\u51FB\?\+ 5/g, '\u57FA\u7840\u653B\u51FB\u529B+5');
content = content.replace(/\u6062\u590D30\u70B9\u751F\u547D\?/g, '\u6062\u590D30\u70B9\u751F\u547D');
content = content.replace(/\u6700\u5927\u751F\u547D\?\+ 25/g, '\u6700\u5927\u751F\u547D+25');
content = content.replace(/\u66B4\u51FB\?\+ 10%/g, '\u66B4\u51FB\u7387+10%');

// Weapon names - fix ? in weapon names
content = content.replace(/"\u2728 \u62A4\u76FE\?/g, '"\u2728 \u62A4\u76FE\u5203"');
content = content.replace(/\u80FD\u91CF\u5200\?/g, '\u80FD\u91CF\u5200\u5203');
content = content.replace(/\u65CB\u8F6C\u5200\?/g, '\u65CB\u8F6C\u5200\u5203');
content = content.replace(/"\u26A1 \u95EA\u7535\?/g, '"\u26A1 \u95EA\u7535\u94FE"');
content = content.replace(/\u95EA\u7535\?\+1/g, '\u95EA\u7535+1');
content = content.replace(/\u4F24\u5BB3\?\+5/g, '\u4F24\u5BB3+5');
content = content.replace(/\u4F24\u5BB3\?\+2/g, '\u4F24\u5BB3+2');
content = content.replace(/\u7684\u529B\?/g, '\u7684\u529B\u573A');
content = content.replace(/\u65F6\u95F4\u53D8\?/g, '\u65F6\u95F4\u53D8\u957F');
content = content.replace(/\u7206\u70B8\u534A\?\+20/g, '\u7206\u70B8\u534A\u5F84+20');
content = content.replace(/\u4F24\u5BB3\?\+10/g, '\u4F24\u5BB3+10');
content = content.replace(/\u7A7F\u900F\u98DE\?/g, '\u7A7F\u900F\u98DE\u9556');

// card-new-weapon check
content = content.replace("startsWith('?)", "startsWith('\u2728')");

// Any remaining ? in middle of strings - just remove them
// But be careful not to break ternary operators

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed main.js corrupted chars');
