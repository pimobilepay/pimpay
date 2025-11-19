"use client";

import { Card } from "@/components/ui/Card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 pb-20">
      
      {/* HEADER */}
      <div className="max-w-3xl mx-auto mb-6">
        <Link href="/settings">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft size={18} />
            Retour
          </button>
        </Link>

        <h1 className="text-3xl font-bold mt-4 tracking-wide">
          Politique de Confidentialité
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          Dernière mise à jour : 2025
        </p>
      </div>

      {/* CONTENU */}
      <div className="max-w-3xl mx-auto space-y-6">
        
        <Card className="p-6 bg-card border-border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            La présente Politique de Confidentialité décrit comment PIMPAY collecte, utilise,
            protège et partage vos informations personnelles lorsque vous utilisez nos services
            numériques, y compris l’application mobile PIMPAY et les plateformes associées.
          </p>
        </Card>

        <Card className="p-6 bg-card border-border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">2. Informations que nous collectons</h2>

          <p className="text-sm font-semibold">2.1 Informations personnelles</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nous collectons les informations que vous nous fournissez directement, notamment :  
            nom, numéro de téléphone, adresse e-mail, informations de vérification d’identité,
            données de paiement et informations de sécurité du compte.
          </p>

          <p className="text-sm font-semibold">2.2 Données techniques</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cela inclut : l’adresse IP, modèle d’appareil, version du système, identifiants
            d’appareil, logs de connexion et données d’utilisation de l’application.
          </p>
        </Card>

        <Card className="p-6 bg-card border-border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">3. Comment nous utilisons vos données</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vos informations sont utilisées pour :
          </p>

          <ul className="list-disc ml-6 text-sm text-muted-foreground leading-relaxed">
            <li>Assurer le fonctionnement sécurisé du service</li>
            <li>Vérifier votre identité</li>
            <li>Prévenir les fraudes et activités suspectes</li>
            <li>Améliorer l’expérience utilisateur</li>
            <li>Envoyer des notifications liées à votre compte</li>
          </ul>
        </Card>

        <Card className="p-6 bg-card border-border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">
            4. Partage et divulgation des données
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            PIMPAY ne vend jamais vos données personnelles. Nous pouvons partager vos informations
            uniquement avec :
          </p>

          <ul className="list-disc ml-6 text-sm text-muted-foreground">
            <li>Fournisseurs de services techniques</li>
            <li>Partenaires de paiement certifiés</li>
            <li>Autorités légales (si exigé par la loi)</li>
          </ul>
        </Card>

        <Card className="p-6 bg-card border-border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">5. Sécurité des données</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nous utilisons des mesures avancées de sécurité, dont :
          </p>

          <ul className="list-disc ml-6 text-sm text-muted-foreground">
            <li>Chiffrement des communications</li>
            <li>Stockage sécurisé des informations sensibles</li>
            <li>Contrôles d’accès stricts</li>
            <li>Audit et surveillance en continu</li>
          </ul>
        </Card>

        <Card className="p-6 bg-card border-border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">6. Vos droits</h2>

          <p className="text-sm text-muted-foreground">
            Conformément aux standards internationaux de protection des données, vous avez le droit de :
          </p>

          <ul className="list-disc ml-6 text-sm text-muted-foreground">
            <li>Accéder à vos données</li>
            <li>Demander une correction</li>
            <li>Supprimer certaines données</li>
            <li>Limiter ou refuser certains traitements</li>
          </ul>
        </Card>

        <Card className="p-6 bg-card border-border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">7. Contact</h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Pour toute question relative à la présente politique, vous pouvez nous contacter à :
          </p>

          <p className="text-sm font-semibold">
            📧 Email : pimobilepay@gmail.com  
            <br />
            📞 Téléphone : +242 065 540 305
          </p>
        </Card>

      </div>
    </div>
  );
}
