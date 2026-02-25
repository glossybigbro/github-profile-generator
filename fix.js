const fs = require('fs');
let c = fs.readFileSync('src/features/profile-export/model/scriptGenerator.ts', 'utf8');

// Fix outer backticks: \` -> `
c = c.replace(/return \\\`/g, 'return `');
c = c.replace(/^\\`/gm, '`');

// Fix inner backticks: \\\` -> \`
c = c.replace(/\\\\\\\`/g, '\\`');

// Fix inner dollars: \${ -> ${
c = c.replace(/\\\\\$/g, '\\$');

fs.writeFileSync('src/features/profile-export/model/scriptGenerator.ts', c);
console.log('Fixed file.');
