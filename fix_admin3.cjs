const fs = require('fs');

const path = './src/components/AdminPanelView.tsx';
let code = fs.readFileSync(path, 'utf8');

// The user mentioned audit tab, news tab, tickets tab, beta tab.
// I'll replace any remaining `border-slate-50`, `border-slate-100`, etc (except maybe 700/800 which are used with bg-slate-900).
code = code.replace(/border-slate-(50|100|200|300)/g, 'theme-border');
code = code.replace(/text-slate-(400|500)/g, 'theme-text-muted');
code = code.replace(/text-slate-(600)/g, 'theme-text-secondary');
code = code.replace(/text-slate-(700|800)/g, 'theme-text-primary');

// Just to be sure about bg-slate-50/100 remaining
code = code.replace(/bg-slate-50/g, 'theme-bg-primary');
code = code.replace(/bg-slate-100/g, 'theme-bg-input');

fs.writeFileSync(path, code);
console.log('done');
