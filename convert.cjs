const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
          if (!file.includes('supabase') && !file.includes('firebase.ts') && !file.includes('convert.js')) {
            results.push(file);
          }
      }
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
   let content = fs.readFileSync(file, 'utf8');
   let modified = false;

   // Replace "firebase/firestore" or "firebase/auth"
   // Needs to point to the correct relative distance to /src/lib/supabaseShim
   const depth = (file.match(/\//g) || []).length - 1; // e.g. src/components/A.tsx -> 2 slashes, depth 1
   let relativePath = '';
   if (depth === 0) relativePath = './lib/supabaseShim';
   else if (depth === 1) relativePath = '../lib/supabaseShim';
   else if (depth === 2) relativePath = '../../lib/supabaseShim';
   else relativePath = '../../../lib/supabaseShim'; // safe fallback

   if (content.includes('firebase/firestore') || content.includes('firebase/auth') || content.includes('lib/firebase')) {
      content = content.replace(/['"]firebase\/(firestore|auth)['"]/g, `'${relativePath}'`);
      content = content.replace(/['"]([^'"]*)lib\/firebase['"]/g, `'${relativePath}'`);
      fs.writeFileSync(file, content);
      console.log('Patched:', file);
   }
});
