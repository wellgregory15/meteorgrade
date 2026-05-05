import fs from 'fs';

const files = [
  'src/components/AdminPanelView.tsx'
];

for (const path of files) {
  let code = fs.readFileSync(path, 'utf8');

  // Specific target box replacements (bg-white border text-colors)
  code = code.replace(/className="([^"]*)bg-white([^"]*)"/g, (match, p1, p2) => {
     let classes = " " + p1 + p2 + " ";
     classes = classes.replace(/ bg-white /g, ' theme-bg-secondary ');
     classes = classes.replace(/ border-slate-100 /g, ' theme-border ');
     classes = classes.replace(/ border-slate-200 /g, ' theme-border ');
     classes = classes.replace(/ border-slate-300 /g, ' theme-border ');
     classes = classes.replace(/ text-slate-800 /g, ' theme-text-primary ');
     classes = classes.replace(/ text-slate-900 /g, ' theme-text-primary ');
     classes = classes.replace(/ text-slate-500 /g, ' theme-text-muted ');
     classes = classes.replace(/ text-slate-400 /g, ' theme-text-muted ');
     classes = classes.replace(/ text-slate-600 /g, ' theme-text-secondary ');
     classes = classes.replace(/ bg-slate-50 /g, ' theme-bg-primary ');
     classes = classes.replace(/ bg-slate-100 /g, ' theme-bg-input ');
     return `className="${classes.trim()}"`;
  });

  // some conditional classes like `bg-white` inside strings or template literals:
  code = code.replace(/: "bg-white border-slate-100 hover:border-slate-200"/g, ': "theme-bg-secondary theme-border hover:theme-bg-primary"');
  code = code.replace(/: "bg-white border-slate-100 hover:border-slate-300"/g, ': "theme-bg-secondary theme-border hover:theme-bg-primary"');
  code = code.replace(/: "bg-white text-slate-500 border-slate-200 hover:border-slate-400"/g, ': "theme-bg-secondary theme-text-muted theme-border hover:theme-bg-primary"');
  code = code.replace(/bg-white\/5/g, 'theme-bg-primary/50');
  code = code.replace(/bg-white\/10/g, 'theme-bg-primary');
  
  // Also we want to replace common backgrounds inside Admin Panel if they're explicitly slate
  code = code.replace(/bg-slate-50/g, 'theme-bg-primary');
  code = code.replace(/border-slate-200/g, 'theme-border');
  code = code.replace(/border-slate-100/g, 'theme-border');
  
  fs.writeFileSync(path, code);
}
