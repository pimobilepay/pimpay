const fs = require('fs');
const path = require('path');

// Dossier racine du projet
const ROOT_DIR = './'; 
// Recherche insensible à la casse pour complete et completed
const SEARCH_TERM = /complete|completed/gi; 
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.prisma'];
const IGNORE_DIRS = ['node_modules', '.git', '.next', 'dist', 'build'];

function scanFiles(dir) {
    try {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            
            // On ignore les dossiers lourds
            if (IGNORE_DIRS.some(d => file === d)) return;

            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                scanFiles(filePath);
            } else if (EXTENSIONS.includes(path.extname(filePath))) {
                // Ne pas scanner le script lui-même
                if (file === 'find-status.js' || file === 'migrate.js') return;

                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    // On réinitialise l'index de la regex à chaque ligne
                    SEARCH_TERM.lastIndex = 0; 
                    if (SEARCH_TERM.test(line)) {
                        console.log(`📍 [MATCH] ${filePath} (Ligne ${index + 1}):`);
                        console.log(`   ➡️  ${line.trim()}`);
                        console.log('-------------------------------------------------------');
                    }
                });
            }
        });
    } catch (err) {
        // Silencieux
    }
}

console.log("🔍 Recherche des résidus de 'SUCCESS' dans Pimpay...");
console.log("-------------------------------------------------------");
scanFiles(ROOT_DIR);
console.log("✅ Scan terminé.");

