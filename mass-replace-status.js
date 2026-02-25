const fs = require('fs');
const path = require('path');

const ROOT_DIR = './';
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];
const IGNORE_DIRS = ['node_modules', '.git', '.next', 'dist', 'build'];

// Liste des fichiers à ignorer (pour être sûr)
const SAFE_FILES = ['mass-replace-status.js', 'find-complete.js', 'migrate.js'];

function fixFiles(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (IGNORE_DIRS.includes(file)) return;

        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            fixFiles(filePath);
        } else if (EXTENSIONS.includes(path.extname(filePath))) {
            if (SAFE_FILES.includes(file)) return;

            let content = fs.readFileSync(filePath, 'utf8');
            let original = content;

            // 1. Remplacer le statut dans les objets JS et Prisma (ex: status: "COMPLETED")
            content = content.replace(/status:\s*["']COMPLETED["']/g, 'status: "SUCCESS"');
            
            // 2. Remplacer dans les tableaux (ex: in: ["SUCCESS", "COMPLETED"])
            content = content.replace(/"COMPLETED"/g, '"SUCCESS"');
            content = content.replace(/'COMPLETED'/g, "'SUCCESS'");

            // 3. Remplacer dans les comparaisons (ex: === "COMPLETED")
            content = content.replace(/===\s*["']COMPLETED["']/g, '=== "SUCCESS"');
            content = content.replace(/!==\s*["']COMPLETED["']/g, '!== "SUCCESS"');

            // 4. Correction spécifique pour les classes CSS (ex: case 'COMPLETED':)
            content = content.replace(/case\s*["']COMPLETED["']:/g, 'case "SUCCESS":');

            if (content !== original) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`✅ Nettoyé : ${filePath}`);
            }
        }
    });
}

console.log("🛠️  Nettoyage automatique des statuts Pimpay...");
fixFiles(ROOT_DIR);
console.log("\n✨ Terminé ! Ton code utilise maintenant exclusivement 'SUCCESS'.");
