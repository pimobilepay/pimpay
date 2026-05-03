/**
 * #10 FIX: Ce fichier ne doit PAS contenir de credentials en clair.
 * Utiliser les variables d'environnement via le seed Prisma officiel.
 * Ce fichier est conservé pour référence uniquement.
 * 
 * Pour créer l'admin: ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_PIN=... npx prisma db seed
 */
console.log("Utiliser 'npx prisma db seed' avec les variables d'environnement ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PIN");
