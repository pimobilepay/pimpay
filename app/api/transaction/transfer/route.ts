import { PI_CONSENSUS_RATE } from "@/lib/exchange";

// Dans ta fonction POST
const amountInPi = body.amount;
const valueInUsd = amountInPi * PI_CONSENSUS_RATE;

// Enregistrer la valeur en USD dans l'AuditLog pour la conformité AML
await prisma.auditLog.create({
  data: {
    action: "LARGE_TRANSFER_DETECTED",
    details: `Transfert de ${amountInPi} PI (Valeur: ${valueInUsd} USD)`,
    userId: session.user.id
  }
});
