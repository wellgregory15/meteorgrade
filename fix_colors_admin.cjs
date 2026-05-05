const fs = require('fs');

const files = [
  './src/components/AdminPanelView.tsx',
];

for (const path of files) {
  let code = fs.readFileSync(path, 'utf8');

  // borders 
  code = code.replace(/border-slate-[0-9]+/g, 'theme-border');
  
  // texts
  code = code.replace(/text-slate-[0-9]+/g, 'theme-text-primary'); // simplify to primary, if needed they can be muted. Actually replace 400 and 500 with muted.
  
  fs.writeFileSync(path, code);
}
console.log('done');
