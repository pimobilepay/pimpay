const fs = require('fs');
const path = require('path');

const rootDir = './'; // Racine de PimPay
const targetText = "SYNCHRONISATION DÉPÔT SIDRA CHAIN";

function searchInFiles(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
            searchInFiles(filePath);
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes(targetText)) {
                console.log("\n[Coupable Trouvé !]");
                console.log(`Fichier : ${filePath}`);
                console.log("--------------------------------------");
                // Affiche la ligne exacte pour comprendre la logique
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    if (line.includes(targetText)) {
                        console.log(`Ligne ${index + 1}: ${line.trim()}`);
                    }
                });
            }
        }
    });
}

console.log("🔍 Recherche du coupable dans PimPay...");
searchInFiles(rootDir);
console.log("\nRecherche terminée.");
