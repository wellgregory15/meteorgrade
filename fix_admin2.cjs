const fs = require('fs');

const files = [
  './src/components/AdminPanelView.tsx',
  './src/components/NotificationSettings.tsx'
];

for (const path of files) {
  let code = fs.readFileSync(path, 'utf8');

  // Fix exact `bg-white` missing because it was the first class
  code = code.replace(/bg-white/g, 'theme-bg-secondary');
  
  // Fix toggle
  code = code.replace(/theme-bg-secondary transition-transform shadow-sm/g, 'bg-white transition-transform shadow-sm');
  
  fs.writeFileSync(path, code);
}
console.log('done');
