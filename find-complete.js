const fs = require('fs');
const path = require('path');

// Dossier racine du projet
const ROOT_DIR = './'; 
const SEARCH_TERM = /'complete'|"complete"|`complete`/g;
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];
const IGNORE_DIRS = ['node_modules', '.git', '.next', 'dist', 'build'];

function scanFiles(dir) {
    try {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            
            // On ignore les dossiers lourds ou inutiles
            if (IGNORE_DIRS.some(d => file === d)) return;

            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                scanFiles(filePath);
            } else if (EXTENSIONS.includes(path.extname(filePath))) {
                // Ne pas scanner le script lui-même
                if (file === 'find-complete.js') return;

                const lines = fs.readFileSync(filePath, 'utf8').split('\n');
                
                lines.forEach((line, index) => {
                    if (SEARCH_TERM.test(line)) {
                        console.log(`📍 [MATCH] ${filePath} (Ligne ${index + 1}):`);
                        console.log(`   ➡️  ${line.trim()}`);
                        console.log('---');
                    }
                });
            }
        });
    } catch (err) {
        // Silencieux sur les erreurs d'accès
    }
}

console.log("🔍 Recherche des occurrences de 'complete' dans Pimpay...");
console.log("-------------------------------------------------------");
scanFiles(ROOT_DIR);
console.log("✅ Scan terminé.");
