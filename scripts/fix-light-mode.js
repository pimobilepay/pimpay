const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(process.cwd(), 'app');
const COMPONENTS_DIR = path.join(process.cwd(), 'components');

// Collect all .tsx files recursively
function getAllTsx(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllTsx(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = [...getAllTsx(APP_DIR), ...getAllTsx(COMPONENTS_DIR)];

let totalChanges = 0;

// For each file, apply color/text replacements
for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // ===== DARK BACKGROUND REPLACEMENTS =====
  
  // Pattern: min-h-screen bg-[#020617] (standalone loading/container) 
  // Replace with semantic bg-background
  content = content.replace(/min-h-screen bg-\[#020617\]/g, 'min-h-screen bg-background');
  
  // Pattern: bg-[#020617] text-white (main container)
  content = content.replace(/bg-\[#020617\] text-white/g, 'bg-background text-foreground');
  
  // Pattern: remaining bg-[#020617] 
  content = content.replace(/bg-\[#020617\]/g, 'bg-background');
  
  // Pattern: bg-[#02040a]
  content = content.replace(/bg-\[#02040a\]/g, 'bg-background');
  
  // Pattern: bg-[#0f172a] (slightly lighter dark)
  content = content.replace(/bg-\[#0f172a\]/g, 'bg-muted');
  
  // Pattern: bg-[#0c1629]
  content = content.replace(/bg-\[#0c1629\]/g, 'bg-muted');

  // ===== CARD/SECTION BACKGROUNDS =====
  // bg-slate-900/40 -> bg-card (semantic)
  content = content.replace(/bg-slate-900\/40/g, 'bg-card');
  
  // bg-slate-900/60 -> bg-card  
  content = content.replace(/bg-slate-900\/60/g, 'bg-card');
  
  // bg-slate-900/80 -> bg-card
  content = content.replace(/bg-slate-900\/80/g, 'bg-card');
  
  // bg-slate-900/50 -> bg-card
  content = content.replace(/bg-slate-900\/50/g, 'bg-card');
  
  // bg-slate-900 (exact) -> bg-card
  content = content.replace(/bg-slate-900(?!\/)/g, 'bg-card');
  
  // ===== BORDER REPLACEMENTS =====
  // border-white/5 -> border-border
  content = content.replace(/border-white\/5/g, 'border-border');
  
  // border-white/10 -> border-border
  content = content.replace(/border-white\/10/g, 'border-border');
  
  // border-white/\[0.06\] -> border-border
  content = content.replace(/border-white\/\[0\.06\]/g, 'border-border');
  
  // border-white/\[0.04\] -> border-border
  content = content.replace(/border-white\/\[0\.04\]/g, 'border-border');

  // ===== SUBTLE BACKGROUNDS =====
  // bg-white/5 -> bg-muted (subtle backgrounds)
  content = content.replace(/bg-white\/5/g, 'bg-muted');
  
  // bg-white/\[0.04\] -> bg-muted
  content = content.replace(/bg-white\/\[0\.04\]/g, 'bg-muted');
  
  // bg-white/\[0.03\] -> bg-muted
  content = content.replace(/bg-white\/\[0\.03\]/g, 'bg-muted');

  // ===== TEXT REPLACEMENTS =====
  // text-white (standalone headings) -> text-foreground 
  // Note: We DON'T replace text-white on buttons/badges with colored backgrounds
  // This is a careful replacement - only for text on dark backgrounds
  
  // text-slate-500 label text -> text-muted-foreground
  // (keeping this as-is since it works in both modes)

  // ===== BORDER-[#020617] =====
  content = content.replace(/border-\[#020617\]/g, 'border-background');
  
  // border-2 border-[#020617] on notification dots
  content = content.replace(/border-2 border-background/g, 'border-2 border-background');

  // ===== FRENCH TO ENGLISH TEXT IN JSX =====
  // Common standalone French strings
  content = content.replace(/"Retour"/g, '"Back"');
  content = content.replace(/"Confirmer"/g, '"Confirm"');
  content = content.replace(/"Annuler"/g, '"Cancel"');
  content = content.replace(/"Envoyer"/g, '"Send"');
  content = content.replace(/"Suivant"/g, '"Next"');
  content = content.replace(/"Fermer"/g, '"Close"');
  content = content.replace(/"Connexion"/g, '"Login"');
  content = content.replace(/"Inscription"/g, '"Sign Up"');
  content = content.replace(/"Chargement"/g, '"Loading"');
  content = content.replace(/"Solde"/g, '"Balance"');
  content = content.replace(/"Montant"/g, '"Amount"');
  content = content.replace(/"Mot de passe"/g, '"Password"');
  content = content.replace(/"Adresse"/g, '"Address"');
  content = content.replace(/"Historique"/g, '"History"');
  content = content.replace(/"Rechercher"/g, '"Search"');
  content = content.replace(/"Paramètres"/g, '"Settings"');
  content = content.replace(/"Profil"/g, '"Profile"');
  content = content.replace(/"Déconnexion"/g, '"Logout"');
  content = content.replace(/"Sécurité"/g, '"Security"');
  content = content.replace(/"Portefeuille"/g, '"Wallet"');
  content = content.replace(/"Dépôt"/g, '"Deposit"');
  content = content.replace(/"Retrait"/g, '"Withdrawal"');
  content = content.replace(/"Transfert"/g, '"Transfer"');
  content = content.replace(/"Succès"/g, '"Success"');
  content = content.replace(/"Échec"/g, '"Failed"');
  content = content.replace(/"En cours"/g, '"Pending"');
  
  // French text in JSX template literals and content
  content = content.replace(/Solde insuffisant/g, 'Insufficient balance');
  content = content.replace(/Veuillez entrer/g, 'Please enter');
  content = content.replace(/Montant invalide/g, 'Invalid amount');
  content = content.replace(/Chargement\.\.\./g, 'Loading...');
  content = content.replace(/Aucun résultat/g, 'No results');
  content = content.replace(/Aucune transaction/g, 'No transactions');
  content = content.replace(/Aucune donnée/g, 'No data');
  content = content.replace(/Réseau actif/g, 'Network active');
  content = content.replace(/Reseau actif/g, 'Network active');
  content = content.replace(/Hors ligne/g, 'Offline');
  content = content.replace(/Marchand detecte/g, 'Merchant detected');
  content = content.replace(/Identifiant marchand invalide/g, 'Invalid merchant ID');
  content = content.replace(/Veuillez entrer un montant/g, 'Please enter an amount');
  content = content.replace(/Solde insuffisant/g, 'Insufficient balance');
  content = content.replace(/Transaction mPay confirmee/g, 'mPay transaction confirmed');
  content = content.replace(/Echec du consensus reseau/g, 'Network consensus failed');
  content = content.replace(/Signature biometrique requise/g, 'Biometric signature required');
  content = content.replace(/Signer & Envoyer/g, 'Sign & Send');
  content = content.replace(/Verifier la Transaction/g, 'Verify Transaction');
  content = content.replace(/Payer Marchand/g, 'Pay Merchant');
  content = content.replace(/Ouvrir la camera/g, 'Open camera');
  content = content.replace(/Scanner QR mPay/g, 'Scan mPay QR');
  content = content.replace(/Ou rechercher/g, 'Or search');
  content = content.replace(/ID MARCHAND/g, 'MERCHANT ID');
  content = content.replace(/Montant du Transfert/g, 'Transfer Amount');
  content = content.replace(/MARCHAND PIMPAY/g, 'PIMPAY MERCHANT');
  content = content.replace(/Priorite/g, 'Priority');
  content = content.replace(/Protocole/g, 'Protocol');
  content = content.replace(/Marchand/g, 'Merchant');
  content = content.replace(/Recevoir/g, 'Receive');
  content = content.replace(/Nouveau paiement recu/g, 'New payment received');
  content = content.replace(/Supermarche/g, 'Supermarket');
  content = content.replace(/Carburant/g, 'Fuel');
  content = content.replace(/Aujourd'hui/g, "Today");
  content = content.replace(/Hier/g, 'Yesterday');
  content = content.replace(/Resume/g, 'Summary');
  content = content.replace(/Signature/g, 'Signature');
  
  // MPay Hub labels
  content = content.replace(/"Solde mPay"/g, '"mPay Balance"');
  content = content.replace(/"Paiements rapides"/g, '"Quick Payments"');
  content = content.replace(/"Marchands frequents"/g, '"Frequent Merchants"');
  content = content.replace(/"Derniere activite"/g, '"Recent Activity"');
  content = content.replace(/"Contacts rapides"/g, '"Quick Contacts"');
  content = content.replace(/"Voir tout"/g, '"View all"');
  content = content.replace(/"Transactions recentes"/g, '"Recent Transactions"');
  
  // Transfer/deposit/withdraw pages
  content = content.replace(/Montant à envoyer/g, 'Amount to send');
  content = content.replace(/Montant a envoyer/g, 'Amount to send');
  content = content.replace(/Montant à déposer/g, 'Amount to deposit');
  content = content.replace(/Montant a deposer/g, 'Amount to deposit');
  content = content.replace(/Montant à retirer/g, 'Amount to withdraw');
  content = content.replace(/Montant a retirer/g, 'Amount to withdraw');
  content = content.replace(/Destinataire/g, 'Recipient');
  content = content.replace(/Expéditeur/g, 'Sender');
  content = content.replace(/Expedition/g, 'Sending');
  content = content.replace(/Frais de réseau/g, 'Network fee');
  content = content.replace(/Frais de reseau/g, 'Network fee');
  content = content.replace(/Frais/g, 'Fees');
  content = content.replace(/Méthode de paiement/g, 'Payment method');
  content = content.replace(/Methode de paiement/g, 'Payment method');
  content = content.replace(/Virement bancaire/g, 'Bank transfer');
  content = content.replace(/Paiement mobile/g, 'Mobile payment');
  content = content.replace(/Récapitulatif/g, 'Summary');
  content = content.replace(/Recapitulatif/g, 'Summary');
  content = content.replace(/Transaction réussie/g, 'Transaction successful');
  content = content.replace(/Transaction reussie/g, 'Transaction successful');
  content = content.replace(/Transaction échouée/g, 'Transaction failed');
  content = content.replace(/Transaction echouee/g, 'Transaction failed');
  content = content.replace(/Retour au tableau de bord/g, 'Back to dashboard');
  content = content.replace(/Tableau de bord/g, 'Dashboard');
  content = content.replace(/Réessayer/g, 'Try again');
  content = content.replace(/Reessayer/g, 'Try again');
  content = content.replace(/Étape/g, 'Step');
  content = content.replace(/Etape/g, 'Step');
  content = content.replace(/Détails/g, 'Details');
  content = content.replace(/Details/g, 'Details');
  content = content.replace(/Numéro de téléphone/g, 'Phone number');
  content = content.replace(/Numero de telephone/g, 'Phone number');
  content = content.replace(/Sélectionner/g, 'Select');
  content = content.replace(/Selectionner/g, 'Select');
  content = content.replace(/Opérateur/g, 'Operator');
  content = content.replace(/Operateur/g, 'Operator');
  content = content.replace(/Recharge mobile/g, 'Mobile recharge');
  content = content.replace(/Référence/g, 'Reference');
  content = content.replace(/Reference/g, 'Reference');
  content = content.replace(/Statut/g, 'Status');
  content = content.replace(/Date et heure/g, 'Date and time');
  content = content.replace(/Mot de passe actuel/g, 'Current password');
  content = content.replace(/Nouveau mot de passe/g, 'New password');
  content = content.replace(/Confirmer le mot de passe/g, 'Confirm password');
  content = content.replace(/Code PIN/g, 'PIN code');
  content = content.replace(/Copier/g, 'Copy');
  content = content.replace(/Copié/g, 'Copied');
  content = content.replace(/Partager/g, 'Share');
  content = content.replace(/Télécharger/g, 'Download');
  content = content.replace(/Telecharger/g, 'Download');
  
  // Comments in French -> English
  content = content.replace(/\/\/ Correction /g, '// Fix ');
  content = content.replace(/\/\/ Logique /g, '// Logic ');
  content = content.replace(/\/\/ Calcul /g, '// Calculate ');
  content = content.replace(/\/\/ Verification /g, '// Verification ');
  content = content.replace(/\/\/ Gestion /g, '// Handle ');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    totalChanges++;
    console.log(`Updated: ${path.relative(process.cwd(), filePath)}`);
  }
}

console.log(`\nTotal files updated: ${totalChanges}`);
