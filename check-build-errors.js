const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SCAN = ['./app/api']; // On cible les routes API
const PROBLEMATIC_PATTERNS = [
  {
    name: "Throw global (Tue le build Vercel)",
    regex: /^[^]*\bthrow\s+new\s+Error\b(?![^{]*})/m // throw en dehors d'une fonction
  },
  {
    name: "Usage de jsonwebtoken (Ancienne API)",
    regex: /import\s+.*\s+from\s+["']jsonwebtoken["']/
  },
  {
    name: "Secret global forcé (!)",
    regex: /const\s+.*\s+=\s+process\.env\..*!/
  }
];

function scanDir(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      scanDir(filePath);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      let hasError = false;

      PROBLEMATIC_PATTERNS.forEach(pattern => {
        if (pattern.regex.test(content)) {
          if (!hasError) {
            console.log(`\n\x1b[33m FILE: ${filePath}\x1b[0m`);
            hasError = true;
          }
          console.log(`  \x1b[31m[!] ${pattern.name}\x1b[0m`);
        }
      });

      // Vérifie si force-dynamic est présent
      if (!content.includes('force-dynamic')) {
        if (!hasError) console.log(`\n\x1b[33m FILE: ${filePath}\x1b[0m`);
        console.log(`  \x1b[34m[?] Manque: export const dynamic = 'force-dynamic';\x1b[0m`);
      }
    }
  });
}

console.log("\x1b[36m--- Scan de PimPay pour erreurs de build Vercel ---\x1b[0m");
scanDir(DIRECTORIES_TO_SCAN[0]);
console.log("\n\x1b[36m--- Scan terminé ---\x1b[0m");
