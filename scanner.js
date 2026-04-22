const fs = require('fs');
const path = require('path');

// Dossiers à ignorer (pour gagner du temps et éviter les erreurs)
const IGNORE_DIRS = ['node_modules', '.next', '.git', 'public'];

function scanFiles(dir, results = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                scanFiles(filePath, results);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // On cherche les fichiers qui importent 'jose' mais qui ne sont pas ton fichier central
            const hasJose = content.includes("from 'jose'") || content.includes('from "jose"');
            const isCentralAuth = filePath.includes('lib/auth.ts');

            if (hasJose && !isCentralAuth) {
                // On vérifie si le fichier utilise déjà verifyAuth ou s'il est "sale"
                const isClean = content.includes('verifyAuth') || content.includes('verifyJWT');
                
                results.push({
                    file: filePath,
                    status: isClean ? 'PARTIAL' : 'DIRTY',
                    lines: content.split('\n').length
                });
            }
        }
    });

    return results;
}

console.log("🔍 Analyse de PimPay en cours...");
const dirtyFiles = scanFiles(__dirname);

console.log("\n--- RAPPORT D'ANALYSE ---");
if (dirtyFiles.length === 0) {
    console.log("✅ Aucun fichier problématique trouvé. Ton architecture est propre !");
} else {
    console.log(`⚠️  Trouvé : ${dirtyFiles.length} fichiers à vérifier.\n`);
    
    dirtyFiles.forEach(f => {
        const color = f.status === 'DIRTY' ? '🔴' : '🟡';
        console.log(`${color} ${f.status}: ${f.file} (${f.lines} lignes)`);
    });

    console.log("\n💡 'DIRTY' signifie que le fichier importe directement 'jose' sans utiliser tes fonctions centralisées.");
}

