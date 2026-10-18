import sharp from 'sharp';
for(const name of ['logo','logo-reverse'])await sharp(`public/brand/${name}.svg`,{density:300}).resize({width:1408}).png().toFile(`public/brand/${name}.png`);
for(const name of ['symbol','symbol-reverse'])await sharp(`public/brand/${name}.svg`,{density:300}).resize({width:608}).png().toFile(`public/brand/${name}.png`);
await sharp('public/brand/avatar.svg').resize(512,512).png().toFile('public/brand/avatar.png');
for(const n of [16,32])await sharp('public/brand/avatar.svg').resize(n,n).png().toFile(`public/brand/favicon-${n}.png`);
await sharp('public/brand/avatar.svg').resize(180,180).png().toFile('public/brand/apple-touch-icon.png');
await sharp('public/brand/social.svg').png().toFile('public/brand/social.png');
