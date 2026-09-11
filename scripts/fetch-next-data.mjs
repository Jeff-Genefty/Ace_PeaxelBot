const res = await fetch('https://peaxel.me');
const html = await res.text();
const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
if (m) {
  const data = JSON.parse(m[1]);
  const str = JSON.stringify(data);
  const urls = [...new Set([...str.matchAll(/https?:\\\/\\\/media\.peaxel\.me\\\/[^"\\]+/g)].map(x => x[0].replace(/\\\//g,'/')))];
  console.log(urls.filter(u => u.includes('pxl_')).join('\n'));
} else {
  const urls = [...html.matchAll(/media\.peaxel\.me\/[a-zA-Z0-9_\-]+\.png/g)].map(m => 'https://'+m[0]);
  console.log([...new Set(urls)].slice(0,30).join('\n'));
}
