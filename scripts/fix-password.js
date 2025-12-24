const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = "admin@pimpay.com"; // REMPLACE PAR TON EMAIL
  const newPassword = "Admin@123"; // LE MOT DE PASSE QUE TU VEUX

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { email: email },
    data: { password: hashedPassword },
  });

  console.log(`✅ Mot de passe mis à jour et haché pour : ${user.email}`);
  console.log(`Utilise maintenant ce mot de passe pour te connecter et faire le changement.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
