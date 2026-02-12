const fs = require('fs');
const path = require('path');

const targetClass = "ease-[cubic-bezier(0.32,0.72,0,1)]";
const directoriesToScan = ['./app', './components', './hooks'];

function scanDir(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            scanDir(filePath);
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes(targetClass)) {
                console.log(`\x1b[32m[TROUVÉ]\x1b[0m Dans le fichier : \x1b[36m${filePath}\x1b[0m`);
                
                // Trouve le numéro de ligne approximatif
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    if (line.includes(targetClass)) {
                        console.log(`   --> Ligne ${index + 1}: ${line.trim().substring(0, 100)}...`);
                    }
                });
            }
        }
    });
}

console.log(`\x1b[33m🔍 Scan de PimPay en cours pour localiser la classe ambiguë...\x1b[0m\n`);
directoriesToScan.forEach(dir => {
    if (fs.existsSync(dir)) scanDir(dir);
});
console.log(`\n\x1b[33m✅ Scan terminé.\x1b[0m`);

