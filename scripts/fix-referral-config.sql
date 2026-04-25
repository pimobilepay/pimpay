-- Script de migration pour corriger les valeurs du programme de parrainage
-- Date: 2024
-- Probleme: Les anciennes valeurs (0.05, 0.5, 0.0005) doivent etre remplacees par 0.0000318 et 0.0000159

-- 1. Mettre a jour la configuration globale avec les nouvelles valeurs de parrainage
UPDATE "SystemConfig"
SET 
  "referralBonus" = 0.0000318,
  "referralWelcomeBonus" = 0.0000159,
  "updatedAt" = NOW()
WHERE id = 'GLOBAL_CONFIG';

-- 2. Si la config n'existe pas, la creer (pour les nouvelles installations)
INSERT INTO "SystemConfig" (
  id, 
  "referralBonus", 
  "referralWelcomeBonus",
  "createdAt",
  "updatedAt"
)
VALUES (
  'GLOBAL_CONFIG',
  0.0000318,
  0.0000159,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verification: Afficher les valeurs actuelles
SELECT id, "referralBonus", "referralWelcomeBonus" FROM "SystemConfig" WHERE id = 'GLOBAL_CONFIG';
