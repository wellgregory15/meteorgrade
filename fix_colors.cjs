const fs = require('fs');

const files = [
  './src/components/AdminPanelView.tsx',
  './src/components/DashboardView.tsx',
  './src/components/DeepDiveModal.tsx',
  './src/components/NotificationSettings.tsx'
];

for (const path of files) {
  let code = fs.readFileSync(path, 'utf8');

  // borders (excluding dark specific borders to keep them maybe? No let's just do them)
  code = code.replace(/border-slate-[0-9]+/g, 'theme-border');
  
  // texts
  code = code.replace(/text-slate-300/g, 'theme-text-primary');
  code = code.replace(/text-slate-400/g, 'theme-text-muted');
  code = code.replace(/text-slate-500/g, 'theme-text-muted');
  code = code.replace(/text-slate-600/g, 'theme-text-secondary');
  code = code.replace(/text-slate-700/g, 'theme-text-primary');
  code = code.replace(/text-slate-800/g, 'theme-text-primary');
  
  // Need to be careful with text-slate-900 because it might be dark mode primary
  // Actually text-slate-900 is almost always theme-text-primary
  code = code.replace(/text-slate-900/g, 'theme-text-primary');

  // backgrounds mapping
  code = code.replace(/bg-slate-50/g, 'theme-bg-primary');
  code = code.replace(/bg-slate-100/g, 'theme-bg-input');
  
  // Some exceptions where we want `bg-slate-900 text-white` (dark buttons/areas) to stay,
  // but if they had border-slate-X we changed them. Let's fix dark button backgrounds specifically if they got messed up, wait...
  
  fs.writeFileSync(path, code);
}
console.log('done');
