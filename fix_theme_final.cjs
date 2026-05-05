const fs = require('fs');

const files = [
  './src/components/DashboardView.tsx',
  './src/components/AdminPanelView.tsx',
  './src/components/ProfileSettingsModal.tsx',
  './src/components/NotificationSettings.tsx',
  './src/components/DeepDiveModal.tsx'
];

for (const path of files) {
  if (!fs.existsSync(path)) continue;
  let code = fs.readFileSync(path, 'utf8');

  // DashboardView specific replacements
  if (path.includes('DashboardView')) {
    code = code.replace(/bg-slate-900 dark:bg-indigo-950 border border-slate-800 dark:border-indigo-900 text-white/g, 'theme-bg-secondary border theme-border theme-text-primary');
    code = code.replace(/bg-slate-900 dark:bg-indigo-950 border-2 border-slate-800 dark:border-indigo-900 text-white/g, 'theme-bg-secondary border-2 theme-border theme-text-primary');
    code = code.replace(/bg-white\/5 hover:bg-white\/10 text-white border border-white\/10/g, 'theme-bg-secondary border theme-border theme-text-primary hover:theme-bg-primary');
    code = code.replace(/bg-slate-950 dark:bg-indigo-950 border border-slate-800 dark:border-indigo-900/g, 'theme-bg-secondary border theme-border');
    code = code.replace(/bg-slate-900\/50 dark:bg-indigo-900\/50/g, 'theme-bg-primary');
    code = code.replace(/border-white\/5/g, 'theme-border');
    code = code.replace(/bg-slate-800 dark:bg-slate-900 p-1 rounded-sm shadow-inner border border-slate-700/g, 'theme-bg-input p-1 rounded-sm shadow-inner');
    code = code.replace(/bg-slate-800 border border-slate-700/g, 'theme-bg-input border theme-border');
    code = code.replace(/bg-slate-800\/80 border border-slate-700/g, 'theme-bg-input border theme-border');
    code = code.replace(/bg-slate-900 hover:bg-slate-800/g, 'theme-bg-secondary hover:theme-bg-primary');
    code = code.replace(/bg-slate-950/g, 'theme-bg-primary');
    code = code.replace(/bg-slate-900\/40/g, 'theme-bg-secondary');
    code = code.replace(/bg-slate-800 text-slate-500 hover:text-white/g, 'theme-bg-input theme-text-muted hover:theme-text-primary');
    code = code.replace(/bg-indigo-600 hover:bg-indigo-500 text-white/g, 'theme-bg-primary border theme-border theme-text-primary hover:theme-bg-secondary');
  }

  // ProfileSettingsModal specific replacements
  if (path.includes('ProfileSettingsModal')) {
    code = code.replace(/bg-slate-900 text-white dark:bg-indigo-600/g, 'theme-bg-secondary theme-text-primary border theme-border hover:theme-bg-primary');
    code = code.replace(/bg-slate-950\/80/g, 'bg-black/50');
    code = code.replace(/bg-white dark:bg-slate-100/g, 'bg-white'); // toggle switch is fine, or replace with something else
  }
  
  if (path.includes('NotificationSettings')) {
    code = code.replace(/bg-indigo-50 text-indigo-600/g, 'theme-bg-secondary theme-text-primary border theme-border');
    code = code.replace(/bg-slate-200/g, 'theme-bg-input');
    code = code.replace(/bg-red-50 border border-red-100/g, 'theme-bg-secondary border border-red-500/50');
  }

  fs.writeFileSync(path, code);
}
console.log('done');
