// 增量更新: 把已有单文件 HTML 里最后一个 <script> 块(即 app 代码)替换为新版
// 用法: node update_html.js <已有.html> <新app.js>
// 好处: 不必重跑完整 assemble, 适合在成品上迭代(改城堡/加交互等), 天然幂等
const fs = require('fs');
const args = process.argv.slice(2);
if (args.length < 2) { console.error('用法: node update_html.js <已有.html> <新app.js>'); process.exit(1); }
let html = fs.readFileSync(args[0], 'utf8');
const js = fs.readFileSync(args[1], 'utf8');
const lastScript = html.lastIndexOf('<script>');
const closeIdx = html.lastIndexOf('</' + 'script>');
if (lastScript < 0 || closeIdx <= lastScript) { console.error('未找到 script 块'); process.exit(1); }
html = html.slice(0, lastScript + 8) + '\n' + js + '\n' + html.slice(closeIdx);
fs.writeFileSync(args[0], html);
console.log('UPDATED', args[0], fs.statSync(args[0]).size, 'bytes');
