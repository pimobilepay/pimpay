const fs = require('fs');
const path = require('path');

// On scanne le dossier courant (.) au lieu de ./src
const directoryToScan = '.'; 
const targetImport = 'lib/auth';

console.log(`🔍 Recherche des imports "${targetImport}" dans le projet PimPay...`);
console.log('--------------------------------------------------');

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // On ignore les dossiers système et les dépendances
            if (file !== 'node_modules' && file !== '.next' && file !== '.git' && file !== 'public') {
                scanDirectory(filePath);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // On vérifie si "lib/auth" est présent
            if (content.includes(targetImport)) {
                console.log(`✅ Fichier : ${filePath}`);
                
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    if (line.includes(targetImport)) {
                        console.log(`   [Ligne ${index + 1}] ${line.trim()}`);
                    }
                });
                console.log('---');
            }
        }
    });
}

try {
    scanDirectory(directoryToScan);
    console.log('✅ Audit terminé.');
} catch (err) {
    console.error('❌ Erreur lors du scan :', err.message);
}
