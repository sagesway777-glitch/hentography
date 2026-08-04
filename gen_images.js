const fs = require('fs');
const path = require('path');
const imagesDir = path.join(__dirname, 'test_images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);

// A simple 1x1 transparent PNG base64
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const buffer = Buffer.from(pngBase64, 'base64');
fs.writeFileSync(path.join(imagesDir, 'cover.png'), buffer);
for(let i=1; i<=10; i++) fs.writeFileSync(path.join(imagesDir, `page_${i}.png`), buffer);
fs.writeFileSync(path.join(imagesDir, 'replaced_page5.png'), buffer);
console.log('Images generated');
