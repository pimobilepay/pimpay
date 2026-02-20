"use client"; // Indispensable pour Next.js App Router

import React from 'react';
import { ShieldCheck, Globe, Lock, Cpu } from 'lucide-react';

const AboutPage = () => {
  // Couleurs extraites de tes captures d'écran de Pimpay
  const colors = {
    background: '#0a0e17',
    card: '#161b28',
    primary: '#3b82f6', // Bleu (Envoi/Swap)
    secondary: '#10b981', // Vert (Reçus/Dépôt)
    accent: '#f97316', // Orange (Swap)
    textMain: '#ffffff',
    textMuted: '#94a3b8'
  };

  const features = [
    {
      icon: <ShieldCheck color={colors.secondary} size={32} />,
      title: "Sécurité Maximale",
      desc: "Toutes les transactions Pi s'effectuent via le domaine officiel wallet.pinet.com. Nous ne demandons jamais votre phrase secrète."
    },
    {
      icon: <Globe color={colors.primary} size={32} />,
      title: "Siège à Dubaï",
      desc: "Pimpay est basé à Dubaï pour bénéficier d'un cadre juridique stable et d'une vision technologique mondiale."
    },
    {
      icon: <Cpu color={colors.accent} size={32} />,
      title: "Optimisation Continue",
      desc: "Notre système est constamment mis à jour pour corriger les bugs et renforcer la stabilité de vos actifs."
    }
  ];

  return (
    <div style={{ backgroundColor: colors.background, color: colors.textMain, minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 'bold', marginBottom: '10px' }}>À propos de Pimpay</h1>
        <p style={{ color: colors.textMuted, maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
          La banque virtuelle de nouvelle génération, alliant la puissance de la Pi Network à la sécurité internationale.
        </p>
      </header>

      <section style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        {features.map((f, i) => (
          <div key={i} style={{ backgroundColor: colors.card, padding: '30px', borderRadius: '16px', border: `1px solid #2d3748` }}>
            <div style={{ marginBottom: '15px' }}>{f.icon}</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '10px', color: colors.textMain }}>{f.title}</h3>
            <p style={{ color: colors.textMuted, fontSize: '0.95rem', lineHeight: '1.6' }}>{f.desc}</p>
          </div>
        ))}
      </section>

      <footer style={{ marginTop: '60px', textAlign: 'center', borderTop: `1px solid #2d3748`, paddingTop: '30px' }}>
        <p style={{ fontSize: '0.9rem', color: colors.textMuted }}>
          &copy; 2026 Pimpay Financial Technologies. Siège Social : Dubaï, Émirats Arabes Unis.
        </p>
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '20px', color: colors.primary, fontWeight: 'bold' }}>
          <span>#PiNetwork</span>
          <span>#Fintech</span>
          <span>#DubaiHub</span>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
