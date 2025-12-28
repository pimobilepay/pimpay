// unlock.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.systemConfig.update({
    where: { id: "GLOBAL_CONFIG" },
    data: { maintenanceMode: false }
  })
  console.log("✅ Maintenance désactivée avec succès !")
}

main()
