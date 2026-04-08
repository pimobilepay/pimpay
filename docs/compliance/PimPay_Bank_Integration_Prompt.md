# PIMPAY — PROMPT DE DÉVELOPPEMENT TECHNIQUE COMPLET
## Module Bancaire ISO 20022 — Intégration Full-Stack

---

| Champ | Valeur |
|-------|--------|
| **Version** | 2.0 |
| **Date** | Avril 2025 |
| **Plateforme** | PIMPAY — Néobanque Web3 |
| **Siège** | Brazzaville, République du Congo |
| **Zone** | CEMAC (Cameroun, Congo, Gabon, Guinée Équatoriale, RCA, Tchad) |
| **Fondateur/CEO** | Aimard Swana |
| **CTO** | Elara AI |
| **Stack technique** | Pi Network, Stellar SDK (Soroban Smart Contracts, SEP-9, SEP-31), Mobile Money (MTN, Airtel, Orange) |
| **Réglementations** | COBAC, BEAC, Règlement N°04/18/CEMAC/UMAC/COBAC, Instruction N°001/GR/2025 |
| **Infrastructure existante** | GIMACPAY (600 milliards FCFA, 79 institutions, 30M comptes mobile) |
| **Taux de change fixe** | 655,957 FCFA = 1 EUR |
| **Classification** | Document Confidentiel — Usage Interne Développement |

---

## TABLE DES MATIÈRES

1. **PRÉAMBULE ET OBJECTIFS DU PROJET**
   - 1.1 Vision et mission PIMPAY
   - 1.2 Pourquoi ISO 20022
   - 1.3 Contexte CEMAC et migration ISO 20022
   - 1.4 Objectifs stratégiques et techniques

2. **ARCHITECTURE GLOBALE DU SYSTÈME**
   - 2.1 Vue d'ensemble
   - 2.2 Diagramme d'architecture en couches
   - 2.3 Choix technologiques

3. **MESSAGES ISO 20022 CORE**
   - 3.1 pacs.008 — FIToFICustomerCreditTransfer
   - 3.2 pacs.002 — FIToFIPaymentStatusReport
   - 3.3 pacs.004 — PaymentReturn
   - 3.4 pacs.009 — FinancialInstitutionCreditTransfer
   - 3.5 pain.001 — CustomerCreditTransferInitiation
   - 3.6 pain.002 — CustomerPaymentStatusReport
   - 3.7 camt.053 — BankToCustomerStatement
   - 3.8 camt.052 — BankToCustomerReport
   - 3.9 camt.054 — BankToCustomerDebitCreditNotification
   - 3.10 acmt.001-024 — Account Management
   - 3.11 Schéma PostgreSQL complet pour messages ISO 20022
   - 3.12 Machine à états des messages

4. **PORTAIL BANCAIRE DÉDIÉ**
   - 4.1 Dashboard temps réel
   - 4.2 Gestion des transactions
   - 4.3 Monitoring temps réel (WebSockets)
   - 4.4 Gestion des correspondants bancaires
   - 4.5 Gestion multi-devises
   - 4.6 Gestion de la liquidité et trésorerie
   - 4.7 Rapports réglementaires COBAC/BEAC
   - 4.8 Gestion des utilisateurs bancaires (RBAC, 2FA)

5. **BRIDGE BLOCKCHAIN + ISO 20022**
   - 5.1 Mapping bidirectionnel ISO 20022 ↔ Stellar
   - 5.2 Stellar Anchors — On-Ramp/Off-Ramp XAF
   - 5.3 Soroban Smart Contracts
   - 5.4 SEP-31 — Cross-Border B2B Payments
   - 5.5 SEP-9 — KYC Compliance
   - 5.6 Bridge Pi Network ↔ ISO 20022 (PiPay/PiBridge)
   - 5.7 Tokenisation des paiements et actifs
   - 5.8 Settlement en 5 secondes via Stellar

6. **INTEROPÉRABILITÉ MOBILE MONEY + ISO 20022**
   - 6.1 Bridge MTN MoMo API ↔ ISO 20022
   - 6.2 Bridge Airtel Money API ↔ ISO 20022
   - 6.3 Bridge Orange Money API ↔ ISO 20022
   - 6.4 Cash-In / Cash-Out via réseau d'agents
   - 6.5 QR Code Payments (EMVCo)
   - 6.6 USSD Integration
   - 6.7 Wallet-to-Bank et Bank-to-Wallet
   - 6.8 Interopérabilité GIMACPAY

7. **CONFORMITÉ ET SÉCURITÉ**
   - 7.1 KYC automatisé multi-niveaux
   - 7.2 AML screening temps réel
   - 7.3 Sanctions screening (OFAC, EU, UN, listes locales)
   - 7.4 Transaction monitoring et fraud detection (ML)
   - 7.5 PEP screening
   - 7.6 STR automatisé
   - 7.7 Audit trail complet et immuable
   - 7.8 Chiffrement et sécurité technique
   - 7.9 Conformité BEAC/COBAC/CEMAC

8. **APIs OPEN BANKING**
   - 8.1 REST API — Spécification OpenAPI 3.0
   - 8.2 Webhook notifications
   - 8.3 SDK banques partenaires
   - 8.4 OAuth 2.0 / OpenID Connect
   - 8.5 Rate limiting et throttling
   - 8.6 Sandbox / environnement de test
   - 8.7 Versioning d'API

9. **FONCTIONNALITÉS INNOVANTES**
   - 9.1 Request to Pay (R2P)
   - 9.2 Buy Now Pay Later (BNPL)
   - 9.3 Embedded Finance
   - 9.4 Paiements programmés et récurrents
   - 9.5 Multi-signature pour transactions à haut montant
   - 9.6 Notifications temps réel
   - 9.7 Export comptable (OHADA / SYSCOHADA)
   - 9.8 Rapprochement bancaire automatique

10. **ARCHITECTURE TECHNIQUE DÉTAILLÉE**
    - 10.1 Microservices — liste complète
    - 10.2 Event-Driven Architecture (Kafka)
    - 10.3 Bases de données (PostgreSQL, Redis, MongoDB)
    - 10.4 Message Queue pour ISO 20022
    - 10.5 Containerisation (Docker/Kubernetes)
    - 10.6 CI/CD Pipeline
    - 10.7 Haute disponibilité et Disaster Recovery
    - 10.8 Scalabilité horizontale
    - 10.9 Monitoring et observabilité

11. **PLAN DE DÉPLOIEMENT (ROADMAP)**

12. **ANNEXES**
    - A. Glossaire
    - B. Codes erreur ISO 20022
    - C. Matrice devises ISO 4217
    - D. BIC/SWIFT banques CEMAC
    - E. Checklist conformité COBAC
    - F. Estimations de performance

---

# 1. PRÉAMBULE ET OBJECTIFS DU PROJET

## 1.1 Vision et Mission PIMPAY

PIMPAY est une plateforme FinTech néobancaire Web3 conçue pour révolutionner les services financiers dans la zone CEMAC. Fondée à Brazzaville (République du Congo) par Aimard Swana, PIMPAY fusionne la puissance de la blockchain (Pi Network, Stellar/Soroban) avec les infrastructures Mobile Money existantes (MTN MoMo, Airtel Money, Orange Money) et le standard de messagerie financière international ISO 20022.

**Mission** : Offrir une passerelle de paiement hybride blockchain/Mobile Money interopérable avec le système bancaire international, conforme aux réglementations CEMAC, et accessible à l'ensemble de la population — y compris les non-bancarisés via USSD et feature phones.

**Vision** : Devenir la première néobanque Web3 certifiée dans la zone CEMAC, connectant 30 millions de comptes Mobile Money existants au réseau financier mondial via ISO 20022 et la blockchain Stellar.

## 1.2 Pourquoi ISO 20022

ISO 20022 est le standard universel de messagerie financière adopté mondialement :
- **SWIFT** : migration complète vers ISO 20022 achevée en mars 2025
- **SEPA** : utilise ISO 20022 depuis 2014
- **TARGET2** (BCE) : migré en mars 2023
- **Fedwire** (USA) : migration en cours
- **BEAC/CEMAC** : migration progressive en conformité avec le Règlement N°04/18

L'adoption d'ISO 20022 par PIMPAY permet :
1. **Interopérabilité internationale** — communication directe avec toutes les institutions SWIFT
2. **Richesse des données** — messages structurés XML/JSON avec métadonnées complètes
3. **Automatisation** — traitement STP (Straight-Through Processing) sans intervention manuelle
4. **Conformité** — respect des exigences BEAC et COBAC pour les systèmes de paiement
5. **Traçabilité** — suivi complet du cycle de vie d'un paiement
6. **Réduction des coûts** — élimination des rejets liés aux formats propriétaires

## 1.3 Contexte CEMAC et Migration ISO 20022

La zone CEMAC comprend 6 États (Cameroun, Congo, Gabon, Guinée Équatoriale, République Centrafricaine, Tchad) partageant le Franc CFA (XAF) à parité fixe avec l'EUR (655,957 XAF = 1 EUR).

**Infrastructure existante** :
- **BEAC** (Banque des États de l'Afrique Centrale) — banque centrale régionale
- **COBAC** (Commission Bancaire de l'Afrique Centrale) — régulateur bancaire
- **GIMACPAY** — système de paiement interbancaire régional (600 milliards FCFA de flux, 79 institutions, 30M comptes mobile connectés)
- **SYSTAC** — système de compensation interbancaire BEAC

**Cadre réglementaire applicable** :
- Règlement N°04/18/CEMAC/UMAC/COBAC — régissant les systèmes, moyens et services de paiement
- Instruction N°001/GR/2025 — nouvelles exigences de conformité et reporting
- Règlement COBAC relatif aux établissements de paiement
- Réglementation des changes BEAC

## 1.4 Objectifs Stratégiques et Techniques

| # | Objectif | KPI cible |
|---|----------|-----------|
| 1 | Traitement ISO 20022 end-to-end | < 3 secondes par message |
| 2 | Disponibilité système | 99,99% uptime |
| 3 | Throughput | 1000 TPS en pointe, 200 TPS soutenu |
| 4 | Settlement blockchain | < 5 secondes via Stellar |
| 5 | Couverture Mobile Money | MTN + Airtel + Orange = 95% du marché |
| 6 | Conformité réglementaire | 100% COBAC/BEAC |
| 7 | Interopérabilité GIMACPAY | Connexion aux 79 institutions |
| 8 | Support multi-devises | XAF, EUR, USD, GBP, XOF, Pi, XLM |

---

# 2. ARCHITECTURE GLOBALE DU SYSTÈME

## 2.1 Vue d'Ensemble

L'architecture PIMPAY suit un modèle **microservices event-driven** avec les principes suivants :
- **Domain-Driven Design (DDD)** — chaque microservice encapsule un domaine métier
- **Event Sourcing** — tous les changements d'état sont des événements immutables
- **CQRS** — séparation lecture/écriture pour la scalabilité
- **Saga Pattern** — orchestration des transactions distribuées
- **Circuit Breaker** — résilience aux pannes des services externes

## 2.2 Diagramme d'Architecture en Couches

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        COUCHE PRÉSENTATION                              ║
║  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────────┐  ║
║  │ Portail Web │  │ App Mobile   │  │ USSD GW   │  │ API Partners  │  ║
║  │ (React/Next)│  │ (React Nat.) │  │ (Feature  │  │ (Open Banking)│  ║
║  │             │  │              │  │  phones)   │  │               │  ║
║  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  └───────┬───────┘  ║
╠═════════╪════════════════╪═════════════════╪════════════════╪══════════╣
║         └────────────────┴─────────────────┴────────────────┘          ║
║                        API GATEWAY (Kong/NGINX)                        ║
║         ┌──────────────────────────────────────────────────┐           ║
║         │  Rate Limiting │ Auth (JWT) │ Load Balancing     │           ║
║         │  mTLS          │ CORS       │ Request Routing    │           ║
║         └──────────────────────────────────────────────────┘           ║
╠════════════════════════════════════════════════════════════════════════╣
║                        COUCHE MICROSERVICES                            ║
║  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌───────────────┐  ║
║  │ payment-svc │ │ account-svc │ │ iso20022-    │ │ kyc-svc       │  ║
║  │             │ │             │ │ parser-svc   │ │               │  ║
║  ├─────────────┤ ├─────────────┤ ├──────────────┤ ├───────────────┤  ║
║  │ fx-svc      │ │ compliance- │ │ notification-│ │ stellar-      │  ║
║  │             │ │ svc         │ │ svc          │ │ bridge-svc    │  ║
║  ├─────────────┤ ├─────────────┤ ├──────────────┤ ├───────────────┤  ║
║  │ mobile-     │ │ pi-bridge-  │ │ reconcilia-  │ │ reporting-svc │  ║
║  │ money-svc   │ │ svc         │ │ tion-svc     │ │               │  ║
║  ├─────────────┤ ├─────────────┤ ├──────────────┤ ├───────────────┤  ║
║  │ bnpl-svc    │ │ agent-mgmt- │ │ scheduler-   │ │ audit-svc     │  ║
║  │             │ │ svc         │ │ svc          │ │               │  ║
║  ├─────────────┤ ├─────────────┤ ├──────────────┤ ├───────────────┤  ║
║  │ auth-svc    │ │ treasury-   │ │ gateway-svc  │ │               │  ║
║  │             │ │ svc         │ │              │ │               │  ║
║  └─────────────┘ └─────────────┘ └──────────────┘ └───────────────┘  ║
╠════════════════════════════════════════════════════════════════════════╣
║                    COUCHE MESSAGE BROKER                               ║
║  ┌────────────────────────────────┐  ┌─────────────────────────────┐  ║
║  │     Apache Kafka Cluster       │  │     RabbitMQ (ISO 20022     │  ║
║  │  (Event Streaming)             │  │      Message Queuing)       │  ║
║  │  Topics: payment.*, account.*, │  │  Queues: iso.pacs.*,        │  ║
║  │  kyc.*, compliance.*, fx.*     │  │  iso.pain.*, iso.camt.*     │  ║
║  └────────────────────────────────┘  └─────────────────────────────┘  ║
╠════════════════════════════════════════════════════════════════════════╣
║                      COUCHE DONNÉES                                    ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐    ║
║  │ PostgreSQL   │  │ Redis        │  │ MongoDB                  │    ║
║  │ (Principal)  │  │ (Cache)      │  │ (Logs/Audit/Analytics)   │    ║
║  │ - Comptes    │  │ - Sessions   │  │ - Messages ISO bruts     │    ║
║  │ - Transac.   │  │ - Taux FX    │  │ - Audit trail            │    ║
║  │ - Utilisat.  │  │ - Rate limit │  │ - Événements             │    ║
║  │ - KYC        │  │ - Balances   │  │ - Analytics              │    ║
║  └──────────────┘  └──────────────┘  └──────────────────────────┘    ║
╠════════════════════════════════════════════════════════════════════════╣
║                    COUCHE BLOCKCHAIN                                   ║
║  ┌──────────────────┐  ┌──────────────┐  ┌────────────────────────┐  ║
║  │ Stellar Network  │  │ Pi Network   │  │ Soroban Smart          │  ║
║  │ (Mainnet)        │  │ (Mainnet)    │  │ Contracts              │  ║
║  │ - XAF Token      │  │ - Pi Wallet  │  │ - Escrow               │  ║
║  │ - XLM Native     │  │ - PiPay      │  │ - MultiSig             │  ║
║  │ - SEP-24/31      │  │ - PiBridge   │  │ - BNPL                 │  ║
║  │ - Anchor Server  │  │              │  │ - Fee Distribution     │  ║
║  └──────────────────┘  └──────────────┘  └────────────────────────┘  ║
╠════════════════════════════════════════════════════════════════════════╣
║                  INTÉGRATIONS EXTERNES                                 ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐ ║
║  │ MTN MoMo │ │ Airtel   │ │ Orange   │ │GIMACPAY│ │ SWIFT/BEAC   │ ║
║  │ API v2   │ │ Money API│ │ Money API│ │  API   │ │ Network      │ ║
║  └──────────┘ └──────────┘ └──────────┘ └────────┘ └──────────────┘ ║
╚════════════════════════════════════════════════════════════════════════╝
```

## 2.3 Choix Technologiques

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| Frontend Web | React 18 + Next.js 14 | SSR, performance, écosystème riche |
| Frontend Mobile | React Native | Code partagé iOS/Android |
| API Gateway | Kong / NGINX Plus | Rate limiting, auth, load balancing |
| Microservices | Node.js (TypeScript) + Rust (Soroban) | Performance + écosystème Stellar |
| Event Broker | Apache Kafka 3.x | Event streaming haute performance |
| Message Queue | RabbitMQ 3.x | Routing ISO 20022 messages |
| BDD Principale | PostgreSQL 16 | ACID, JSON support, partitioning |
| Cache | Redis 7 Cluster | In-memory, pub/sub, sessions |
| BDD Logs | MongoDB 7 | Documents flexibles, TTL indexes |
| Blockchain | Stellar SDK + Soroban (Rust) | 5s settlement, faible coût |
| Blockchain | Pi Network SDK | Écosystème Pi, adoption locale |
| Conteneurs | Docker + Kubernetes (K8s) | Orchestration, scalabilité |
| CI/CD | GitHub Actions | Intégration Git native |
| Monitoring | Prometheus + Grafana | Métriques temps réel |
| Logs | ELK Stack | Agrégation et recherche |
| Tracing | Jaeger | Traçage distribué |
| HSM | Thales Luna / AWS CloudHSM | Sécurité clés cryptographiques |
| XML Parser | fast-xml-parser (Node) | Performance parsing ISO 20022 |
| ORM | Prisma / TypeORM | Type-safe database access |


---

# 3. MESSAGES ISO 20022 CORE

> **INSTRUCTION AU DÉVELOPPEUR** : Implémenter un parseur/générateur XML complet pour chaque type de message ISO 20022 ci-dessous. Utiliser la bibliothèque `fast-xml-parser` (Node.js) avec validation XSD stricte. Chaque message doit être stocké en base PostgreSQL ET en MongoDB (message brut).

## 3.1 pacs.008.001.10 — FIToFICustomerCreditTransfer

**Usage** : Virement de crédit interbancaire (national et international). Message principal pour les transferts de fonds entre institutions financières pour le compte de clients.

### Structure XML Complète

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <!-- Group Header — Obligatoire, occurrence unique -->
    <GrpHdr>
      <MsgId>PIMPAY-PAC008-20250408-000001</MsgId>
      <CreDtTm>2025-04-08T10:30:00+01:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <TtlIntrBkSttlmAmt Ccy="XAF">5000000.00</TtlIntrBkSttlmAmt>
      <IntrBkSttlmDt>2025-04-08</IntrBkSttlmDt>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <ClrSys>
          <Prtry>GIMACPAY</Prtry>
        </ClrSys>
      </SttlmInf>
      <InstgAgt>
        <FinInstnId>
          <BICFI>PIMPAYXXX</BICFI>
          <Nm>PIMPAY SA</Nm>
        </FinInstnId>
      </InstgAgt>
      <InstdAgt>
        <FinInstnId>
          <BICFI>BGFICGCG</BICFI>
          <Nm>Banque Commerciale du Congo</Nm>
        </FinInstnId>
      </InstdAgt>
    </GrpHdr>

    <!-- Credit Transfer Transaction Information — 1..n -->
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>INSTR-20250408-001</InstrId>
        <EndToEndId>E2E-PIMPAY-20250408-001</EndToEndId>
        <TxId>TXN-20250408-001</TxId>
        <UETR>eb6305c9-1f7a-4e3a-a259-5e8e420c1a2d</UETR>
      </PmtId>
      <PmtTpInf>
        <InstrPrty>NORM</InstrPrty>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
        <LclInstrm>
          <Cd>INST</Cd>
        </LclInstrm>
        <CtgyPurp>
          <Cd>SUPP</Cd>
        </CtgyPurp>
      </PmtTpInf>
      <IntrBkSttlmAmt Ccy="XAF">5000000.00</IntrBkSttlmAmt>
      <InstdAmt Ccy="XAF">5000000.00</InstdAmt>
      <ChrgBr>SHAR</ChrgBr>

      <!-- Débiteur -->
      <Dbtr>
        <Nm>Jean-Baptiste Makosso</Nm>
        <PstlAdr>
          <StrtNm>Avenue de la Paix</StrtNm>
          <BldgNb>45</BldgNb>
          <PstCd>BP 1234</PstCd>
          <TwnNm>Brazzaville</TwnNm>
          <Ctry>CG</Ctry>
        </PstlAdr>
        <Id>
          <PrvtId>
            <Othr>
              <Id>CG-NID-123456789</Id>
              <SchmeNm>
                <Cd>NIDN</Cd>
              </SchmeNm>
              <Issr>DGTT-CG</Issr>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>CG3900010001000123456789</IBAN>
        </Id>
        <Ccy>XAF</Ccy>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>PIMPAYXXX</BICFI>
        </FinInstnId>
      </DbtrAgt>

      <!-- Créditeur -->
      <CdtrAgt>
        <FinInstnId>
          <BICFI>BGFICGCG</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>Marie-Claire Obami</Nm>
        <PstlAdr>
          <TwnNm>Douala</TwnNm>
          <Ctry>CM</Ctry>
        </PstlAdr>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>CM2100020002000987654321</IBAN>
        </Id>
      </CdtrAcct>

      <!-- Informations de remise -->
      <RmtInf>
        <Ustrd>Paiement facture FACT-2025-0042</Ustrd>
        <Strd>
          <RfrdDocInf>
            <Tp>
              <CdOrPrtry>
                <Cd>CINV</Cd>
              </CdOrPrtry>
            </Tp>
            <Nb>FACT-2025-0042</Nb>
            <RltdDt>2025-04-01</RltdDt>
          </RfrdDocInf>
        </Strd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>
```

### Règles de Validation pacs.008

| Champ | Règle | Code Erreur |
|-------|-------|-------------|
| MsgId | Unique, max 35 car., alphanumérique + tirets | AM05 |
| CreDtTm | Format ISO 8601, pas dans le futur > 5 min | DT01 |
| NbOfTxs | Doit correspondre au nombre réel de CdtTrfTxInf | AM10 |
| TtlIntrBkSttlmAmt | Somme des IntrBkSttlmAmt de chaque transaction | AM10 |
| UETR | UUID v4 obligatoire pour tracking SWIFT gpi | FF01 |
| IntrBkSttlmAmt | > 0, max 15 chiffres, devise XAF/EUR/USD | AM01 |
| BICFI (InstgAgt) | BIC valide 8 ou 11 caractères | RC01 |
| BICFI (InstdAgt) | BIC valide, institution connue | RC01 |
| Dbtr/Nm | Obligatoire, max 140 caractères | AC01 |
| DbtrAcct/IBAN | Valide selon algorithme MOD 97 | AC01 |
| CdtrAcct/IBAN | Valide selon algorithme MOD 97 | AC01 |
| ChrgBr | DEBT, CRED, SHAR, ou SLEV | CH03 |

### Flux de Traitement pacs.008

```
Client PIMPAY                payment-svc              iso20022-parser       compliance-svc
     │                            │                        │                      │
     │  POST /payments/transfer   │                        │                      │
     ├───────────────────────────►│                        │                      │
     │                            │  Valider structure     │                      │
     │                            ├───────────────────────►│                      │
     │                            │  XML validé ✓          │                      │
     │                            │◄───────────────────────┤                      │
     │                            │                        │                      │
     │                            │  AML/Sanctions check   │                      │
     │                            ├────────────────────────┼─────────────────────►│
     │                            │  Compliance OK ✓       │                      │
     │                            │◄───────────────────────┼──────────────────────┤
     │                            │                        │                      │
     │                            │  ── Kafka: payment.initiated ──►              │
     │                            │                        │                      │
     │  202 Accepted + TxId       │                        │                      │
     │◄───────────────────────────┤                        │                      │

     stellar-bridge-svc          GIMACPAY                 account-svc
           │                        │                        │
           │◄── Kafka: payment.initiated ──                  │
           │                        │                        │
           │  Route: Stellar ou GIMACPAY ?                   │
           │  [Si même zone CEMAC → GIMACPAY]                │
           │  [Si blockchain → Stellar]                      │
           │                        │                        │
           │  POST /gimacpay/transfer                        │
           ├───────────────────────►│                        │
           │  Confirmation          │                        │
           │◄───────────────────────┤                        │
           │                        │                        │
           │  ── Kafka: payment.completed ──►                │
           │                        │        Mise à jour     │
           │                        │        soldes          │
           │                        │───────────────────────►│
```

### Endpoint API

```
POST /api/v1/payments/credit-transfer
Content-Type: application/json
Authorization: Bearer {token}

Request Body:
{
  "debtor": {
    "name": "Jean-Baptiste Makosso",
    "account_iban": "CG3900010001000123456789",
    "identification": { "type": "NIDN", "value": "CG-NID-123456789" },
    "address": { "city": "Brazzaville", "country": "CG" }
  },
  "creditor": {
    "name": "Marie-Claire Obami",
    "account_iban": "CM2100020002000987654321",
    "agent_bic": "BGFICGCG",
    "address": { "city": "Douala", "country": "CM" }
  },
  "amount": { "value": 5000000.00, "currency": "XAF" },
  "charge_bearer": "SHAR",
  "purpose": "SUPP",
  "priority": "NORM",
  "remittance_info": {
    "unstructured": "Paiement facture FACT-2025-0042",
    "structured": { "type": "CINV", "number": "FACT-2025-0042", "date": "2025-04-01" }
  },
  "execution_date": "2025-04-08"
}

Response 202:
{
  "transaction_id": "TXN-20250408-001",
  "uetr": "eb6305c9-1f7a-4e3a-a259-5e8e420c1a2d",
  "status": "ACTC",
  "status_description": "AcceptedTechnicalValidation",
  "created_at": "2025-04-08T10:30:00+01:00",
  "estimated_settlement": "2025-04-08T10:30:05+01:00"
}
```

## 3.2 pacs.002.001.12 — FIToFIPaymentStatusReport

**Usage** : Rapport de statut pour informer l'institution émettrice du statut d'un paiement envoyé via pacs.008 ou pacs.009.

### Structure XML

```xml
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.002.001.12">
  <FIToFIPmtStsRpt>
    <GrpHdr>
      <MsgId>PIMPAY-STS-20250408-000001</MsgId>
      <CreDtTm>2025-04-08T10:30:05+01:00</CreDtTm>
      <InstgAgt>
        <FinInstnId><BICFI>BGFICGCG</BICFI></FinInstnId>
      </InstgAgt>
    </GrpHdr>
    <TxInfAndSts>
      <OrgnlGrpInf>
        <OrgnlMsgId>PIMPAY-PAC008-20250408-000001</OrgnlMsgId>
        <OrgnlMsgNmId>pacs.008.001.10</OrgnlMsgNmId>
      </OrgnlGrpInf>
      <OrgnlInstrId>INSTR-20250408-001</OrgnlInstrId>
      <OrgnlEndToEndId>E2E-PIMPAY-20250408-001</OrgnlEndToEndId>
      <OrgnlTxId>TXN-20250408-001</OrgnlTxId>
      <OrgnlUETR>eb6305c9-1f7a-4e3a-a259-5e8e420c1a2d</OrgnlUETR>
      <TxSts>ACSC</TxSts>
      <StsRsnInf>
        <Rsn><Cd>G000</Cd></Rsn>
        <AddtlInf>Settlement completed via GIMACPAY</AddtlInf>
      </StsRsnInf>
      <AccptncDtTm>2025-04-08T10:30:05+01:00</AccptncDtTm>
      <AcctSvcrRef>GIMAC-REF-20250408-5678</AcctSvcrRef>
    </TxInfAndSts>
  </FIToFIPmtStsRpt>
</Document>
```

### Codes de Statut ISO 20022

| Code | Nom | Description | Action PIMPAY |
|------|-----|-------------|---------------|
| ACCP | AcceptedCustomerProfile | Vérifié par le profil client | Continuer processing |
| ACSP | AcceptedSettlementInProcess | Settlement en cours | Attendre confirmation |
| ACSC | AcceptedSettlementCompleted | Settlement terminé | Marquer comme complété, notifier client |
| ACTC | AcceptedTechnicalValidation | Validation technique OK | Continuer vers compliance |
| ACWC | AcceptedWithChange | Accepté avec modification | Notifier client du changement |
| PDNG | Pending | En attente de traitement | Monitoring, timeout 24h |
| RCVD | Received | Message reçu | Accuser réception |
| RJCT | Rejected | Rejeté | Notifier client, initier retour si nécessaire |
| CANC | Cancelled | Annulé | Reverser si débité |

### Codes de Rejet (Reason Codes)

| Code | Description | Catégorie |
|------|-------------|-----------|
| AC01 | IncorrectAccountNumber | Compte |
| AC04 | ClosedAccountNumber | Compte |
| AC06 | BlockedAccount | Compte |
| AG01 | TransactionForbidden | Agent |
| AG02 | InvalidBankOperationCode | Agent |
| AM01 | ZeroAmount | Montant |
| AM02 | NotAllowedAmount | Montant |
| AM04 | InsufficientFunds | Montant |
| AM05 | Duplication | Montant |
| AM09 | WrongAmount | Montant |
| BE01 | InconsistentWithEndCustomer | Bénéficiaire |
| CH03 | RequestedExecutionDateOrRequestedCollectionDateTooFarInFuture | Charge |
| DS02 | OrderCancelled | Documents |
| DT01 | InvalidDate | Date |
| FF01 | InvalidFileFormat | Format |
| MS02 | NotSpecifiedReasonCustomerGenerated | Divers |
| RC01 | BankIdentifierIncorrect | Routage |
| RR01 | MissingDebtorAccountOrIdentification | Réglementaire |
| RR02 | MissingDebtorNameOrAddress | Réglementaire |
| RR03 | MissingCreditorNameOrAddress | Réglementaire |
| TM01 | CutOffTime | Timing |


## 3.3 pacs.004.001.11 — PaymentReturn

**Usage** : Retour d'un paiement précédemment exécuté via pacs.008. Utilisé lorsque le bénéficiaire ou sa banque refuse le paiement après settlement.

### Structure XML

```xml
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.004.001.11">
  <PmtRtr>
    <GrpHdr>
      <MsgId>PIMPAY-RTN-20250408-000001</MsgId>
      <CreDtTm>2025-04-08T14:00:00+01:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <TtlRtrdIntrBkSttlmAmt Ccy="XAF">5000000.00</TtlRtrdIntrBkSttlmAmt>
      <IntrBkSttlmDt>2025-04-08</IntrBkSttlmDt>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <TxInf>
      <RtrId>RTN-20250408-001</RtrId>
      <OrgnlGrpInf>
        <OrgnlMsgId>PIMPAY-PAC008-20250408-000001</OrgnlMsgId>
        <OrgnlMsgNmId>pacs.008.001.10</OrgnlMsgNmId>
      </OrgnlGrpInf>
      <OrgnlInstrId>INSTR-20250408-001</OrgnlInstrId>
      <OrgnlEndToEndId>E2E-PIMPAY-20250408-001</OrgnlEndToEndId>
      <OrgnlTxId>TXN-20250408-001</OrgnlTxId>
      <OrgnlUETR>eb6305c9-1f7a-4e3a-a259-5e8e420c1a2d</OrgnlUETR>
      <OrgnlIntrBkSttlmAmt Ccy="XAF">5000000.00</OrgnlIntrBkSttlmAmt>
      <RtrdIntrBkSttlmAmt Ccy="XAF">5000000.00</RtrdIntrBkSttlmAmt>
      <ChrgBr>SHAR</ChrgBr>
      <RtrRsnInf>
        <Orgtr>
          <Nm>Banque Commerciale du Congo</Nm>
        </Orgtr>
        <Rsn>
          <Cd>AC04</Cd>
        </Rsn>
        <AddtlInf>Compte bénéficiaire clôturé</AddtlInf>
      </RtrRsnInf>
    </TxInf>
  </PmtRtr>
</Document>
```

### Codes de Retour Spécifiques

| Code | Description | Délai max retour |
|------|-------------|------------------|
| AC01 | Numéro de compte incorrect | 10 jours ouvrés |
| AC04 | Compte clôturé | 10 jours ouvrés |
| AC06 | Compte bloqué | 5 jours ouvrés |
| AM04 | Fonds insuffisants (retour partiel) | 2 jours ouvrés |
| BE04 | Adresse du créditeur manquante | 10 jours ouvrés |
| FOCR | FollowingCancellationRequest | Immédiat |
| FRAD | FraudulentOrigin | Immédiat, alerte compliance |
| MD01 | NoMandate | 5 jours ouvrés |
| MS02 | NotSpecifiedReasonByCustomer | 10 jours ouvrés |
| NARR | Narrative (texte libre) | Variable |

### Endpoint API

```
POST /api/v1/payments/return
Content-Type: application/json
Authorization: Bearer {token}

{
  "original_transaction_id": "TXN-20250408-001",
  "original_uetr": "eb6305c9-1f7a-4e3a-a259-5e8e420c1a2d",
  "return_amount": { "value": 5000000.00, "currency": "XAF" },
  "return_reason": { "code": "AC04", "additional_info": "Compte bénéficiaire clôturé" }
}

Response 202:
{
  "return_id": "RTN-20250408-001",
  "status": "ACTC",
  "original_transaction_id": "TXN-20250408-001",
  "created_at": "2025-04-08T14:00:00+01:00"
}
```

## 3.4 pacs.009.001.10 — FinancialInstitutionCreditTransfer

**Usage** : Transfert interbancaire direct entre institutions financières (nostro/vostro), sans client final. Utilisé pour le settlement, la gestion de liquidité et les transferts de couverture.

### Structure XML

```xml
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.009.001.10">
  <FICdtTrf>
    <GrpHdr>
      <MsgId>PIMPAY-FI009-20250408-000001</MsgId>
      <CreDtTm>2025-04-08T08:00:00+01:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>INDA</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>FI-INSTR-20250408-001</InstrId>
        <EndToEndId>FI-E2E-20250408-001</EndToEndId>
        <TxId>FI-TXN-20250408-001</TxId>
        <UETR>a1b2c3d4-5678-9abc-def0-123456789abc</UETR>
      </PmtId>
      <PmtTpInf>
        <InstrPrty>HIGH</InstrPrty>
      </PmtTpInf>
      <IntrBkSttlmAmt Ccy="EUR">76224.51</IntrBkSttlmAmt>
      <IntrBkSttlmDt>2025-04-08</IntrBkSttlmDt>
      <Dbtr>
        <FinInstnId>
          <BICFI>PIMPAYXXX</BICFI>
          <Nm>PIMPAY SA</Nm>
        </FinInstnId>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>FR7630001007941234567890185</IBAN></Id>
      </DbtrAcct>
      <Cdtr>
        <FinInstnId>
          <BICFI>BEABORBB</BICFI>
          <Nm>Bank of Africa</Nm>
        </FinInstnId>
      </Cdtr>
      <CdtrAcct>
        <Id><IBAN>CG3900010001000000000001</IBAN></Id>
      </CdtrAcct>
    </CdtTrfTxInf>
  </FICdtTrf>
</Document>
```

## 3.5 pain.001.001.11 — CustomerCreditTransferInitiation

**Usage** : Message initié par le client pour demander un virement. C'est le point d'entrée côté client avant transformation en pacs.008 pour le réseau interbancaire.

### Structure XML

```xml
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.11">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>PIMPAY-PAIN001-20250408-000001</MsgId>
      <CreDtTm>2025-04-08T10:00:00+01:00</CreDtTm>
      <NbOfTxs>2</NbOfTxs>
      <CtrlSum>7500000.00</CtrlSum>
      <InitgPty>
        <Nm>Entreprise Makosso SARL</Nm>
        <Id>
          <OrgId>
            <Othr>
              <Id>CG-RCCM-2025-B-1234</Id>
              <SchmeNm><Cd>TXID</Cd></SchmeNm>
            </Othr>
          </OrgId>
        </Id>
      </InitgPty>
    </GrpHdr>

    <!-- Bloc de paiement 1 -->
    <PmtInf>
      <PmtInfId>BATCH-001</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>2</NbOfTxs>
      <CtrlSum>7500000.00</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>NURG</Cd></SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>
        <Dt>2025-04-09</Dt>
      </ReqdExctnDt>
      <Dbtr>
        <Nm>Entreprise Makosso SARL</Nm>
        <PstlAdr><Ctry>CG</Ctry><TwnNm>Brazzaville</TwnNm></PstlAdr>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>CG3900010001000555666777</IBAN></Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId><BICFI>PIMPAYXXX</BICFI></FinInstnId>
      </DbtrAgt>

      <!-- Transaction 1 : Salaire employé -->
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>SALARY-001</EndToEndId>
        </PmtId>
        <Amt><InstdAmt Ccy="XAF">4500000.00</InstdAmt></Amt>
        <Cdtr>
          <Nm>Paul Ngoma</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id><IBAN>CG3900020002000111222333</IBAN></Id>
        </CdtrAcct>
        <RmtInf><Ustrd>Salaire Mars 2025</Ustrd></RmtInf>
      </CdtTrfTxInf>

      <!-- Transaction 2 : Fournisseur -->
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>SUPPLIER-001</EndToEndId>
        </PmtId>
        <Amt><InstdAmt Ccy="XAF">3000000.00</InstdAmt></Amt>
        <Cdtr>
          <Nm>Fournitures Congo SA</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id><IBAN>CG3900030003000444555666</IBAN></Id>
        </CdtrAcct>
        <RmtInf><Ustrd>Facture FRN-2025-088</Ustrd></RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
```

### Transformation pain.001 → pacs.008

```
pain.001 (client)                    payment-svc                        iso20022-parser
     │                                    │                                  │
     │  Soumission pain.001               │                                  │
     ├───────────────────────────────────►│                                  │
     │                                    │  Parse + Validate                │
     │                                    ├─────────────────────────────────►│
     │                                    │  Validated ✓                     │
     │                                    │◄─────────────────────────────────┤
     │                                    │                                  │
     │                                    │  Pour chaque CdtTrfTxInf:       │
     │                                    │  1. Vérifier solde débiteur      │
     │                                    │  2. Screening AML/Sanctions      │
     │                                    │  3. Générer pacs.008             │
     │                                    │  4. Ajouter GrpHdr institutionnel│
     │                                    │  5. Attribuer UETR              │
     │                                    │  6. Router vers réseau approprié │
     │                                    │                                  │
     │  pain.002 (statut)                 │                                  │
     │◄───────────────────────────────────┤                                  │
```

## 3.6 pain.002.001.12 — CustomerPaymentStatusReport

**Usage** : Réponse au client sur le statut de sa demande pain.001.

```xml
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.002.001.12">
  <CstmrPmtStsRpt>
    <GrpHdr>
      <MsgId>PIMPAY-PAIN002-20250408-000001</MsgId>
      <CreDtTm>2025-04-08T10:00:30+01:00</CreDtTm>
      <InitgPty><Nm>Entreprise Makosso SARL</Nm></InitgPty>
    </GrpHdr>
    <OrgnlGrpInfAndSts>
      <OrgnlMsgId>PIMPAY-PAIN001-20250408-000001</OrgnlMsgId>
      <OrgnlMsgNmId>pain.001.001.11</OrgnlMsgNmId>
      <GrpSts>PART</GrpSts>
    </OrgnlGrpInfAndSts>
    <OrgnlPmtInfAndSts>
      <OrgnlPmtInfId>BATCH-001</OrgnlPmtInfId>
      <PmtInfSts>PART</PmtInfSts>
      <TxInfAndSts>
        <OrgnlEndToEndId>SALARY-001</OrgnlEndToEndId>
        <TxSts>ACSC</TxSts>
      </TxInfAndSts>
      <TxInfAndSts>
        <OrgnlEndToEndId>SUPPLIER-001</OrgnlEndToEndId>
        <TxSts>RJCT</TxSts>
        <StsRsnInf>
          <Rsn><Cd>AM04</Cd></Rsn>
          <AddtlInf>Solde insuffisant pour la 2ème transaction</AddtlInf>
        </StsRsnInf>
      </TxInfAndSts>
    </OrgnlPmtInfAndSts>
  </CstmrPmtStsRpt>
</Document>
```

## 3.7 camt.053.001.10 — BankToCustomerStatement

**Usage** : Relevé bancaire complet envoyé par la banque au client en fin de journée ou de période. Contient les soldes d'ouverture/clôture et toutes les écritures de la période.

### Structure XML

```xml
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.10">
  <BkToCstmrStmt>
    <GrpHdr>
      <MsgId>PIMPAY-STMT-20250408-000001</MsgId>
      <CreDtTm>2025-04-08T23:59:59+01:00</CreDtTm>
    </GrpHdr>
    <Stmt>
      <Id>STMT-CG39-20250408</Id>
      <ElctrncSeqNb>87</ElctrncSeqNb>
      <LglSeqNb>87</LglSeqNb>
      <CreDtTm>2025-04-08T23:59:59+01:00</CreDtTm>
      <FrToDt>
        <FrDtTm>2025-04-08T00:00:00+01:00</FrDtTm>
        <ToDtTm>2025-04-08T23:59:59+01:00</ToDtTm>
      </FrToDt>
      <Acct>
        <Id><IBAN>CG3900010001000123456789</IBAN></Id>
        <Ccy>XAF</Ccy>
        <Ownr><Nm>Jean-Baptiste Makosso</Nm></Ownr>
        <Svcr>
          <FinInstnId><BICFI>PIMPAYXXX</BICFI></FinInstnId>
        </Svcr>
      </Acct>

      <!-- Soldes -->
      <Bal>
        <Tp><CdOrPrtry><Cd>OPBD</Cd></CdOrPrtry></Tp>
        <Amt Ccy="XAF">15000000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Dt><Dt>2025-04-08</Dt></Dt>
      </Bal>
      <Bal>
        <Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp>
        <Amt Ccy="XAF">12500000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Dt><Dt>2025-04-08</Dt></Dt>
      </Bal>
      <Bal>
        <Tp><CdOrPrtry><Cd>FWAV</Cd></CdOrPrtry></Tp>
        <Amt Ccy="XAF">12500000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Dt><Dt>2025-04-09</Dt></Dt>
      </Bal>

      <!-- Résumé des transactions -->
      <TxsSummry>
        <TtlNtries>
          <NbOfNtries>5</NbOfNtries>
          <Sum>7500000.00</Sum>
          <TtlNetNtry>
            <Amt>2500000.00</Amt>
            <CdtDbtInd>DBIT</CdtDbtInd>
          </TtlNetNtry>
        </TtlNtries>
        <TtlCdtNtries>
          <NbOfNtries>2</NbOfNtries>
          <Sum>2500000.00</Sum>
        </TtlCdtNtries>
        <TtlDbtNtries>
          <NbOfNtries>3</NbOfNtries>
          <Sum>5000000.00</Sum>
        </TtlDbtNtries>
      </TxsSummry>

      <!-- Entrées individuelles -->
      <Ntry>
        <Amt Ccy="XAF">5000000.00</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <Sts><Cd>BOOK</Cd></Sts>
        <BookgDt><Dt>2025-04-08</Dt></BookgDt>
        <ValDt><Dt>2025-04-08</Dt></ValDt>
        <AcctSvcrRef>PIMPAY-REF-001</AcctSvcrRef>
        <BkTxCd>
          <Domn>
            <Cd>PMNT</Cd>
            <Fmly><Cd>ICDT</Cd><SubFmlyCd>DMCT</SubFmlyCd></Fmly>
          </Domn>
        </BkTxCd>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <EndToEndId>E2E-PIMPAY-20250408-001</EndToEndId>
              <TxId>TXN-20250408-001</TxId>
            </Refs>
            <AmtDtls>
              <InstdAmt><Amt Ccy="XAF">5000000.00</Amt></InstdAmt>
            </AmtDtls>
            <RltdPties>
              <Cdtr><Nm>Marie-Claire Obami</Nm></Cdtr>
              <CdtrAcct><Id><IBAN>CM2100020002000987654321</IBAN></Id></CdtrAcct>
            </RltdPties>
            <RmtInf><Ustrd>Paiement facture FACT-2025-0042</Ustrd></RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>
```

### Types de Soldes

| Code | Nom | Description |
|------|-----|-------------|
| OPBD | OpeningBooked | Solde d'ouverture comptabilisé |
| CLBD | ClosingBooked | Solde de clôture comptabilisé |
| ITBD | InterimBooked | Solde intérimaire comptabilisé |
| PRCD | PreviouslyClosedBooked | Solde de clôture précédent |
| FWAV | ForwardAvailable | Solde disponible prévisionnel |
| CLAV | ClosingAvailable | Solde disponible de clôture |
| INFO | Information | Solde informatif |

## 3.8 camt.052.001.10 — BankToCustomerReport (Intraday)

**Usage** : Reporting intraday en temps réel. Même structure que camt.053 mais envoyé en cours de journée (toutes les heures ou sur demande).

```
Endpoint: GET /api/v1/accounts/{accountId}/report?type=intraday
Fréquence: Toutes les heures ou on-demand
Contenu: Mouvements depuis le dernier rapport
Format réponse: JSON (avec option XML camt.052)
WebSocket: ws://api.pimpay.cg/v1/accounts/{accountId}/live-report
```

### Différences avec camt.053

| Aspect | camt.052 (Intraday) | camt.053 (Statement) |
|--------|---------------------|----------------------|
| Fréquence | Temps réel / horaire | Fin de journée |
| Soldes | ITBD (intérimaire) | OPBD, CLBD (définitifs) |
| Complétude | Partiel (depuis dernier rapport) | Complet (période entière) |
| Statut entrées | PDNG + BOOK | BOOK uniquement |
| Usage | Monitoring trésorerie | Comptabilité, rapprochement |

## 3.9 camt.054.001.10 — BankToCustomerDebitCreditNotification

**Usage** : Notification individuelle push envoyée au client à chaque mouvement débit ou crédit sur son compte. Déclenche les notifications push/SMS/email.

```xml
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.10">
  <BkToCstmrDbtCdtNtfctn>
    <GrpHdr>
      <MsgId>PIMPAY-NTF-20250408-000001</MsgId>
      <CreDtTm>2025-04-08T10:30:05+01:00</CreDtTm>
    </GrpHdr>
    <Ntfctn>
      <Id>NTF-CG39-20250408-001</Id>
      <CreDtTm>2025-04-08T10:30:05+01:00</CreDtTm>
      <Acct>
        <Id><IBAN>CG3900010001000123456789</IBAN></Id>
        <Ownr><Nm>Jean-Baptiste Makosso</Nm></Ownr>
      </Acct>
      <Ntry>
        <Amt Ccy="XAF">5000000.00</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <Sts><Cd>BOOK</Cd></Sts>
        <BookgDt><Dt>2025-04-08</Dt></BookgDt>
        <ValDt><Dt>2025-04-08</Dt></ValDt>
        <BkTxCd>
          <Domn><Cd>PMNT</Cd><Fmly><Cd>ICDT</Cd><SubFmlyCd>DMCT</SubFmlyCd></Fmly></Domn>
        </BkTxCd>
        <NtryDtls>
          <TxDtls>
            <Refs><EndToEndId>E2E-PIMPAY-20250408-001</EndToEndId></Refs>
            <RltdPties>
              <Cdtr><Nm>Marie-Claire Obami</Nm></Cdtr>
            </RltdPties>
            <RmtInf><Ustrd>Paiement facture FACT-2025-0042</Ustrd></RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Ntfctn>
  </BkToCstmrDbtCdtNtfctn>
</Document>
```

### Pipeline de Notification (camt.054 → Push/SMS/Email)

```
camt.054 généré          notification-svc              Canaux
      │                        │                          │
      │  Kafka: account.movement                          │
      ├───────────────────────►│                          │
      │                        │  Lookup préférences user │
      │                        │  ┌──────────────────┐    │
      │                        │  │ push: true       │    │
      │                        │  │ sms: true        │    │  ──► FCM Push
      │                        │  │ email: false     │    │  ──► SMS Gateway
      │                        │  │ in_app: true     │    │  ──► WebSocket
      │                        │  └──────────────────┘    │
      │                        │                          │
      │                        │  Format message:         │
      │                        │  "Débit 5 000 000 XAF    │
      │                        │   Bénéf: M-C Obami       │
      │                        │   Réf: FACT-2025-0042    │
      │                        │   Solde: 12 500 000 XAF" │
```

## 3.10 acmt.001-024 — Account Management

**Usage** : Gestion complète du cycle de vie des comptes — ouverture, modification, clôture, identification, mandats.

### Messages Principaux

| Message | Nom | Usage |
|---------|-----|-------|
| acmt.001 | AccountOpeningInstructionV07 | Demande d'ouverture de compte |
| acmt.002 | AccountDetailsConfirmationV07 | Confirmation d'ouverture |
| acmt.003 | AccountModificationInstructionV07 | Modification de compte |
| acmt.005 | RequestForAccountManagementStatusReportV05 | Demande de statut |
| acmt.006 | AccountManagementStatusReportV05 | Rapport de statut |
| acmt.007 | AccountOpeningAmendmentRequestV03 | Amendement d'ouverture |
| acmt.010 | AccountRequestAcknowledgementV03 | Accusé de réception |
| acmt.019 | AccountClosingRequestV03 | Demande de clôture |
| acmt.020 | AccountClosingAmendmentRequestV03 | Amendement de clôture |
| acmt.021 | AccountClosingAdditionalInformationRequestV03 | Info complémentaire |
| acmt.022 | IdentificationModificationAdviceV03 | Modification ID |
| acmt.023 | IdentificationVerificationRequestV03 | Vérification ID |
| acmt.024 | IdentificationVerificationReportV03 | Rapport vérification |

### Flux d'Ouverture de Compte

```
Client App          account-svc          kyc-svc          compliance-svc        BEAC/COBAC
    │                    │                  │                    │                    │
    │ POST /accounts     │                  │                    │                    │
    │ (acmt.001)         │                  │                    │                    │
    ├───────────────────►│                  │                    │                    │
    │                    │ Vérif KYC Tier   │                    │                    │
    │                    ├─────────────────►│                    │                    │
    │                    │ KYC Status       │                    │                    │
    │                    │◄─────────────────┤                    │                    │
    │                    │                  │                    │                    │
    │                    │ Si KYC insuffisant: retour 422        │                    │
    │                    │                  │                    │                    │
    │                    │ Sanctions screen │                    │                    │
    │                    ├──────────────────┼───────────────────►│                    │
    │                    │ Screen OK ✓      │                    │                    │
    │                    │◄─────────────────┼────────────────────┤                    │
    │                    │                  │                    │                    │
    │                    │ Générer numéro compte (IBAN CG)       │                    │
    │                    │ Créer compte PostgreSQL                │                    │
    │                    │ Créer trustline Stellar (XAF token)   │                    │
    │                    │                  │                    │                    │
    │                    │ Déclaration réglementaire              │                    │
    │                    ├───────────────────┼───────────────────┼───────────────────►│
    │                    │                  │                    │                    │
    │ acmt.002           │                  │                    │                    │
    │ (confirmation)     │                  │                    │                    │
    │◄───────────────────┤                  │                    │                    │
```

### Types de Comptes PIMPAY

| Type | Code | Devise | KYC Min | Limites |
|------|------|--------|---------|---------|
| Compte Courant Particulier | CACC | XAF | Tier 1 | 200K/mois |
| Compte Courant Business | BIZZ | XAF | Tier 3 | 50M/jour |
| Compte Épargne | SVGS | XAF | Tier 2 | 5M/mois |
| Wallet Mobile Money | EWLT | XAF | Tier 1 | 200K/mois |
| Wallet Crypto (Stellar) | CWLT | XLM/XAF | Tier 2 | 5M/mois |
| Wallet Pi Network | PIWT | Pi/XAF | Tier 1 | 200K/mois |
| Compte Nostro/Vostro | NSVR | Multi | N/A | Illimité |

### Endpoint API — Ouverture de Compte

```
POST /api/v1/accounts
Content-Type: application/json
Authorization: Bearer {token}

{
  "account_type": "CACC",
  "currency": "XAF",
  "owner": {
    "type": "individual",
    "first_name": "Jean-Baptiste",
    "last_name": "Makosso",
    "date_of_birth": "1985-06-15",
    "nationality": "CG",
    "identification": {
      "type": "NATIONAL_ID",
      "number": "CG-NID-123456789",
      "issuer": "DGTT-CG",
      "expiry_date": "2030-12-31"
    },
    "address": {
      "street": "Avenue de la Paix, 45",
      "city": "Brazzaville",
      "country": "CG",
      "postal_code": "BP 1234"
    },
    "phone": "+242066123456",
    "email": "jb.makosso@email.cg"
  },
  "kyc_tier": 2,
  "initial_deposit": { "amount": 100000, "currency": "XAF", "source": "MOBILE_MONEY", "mobile_money_ref": "MTN-DEP-2025-001" }
}

Response 201:
{
  "account_id": "ACC-CG39-20250408-001",
  "iban": "CG3900010001000123456789",
  "bic": "PIMPAYXXX",
  "account_type": "CACC",
  "currency": "XAF",
  "status": "ACTIVE",
  "stellar_address": "GBPIMPAY...XAF",
  "kyc_tier": 2,
  "limits": {
    "daily_debit": 500000,
    "monthly_debit": 5000000,
    "single_transaction": 500000
  },
  "created_at": "2025-04-08T10:00:00+01:00"
}
```

## 3.11 Schéma PostgreSQL Complet pour Messages ISO 20022

### Tables Principales

```sql
-- ============================================================
-- SCHÉMA PRINCIPAL : iso20022
-- ============================================================
CREATE SCHEMA IF NOT EXISTS iso20022;

-- Table des messages ISO 20022 (enveloppe commune)
CREATE TABLE iso20022.messages (
    message_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    msg_id_iso          VARCHAR(35) NOT NULL UNIQUE,  -- MsgId ISO
    message_type        VARCHAR(20) NOT NULL,          -- pacs.008, pain.001, camt.053...
    message_version     VARCHAR(10) NOT NULL,          -- 001.10, 001.12...
    direction           VARCHAR(4) NOT NULL CHECK (direction IN ('IN', 'OUT')),
    status              VARCHAR(10) NOT NULL DEFAULT 'RCVD',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at        TIMESTAMPTZ,
    instructing_agent   VARCHAR(11),                   -- BIC
    instructed_agent    VARCHAR(11),                   -- BIC
    nb_of_txs           INTEGER NOT NULL DEFAULT 1,
    total_amount        NUMERIC(18,2),
    currency            VARCHAR(3),
    settlement_method   VARCHAR(4),                    -- CLRG, INDA, INGA, COVE
    settlement_date     DATE,
    raw_xml             TEXT,                           -- Message XML brut
    json_payload        JSONB,                          -- Version JSON parsée
    checksum_sha256     VARCHAR(64) NOT NULL,           -- Intégrité
    CONSTRAINT chk_message_type CHECK (message_type IN (
        'pacs.008', 'pacs.002', 'pacs.004', 'pacs.009',
        'pain.001', 'pain.002',
        'camt.052', 'camt.053', 'camt.054',
        'acmt.001', 'acmt.002', 'acmt.003', 'acmt.005',
        'acmt.006', 'acmt.019', 'acmt.022', 'acmt.023', 'acmt.024'
    ))
) PARTITION BY RANGE (created_at);

-- Partitions mensuelles (créer automatiquement via pg_partman)
CREATE TABLE iso20022.messages_2025_04 PARTITION OF iso20022.messages
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE iso20022.messages_2025_05 PARTITION OF iso20022.messages
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

-- Index
CREATE INDEX idx_messages_type ON iso20022.messages (message_type);
CREATE INDEX idx_messages_status ON iso20022.messages (status);
CREATE INDEX idx_messages_created ON iso20022.messages (created_at DESC);
CREATE INDEX idx_messages_agents ON iso20022.messages (instructing_agent, instructed_agent);
CREATE INDEX idx_messages_json ON iso20022.messages USING GIN (json_payload);

-- ============================================================
-- Table des transactions de paiement
-- ============================================================
CREATE TABLE iso20022.payment_transactions (
    transaction_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id          UUID NOT NULL REFERENCES iso20022.messages(message_id),
    tx_id_iso           VARCHAR(35) NOT NULL,           -- TxId
    instr_id            VARCHAR(35),                    -- InstrId
    end_to_end_id       VARCHAR(35) NOT NULL,           -- EndToEndId
    uetr                UUID NOT NULL UNIQUE,            -- UETR (SWIFT gpi)
    payment_type        VARCHAR(20) NOT NULL,            -- CREDIT_TRANSFER, RETURN, FI_TRANSFER
    status              VARCHAR(10) NOT NULL DEFAULT 'RCVD',
    priority            VARCHAR(4) DEFAULT 'NORM',       -- NORM, HIGH, URGN
    service_level       VARCHAR(4),                      -- SEPA, NURG, INST
    local_instrument    VARCHAR(4),                      -- INST, CORE
    category_purpose    VARCHAR(4),                      -- SUPP, SALA, PENS, TAXS...
    interbank_amount    NUMERIC(18,2) NOT NULL,
    interbank_currency  VARCHAR(3) NOT NULL,
    instructed_amount   NUMERIC(18,2),
    instructed_currency VARCHAR(3),
    charge_bearer       VARCHAR(4),                      -- DEBT, CRED, SHAR, SLEV
    exchange_rate       NUMERIC(12,6),
    -- Débiteur
    debtor_name         VARCHAR(140),
    debtor_account_iban VARCHAR(34),
    debtor_account_other VARCHAR(34),
    debtor_agent_bic    VARCHAR(11),
    debtor_country      VARCHAR(2),
    debtor_id_type      VARCHAR(10),
    debtor_id_value     VARCHAR(35),
    -- Créditeur
    creditor_name       VARCHAR(140),
    creditor_account_iban VARCHAR(34),
    creditor_account_other VARCHAR(34),
    creditor_agent_bic  VARCHAR(11),
    creditor_country    VARCHAR(2),
    -- Remise
    remittance_info     TEXT,
    structured_ref      VARCHAR(35),
    -- Métadonnées
    settlement_date     DATE,
    acceptance_datetime TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Blockchain
    stellar_tx_hash     VARCHAR(64),
    stellar_ledger      BIGINT,
    pi_tx_hash          VARCHAR(64),
    -- Mobile Money
    mobile_money_ref    VARCHAR(50),
    mobile_money_provider VARCHAR(20),  -- MTN, AIRTEL, ORANGE
    -- Routing
    routing_channel     VARCHAR(20),     -- GIMACPAY, STELLAR, SWIFT, MOBILE_MONEY
    -- Compliance
    aml_score           SMALLINT,        -- 0-100
    sanctions_checked   BOOLEAN DEFAULT FALSE,
    compliance_status   VARCHAR(20) DEFAULT 'PENDING'
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_ptx_uetr ON iso20022.payment_transactions (uetr);
CREATE INDEX idx_ptx_status ON iso20022.payment_transactions (status);
CREATE INDEX idx_ptx_e2e ON iso20022.payment_transactions (end_to_end_id);
CREATE INDEX idx_ptx_debtor ON iso20022.payment_transactions (debtor_account_iban);
CREATE INDEX idx_ptx_creditor ON iso20022.payment_transactions (creditor_account_iban);
CREATE INDEX idx_ptx_date ON iso20022.payment_transactions (created_at DESC);
CREATE INDEX idx_ptx_channel ON iso20022.payment_transactions (routing_channel);
CREATE INDEX idx_ptx_stellar ON iso20022.payment_transactions (stellar_tx_hash) WHERE stellar_tx_hash IS NOT NULL;

-- ============================================================
-- Table des statuts (historique complet de chaque transition)
-- ============================================================
CREATE TABLE iso20022.transaction_status_history (
    id                  BIGSERIAL PRIMARY KEY,
    transaction_id      UUID NOT NULL REFERENCES iso20022.payment_transactions(transaction_id),
    previous_status     VARCHAR(10),
    new_status          VARCHAR(10) NOT NULL,
    reason_code         VARCHAR(4),
    reason_description  TEXT,
    source_message_id   UUID REFERENCES iso20022.messages(message_id),
    changed_by          VARCHAR(50),          -- system, user_id, service_name
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tsh_tx ON iso20022.transaction_status_history (transaction_id, created_at);

-- ============================================================
-- Table des comptes
-- ============================================================
CREATE TABLE iso20022.accounts (
    account_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iban                VARCHAR(34) UNIQUE,
    account_number      VARCHAR(34) NOT NULL UNIQUE,
    bic                 VARCHAR(11) NOT NULL DEFAULT 'PIMPAYXXX',
    account_type        VARCHAR(4) NOT NULL,              -- CACC, SVGS, EWLT, CWLT, PIWT, BIZZ, NSVR
    currency            VARCHAR(3) NOT NULL DEFAULT 'XAF',
    status              VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    -- Propriétaire
    owner_id            UUID NOT NULL,
    owner_type          VARCHAR(15) NOT NULL,              -- INDIVIDUAL, ORGANIZATION
    owner_name          VARCHAR(140) NOT NULL,
    -- Soldes
    balance_available   NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    balance_booked      NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    balance_pending     NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    -- Limites
    daily_limit         NUMERIC(18,2),
    monthly_limit       NUMERIC(18,2),
    single_tx_limit     NUMERIC(18,2),
    -- Blockchain
    stellar_account_id  VARCHAR(56),                       -- Stellar public key
    pi_wallet_address   VARCHAR(100),
    -- KYC
    kyc_tier            SMALLINT NOT NULL DEFAULT 1,
    kyc_verified_at     TIMESTAMPTZ,
    -- Métadonnées
    opened_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at           TIMESTAMPTZ,
    last_activity_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_acc_owner ON iso20022.accounts (owner_id);
CREATE INDEX idx_acc_status ON iso20022.accounts (status);
CREATE INDEX idx_acc_type ON iso20022.accounts (account_type);
CREATE INDEX idx_acc_stellar ON iso20022.accounts (stellar_account_id) WHERE stellar_account_id IS NOT NULL;

-- ============================================================
-- Table des correspondants bancaires
-- ============================================================
CREATE TABLE iso20022.correspondent_banks (
    bank_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bic                 VARCHAR(11) NOT NULL UNIQUE,
    name                VARCHAR(140) NOT NULL,
    country             VARCHAR(2) NOT NULL,
    city                VARCHAR(50),
    is_active           BOOLEAN DEFAULT TRUE,
    relationship_type   VARCHAR(20),                       -- NOSTRO, VOSTRO, CORRESPONDENT
    nostro_account      VARCHAR(34),
    vostro_account      VARCHAR(34),
    settlement_method   VARCHAR(4),
    supported_currencies VARCHAR(50),                       -- JSON array
    fee_schedule        JSONB,                              -- Grille tarifaire
    gimacpay_member     BOOLEAN DEFAULT FALSE,
    swift_connected     BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table des relevés bancaires (camt.053)
-- ============================================================
CREATE TABLE iso20022.bank_statements (
    statement_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id          UUID NOT NULL REFERENCES iso20022.accounts(account_id),
    statement_number    INTEGER NOT NULL,
    period_from         TIMESTAMPTZ NOT NULL,
    period_to           TIMESTAMPTZ NOT NULL,
    opening_balance     NUMERIC(18,2) NOT NULL,
    closing_balance     NUMERIC(18,2) NOT NULL,
    total_credit_entries INTEGER DEFAULT 0,
    total_credit_amount NUMERIC(18,2) DEFAULT 0.00,
    total_debit_entries INTEGER DEFAULT 0,
    total_debit_amount  NUMERIC(18,2) DEFAULT 0.00,
    message_id          UUID REFERENCES iso20022.messages(message_id),
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, statement_number)
);

-- ============================================================
-- Table des taux de change
-- ============================================================
CREATE TABLE iso20022.fx_rates (
    rate_id             BIGSERIAL PRIMARY KEY,
    source_currency     VARCHAR(3) NOT NULL,
    target_currency     VARCHAR(3) NOT NULL,
    rate                NUMERIC(12,6) NOT NULL,
    inverse_rate        NUMERIC(12,6) NOT NULL,
    spread              NUMERIC(8,6) DEFAULT 0,
    source              VARCHAR(20),                        -- BEAC, ECB, MARKET, FIXED
    effective_from      TIMESTAMPTZ NOT NULL,
    effective_to        TIMESTAMPTZ,
    is_fixed            BOOLEAN DEFAULT FALSE,              -- TRUE pour XAF/EUR
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Taux fixe XAF/EUR (immuable)
INSERT INTO iso20022.fx_rates (source_currency, target_currency, rate, inverse_rate, source, effective_from, is_fixed)
VALUES ('XAF', 'EUR', 0.001524490, 655.957000, 'BEAC', '1999-01-01', TRUE);

INSERT INTO iso20022.fx_rates (source_currency, target_currency, rate, inverse_rate, source, effective_from, is_fixed)
VALUES ('EUR', 'XAF', 655.957000, 0.001524490, 'BEAC', '1999-01-01', TRUE);

-- ============================================================
-- Vue matérialisée pour le dashboard temps réel
-- ============================================================
CREATE MATERIALIZED VIEW iso20022.dashboard_daily_stats AS
SELECT
    DATE(created_at) AS tx_date,
    routing_channel,
    interbank_currency,
    status,
    COUNT(*) AS tx_count,
    SUM(interbank_amount) AS total_amount,
    AVG(interbank_amount) AS avg_amount,
    MIN(interbank_amount) AS min_amount,
    MAX(interbank_amount) AS max_amount,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) AS avg_processing_seconds
FROM iso20022.payment_transactions
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at), routing_channel, interbank_currency, status;

CREATE UNIQUE INDEX idx_dashboard_daily ON iso20022.dashboard_daily_stats (tx_date, routing_channel, interbank_currency, status);

-- Rafraîchir toutes les 5 minutes via pg_cron
-- SELECT cron.schedule('refresh_dashboard', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY iso20022.dashboard_daily_stats');
```

## 3.12 Machine à États des Messages ISO 20022

### Diagramme de Transition d'État

```
                    ┌──────────┐
                    │  RCVD    │ ◄── Message reçu
                    │ (Received)│
                    └────┬─────┘
                         │ Validation technique
                    ┌────▼─────┐
               ┌────┤  ACTC    │ ◄── Validation technique OK
               │    │(AccTech) │
               │    └────┬─────┘
               │         │ Validation profil client
               │    ┌────▼─────┐
               │    │  ACCP    │ ◄── Profil client vérifié
               │    │(AccCust) │
               │    └────┬─────┘
               │         │ AML + Sanctions check
               │    ┌────▼─────┐
               │    │  ACSP    │ ◄── Settlement en cours
               │    │(AccSett) │
               │    └────┬─────┘
               │         │
               │    ┌────▼─────┐          ┌──────────┐
               │    │  ACSC    │          │  ACWC    │
               │    │(AccComp) │          │(AccChg)  │
               │    │ TERMINÉ  │          │ Avec modif│
               │    └──────────┘          └──────────┘
               │
               │ (À tout moment si échec)
               │    ┌──────────┐
               └───►│  RJCT    │ ◄── Rejeté (avec reason code)
                    │(Rejected)│
                    └────┬─────┘
                         │ Si retour nécessaire
                    ┌────▼─────┐
                    │  CANC    │ ◄── Annulé / Retourné
                    │(Cancelled)│
                    └──────────┘

    Statut spécial:
    ┌──────────┐
    │  PDNG    │ ◄── En attente (intervention manuelle, timeout 24h)
    │(Pending) │
    └──────────┘
```

### Règles de Transition

| De | Vers | Condition | Action |
|----|------|-----------|--------|
| RCVD | ACTC | Validation XSD OK, champs obligatoires présents | Log, continuer |
| RCVD | RJCT | Erreur de format, champ manquant | Générer pacs.002 RJCT |
| ACTC | ACCP | KYC vérifié, limites respectées | Continuer |
| ACTC | RJCT | KYC insuffisant, dépassement limites | Générer pacs.002 RJCT |
| ACCP | ACSP | AML OK, sanctions OK, solde suffisant | Initier settlement |
| ACCP | RJCT | AML alerte, sanction match, solde insuffisant | Bloquer, alerter compliance |
| ACSP | ACSC | Settlement confirmé (GIMACPAY/Stellar/SWIFT) | Notifier, mettre à jour soldes |
| ACSP | RJCT | Settlement échoué, timeout | Reverser, notifier |
| ACSP | ACWC | Settlement avec modification (montant, date) | Notifier du changement |
| ANY | PDNG | Intervention manuelle requise | Créer case compliance |
| PDNG | ACSP | Compliance approuve | Reprendre processing |
| PDNG | RJCT | Compliance rejette, timeout 24h | Rejeter, notifier |
| ACSC | CANC | Demande de retour (pacs.004) | Initier retour via pacs.004 |

---

# 4. PORTAIL BANCAIRE DÉDIÉ

> **INSTRUCTION AU DÉVELOPPEUR** : Implémenter un portail web React/Next.js complet pour les opérations bancaires. Le portail doit être accessible via `https://bank.pimpay.cg` avec authentification forte (2FA obligatoire).

## 4.1 Dashboard Temps Réel

### Architecture Frontend

```
src/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── 2fa/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Dashboard layout avec sidebar
│   │   ├── page.tsx              # Vue d'ensemble (home dashboard)
│   │   ├── transactions/
│   │   │   ├── page.tsx          # Liste transactions
│   │   │   ├── [id]/page.tsx     # Détail transaction
│   │   │   └── new/page.tsx      # Nouvelle transaction
│   │   ├── accounts/
│   │   │   ├── page.tsx          # Liste comptes
│   │   │   └── [id]/page.tsx     # Détail compte
│   │   ├── monitoring/
│   │   │   └── page.tsx          # Monitoring temps réel
│   │   ├── correspondents/
│   │   │   └── page.tsx          # Banques correspondantes
│   │   ├── fx/
│   │   │   └── page.tsx          # Taux de change et conversions
│   │   ├── treasury/
│   │   │   └── page.tsx          # Gestion trésorerie
│   │   ├── compliance/
│   │   │   ├── page.tsx          # Vue compliance
│   │   │   ├── alerts/page.tsx   # Alertes AML
│   │   │   └── reports/page.tsx  # Rapports réglementaires
│   │   ├── reports/
│   │   │   └── page.tsx          # Rapports COBAC/BEAC
│   │   └── settings/
│   │       ├── users/page.tsx    # Gestion utilisateurs
│   │       └── roles/page.tsx    # Gestion rôles
│   └── api/                      # API Routes Next.js (BFF)
├── components/
│   ├── dashboard/
│   │   ├── KPICard.tsx           # Widget KPI individuel
│   │   ├── TransactionVolumeChart.tsx
│   │   ├── CurrencyDistributionPie.tsx
│   │   ├── StatusBreakdownBar.tsx
│   │   ├── GeographicHeatmap.tsx
│   │   ├── RecentTransactionsTable.tsx
│   │   ├── AlertsPanel.tsx
│   │   └── LiveActivityFeed.tsx
│   ├── transactions/
│   │   ├── TransactionForm.tsx
│   │   ├── TransactionTable.tsx
│   │   ├── TransactionDetail.tsx
│   │   ├── BulkUploadModal.tsx
│   │   └── TransactionTimeline.tsx
│   ├── common/
│   │   ├── DataTable.tsx         # Table générique avec tri/filtre/pagination
│   │   ├── AmountDisplay.tsx     # Affichage montant avec devise
│   │   ├── StatusBadge.tsx       # Badge statut coloré
│   │   └── CurrencySelector.tsx
│   └── charts/
│       ├── AreaChart.tsx
│       ├── BarChart.tsx
│       ├── PieChart.tsx
│       └── LineChart.tsx
├── hooks/
│   ├── useWebSocket.ts           # Hook WebSocket générique
│   ├── useRealtimeStats.ts       # Stats temps réel
│   ├── useTransactions.ts        # CRUD transactions
│   └── usePermissions.ts         # Vérification permissions RBAC
├── lib/
│   ├── api-client.ts             # Client API avec interceptors
│   ├── websocket-client.ts       # Client WebSocket
│   ├── formatters.ts             # Formatage montants, dates, IBAN
│   └── validators.ts             # Validation côté client
└── types/
    ├── transaction.ts
    ├── account.ts
    ├── user.ts
    └── iso20022.ts
```

### KPI Widgets du Dashboard

| Widget | Données | Refresh | Source |
|--------|---------|---------|--------|
| Volume Transactions (Jour) | Nombre total | WebSocket temps réel | Kafka consumer |
| Montant Total (Jour) | Somme XAF | WebSocket temps réel | Redis counter |
| Taux de Succès | % ACSC / Total | 30 secondes | Vue matérialisée |
| Temps Moyen Traitement | Secondes | 1 minute | Vue matérialisée |
| Transactions en Attente | Count PDNG | WebSocket temps réel | Redis counter |
| Alertes Compliance | Count alertes ouvertes | WebSocket | Kafka topic |
| Solde Trésorerie | Somme soldes nostro | 5 minutes | PostgreSQL |
| Volume Mobile Money | Transactions MoMo/jour | 1 minute | Redis counter |

### WebSocket Events (Dashboard)

```typescript
// Types d'événements WebSocket
interface WSEvent {
  type: 'TRANSACTION_CREATED' | 'TRANSACTION_STATUS_CHANGED' |
        'BALANCE_UPDATED' | 'ALERT_CREATED' | 'FX_RATE_UPDATED' |
        'KPI_UPDATED' | 'SYSTEM_ALERT';
  timestamp: string;
  payload: Record<string, unknown>;
}

// Exemple: Notification de nouvelle transaction
{
  "type": "TRANSACTION_CREATED",
  "timestamp": "2025-04-08T10:30:00.123Z",
  "payload": {
    "transaction_id": "TXN-20250408-001",
    "type": "pacs.008",
    "amount": 5000000,
    "currency": "XAF",
    "debtor": "Jean-Baptiste Makosso",
    "creditor": "Marie-Claire Obami",
    "status": "ACTC",
    "channel": "GIMACPAY"
  }
}

// Exemple: Mise à jour KPI
{
  "type": "KPI_UPDATED",
  "timestamp": "2025-04-08T10:31:00.000Z",
  "payload": {
    "daily_volume": 1247,
    "daily_amount_xaf": 3450000000,
    "success_rate": 98.7,
    "avg_processing_ms": 2340,
    "pending_count": 12,
    "alerts_count": 3
  }
}
```

### Configuration WebSocket Server (Socket.io)

```typescript
// server/websocket.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const io = new Server(httpServer, {
  cors: { origin: 'https://bank.pimpay.cg', credentials: true },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Redis adapter pour scalabilité horizontale (multi-instance)
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));

// Middleware d'authentification
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const user = await verifyJWT(token);
    socket.data.user = user;
    socket.join(`role:${user.role}`);
    socket.join(`user:${user.id}`);
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

// Rooms par rôle pour filtrage des événements
// ADMIN: tous les événements
// TREASURER: transactions, balances, FX
// COMPLIANCE: alertes, sanctions
// OPERATOR: transactions
// VIEWER: lecture seule, KPIs uniquement

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.data.user.email} [role: ${socket.data.user.role}]`);

  socket.on('subscribe:account', (accountId: string) => {
    if (hasPermission(socket.data.user, 'accounts:read', accountId)) {
      socket.join(`account:${accountId}`);
    }
  });

  socket.on('subscribe:transactions', () => {
    if (hasPermission(socket.data.user, 'transactions:read')) {
      socket.join('transactions:live');
    }
  });
});

// Kafka Consumer → WebSocket broadcast
kafkaConsumer.on('payment.status_changed', (event) => {
  io.to('transactions:live').emit('TRANSACTION_STATUS_CHANGED', event);
  io.to(`account:${event.debtor_account}`).emit('BALANCE_UPDATED', event);
});
```

## 4.2 Gestion des Transactions

### Workflow Maker-Checker (4-Eyes Principle)

```
Maker (Opérateur)          Checker (Validateur)         Système
      │                           │                        │
      │ Créer transaction         │                        │
      │ (statut: DRAFT)           │                        │
      ├──────────────────────────►│                        │
      │                           │                        │
      │ Soumettre pour validation │                        │
      │ (statut: PENDING_APPROVAL)│                        │
      ├──────────────────────────►│                        │
      │                           │                        │
      │                           │ Examiner transaction   │
      │                           │ Vérifier montant,      │
      │                           │ bénéficiaire, motif    │
      │                           │                        │
      │                           │ [APPROUVER]            │
      │                           ├───────────────────────►│
      │                           │                        │ Exécuter pacs.008
      │                           │                        │ (statut: PROCESSING)
      │                           │                        │
      │                           │ [REJETER]              │
      │                           ├───────────────────────►│
      │                           │                        │ (statut: REJECTED)
      │                           │                        │ Notifier maker
      │                           │                        │

Règles Maker-Checker:
- Montant < 1 000 000 XAF : auto-approval (Tier 1)
- 1M - 10M XAF : 1 checker requis (Tier 2)
- 10M - 50M XAF : 2 checkers requis (Tier 3)
- > 50M XAF : 2 checkers + Compliance Officer (Tier 4)
- Le maker ne peut PAS être checker de sa propre transaction
```

### Seuils d'Approbation

| Tier | Montant (XAF) | Montant (EUR) | Approbations requises |
|------|---------------|---------------|----------------------|
| 1 | 0 — 1 000 000 | 0 — 1 524 | Auto-approval |
| 2 | 1M — 10 000 000 | 1 524 — 15 245 | 1 Checker |
| 3 | 10M — 50 000 000 | 15 245 — 76 224 | 2 Checkers |
| 4 | > 50 000 000 | > 76 224 | 2 Checkers + Compliance |

### Bulk Transaction Processing

```
POST /api/v1/payments/bulk
Content-Type: multipart/form-data

FormData:
  file: salaires_mars_2025.csv  (ou .xml pain.001)
  debit_account: CG3900010001000555666777
  execution_date: 2025-04-09
  batch_name: "Salaires Mars 2025"

Formats acceptés:
- CSV: end_to_end_id, creditor_name, creditor_iban, amount, currency, remittance_info
- XML: pain.001 natif (batch de paiements)

Response 202:
{
  "batch_id": "BATCH-20250408-001",
  "total_transactions": 150,
  "total_amount": { "value": 225000000, "currency": "XAF" },
  "status": "VALIDATING",
  "validation_report_url": "/api/v1/payments/bulk/BATCH-20250408-001/report"
}
```

## 4.3 Monitoring Temps Réel

### Architecture de Monitoring

```
Microservices ──► Kafka Topics ──► Stream Processor ──► WebSocket Server ──► Dashboard
                                       │
                                       ▼
                                  Redis (counters,
                                  time-series)
                                       │
                                       ▼
                                  Prometheus
                                  (métriques)
                                       │
                                       ▼
                                  Grafana
                                  (visualisation ops)
```

### Métriques Temps Réel à Afficher

| Métrique | Type | Seuil alerte |
|----------|------|--------------|
| TPS (Transactions Per Second) | Gauge | > 500 TPS = warning, > 900 TPS = critical |
| Latence P95 | Histogram | > 3s = warning, > 10s = critical |
| Taux d'erreur | Counter | > 2% = warning, > 5% = critical |
| Queue depth (Kafka lag) | Gauge | > 10000 = warning, > 50000 = critical |
| Solde nostro minimum | Gauge | < 100M XAF = warning |
| Connexions WebSocket | Gauge | > 5000 = info |
| CPU/Memory par service | Gauge | CPU > 80% ou Mem > 85% = warning |

## 4.4 Gestion des Correspondants Bancaires

### Modèle de Données

```typescript
interface CorrespondentBank {
  id: string;
  bic: string;                    // SWIFT BIC (8 ou 11 chars)
  name: string;
  country: string;                // ISO 3166-1 alpha-2
  city: string;
  relationship_type: 'NOSTRO' | 'VOSTRO' | 'CORRESPONDENT' | 'AGENT';
  is_active: boolean;
  // Comptes
  nostro_account?: string;        // Notre compte chez eux
  vostro_account?: string;        // Leur compte chez nous
  // Capabilities
  supported_currencies: string[];
  supported_message_types: string[];
  settlement_method: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  clearing_system?: string;       // GIMACPAY, TARGET2, FEDWIRE
  // Tarification
  fee_schedule: {
    corridor: string;             // CG->CM, CG->GA, etc.
    fixed_fee_xaf: number;
    percentage_fee: number;
    min_fee_xaf: number;
    max_fee_xaf: number;
    fx_spread: number;
  }[];
  // SLA
  sla_processing_time_hours: number;
  cut_off_time: string;           // "16:00" local time
  // GIMACPAY
  gimacpay_member_id?: string;
  gimacpay_participant_type?: 'DIRECT' | 'INDIRECT';
}
```

### Correspondants CEMAC Principaux

| BIC | Nom | Pays | Type |
|-----|-----|------|------|
| BEABORBB | Bank of Africa | CG | NOSTRO |
| COBRCGCG | Crédit du Congo | CG | CORRESPONDENT |
| UNAFCMCX | UBA Cameroun | CM | CORRESPONDENT |
| SGABGABL | Société Générale Gabon | GA | CORRESPONDENT |
| BICCGNCX | BICIG Guinée Éq. | GQ | CORRESPONDENT |
| EABORWRW | Ecobank Rwanda | RW | AGENT |
| BEABORBB | BEAC | CEMAC | CENTRAL BANK |

## 4.5 Gestion Multi-Devises

### Devises Supportées

| Code ISO | Devise | Type | Taux vs XAF | Source |
|----------|--------|------|-------------|--------|
| XAF | Franc CFA CEMAC | Fiat (local) | 1.000000 | — |
| EUR | Euro | Fiat | 655.957 (fixe) | BEAC |
| USD | Dollar US | Fiat | Variable | BEAC daily |
| GBP | Livre Sterling | Fiat | Variable | BEAC daily |
| XOF | Franc CFA UEMOA | Fiat | 1.000000 (parité) | BEAC |
| XLM | Stellar Lumens | Crypto | Variable | Stellar DEX |
| Pi | Pi Network | Crypto | Variable | Pi Network |

### Moteur de Conversion Automatique

```typescript
// services/fx-service/src/conversion-engine.ts

interface ConversionRequest {
  source_currency: string;
  target_currency: string;
  amount: number;
  direction: 'BUY' | 'SELL';      // Du point de vue de PIMPAY
}

interface ConversionResult {
  source_amount: number;
  target_amount: number;
  rate_applied: number;
  spread_applied: number;
  fee_xaf: number;
  rate_source: string;
  rate_timestamp: string;
  quote_id: string;
  quote_expiry: string;            // Validité 30 secondes
}

// Logique de conversion
function convert(req: ConversionRequest): ConversionResult {
  // 1. Si XAF ↔ EUR : taux fixe 655.957 (AUCUN spread)
  if (isFixedPair(req.source_currency, req.target_currency)) {
    return applyFixedRate(req);
  }

  // 2. Si XAF ↔ XOF : parité 1:1 (AUCUN spread)
  if (isParityPair(req.source_currency, req.target_currency)) {
    return applyParityRate(req);
  }

  // 3. Autres devises fiat : taux BEAC + spread configurable
  if (isFiat(req.source_currency) && isFiat(req.target_currency)) {
    const midRate = getFXRate(req.source_currency, req.target_currency);
    const spread = getSpreadConfig(req.source_currency, req.target_currency);
    const adjustedRate = req.direction === 'BUY'
      ? midRate * (1 + spread) : midRate * (1 - spread);
    return calculateConversion(req, adjustedRate, spread);
  }

  // 4. Crypto : taux Stellar DEX ou Pi Network + spread
  if (isCrypto(req.source_currency) || isCrypto(req.target_currency)) {
    const dexRate = getStellarDEXRate(req.source_currency, req.target_currency);
    const cryptoSpread = 0.015; // 1.5% spread crypto
    return calculateConversion(req, dexRate, cryptoSpread);
  }
}
```

## 4.6 Gestion de la Liquidité et Trésorerie

### Dashboard Trésorerie

```
┌─────────────────────────────────────────────────────────────┐
│                 TRÉSORERIE — VUE D'ENSEMBLE                 │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  XAF         │  EUR         │  USD         │  XLM           │
│  12.5 Mrd    │  2.1M        │  1.8M        │  500K          │
│  ▲ +3.2%     │  ▼ -0.5%     │  ▲ +1.1%     │  ▲ +12%        │
├──────────────┴──────────────┴──────────────┴────────────────┤
│                                                             │
│  Nostro Accounts:                                           │
│  ├── BEAC (XAF): 8,500,000,000    [Min: 5,000,000,000]    │
│  ├── BNP Paribas (EUR): 1,200,000 [Min: 500,000]          │
│  ├── Citibank (USD): 950,000      [Min: 300,000]          │
│  └── Stellar Hot Wallet: 500,000 XLM                       │
│                                                             │
│  Réserves Obligatoires BEAC:                                │
│  ├── Taux: 7% des dépôts à vue                             │
│  ├── Montant requis: 875,000,000 XAF                       │
│  ├── Montant actuel: 1,200,000,000 XAF                     │
│  └── Excédent: 325,000,000 XAF ✓                          │
│                                                             │
│  Prévision Cash Flow (7 jours):                             │
│  ├── Entrées prévues: +2,500,000,000 XAF                   │
│  ├── Sorties prévues: -1,800,000,000 XAF                   │
│  └── Position nette: +700,000,000 XAF                      │
└─────────────────────────────────────────────────────────────┘
```

### Sweep Account Automation

```typescript
// Règles de sweep automatique
const sweepRules = [
  {
    name: 'XAF_EXCESS_TO_BEAC',
    source_account: 'PIMPAY_MAIN_XAF',
    target_account: 'BEAC_RESERVE',
    trigger: 'BALANCE_EXCEEDS',
    threshold: 15_000_000_000,     // 15 milliards XAF
    sweep_amount: 'EXCESS',        // Transférer l'excédent
    schedule: 'DAILY_EOD',         // Fin de journée
    generate_pacs009: true,        // Générer message interbancaire
  },
  {
    name: 'EUR_LOW_BALANCE_TOPUP',
    source_account: 'PIMPAY_MAIN_XAF',
    target_account: 'BNP_NOSTRO_EUR',
    trigger: 'BALANCE_BELOW',
    threshold: 500_000,            // 500K EUR
    sweep_amount: 1_000_000,       // Reconstituer à 1M EUR
    schedule: 'ON_TRIGGER',
    generate_pacs009: true,
    requires_approval: true,       // Validation trésorier
  }
];
```

## 4.7 Rapports Réglementaires COBAC/BEAC

### Rapports Obligatoires

| Rapport | Destinataire | Fréquence | Format | Délai |
|---------|-------------|-----------|--------|-------|
| Situation comptable | COBAC | Mensuel | XML COBAC | J+15 |
| Balance des paiements | BEAC | Trimestriel | Excel BEAC | T+30j |
| Déclaration statistique | BEAC | Mensuel | XML | J+10 |
| Rapport AML/CTF | ANIF (Congo) | Trimestriel | PDF + XML | T+15j |
| Ratio de liquidité | COBAC | Mensuel | XML COBAC | J+15 |
| Grands risques | COBAC | Trimestriel | XML | T+20j |
| Rapport d'activité | COBAC | Annuel | PDF | A+90j |
| Déclaration de soupçon (STR) | ANIF | Immédiat | PDF + XML | Immédiat |

### Génération Automatique

```
Endpoint: POST /api/v1/reports/generate
{
  "report_type": "COBAC_MONTHLY_SITUATION",
  "period": "2025-03",
  "format": "XML",
  "auto_submit": false
}

Response:
{
  "report_id": "RPT-COBAC-202503-001",
  "status": "GENERATED",
  "download_url": "/api/v1/reports/RPT-COBAC-202503-001/download",
  "preview_url": "/api/v1/reports/RPT-COBAC-202503-001/preview",
  "validation_errors": [],
  "submission_deadline": "2025-04-15"
}
```

## 4.8 Gestion des Utilisateurs Bancaires (RBAC, 2FA)

### Rôles et Permissions

```typescript
const ROLES = {
  SUPER_ADMIN: {
    description: 'Accès total au système',
    permissions: ['*'],
  },
  ADMIN: {
    description: 'Administration des utilisateurs et configuration',
    permissions: [
      'users:*', 'roles:*', 'settings:*',
      'transactions:read', 'accounts:read',
      'reports:*', 'audit:read',
    ],
  },
  COMPLIANCE_OFFICER: {
    description: 'Gestion de la conformité AML/KYC',
    permissions: [
      'compliance:*', 'kyc:*', 'sanctions:*',
      'alerts:*', 'str:*', 'pep:*',
      'transactions:read', 'accounts:read',
      'audit:read', 'reports:compliance:*',
    ],
  },
  TREASURER: {
    description: 'Gestion de la trésorerie et liquidité',
    permissions: [
      'treasury:*', 'fx:*', 'nostro:*',
      'transactions:read', 'transactions:approve:tier3',
      'accounts:read', 'balances:*',
      'reports:treasury:*', 'sweep:*',
    ],
  },
  OPERATOR: {
    description: 'Opérations de paiement quotidiennes',
    permissions: [
      'transactions:create', 'transactions:read',
      'transactions:approve:tier2',
      'accounts:read', 'bulk:create',
      'mobile_money:*',
    ],
  },
  AUDITOR: {
    description: 'Consultation des logs et audit',
    permissions: [
      'audit:read', 'transactions:read',
      'accounts:read', 'reports:read',
      'compliance:read', 'logs:read',
    ],
  },
  VIEWER: {
    description: 'Lecture seule',
    permissions: [
      'transactions:read', 'accounts:read',
      'reports:read', 'dashboard:read',
    ],
  },
};
```

### Authentification 2FA

```
POST /api/v1/auth/login
{ "email": "operator@pimpay.cg", "password": "..." }

Response 200:
{ "requires_2fa": true, "session_token": "temp_xxx", "methods": ["totp", "sms"] }

POST /api/v1/auth/verify-2fa
{ "session_token": "temp_xxx", "method": "totp", "code": "123456" }

Response 200:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 3600,
  "user": { "id": "...", "role": "OPERATOR", "permissions": [...] }
}

Politique de sécurité:
- TOTP obligatoire pour TOUS les rôles
- SMS 2FA en backup uniquement
- Session timeout: 30 minutes d'inactivité
- IP whitelisting obligatoire pour ADMIN et SUPER_ADMIN
- Max 5 tentatives avant blocage (lockout 15 minutes)
- Rotation mot de passe: 90 jours
- Complexité: min 12 chars, majuscule, minuscule, chiffre, symbole
```

---

# 5. BRIDGE BLOCKCHAIN + ISO 20022

> **INSTRUCTION AU DÉVELOPPEUR** : Implémenter un bridge bidirectionnel complet entre les messages ISO 20022 et les transactions blockchain (Stellar Network + Pi Network). Chaque transaction ISO 20022 doit pouvoir être exécutée via la blockchain, et chaque transaction blockchain doit générer les messages ISO 20022 correspondants.

## 5.1 Mapping Bidirectionnel ISO 20022 ↔ Stellar

### Table de Mapping — pacs.008 → Stellar Transaction

| Champ ISO 20022 (pacs.008) | Champ Stellar | Transformation |
|----------------------------|---------------|----------------|
| GrpHdr/MsgId | Transaction Memo (TEXT) | Tronquer à 28 chars, préfixer "P8:" |
| CdtTrfTxInf/PmtId/UETR | Transaction Memo (HASH) | SHA256 du UETR → memo hash |
| CdtTrfTxInf/IntrBkSttlmAmt | Operation amount | Conversion: montant / 10^7 (Stellar precision) |
| CdtTrfTxInf/IntrBkSttlmAmt/@Ccy | Asset code | XAF → PIMPAY_XAF, EUR → PIMPAY_EUR |
| Dbtr/DbtrAcct | Source account | Mapping IBAN → Stellar public key via DB |
| Cdtr/CdtrAcct | Destination account | Mapping IBAN → Stellar public key via DB |
| ChrgBr | Fee source | DEBT → source pays, CRED → dest pays, SHAR → split |
| PmtTpInf/InstrPrty | Transaction priority | HIGH → fee bump, NORM → base fee |
| RmtInf | Manage Data operation | Stocker ref en ManageData sur compte source |

### Code TypeScript — ISO 20022 → Stellar Transaction Builder

```typescript
// services/stellar-bridge-svc/src/iso-to-stellar.ts
import {
  Keypair, Server, TransactionBuilder, Networks,
  Operation, Asset, Memo, BASE_FEE
} from '@stellar/stellar-sdk';

interface ISO20022Payment {
  msg_id: string;
  uetr: string;
  debtor_iban: string;
  creditor_iban: string;
  amount: number;
  currency: string;
  charge_bearer: string;
  priority: string;
  remittance_info: string;
}

async function buildStellarFromISO(payment: ISO20022Payment): Promise<string> {
  const server = new Server('https://horizon.stellar.org');

  // 1. Résoudre les comptes Stellar à partir des IBAN
  const sourceKeypair = await resolveIBANToStellarKeypair(payment.debtor_iban);
  const destPublicKey = await resolveIBANToStellarPublicKey(payment.creditor_iban);
  const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

  // 2. Déterminer l'asset Stellar
  const asset = resolveCurrencyToAsset(payment.currency);
  // XAF → Asset('PIMPAY_XAF', 'GBPIMPAY_ISSUER_PUBLIC_KEY...')
  // EUR → Asset('PIMPAY_EUR', 'GBPIMPAY_ISSUER_PUBLIC_KEY...')

  // 3. Calculer les frais
  const baseFee = payment.priority === 'HIGH' ? String(Number(BASE_FEE) * 10) : BASE_FEE;

  // 4. Créer le memo avec référence ISO
  const memoText = `P8:${payment.uetr.substring(0, 25)}`;

  // 5. Builder la transaction
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: baseFee,
    networkPassphrase: Networks.PUBLIC,
  })
    .addOperation(Operation.payment({
      destination: destPublicKey,
      asset: asset,
      amount: payment.amount.toFixed(7),
    }))
    // Stocker la référence complète en ManageData
    .addOperation(Operation.manageData({
      name: 'iso20022_ref',
      value: Buffer.from(JSON.stringify({
        uetr: payment.uetr,
        msg_id: payment.msg_id,
        type: 'pacs.008',
      })),
    }))
    .addMemo(Memo.text(memoText))
    .setTimeout(30)
    .build();

  // 6. Signer avec la clé du compte source (HSM en production)
  transaction.sign(sourceKeypair);

  // 7. Soumettre à Stellar
  const result = await server.submitTransaction(transaction);

  // 8. Stocker le mapping en base
  await storeStellarISOMapping({
    stellar_tx_hash: result.hash,
    stellar_ledger: result.ledger,
    iso_uetr: payment.uetr,
    iso_msg_id: payment.msg_id,
    iso_message_type: 'pacs.008',
  });

  return result.hash;
}

// Fonction inverse: Stellar → ISO 20022
async function buildISOFromStellar(stellarTxHash: string): Promise<string> {
  const server = new Server('https://horizon.stellar.org');
  const tx = await server.transactions().transaction(stellarTxHash).call();
  const operations = await tx.operations();

  const paymentOp = operations.records.find(op => op.type === 'payment');
  const manageDataOp = operations.records.find(op =>
    op.type === 'manage_data' && op.name === 'iso20022_ref'
  );

  // Reconstruire le message pacs.008 depuis les données Stellar
  const isoMessage = {
    GrpHdr: {
      MsgId: generateMsgId(),
      CreDtTm: new Date().toISOString(),
      NbOfTxs: '1',
      SttlmInf: { SttlmMtd: 'CLRG' },
    },
    CdtTrfTxInf: {
      PmtId: {
        TxId: stellarTxHash.substring(0, 35),
        UETR: manageDataOp ? JSON.parse(
          Buffer.from(manageDataOp.value, 'base64').toString()
        ).uetr : generateUUID(),
      },
      IntrBkSttlmAmt: {
        Ccy: resolveAssetToCurrency(paymentOp.asset_code),
        value: paymentOp.amount,
      },
      Dbtr: await resolvePublicKeyToParty(paymentOp.source_account),
      Cdtr: await resolvePublicKeyToParty(paymentOp.to),
    },
  };

  return buildXMLFromObject('pacs.008.001.10', isoMessage);
}
```

## 5.2 Stellar Anchors — On-Ramp/Off-Ramp XAF

### Architecture Anchor Server

```
Client App           Anchor Server         Stellar Network       Banque/MoMo
    │                     │                      │                    │
    │  SEP-24: Deposit    │                      │                    │
    │  (XAF → PIMPAY_XAF)│                      │                    │
    ├────────────────────►│                      │                    │
    │                     │                      │                    │
    │  Redirect to KYC    │                      │                    │
    │  (SEP-9 check)      │                      │                    │
    │◄────────────────────┤                      │                    │
    │                     │                      │                    │
    │  KYC completed ✓    │                      │                    │
    ├────────────────────►│                      │                    │
    │                     │                      │                    │
    │  Instructions dépôt │                      │                    │
    │  (Mobile Money ou   │                      │                    │
    │   virement bancaire)│                      │                    │
    │◄────────────────────┤                      │                    │
    │                     │                      │                    │
    │  Paiement MoMo      │                      │                    │
    ├─────────────────────┼──────────────────────┼───────────────────►│
    │                     │  Callback: paiement reçu                  │
    │                     │◄─────────────────────┼────────────────────┤
    │                     │                      │                    │
    │                     │  Mint PIMPAY_XAF     │                    │
    │                     │  (issuer → user)     │                    │
    │                     ├─────────────────────►│                    │
    │                     │  Tx confirmed ✓      │                    │
    │                     │◄─────────────────────┤                    │
    │                     │                      │                    │
    │  Notification:      │                      │                    │
    │  Dépôt confirmé     │                      │                    │
    │◄────────────────────┤                      │                    │

Off-Ramp (PIMPAY_XAF → XAF cash):
1. Client envoie PIMPAY_XAF au compte Anchor
2. Anchor vérifie réception sur Stellar (< 5 sec)
3. Anchor burn les tokens PIMPAY_XAF
4. Anchor initie paiement Mobile Money ou virement
5. Génération pacs.008 pour traçabilité ISO 20022
```

### Asset Issuance — Token PIMPAY_XAF sur Stellar

```typescript
// Configuration des assets Stellar PIMPAY
const PIMPAY_ASSETS = {
  XAF: {
    code: 'PIMPAY_XAF',
    issuer: 'GBPIMPAY_ISSUER_...', // Compte issuer (cold storage, multi-sig)
    decimals: 2,                    // 2 décimales pour XAF
    home_domain: 'pimpay.cg',
    anchor_asset_type: 'fiat',
    anchor_asset: 'XAF',
    is_regulated: true,
    approval_server: 'https://anchor.pimpay.cg/sep8/approve',
    conditions: 'Backed 1:1 by XAF deposits. Regulated by COBAC.',
  },
  EUR: {
    code: 'PIMPAY_EUR',
    issuer: 'GBPIMPAY_ISSUER_...',
    decimals: 2,
    anchor_asset: 'EUR',
  },
};

// Stellar TOML (hosted at https://pimpay.cg/.well-known/stellar.toml)
const STELLAR_TOML = `
[DOCUMENTATION]
ORG_NAME = "PIMPAY SA"
ORG_URL = "https://pimpay.cg"
ORG_DESCRIPTION = "Néobanque Web3 - Zone CEMAC"
ORG_OFFICIAL_EMAIL = "contact@pimpay.cg"

[PRINCIPALS]
name = "Aimard Swana"
title = "CEO"

[[CURRENCIES]]
code = "PIMPAY_XAF"
issuer = "GBPIMPAY_ISSUER_..."
display_decimals = 0
name = "PIMPAY Franc CFA CEMAC"
desc = "Tokenized XAF backed 1:1"
anchor_asset_type = "fiat"
anchor_asset = "XAF"
is_regulated = true

TRANSFER_SERVER_SEP0024 = "https://anchor.pimpay.cg/sep24"
KYC_SERVER = "https://anchor.pimpay.cg/sep9"
DIRECT_PAYMENT_SERVER = "https://anchor.pimpay.cg/sep31"
`;
```

## 5.3 Soroban Smart Contracts

### Contract 1: Escrow Payment (Rust)

```rust
// contracts/escrow/src/lib.rs
#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Symbol, Vec,
};

#[contracttype]
#[derive(Clone)]
pub struct EscrowAgreement {
    pub escrow_id: Symbol,
    pub payer: Address,
    pub payee: Address,
    pub amount: i128,
    pub token: Address,          // PIMPAY_XAF token contract
    pub iso_uetr: Symbol,       // Référence ISO 20022
    pub status: u32,            // 0=CREATED, 1=FUNDED, 2=RELEASED, 3=REFUNDED, 4=DISPUTED
    pub expiry_ledger: u32,
    pub arbiter: Address,        // PIMPAY compliance officer
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Créer un escrow lié à une transaction ISO 20022
    pub fn create_escrow(
        env: Env,
        payer: Address,
        payee: Address,
        amount: i128,
        token: Address,
        iso_uetr: Symbol,
        expiry_ledgers: u32,
        arbiter: Address,
    ) -> Symbol {
        payer.require_auth();

        let escrow_id = Symbol::new(&env, "ESC");
        let current_ledger = env.ledger().sequence();

        let agreement = EscrowAgreement {
            escrow_id: escrow_id.clone(),
            payer: payer.clone(),
            payee,
            amount,
            token: token.clone(),
            iso_uetr,
            status: 0, // CREATED
            expiry_ledger: current_ledger + expiry_ledgers,
            arbiter,
        };

        // Transférer les fonds du payer vers le contrat
        let client = token::Client::new(&env, &token);
        client.transfer(&payer, &env.current_contract_address(), &amount);

        // Stocker l'escrow
        env.storage().persistent().set(&escrow_id, &agreement);

        // Émettre événement
        env.events().publish(
            (Symbol::new(&env, "escrow_created"),),
            agreement.clone(),
        );

        escrow_id
    }

    /// Libérer les fonds vers le payee (appelé par le payer ou l'arbiter)
    pub fn release(env: Env, escrow_id: Symbol, caller: Address) {
        caller.require_auth();
        let mut agreement: EscrowAgreement =
            env.storage().persistent().get(&escrow_id).unwrap();

        assert!(agreement.status == 1, "Escrow not funded");
        assert!(
            caller == agreement.payer || caller == agreement.arbiter,
            "Unauthorized"
        );

        // Transférer au payee
        let client = token::Client::new(&env, &agreement.token);
        client.transfer(
            &env.current_contract_address(),
            &agreement.payee,
            &agreement.amount,
        );

        agreement.status = 2; // RELEASED
        env.storage().persistent().set(&escrow_id, &agreement);

        env.events().publish(
            (Symbol::new(&env, "escrow_released"),),
            agreement,
        );
    }

    /// Rembourser le payer si expiry atteint ou dispute
    pub fn refund(env: Env, escrow_id: Symbol, caller: Address) {
        caller.require_auth();
        let mut agreement: EscrowAgreement =
            env.storage().persistent().get(&escrow_id).unwrap();

        let is_expired = env.ledger().sequence() > agreement.expiry_ledger;
        assert!(
            is_expired || caller == agreement.arbiter,
            "Not expired and not arbiter"
        );

        let client = token::Client::new(&env, &agreement.token);
        client.transfer(
            &env.current_contract_address(),
            &agreement.payer,
            &agreement.amount,
        );

        agreement.status = 3; // REFUNDED
        env.storage().persistent().set(&escrow_id, &agreement);
    }
}
```

### Contract 2: BNPL Installment (Rust)

```rust
// contracts/bnpl/src/lib.rs
#[contracttype]
#[derive(Clone)]
pub struct BNPLPlan {
    pub plan_id: Symbol,
    pub borrower: Address,
    pub merchant: Address,
    pub total_amount: i128,         // Montant total en PIMPAY_XAF
    pub installment_amount: i128,   // Montant par échéance
    pub num_installments: u32,      // 3, 6, ou 12
    pub installments_paid: u32,
    pub interest_rate_bps: u32,     // Taux en basis points (ex: 500 = 5%)
    pub token: Address,
    pub next_due_ledger: u32,
    pub status: u32,                // 0=ACTIVE, 1=COMPLETED, 2=DEFAULTED
}

#[contractimpl]
impl BNPLContract {
    /// Créer un plan BNPL — le merchant reçoit le montant total immédiatement
    pub fn create_plan(
        env: Env,
        borrower: Address,
        merchant: Address,
        amount: i128,
        num_installments: u32,
        interest_rate_bps: u32,
        token: Address,
    ) -> Symbol {
        borrower.require_auth();
        assert!(num_installments == 3 || num_installments == 6 || num_installments == 12);

        // Calculer montant total avec intérêts
        let total_with_interest = amount + (amount * interest_rate_bps as i128) / 10000;
        let installment_amount = total_with_interest / num_installments as i128;

        // Payer le premier versement immédiatement
        let client = token::Client::new(&env, &token);
        client.transfer(&borrower, &env.current_contract_address(), &installment_amount);

        // Le merchant reçoit le montant total du contract pool
        // (PIMPAY avance les fonds)
        client.transfer(&env.current_contract_address(), &merchant, &amount);

        let plan = BNPLPlan {
            plan_id: Symbol::new(&env, "BNPL"),
            borrower, merchant, total_amount: total_with_interest,
            installment_amount, num_installments, installments_paid: 1,
            interest_rate_bps, token,
            next_due_ledger: env.ledger().sequence() + 864000, // ~30 jours
            status: 0,
        };

        env.storage().persistent().set(&plan.plan_id, &plan);
        plan.plan_id
    }

    /// Payer une échéance
    pub fn pay_installment(env: Env, plan_id: Symbol) {
        let mut plan: BNPLPlan = env.storage().persistent().get(&plan_id).unwrap();
        plan.borrower.require_auth();
        assert!(plan.status == 0, "Plan not active");

        let client = token::Client::new(&env, &plan.token);
        client.transfer(&plan.borrower, &env.current_contract_address(), &plan.installment_amount);

        plan.installments_paid += 1;
        plan.next_due_ledger = env.ledger().sequence() + 864000;

        if plan.installments_paid >= plan.num_installments {
            plan.status = 1; // COMPLETED
        }

        env.storage().persistent().set(&plan_id, &plan);
    }
}
```

## 5.4 SEP-31 — Cross-Border B2B Payments

### Flux de Paiement Direct

```
Sender Bank (Congo)      PIMPAY Anchor          Stellar Network      Receiver Anchor (Cameroun)
      │                       │                       │                       │
      │ POST /sep31/transactions                      │                       │
      │ {                     │                       │                       │
      │   sender_id, receiver_id,                     │                       │
      │   amount: 50M XAF,   │                       │                       │
      │   asset: PIMPAY_XAF  │                       │                       │
      │ }                     │                       │                       │
      ├──────────────────────►│                       │                       │
      │                       │                       │                       │
      │                       │ Compliance check      │                       │
      │                       │ (KYC sender/receiver) │                       │
      │                       │ (AML screening)       │                       │
      │                       │ (Sanctions check)     │                       │
      │                       │                       │                       │
      │                       │ Stellar path payment  │                       │
      │                       ├──────────────────────►│                       │
      │                       │ Tx confirmed (5 sec)  │                       │
      │                       │◄──────────────────────┤                       │
      │                       │                       │                       │
      │                       │ Notify receiver anchor│                       │
      │                       ├───────────────────────┼──────────────────────►│
      │                       │                       │                       │
      │                       │                       │  Off-ramp: pay receiver│
      │                       │                       │  via local bank/MoMo   │
      │                       │                       │                       │
      │ 201: { id, status:    │                       │                       │
      │   "pending_stellar" } │                       │                       │
      │◄──────────────────────┤                       │                       │
      │                       │                       │                       │
      │ Callback: completed   │                       │                       │
      │◄──────────────────────┤                       │                       │
      │                       │                       │                       │
      │ Générer pacs.008 pour │                       │                       │
      │ traçabilité ISO 20022 │                       │                       │
```

## 5.5 SEP-9 — KYC Compliance

### Mapping SEP-9 → Exigences CEMAC KYC

| Champ SEP-9 | Exigence CEMAC | Tier KYC | Obligatoire |
|-------------|----------------|----------|-------------|
| first_name | Prénom | Tier 1 | Oui |
| last_name | Nom | Tier 1 | Oui |
| mobile_number | Numéro mobile | Tier 1 | Oui |
| email_address | Email | Tier 1 | Non |
| id_type | Type de pièce d'identité | Tier 2 | Oui |
| id_number | Numéro pièce | Tier 2 | Oui |
| id_country_code | Pays émetteur | Tier 2 | Oui |
| photo_id_front | Recto pièce | Tier 2 | Oui |
| photo_id_back | Verso pièce | Tier 2 | Oui |
| address_street | Adresse rue | Tier 2 | Oui |
| address_city | Ville | Tier 2 | Oui |
| address_country_code | Pays | Tier 2 | Oui |
| date_of_birth | Date de naissance | Tier 2 | Oui |
| photo_proof_residence | Justificatif domicile | Tier 3 | Oui |
| source_of_funds | Source des fonds | Tier 3 | Oui |
| occupation | Profession | Tier 3 | Oui |
| employer_name | Employeur | Tier 3 | Non |
| annual_income | Revenu annuel | Tier 3 | Oui |

## 5.6 Bridge Pi Network ↔ ISO 20022 (PiPay/PiBridge)

### Architecture PiBridge

```typescript
// services/pi-bridge-svc/src/pi-payment-handler.ts

import PiNetwork from 'pi-network-sdk';

interface PiPaymentRequest {
  pi_username: string;
  amount_pi: number;
  memo: string;            // Référence ISO 20022
  target_currency: string; // XAF, EUR, USD
}

class PiBridge {
  private pi: PiNetwork;
  private stellarBridge: StellarBridgeService;

  async processPayment(req: PiPaymentRequest): Promise<PaymentResult> {
    // 1. Vérifier le wallet Pi du user
    const piUser = await this.pi.authenticate();

    // 2. Créer le paiement Pi
    const piPayment = await this.pi.createPayment({
      amount: req.amount_pi,
      memo: req.memo,
      metadata: {
        iso_ref: req.memo,
        target_currency: req.target_currency,
      },
    });

    // 3. Attendre l'approbation du user (popup Pi Browser)
    const approvedPayment = await this.pi.waitForApproval(piPayment.identifier);

    // 4. Compléter le paiement côté serveur
    const completedPayment = await this.pi.completePayment(
      approvedPayment.identifier
    );

    // 5. Convertir Pi → XAF via Stellar DEX
    // Pi → XLM → PIMPAY_XAF (path payment)
    const stellarTx = await this.stellarBridge.pathPayment({
      source_asset: { code: 'PI', issuer: PI_ISSUER },
      dest_asset: { code: 'PIMPAY_XAF', issuer: PIMPAY_ISSUER },
      amount: req.amount_pi,
    });

    // 6. Générer le message ISO 20022 (pacs.008)
    const isoMessage = generatePacs008FromPiPayment({
      pi_tx_id: completedPayment.identifier,
      stellar_tx_hash: stellarTx.hash,
      amount_xaf: stellarTx.destination_amount,
      user: piUser,
    });

    // 7. Publier sur Kafka
    await kafka.publish('payment.completed', {
      source: 'PI_NETWORK',
      pi_tx_id: completedPayment.identifier,
      stellar_tx_hash: stellarTx.hash,
      iso_message: isoMessage,
    });

    return {
      pi_tx_id: completedPayment.identifier,
      stellar_tx_hash: stellarTx.hash,
      amount_pi: req.amount_pi,
      amount_xaf: stellarTx.destination_amount,
      iso_uetr: isoMessage.uetr,
      status: 'COMPLETED',
    };
  }
}
```

## 5.7 Tokenisation des Paiements et Actifs

### Tokens PIMPAY sur Stellar

| Token | Code | Issuer | Backing | Réglementation |
|-------|------|--------|---------|----------------|
| Franc CFA tokenisé | PIMPAY_XAF | GBPIMPAY_ISSUER | 1:1 XAF en banque | BEAC/COBAC |
| Euro tokenisé | PIMPAY_EUR | GBPIMPAY_ISSUER | 1:1 EUR en banque | BCE |
| Dollar tokenisé | PIMPAY_USD | GBPIMPAY_ISSUER | 1:1 USD en banque | Fed |
| Token de paiement | PIMPAY_PAY | GBPIMPAY_ISSUER | Loyalty/rewards | Interne |

## 5.8 Settlement en 5 Secondes via Stellar

### Comparaison des Temps de Settlement

| Canal | Temps Settlement | Coût | Disponibilité |
|-------|-----------------|------|---------------|
| Stellar Network | ~5 secondes | ~0.00001 XLM | 24/7/365 |
| GIMACPAY | 2-4 heures | Variable | Heures ouvrables |
| SWIFT (ancien) | 1-5 jours | 25-50 USD | Heures ouvrables |
| Mobile Money (local) | ~30 secondes | 1-3% | 24/7 |
| Pi Network | ~10 secondes | Gratuit | 24/7 |

### Logique de Routage Automatique

```typescript
function determineSettlementChannel(payment: Payment): SettlementChannel {
  // 1. Même banque PIMPAY → Settlement interne instantané
  if (payment.debtor_bic === 'PIMPAYXXX' && payment.creditor_bic === 'PIMPAYXXX') {
    return 'INTERNAL'; // < 1 seconde
  }

  // 2. Mobile Money local → API Mobile Money directe
  if (payment.creditor_account_type === 'MOBILE_MONEY' && payment.is_domestic) {
    return 'MOBILE_MONEY'; // ~30 secondes
  }

  // 3. Zone CEMAC, institution GIMACPAY → GIMACPAY
  if (isCEMACCountry(payment.creditor_country) && isGIMACPAYMember(payment.creditor_bic)) {
    return 'GIMACPAY'; // 2-4 heures
  }

  // 4. Bénéficiaire a un wallet Stellar → Stellar direct
  if (payment.creditor_stellar_account) {
    return 'STELLAR'; // ~5 secondes
  }

  // 5. International hors CEMAC → Stellar (si Anchor disponible) sinon SWIFT
  if (hasStellarAnchor(payment.creditor_country)) {
    return 'STELLAR_ANCHOR'; // ~5 sec + off-ramp delay
  }

  // 6. Fallback → SWIFT traditionnel
  return 'SWIFT'; // 1-5 jours
}
```

---

# 6. INTEROPÉRABILITÉ MOBILE MONEY + ISO 20022

> **INSTRUCTION AU DÉVELOPPEUR** : Implémenter les bridges complets entre les 3 opérateurs Mobile Money du Congo (MTN MoMo, Airtel Money, Orange Money) et le système ISO 20022. Chaque transaction Mobile Money doit générer les messages ISO 20022 correspondants et être traçable de bout en bout.

## 6.1 Bridge MTN MoMo API ↔ ISO 20022

### Configuration MTN MoMo API v2

```typescript
// services/mobile-money-svc/src/providers/mtn-momo.ts

const MTN_CONFIG = {
  sandbox: {
    base_url: 'https://sandbox.momodeveloper.mtn.com',
    callback_url: 'https://api.pimpay.cg/webhooks/mtn',
  },
  production: {
    base_url: 'https://proxy.momoapi.mtn.com',
    callback_url: 'https://api.pimpay.cg/webhooks/mtn',
  },
  // API Products
  products: {
    collection: {
      primary_key: process.env.MTN_COLLECTION_PRIMARY_KEY,
      secondary_key: process.env.MTN_COLLECTION_SECONDARY_KEY,
      api_user: process.env.MTN_COLLECTION_API_USER,
      api_key: process.env.MTN_COLLECTION_API_KEY,
    },
    disbursement: {
      primary_key: process.env.MTN_DISBURSEMENT_PRIMARY_KEY,
      secondary_key: process.env.MTN_DISBURSEMENT_SECONDARY_KEY,
      api_user: process.env.MTN_DISBURSEMENT_API_USER,
      api_key: process.env.MTN_DISBURSEMENT_API_KEY,
    },
    remittance: {
      primary_key: process.env.MTN_REMITTANCE_PRIMARY_KEY,
      secondary_key: process.env.MTN_REMITTANCE_SECONDARY_KEY,
      api_user: process.env.MTN_REMITTANCE_API_USER,
      api_key: process.env.MTN_REMITTANCE_API_KEY,
    },
  },
};
```

### Authentification MTN MoMo

```typescript
class MTNMoMoAuth {
  private tokenCache: Map<string, { token: string; expiry: Date }> = new Map();

  // Étape 1: Créer API User (sandbox uniquement)
  async createApiUser(referenceId: string): Promise<void> {
    await axios.post(
      `${MTN_CONFIG.sandbox.base_url}/v1_0/apiuser`,
      { providerCallbackHost: 'api.pimpay.cg' },
      {
        headers: {
          'X-Reference-Id': referenceId,
          'Ocp-Apim-Subscription-Key': MTN_CONFIG.products.collection.primary_key,
        },
      }
    );
  }

  // Étape 2: Obtenir API Key
  async getApiKey(apiUserId: string): Promise<string> {
    const res = await axios.post(
      `${MTN_CONFIG.sandbox.base_url}/v1_0/apiuser/${apiUserId}/apikey`,
      {},
      {
        headers: {
          'Ocp-Apim-Subscription-Key': MTN_CONFIG.products.collection.primary_key,
        },
      }
    );
    return res.data.apiKey;
  }

  // Étape 3: Obtenir OAuth Token
  async getToken(product: 'collection' | 'disbursement' | 'remittance'): Promise<string> {
    const cached = this.tokenCache.get(product);
    if (cached && cached.expiry > new Date()) return cached.token;

    const config = MTN_CONFIG.products[product];
    const credentials = Buffer.from(`${config.api_user}:${config.api_key}`).toString('base64');

    const res = await axios.post(
      `${MTN_CONFIG.production.base_url}/${product}/token/`,
      {},
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Ocp-Apim-Subscription-Key': config.primary_key,
        },
      }
    );

    this.tokenCache.set(product, {
      token: res.data.access_token,
      expiry: new Date(Date.now() + res.data.expires_in * 1000),
    });

    return res.data.access_token;
  }
}
```

### Collection (Cash-In) : Client → PIMPAY

```typescript
// Demander un paiement au client via MTN MoMo
async function requestPayment(params: {
  phone: string;          // Format: 242066123456
  amount: number;         // En XAF
  reference: string;      // Référence PIMPAY
  reason: string;
}): Promise<{ referenceId: string; status: string }> {

  const token = await auth.getToken('collection');
  const referenceId = uuidv4(); // X-Reference-Id unique

  // POST /collection/v1_0/requesttopay
  await axios.post(
    `${MTN_CONFIG.production.base_url}/collection/v1_0/requesttopay`,
    {
      amount: params.amount.toString(),
      currency: 'XAF',
      externalId: params.reference,
      payer: {
        partyIdType: 'MSISDN',
        partyId: params.phone,
      },
      payerMessage: params.reason,
      payeeNote: `PIMPAY Deposit ${params.reference}`,
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': 'mtnivorycoast', // ou mtncongo
        'Ocp-Apim-Subscription-Key': MTN_CONFIG.products.collection.primary_key,
        'X-Callback-Url': MTN_CONFIG.production.callback_url,
        'Content-Type': 'application/json',
      },
    }
  );

  // Retourne 202 Accepted — le résultat arrive via callback
  return { referenceId, status: 'PENDING' };
}

// Callback handler
app.post('/webhooks/mtn', async (req, res) => {
  const { referenceId, status, financialTransactionId } = req.body;

  if (status === 'SUCCESSFUL') {
    // 1. Mettre à jour le statut en base
    await updateMobileMoneyTx(referenceId, 'COMPLETED', financialTransactionId);

    // 2. Créditer le compte PIMPAY du client
    await creditAccount(referenceId);

    // 3. Générer le message ISO 20022 camt.054 (notification crédit)
    await generateCamt054Notification(referenceId, 'CRDT');

    // 4. Si c'est un on-ramp Stellar, mint les tokens
    await mintStellarTokensIfNeeded(referenceId);

    // 5. Kafka event
    await kafka.publish('mobile_money.collection.completed', { referenceId });
  } else if (status === 'FAILED') {
    await updateMobileMoneyTx(referenceId, 'FAILED');
    await generatePacs002Rejection(referenceId, 'AM04');
  }

  res.status(200).end();
});
```

### Disbursement (Cash-Out) : PIMPAY → Client

```typescript
// Envoyer de l'argent au client via MTN MoMo
async function disburseFunds(params: {
  phone: string;
  amount: number;
  reference: string;
  reason: string;
}): Promise<{ referenceId: string }> {

  const token = await auth.getToken('disbursement');
  const referenceId = uuidv4();

  // POST /disbursement/v1_0/transfer
  await axios.post(
    `${MTN_CONFIG.production.base_url}/disbursement/v1_0/transfer`,
    {
      amount: params.amount.toString(),
      currency: 'XAF',
      externalId: params.reference,
      payee: {
        partyIdType: 'MSISDN',
        partyId: params.phone,
      },
      payerMessage: params.reason,
      payeeNote: `PIMPAY Withdrawal ${params.reference}`,
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': 'mtncongo',
        'Ocp-Apim-Subscription-Key': MTN_CONFIG.products.disbursement.primary_key,
        'Content-Type': 'application/json',
      },
    }
  );

  return { referenceId };
}
```

### Mapping Erreurs MTN → ISO 20022

| Code Erreur MTN | Description MTN | Code ISO 20022 | Description ISO |
|-----------------|-----------------|-----------------|-----------------|
| PAYER_NOT_FOUND | Numéro non enregistré | AC01 | IncorrectAccountNumber |
| NOT_ENOUGH_FUNDS | Solde insuffisant | AM04 | InsufficientFunds |
| PAYEE_NOT_ALLOWED | Opération non autorisée | AG01 | TransactionForbidden |
| NOT_ALLOWED | Service indisponible | AG02 | InvalidBankOperationCode |
| INTERNAL_PROCESSING_ERROR | Erreur interne MTN | MS02 | NotSpecified |
| TRANSACTION_CANCELED | Annulé par le client | DS02 | OrderCancelled |
| EXPIRED | Timeout de paiement | TM01 | CutOffTime |
| RESOURCE_NOT_FOUND | Référence introuvable | FF01 | InvalidFileFormat |

## 6.2 Bridge Airtel Money API ↔ ISO 20022

### Configuration Airtel Money

```typescript
const AIRTEL_CONFIG = {
  base_url: 'https://openapi.airtel.africa',
  auth_url: 'https://openapi.airtel.africa/auth/oauth2/token',
  client_id: process.env.AIRTEL_CLIENT_ID,
  client_secret: process.env.AIRTEL_CLIENT_SECRET,
  country: 'CG',
  currency: 'XAF',
};

// Authentification Airtel (OAuth 2.0 Client Credentials)
async function getAirtelToken(): Promise<string> {
  const res = await axios.post(AIRTEL_CONFIG.auth_url, {
    client_id: AIRTEL_CONFIG.client_id,
    client_secret: AIRTEL_CONFIG.client_secret,
    grant_type: 'client_credentials',
  });
  return res.data.access_token;
}

// Collection Airtel Money
async function airtelCollect(params: {
  phone: string;
  amount: number;
  reference: string;
}): Promise<AirtelResponse> {
  const token = await getAirtelToken();

  return axios.post(
    `${AIRTEL_CONFIG.base_url}/merchant/v2/payments/`,
    {
      reference: params.reference,
      subscriber: {
        country: 'CG',
        currency: 'XAF',
        msisdn: params.phone,
      },
      transaction: {
        amount: params.amount,
        country: 'CG',
        currency: 'XAF',
        id: params.reference,
      },
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Country': 'CG',
        'X-Currency': 'XAF',
        'Content-Type': 'application/json',
      },
    }
  );
}

// Disbursement Airtel Money
async function airtelDisburse(params: {
  phone: string;
  amount: number;
  reference: string;
}): Promise<AirtelResponse> {
  const token = await getAirtelToken();

  return axios.post(
    `${AIRTEL_CONFIG.base_url}/standard/v2/disbursements/`,
    {
      payee: {
        msisdn: params.phone,
        wallet_type: 'NORMAL',
      },
      reference: params.reference,
      pin: process.env.AIRTEL_DISBURSEMENT_PIN, // PIN de sécurité
      transaction: {
        amount: params.amount,
        id: params.reference,
        type: 'B2C',
      },
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Country': 'CG',
        'X-Currency': 'XAF',
      },
    }
  );
}
```

## 6.3 Bridge Orange Money API ↔ ISO 20022

### Configuration Orange Money

```typescript
const ORANGE_CONFIG = {
  base_url: 'https://api.orange.com/orange-money-webpay/cg/v1',
  auth_url: 'https://api.orange.com/oauth/v3/token',
  client_id: process.env.ORANGE_CLIENT_ID,
  client_secret: process.env.ORANGE_CLIENT_SECRET,
  merchant_key: process.env.ORANGE_MERCHANT_KEY,
};

// Payment initiation Orange Money
async function orangeMoneyPay(params: {
  phone: string;
  amount: number;
  reference: string;
  order_id: string;
}): Promise<OrangePaymentResponse> {
  const token = await getOrangeToken();

  // Étape 1: Initier le paiement (web payment)
  const res = await axios.post(
    `${ORANGE_CONFIG.base_url}/webpayment`,
    {
      merchant_key: ORANGE_CONFIG.merchant_key,
      currency: 'OUV',   // Orange Unit Value = XAF en production
      order_id: params.order_id,
      amount: params.amount,
      return_url: 'https://app.pimpay.cg/payment/callback',
      cancel_url: 'https://app.pimpay.cg/payment/cancel',
      notif_url: 'https://api.pimpay.cg/webhooks/orange',
      lang: 'fr',
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    payment_url: res.data.payment_url,  // Redirect user ici
    pay_token: res.data.pay_token,
    notif_token: res.data.notif_token,
  };
}
```

## 6.4 Cash-In / Cash-Out via Réseau d'Agents

### Modèle de Données Agent

```sql
CREATE TABLE agents.agents (
    agent_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_code      VARCHAR(10) NOT NULL UNIQUE,       -- Code unique (ex: AG-BZV-001)
    agent_name      VARCHAR(140) NOT NULL,
    agent_type      VARCHAR(20) NOT NULL,               -- INDIVIDUAL, SHOP, BANK_BRANCH
    status          VARCHAR(10) DEFAULT 'ACTIVE',
    -- Localisation
    city            VARCHAR(50) NOT NULL,
    district        VARCHAR(50),
    gps_latitude    DECIMAL(10,8),
    gps_longitude   DECIMAL(11,8),
    address         TEXT,
    -- Contact
    phone           VARCHAR(15) NOT NULL,
    email           VARCHAR(100),
    -- Financier
    float_balance   NUMERIC(18,2) NOT NULL DEFAULT 0,
    float_limit     NUMERIC(18,2) NOT NULL DEFAULT 5000000,  -- 5M XAF
    commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0100,     -- 1%
    -- KYC
    kyc_verified    BOOLEAN DEFAULT FALSE,
    national_id     VARCHAR(35),
    rccm            VARCHAR(35),          -- Registre commerce (si entreprise)
    -- Opérationnel
    daily_tx_count  INTEGER DEFAULT 0,
    daily_tx_limit  INTEGER DEFAULT 200,
    daily_amount    NUMERIC(18,2) DEFAULT 0,
    daily_amount_limit NUMERIC(18,2) DEFAULT 50000000,  -- 50M XAF
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Table des transactions agents
CREATE TABLE agents.agent_transactions (
    tx_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents.agents(agent_id),
    tx_type         VARCHAR(10) NOT NULL,     -- CASH_IN, CASH_OUT
    customer_phone  VARCHAR(15) NOT NULL,
    amount          NUMERIC(18,2) NOT NULL,
    commission      NUMERIC(18,2) NOT NULL,
    net_amount      NUMERIC(18,2) NOT NULL,
    status          VARCHAR(10) DEFAULT 'PENDING',
    payment_ref     UUID,                      -- Référence transaction principale
    iso_msg_id      VARCHAR(35),               -- Référence ISO 20022
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Calcul des Commissions Agent

| Opération | Montant | Commission Agent | Commission PIMPAY |
|-----------|---------|-----------------|-------------------|
| Cash-In | 0 - 50 000 XAF | 1.0% | 0.5% |
| Cash-In | 50K - 500K XAF | 0.8% | 0.4% |
| Cash-In | 500K - 5M XAF | 0.5% | 0.3% |
| Cash-Out | 0 - 50 000 XAF | 1.5% | 0.5% |
| Cash-Out | 50K - 500K XAF | 1.2% | 0.4% |
| Cash-Out | 500K - 5M XAF | 0.8% | 0.3% |

## 6.5 QR Code Payments (EMVCo Standard)

### Structure QR Code EMVCo (Merchant-Presented Mode)

```
Format: EMVCo QR Code Specification for Payment Systems (MPM)

Payload Structure:
ID | Nom                          | Valeur
00 | Payload Format Indicator     | 01
01 | Point of Initiation Method   | 12 (Dynamic)
26 | Merchant Account Info        |
   | 00 | Globally Unique ID       | cg.pimpay.pay
   | 01 | Merchant Account         | PIMPAY-MERCH-001
   | 02 | Merchant Wallet          | +242066123456
52 | Merchant Category Code       | 5411 (Grocery)
53 | Transaction Currency         | 950 (XAF ISO 4217)
54 | Transaction Amount           | 25000
58 | Country Code                 | CG
59 | Merchant Name                | Boutique Makosso
60 | Merchant City                | Brazzaville
62 | Additional Data Field        |
   | 05 | Reference Label          | INV-2025-042
   | 07 | Terminal Label           | T001
63 | CRC                          | AD45

Exemple encodé:
00020101021226490016cg.pimpay.pay0115PIMPAY-MERCH-0010213+2420661234565204541153039505405250005802CG5915Boutique Makosso6012Brazzaville6228050BINV-2025-0420704T0016304AD45
```

### Flux de Paiement QR Code

```
Merchant App         Client App            PIMPAY API           Mobile Money
     │                    │                     │                    │
     │  Générer QR        │                     │                    │
     │  (Static/Dynamic)  │                     │                    │
     │ ◄─────────────────►│                     │                    │
     │                    │                     │                    │
     │     Scanner QR     │                     │                    │
     │ ──────────────────►│                     │                    │
     │                    │  Décoder payload    │                    │
     │                    │  EMVCo              │                    │
     │                    │                     │                    │
     │                    │  POST /qr/pay       │                    │
     │                    ├────────────────────►│                    │
     │                    │                     │ Valider merchant   │
     │                    │                     │ Vérifier solde     │
     │                    │                     │ AML check          │
     │                    │                     │                    │
     │                    │                     │ Exécuter paiement  │
     │                    │                     ├───────────────────►│
     │                    │                     │ Confirmation       │
     │                    │                     │◄───────────────────┤
     │                    │                     │                    │
     │                    │  200: { status:     │                    │
     │                    │   "COMPLETED" }     │                    │
     │                    │◄────────────────────┤                    │
     │                    │                     │                    │
     │  Push notification │                     │                    │
     │  "Paiement reçu"  │                     │                    │
     │◄───────────────────┼─────────────────────┤                    │
```

## 6.6 USSD Integration

### Arbre de Menu USSD

```
*123# (PIMPAY USSD Short Code)

1. Consulter solde
   → Afficher solde XAF + dernières 3 transactions

2. Envoyer argent
   → Entrer numéro bénéficiaire
   → Entrer montant
   → Confirmer (PIN)
   → Résultat: Succès/Échec + Réf transaction

3. Payer facture
   → 1. Eau (SNDE)
   → 2. Électricité (SNE)
   → 3. Téléphone (MTN/Airtel/Orange)
   → 4. Autre (entrer code marchand)
   → Entrer référence
   → Confirmer montant + PIN

4. Retirer (Cash-Out)
   → Entrer code agent
   → Entrer montant
   → Confirmer (PIN)
   → Code de retrait généré (6 chiffres, valide 24h)

5. Déposer (Cash-In)
   → Afficher numéro de dépôt
   → Instructions pour l'agent

6. Historique
   → 5 dernières transactions

7. Mini-relevé
   → Relevé du jour (camt.052 simplifié)

0. Quitter
```

### Implémentation USSD Gateway

```typescript
// services/mobile-money-svc/src/ussd/handler.ts

interface USSDRequest {
  sessionId: string;
  serviceCode: string;   // *123#
  phoneNumber: string;
  text: string;           // Input utilisateur (vide au début, puis "1", "1*2", etc.)
  networkCode: string;    // MTN, AIRTEL, ORANGE
}

interface USSDResponse {
  response: string;       // Texte à afficher
  type: 'CON' | 'END';   // CON = continuer, END = terminer session
}

async function handleUSSD(req: USSDRequest): Promise<USSDResponse> {
  const inputs = req.text.split('*').filter(Boolean);
  const level = inputs.length;

  // Menu principal
  if (level === 0) {
    return {
      type: 'CON',
      response: 'Bienvenue PIMPAY\n1. Solde\n2. Envoyer\n3. Payer facture\n4. Retirer\n5. Deposer\n6. Historique\n7. Mini-releve',
    };
  }

  const mainChoice = inputs[0];

  switch (mainChoice) {
    case '1': // Solde
      const balance = await getBalance(req.phoneNumber);
      return {
        type: 'END',
        response: `Votre solde PIMPAY:\n${formatXAF(balance.available)} XAF disponible\nDernier mouvement: ${balance.last_tx}`,
      };

    case '2': // Envoyer
      if (level === 1) return { type: 'CON', response: 'Numero du beneficiaire:' };
      if (level === 2) return { type: 'CON', response: 'Montant en FCFA:' };
      if (level === 3) return {
        type: 'CON',
        response: `Envoyer ${formatXAF(inputs[2])} XAF a ${inputs[1]}?\nEntrez votre PIN:`,
      };
      if (level === 4) {
        const result = await executeTransfer(req.phoneNumber, inputs[1], Number(inputs[2]), inputs[3]);
        if (result.success) {
          // Générer pacs.008 en background
          await generatePacs008FromMoMo(result.tx_id);
          return { type: 'END', response: `Envoi reussi!\nRef: ${result.tx_id}\nSolde: ${formatXAF(result.new_balance)} XAF` };
        }
        return { type: 'END', response: `Echec: ${result.error_message}` };
      }
      break;

    // ... autres cases similaires
  }
}
```

## 6.7 Wallet-to-Bank et Bank-to-Wallet

### Flux Wallet → Bank (Temps Réel)

```
Client PIMPAY       mobile-money-svc       payment-svc        Banque Partenaire
     │                    │                     │                    │
     │ POST /transfers    │                     │                    │
     │ { from: wallet,    │                     │                    │
     │   to: bank_account,│                     │                    │
     │   amount: 2M XAF } │                     │                    │
     ├───────────────────►│                     │                    │
     │                    │                     │                    │
     │                    │ Débiter wallet      │                    │
     │                    │ client              │                    │
     │                    │                     │                    │
     │                    │ Générer pain.001    │                    │
     │                    ├────────────────────►│                    │
     │                    │                     │                    │
     │                    │                     │ Transformer en     │
     │                    │                     │ pacs.008           │
     │                    │                     │                    │
     │                    │                     │ Router via         │
     │                    │                     │ GIMACPAY           │
     │                    │                     ├───────────────────►│
     │                    │                     │                    │
     │                    │                     │ pacs.002 (ACSC)    │
     │                    │                     │◄───────────────────┤
     │                    │                     │                    │
     │ Notification:      │                     │                    │
     │ "Virement effectué"│                     │                    │
     │◄───────────────────┤                     │                    │
```

## 6.8 Interopérabilité GIMACPAY

### Architecture d'Intégration GIMACPAY

```typescript
// services/mobile-money-svc/src/gimacpay/client.ts

interface GIMACPAYConfig {
  api_url: string;               // URL API GIMACPAY
  participant_id: string;        // ID participant PIMPAY
  certificate: string;           // Certificat mTLS
  private_key: string;           // Clé privée mTLS
  encryption_key: string;        // Clé de chiffrement messages
}

interface GIMACPAYTransferRequest {
  sender_institution: string;     // BIC PIMPAY
  receiver_institution: string;   // BIC banque destinataire
  sender_account: string;
  receiver_account: string;
  amount: number;
  currency: 'XAF';
  purpose_code: string;
  reference: string;
  sender_name: string;
  receiver_name: string;
}

class GIMACPAYClient {
  // Initier un transfert interbancaire via GIMACPAY
  async initiateTransfer(req: GIMACPAYTransferRequest): Promise<GIMACPAYResponse> {
    // 1. Construire le message ISO 20022 pacs.008 au format GIMACPAY
    const pacs008 = buildGIMACPAYPacs008(req);

    // 2. Chiffrer le message
    const encrypted = await encryptMessage(pacs008, this.config.encryption_key);

    // 3. Signer numériquement
    const signed = await signMessage(encrypted, this.config.private_key);

    // 4. Envoyer via mTLS
    const response = await axios.post(
      `${this.config.api_url}/v1/transfers`,
      signed,
      {
        httpsAgent: new https.Agent({
          cert: this.config.certificate,
          key: this.config.private_key,
          rejectUnauthorized: true,
        }),
        headers: {
          'X-Participant-Id': this.config.participant_id,
          'Content-Type': 'application/xml',
        },
      }
    );

    return response.data;
  }

  // Recevoir les notifications de settlement GIMACPAY
  async handleSettlementNotification(notification: GIMACPAYNotification): Promise<void> {
    // 1. Vérifier la signature
    await verifySignature(notification);

    // 2. Déchiffrer
    const pacs002 = await decryptMessage(notification.payload);

    // 3. Parser le pacs.002
    const statusReport = parseISO20022(pacs002);

    // 4. Mettre à jour le statut de la transaction
    await updateTransactionStatus(
      statusReport.originalTxId,
      statusReport.status,
      statusReport.reasonCode
    );

    // 5. Si ACSC → créditer le compte bénéficiaire
    if (statusReport.status === 'ACSC') {
      await creditBeneficiaryAccount(statusReport);
      await generateCamt054(statusReport); // Notification au client
    }
  }
}
```

### Institutions GIMACPAY Connectées (Extrait)

| # | Institution | BIC | Pays | Type |
|---|-------------|-----|------|------|
| 1 | BEAC | BEABORBB | CEMAC | Banque Centrale |
| 2 | Afriland First Bank | AFRIORBR | CG | Banque Commerciale |
| 3 | BGFI Bank Congo | BGFICGCG | CG | Banque Commerciale |
| 4 | Crédit du Congo | COBRCGCG | CG | Banque Commerciale |
| 5 | LCB Bank | LCBRCGCG | CG | Banque Commerciale |
| 6 | UBA Congo | UNAFCGCG | CG | Banque Commerciale |
| 7 | Ecobank Congo | EABOROBB | CG | Banque Commerciale |
| 8 | Société Générale Congo | SGABCGCG | CG | Banque Commerciale |
| 9 | MTN MoMo Congo | — | CG | EME |
| 10 | Airtel Money Congo | — | CG | EME |

---

# 7. CONFORMITÉ ET SÉCURITÉ

> **INSTRUCTION AU DÉVELOPPEUR** : La conformité est NON NÉGOCIABLE. Chaque transaction doit passer par le pipeline compliance AVANT exécution. Aucune exception. Les régulateurs COBAC et BEAC peuvent auditer à tout moment. Toute donnée doit être conservée minimum 10 ans.

## 7.1 KYC Automatisé Multi-Niveaux

### Tiers KYC et Limites

| Tier | Niveau | Données Requises | Limites Jour | Limites Mois | Vérification |
|------|--------|-----------------|--------------|--------------|--------------|
| 1 | Basic | Nom + Prénom + Téléphone | 50 000 XAF | 200 000 XAF | SMS OTP |
| 2 | Standard | + CNI/Passeport + Selfie + Adresse | 500 000 XAF | 5 000 000 XAF | OCR + Face Match |
| 3 | Enhanced | + Source fonds + Emploi + Justif domicile + PEP check | 50 000 000 XAF | 200 000 000 XAF | Manuel + EDD |
| Business | Entreprise | + RCCM + Statuts + Bilan + UBO | 500 000 000 XAF | 2 000 000 000 XAF | Manuel + EDD |

### Schéma PostgreSQL KYC

```sql
CREATE TABLE compliance.kyc_profiles (
    profile_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL UNIQUE,
    kyc_tier            SMALLINT NOT NULL DEFAULT 0,   -- 0=NONE, 1=BASIC, 2=STANDARD, 3=ENHANCED
    status              VARCHAR(15) NOT NULL DEFAULT 'PENDING',
    -- Tier 1
    first_name          VARCHAR(50),
    last_name           VARCHAR(50),
    phone               VARCHAR(15),
    phone_verified      BOOLEAN DEFAULT FALSE,
    -- Tier 2
    date_of_birth       DATE,
    nationality         VARCHAR(2),
    id_type             VARCHAR(20),        -- NATIONAL_ID, PASSPORT, DRIVER_LICENSE
    id_number           VARCHAR(35),
    id_expiry           DATE,
    id_country          VARCHAR(2),
    id_front_url        VARCHAR(500),       -- S3/MinIO URL (chiffré)
    id_back_url         VARCHAR(500),
    selfie_url          VARCHAR(500),
    face_match_score    DECIMAL(5,2),       -- 0-100, seuil: 85
    liveness_score      DECIMAL(5,2),       -- 0-100, seuil: 90
    address_street      VARCHAR(200),
    address_city        VARCHAR(50),
    address_country     VARCHAR(2),
    -- Tier 3
    occupation          VARCHAR(100),
    employer            VARCHAR(140),
    annual_income_xaf   NUMERIC(18,2),
    source_of_funds     VARCHAR(50),        -- SALARY, BUSINESS, INVESTMENT, INHERITANCE, OTHER
    source_of_funds_detail TEXT,
    proof_of_address_url VARCHAR(500),
    proof_of_income_url VARCHAR(500),
    -- PEP
    is_pep              BOOLEAN DEFAULT FALSE,
    pep_category        VARCHAR(20),
    pep_details         TEXT,
    -- Risque
    risk_score          SMALLINT DEFAULT 0, -- 0-100
    risk_category       VARCHAR(10),        -- LOW, MEDIUM, HIGH, CRITICAL
    -- Audit
    verified_by         VARCHAR(50),
    verified_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    next_review_date    DATE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE compliance.kyc_documents (
    doc_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id          UUID NOT NULL REFERENCES compliance.kyc_profiles(profile_id),
    doc_type            VARCHAR(30) NOT NULL,
    file_url            VARCHAR(500) NOT NULL,          -- Chiffré AES-256
    file_hash_sha256    VARCHAR(64) NOT NULL,
    ocr_extracted_data  JSONB,
    verification_status VARCHAR(15) DEFAULT 'PENDING',
    verified_by         VARCHAR(50),
    uploaded_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE compliance.kyc_verifications (
    verification_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id          UUID NOT NULL REFERENCES compliance.kyc_profiles(profile_id),
    verification_type   VARCHAR(30) NOT NULL,   -- PHONE_OTP, ID_OCR, FACE_MATCH, LIVENESS, MANUAL, PEP_CHECK, ADDRESS
    status              VARCHAR(10) NOT NULL,    -- PASS, FAIL, PENDING, REVIEW
    score               DECIMAL(5,2),
    details             JSONB,
    provider            VARCHAR(30),             -- INTERNAL, ONFIDO, JUMIO, SMILE_ID
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### Workflow KYC (Machine à États)

```
NONE ──► TIER1_PENDING ──► TIER1_VERIFIED ──► TIER2_PENDING ──► TIER2_VERIFIED ──► TIER3_PENDING ──► TIER3_VERIFIED
  │            │                                     │                                    │
  │            ▼                                     ▼                                    ▼
  │      TIER1_REJECTED                        TIER2_REJECTED                       TIER3_REJECTED
  │            │                                     │                                    │
  │            ▼                                     ▼                                    ▼
  └────── SUSPENDED (si fraude détectée) ◄───────────┴────────────────────────────────────┘
               │
               ▼
           BLACKLISTED (permanent)
```

### Pipeline de Vérification Document (OCR + Face Match)

```typescript
async function verifyIdentityDocument(profileId: string, docFrontUrl: string, docBackUrl: string, selfieUrl: string) {
  // 1. OCR — Extraire les données de la pièce d'identité
  const ocrResult = await ocrService.extractDocument({
    front_image: docFrontUrl,
    back_image: docBackUrl,
    document_type: 'NATIONAL_ID',
    country: 'CG',
  });
  // Résultat: { name, dob, id_number, expiry, nationality, mrz_valid }

  // 2. Vérifier la cohérence avec les données déclarées
  const profile = await getKYCProfile(profileId);
  const nameMatch = fuzzyNameMatch(
    `${profile.first_name} ${profile.last_name}`,
    ocrResult.name
  );
  if (nameMatch.score < 0.85) {
    return { status: 'FAIL', reason: 'NAME_MISMATCH', score: nameMatch.score };
  }

  // 3. Vérifier l'expiration du document
  if (new Date(ocrResult.expiry) < new Date()) {
    return { status: 'FAIL', reason: 'DOCUMENT_EXPIRED' };
  }

  // 4. Face Match — Comparer selfie vs photo du document
  const faceResult = await faceMatchService.compare({
    reference_image: docFrontUrl,  // Photo sur le document
    selfie_image: selfieUrl,
  });
  if (faceResult.match_score < 85) {
    return { status: 'FAIL', reason: 'FACE_MISMATCH', score: faceResult.match_score };
  }

  // 5. Liveness Detection — Vérifier que le selfie est d'une vraie personne
  const livenessResult = await livenessService.check({ image: selfieUrl });
  if (livenessResult.score < 90) {
    return { status: 'FAIL', reason: 'LIVENESS_FAILED', score: livenessResult.score };
  }

  // 6. Tout OK → mettre à jour le profil
  await updateKYCProfile(profileId, {
    face_match_score: faceResult.match_score,
    liveness_score: livenessResult.score,
    id_number: ocrResult.id_number,
    kyc_tier: 2,
    status: 'TIER2_VERIFIED',
  });

  return { status: 'PASS', tier: 2 };
}
```

## 7.2 AML Screening Temps Réel

### Règles AML Prédéfinies (20 règles minimum)

| # | Règle | Seuil | Score Impact | Action |
|---|-------|-------|--------------|--------|
| R01 | Montant unique élevé | > 5 000 000 XAF | +30 | Alerte |
| R02 | Volume quotidien élevé | > 10 transactions/jour | +20 | Alerte |
| R03 | Structuring (fractionnement) | >3 tx proches du seuil déclaratif | +50 | Alerte + Blocage |
| R04 | Destination pays à risque | Pays sanctionné | +80 | Blocage immédiat |
| R05 | Nouveau compte, montant élevé | Compte < 30j + tx > 1M XAF | +40 | Alerte |
| R06 | Round-tripping | Même montant A→B puis B→A < 24h | +60 | Alerte |
| R07 | Velocity check | > 3M XAF en < 1 heure | +35 | Alerte |
| R08 | Hors profil | Tx > 5x montant moyen habituel | +45 | Alerte |
| R09 | Horaire inhabituel | Transaction entre 01h-05h | +15 | Log |
| R10 | Multiple destinataires | > 5 destinataires différents/jour | +25 | Alerte |
| R11 | Cash-in suivi transfer immédiat | Cash-in puis transfert < 15 min | +40 | Alerte |
| R12 | PEP transaction | Tout montant impliquant un PEP | +30 | Alerte obligatoire |
| R13 | Dépassement cumul mensuel | > 80% de la limite mensuelle | +15 | Log |
| R14 | Multi-device | Connexion depuis > 3 devices/jour | +20 | Alerte |
| R15 | Changement KYC récent | Modif infos < 7j puis grosse tx | +25 | Alerte |
| R16 | Cross-border fréquent | > 5 tx internationales/semaine | +30 | Alerte |
| R17 | Agent Cash-Out suspect | Agent: > 20 cash-outs identiques | +50 | Blocage agent |
| R18 | Dormant account activity | Inactif > 6 mois puis tx soudaine | +35 | Alerte |
| R19 | Refus répétés | > 3 transactions refusées/jour | +20 | Alerte |
| R20 | Montant exact en devises | Montant rond en EUR/USD converti | +10 | Log |

### Moteur de Scoring

```typescript
interface AMLScreeningResult {
  transaction_id: string;
  total_score: number;           // 0-100
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  triggered_rules: TriggeredRule[];
  decision: 'APPROVE' | 'REVIEW' | 'BLOCK';
  requires_str: boolean;
}

// Seuils de décision
const THRESHOLDS = {
  AUTO_APPROVE: 25,    // Score < 25 → approuvé automatiquement
  MANUAL_REVIEW: 50,   // 25-50 → review par compliance officer
  AUTO_BLOCK: 75,      // > 75 → blocage automatique + STR
};

async function screenTransaction(tx: Transaction): Promise<AMLScreeningResult> {
  const rules = await loadActiveRules();
  const customerProfile = await getCustomerProfile(tx.debtor_id);
  const historicalData = await getTransactionHistory(tx.debtor_id, '90d');

  let totalScore = 0;
  const triggeredRules: TriggeredRule[] = [];

  for (const rule of rules) {
    const result = await evaluateRule(rule, tx, customerProfile, historicalData);
    if (result.triggered) {
      totalScore += result.score_impact;
      triggeredRules.push({
        rule_id: rule.id,
        rule_name: rule.name,
        score_impact: result.score_impact,
        details: result.details,
      });
    }
  }

  // ML model overlay (booste ou réduit le score)
  const mlScore = await mlFraudModel.predict(tx, customerProfile, historicalData);
  totalScore = Math.round(totalScore * 0.6 + mlScore * 0.4); // 60% rules, 40% ML

  const riskLevel = totalScore < 25 ? 'LOW' : totalScore < 50 ? 'MEDIUM' : totalScore < 75 ? 'HIGH' : 'CRITICAL';
  const decision = totalScore < THRESHOLDS.AUTO_APPROVE ? 'APPROVE'
    : totalScore < THRESHOLDS.AUTO_BLOCK ? 'REVIEW' : 'BLOCK';

  return {
    transaction_id: tx.id,
    total_score: Math.min(totalScore, 100),
    risk_level: riskLevel,
    triggered_rules: triggeredRules,
    decision,
    requires_str: totalScore >= THRESHOLDS.AUTO_BLOCK,
  };
}
```

## 7.3 Sanctions Screening

### Sources de Listes de Sanctions

| Source | URL | Fréquence MAJ | Format |
|--------|-----|---------------|--------|
| OFAC SDN | treasury.gov/sdn | Quotidien | XML, CSV |
| EU Consolidated | data.europa.eu | Quotidien | XML |
| UN Security Council | scsanctions.un.org | Hebdomadaire | XML |
| FATF High-Risk | fatf-gafi.org | Mensuel | PDF → parsé |
| BEAC/CEMAC Local | beac.int | Mensuel | PDF → parsé |
| ANIF Congo | anif.cg | Variable | PDF → parsé |

### Algorithme de Fuzzy Matching

```typescript
interface SanctionMatchResult {
  is_match: boolean;
  confidence: number;        // 0-100
  matched_entity?: SanctionEntity;
  match_details: {
    algorithm: string;
    score: number;
  }[];
}

function screenName(name: string, sanctionsList: SanctionEntity[]): SanctionMatchResult[] {
  const results: SanctionMatchResult[] = [];

  for (const entity of sanctionsList) {
    const scores = {
      levenshtein: levenshteinSimilarity(normalize(name), normalize(entity.name)),
      jaroWinkler: jaroWinklerSimilarity(normalize(name), normalize(entity.name)),
      soundex: soundexMatch(name, entity.name) ? 1.0 : 0.0,
      metaphone: doubleMetaphoneMatch(name, entity.name) ? 1.0 : 0.0,
      ngram: ngramSimilarity(name, entity.name, 3),
    };

    // Score composite pondéré
    const composite = (
      scores.jaroWinkler * 0.35 +
      scores.levenshtein * 0.25 +
      scores.ngram * 0.20 +
      scores.soundex * 0.10 +
      scores.metaphone * 0.10
    );

    // Vérifier aussi les alias
    let aliasMaxScore = 0;
    for (const alias of entity.aliases || []) {
      const aliasScore = jaroWinklerSimilarity(normalize(name), normalize(alias));
      aliasMaxScore = Math.max(aliasMaxScore, aliasScore);
    }

    const finalScore = Math.max(composite, aliasMaxScore) * 100;

    if (finalScore >= 80) {  // Seuil de match : 80%
      results.push({
        is_match: true,
        confidence: finalScore,
        matched_entity: entity,
        match_details: Object.entries(scores).map(([algo, score]) => ({
          algorithm: algo,
          score: score * 100,
        })),
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
```

## 7.4 Transaction Monitoring et Fraud Detection (ML)

### Architecture du Modèle ML

```
Données historiques                Feature Engineering              Modèle
┌──────────────┐                ┌──────────────────┐          ┌──────────────┐
│ Transactions │───────────────►│ Vélocité         │          │ Ensemble     │
│ Profils      │                │ Montants (avg,std)│─────────►│ Model:       │
│ Devices      │                │ Temps (heure,jour)│         │ - XGBoost    │
│ Géoloc       │                │ Réseau (graphe)  │         │ - Random     │
│ Historique   │                │ Device fingerprint│         │   Forest     │
│ Sanctions    │                │ Ratio in/out     │         │ - Neural Net │
└──────────────┘                │ Récurrence       │         └──────┬───────┘
                                │ Cross-border freq│                │
                                └──────────────────┘                │
                                                                    ▼
                                                            Score 0-100
                                                            + Explication
```

### Features Principales

| Feature | Type | Description |
|---------|------|-------------|
| tx_amount | Numeric | Montant de la transaction |
| tx_amount_zscore | Numeric | Z-score vs historique client |
| tx_hour | Categorical | Heure de la journée (0-23) |
| tx_day_of_week | Categorical | Jour de la semaine |
| velocity_1h | Numeric | Nombre de tx dans la dernière heure |
| velocity_24h | Numeric | Nombre de tx dans les dernières 24h |
| amount_24h | Numeric | Montant cumulé 24h |
| unique_recipients_7d | Numeric | Destinataires uniques sur 7 jours |
| is_new_recipient | Boolean | Premier envoi à ce destinataire |
| account_age_days | Numeric | Âge du compte en jours |
| kyc_tier | Categorical | Niveau KYC (1, 2, 3) |
| is_cross_border | Boolean | Transaction internationale |
| device_fingerprint_new | Boolean | Nouveau device |
| time_since_last_tx_min | Numeric | Minutes depuis dernière tx |
| channel | Categorical | MOBILE_MONEY, BANK, STELLAR, PI |

## 7.5 PEP Screening

### Catégories PEP (CEMAC)

| Catégorie | Exemples | Monitoring Renforcé |
|-----------|----------|---------------------|
| PEP National | Président, ministres, parlementaires, gouverneurs | Toute transaction > 1M XAF |
| PEP Régional | Commissaires CEMAC, dirigeants BEAC, COBAC | Toute transaction > 2M XAF |
| PEP International | Dirigeants organisations internationales | Toute transaction > 5M XAF |
| RCA (Related/Close Associates) | Famille proche, associés d'affaires | Toute transaction > 3M XAF |
| HIO (Head of International Org) | Directeurs ONU, UA, BAD | Toute transaction > 5M XAF |

## 7.6 STR Automatisé (Suspicious Transaction Report)

### Déclencheurs STR Automatiques

```typescript
const STR_AUTO_TRIGGERS = [
  { condition: 'aml_score >= 75', action: 'AUTO_STR' },
  { condition: 'sanctions_match === true', action: 'IMMEDIATE_STR' },
  { condition: 'structuring_detected === true', action: 'AUTO_STR' },
  { condition: 'pep_tx_amount > 10000000', action: 'REVIEW_FOR_STR' },
  { condition: 'fraud_model_score > 90', action: 'AUTO_STR' },
];

// Format STR pour ANIF (Agence Nationale d'Investigation Financière) Congo
interface STRReport {
  report_id: string;
  report_date: string;
  reporting_entity: {
    name: 'PIMPAY SA';
    registration: string;
    address: string;
    compliance_officer: string;
    phone: string;
  };
  suspect: {
    name: string;
    dob: string;
    nationality: string;
    id_number: string;
    address: string;
    phone: string;
    account_number: string;
    customer_since: string;
    kyc_tier: number;
    occupation: string;
  };
  suspicious_activity: {
    transaction_ids: string[];
    date_range: { from: string; to: string };
    total_amount_xaf: number;
    description: string;            // Texte libre détaillant le soupçon
    indicators: string[];           // Liste des indicateurs de soupçon
    triggered_rules: string[];
    aml_score: number;
  };
  supporting_documents: string[];   // URLs des documents joints
  recommendation: string;
}
```

## 7.7 Audit Trail Complet et Immuable

### Architecture Audit Log

```sql
-- Table d'audit immuable (INSERT ONLY — jamais de UPDATE/DELETE)
CREATE TABLE audit.audit_log (
    log_id              BIGSERIAL PRIMARY KEY,
    event_timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type          VARCHAR(50) NOT NULL,
    entity_type         VARCHAR(30) NOT NULL,    -- TRANSACTION, ACCOUNT, USER, KYC, CONFIG
    entity_id           VARCHAR(100) NOT NULL,
    action              VARCHAR(20) NOT NULL,     -- CREATE, UPDATE, DELETE, READ, LOGIN, LOGOUT, APPROVE, REJECT
    actor_id            VARCHAR(100),             -- User ID ou 'SYSTEM'
    actor_type          VARCHAR(20),              -- USER, SYSTEM, API_CLIENT, WEBHOOK
    actor_ip            INET,
    actor_user_agent    TEXT,
    previous_state      JSONB,                    -- État avant modification
    new_state           JSONB,                    -- État après modification
    change_summary      TEXT,
    -- Intégrité
    previous_log_hash   VARCHAR(64),              -- Hash du log précédent (chaîne)
    log_hash            VARCHAR(64) NOT NULL,     -- SHA256(log_id + event + previous_hash)
    -- Rétention
    retention_until     DATE NOT NULL             -- Minimum 10 ans (COBAC)
) PARTITION BY RANGE (event_timestamp);

-- Trigger pour calculer le hash chaîné (garantie d'immuabilité)
CREATE OR REPLACE FUNCTION audit.calculate_log_hash()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash VARCHAR(64);
BEGIN
    SELECT log_hash INTO prev_hash FROM audit.audit_log
    ORDER BY log_id DESC LIMIT 1;

    NEW.previous_log_hash := COALESCE(prev_hash, '0000000000000000000000000000000000000000000000000000000000000000');
    NEW.log_hash := encode(
        sha256(
            (NEW.log_id || NEW.event_timestamp || NEW.event_type ||
             NEW.entity_id || NEW.action || COALESCE(NEW.actor_id, '') ||
             NEW.previous_log_hash)::bytea
        ), 'hex'
    );
    NEW.retention_until := (NOW() + INTERVAL '10 years')::DATE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_hash
BEFORE INSERT ON audit.audit_log
FOR EACH ROW EXECUTE FUNCTION audit.calculate_log_hash();

-- Vue matérialisée pour recherche rapide
CREATE INDEX idx_audit_entity ON audit.audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit.audit_log (actor_id);
CREATE INDEX idx_audit_time ON audit.audit_log (event_timestamp DESC);
CREATE INDEX idx_audit_type ON audit.audit_log (event_type);
```

## 7.8 Chiffrement et Sécurité Technique

### Matrice de Chiffrement

| Donnée | Au repos | En transit | Niveau |
|--------|----------|------------|--------|
| Mots de passe | Argon2id (hash) | TLS 1.3 | Critique |
| Clés privées Stellar/Pi | HSM (FIPS 140-2 L3) | mTLS | Critique |
| Documents KYC (images) | AES-256-GCM | TLS 1.3 | Élevé |
| PII (nom, adresse, téléphone) | AES-256-GCM (field-level) | TLS 1.3 | Élevé |
| Numéros de compte/IBAN | AES-256-GCM (field-level) | TLS 1.3 | Élevé |
| Messages ISO 20022 XML | AES-256-GCM | mTLS (GIMACPAY) | Élevé |
| Logs d'audit | Intégrité SHA-256 | TLS 1.3 | Moyen |
| Tokens JWT | RSA-2048 signature | TLS 1.3 | Élevé |
| API Keys partenaires | AES-256-GCM (Vault) | TLS 1.3 | Critique |
| Sessions Redis | AES-256-CBC | TLS | Moyen |

### Configuration HSM

```typescript
// Clés gérées par HSM
const HSM_KEY_TYPES = {
  STELLAR_ISSUER_KEY: { algorithm: 'Ed25519', usage: 'SIGN', rotation: 'YEARLY' },
  STELLAR_HOT_WALLET: { algorithm: 'Ed25519', usage: 'SIGN', rotation: 'MONTHLY' },
  PI_WALLET_KEY: { algorithm: 'Ed25519', usage: 'SIGN', rotation: 'MONTHLY' },
  DATA_ENCRYPTION_KEY: { algorithm: 'AES-256', usage: 'ENCRYPT', rotation: 'QUARTERLY' },
  JWT_SIGNING_KEY: { algorithm: 'RSA-2048', usage: 'SIGN', rotation: 'QUARTERLY' },
  API_HMAC_KEY: { algorithm: 'HMAC-SHA256', usage: 'MAC', rotation: 'MONTHLY' },
  GIMACPAY_MTLS_KEY: { algorithm: 'RSA-4096', usage: 'TLS', rotation: 'YEARLY' },
};
```

## 7.9 Conformité BEAC/COBAC/CEMAC

### Checklist Réglementaire

| # | Exigence | Règlement | Statut Impl. |
|---|----------|-----------|--------------|
| 1 | Agrément établissement de paiement | Règl. N°04/18 Art. 5 | Pré-requis |
| 2 | Capital minimum (100M XAF pour EP) | Règl. N°04/18 Art. 12 | Pré-requis |
| 3 | KYC obligatoire tous clients | Règl. N°04/18 Art. 45 | Section 7.1 |
| 4 | Reporting mensuel COBAC | Instr. COBAC | Section 4.7 |
| 5 | STR à ANIF sous 24h | Loi AML Congo | Section 7.6 |
| 6 | Conservation données 10 ans | Règl. N°04/18 Art. 78 | Section 7.7 |
| 7 | Ségrégation fonds clients | Règl. N°04/18 Art. 22 | Architecture comptes |
| 8 | Plan de continuité d'activité | Instr. COBAC | Section 10.7 |
| 9 | Audit annuel externe | Règl. N°04/18 Art. 89 | Processus |
| 10 | Réserves obligatoires BEAC (7%) | Règl. BEAC | Section 4.6 |
| 11 | Reporting balance des paiements | Règl. changes BEAC | Section 4.7 |
| 12 | Plafonds transactions MoMo | Instr. N°001/GR/2025 | Section 7.1 |
| 13 | Interopérabilité GIMACPAY | Règl. N°04/18 Art. 67 | Section 6.8 |
| 14 | Protection données personnelles | Loi Congo | Section 7.8 |
| 15 | Notification incidents sécurité | Instr. COBAC | Processus ops |

---

# 8. APIs OPEN BANKING

> **INSTRUCTION AU DÉVELOPPEUR** : Toutes les APIs doivent être documentées via OpenAPI 3.0 (Swagger), versionées, sécurisées par OAuth 2.0, et rate-limitées. L'API doit être disponible en sandbox pour les partenaires bancaires.

## 8.1 REST API — Spécification OpenAPI 3.0

### Base URLs

| Environnement | URL | Usage |
|---------------|-----|-------|
| Production | https://api.pimpay.cg/v1 | Production live |
| Sandbox | https://sandbox-api.pimpay.cg/v1 | Tests partenaires |
| Staging | https://staging-api.pimpay.cg/v1 | Tests internes |

### Endpoints Complets

#### Payments API

```yaml
# openapi: 3.0.3
paths:
  /v1/payments/credit-transfer:
    post:
      summary: Initier un virement (pain.001 → pacs.008)
      tags: [Payments]
      security: [{ oauth2: [payments:write] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [debtor, creditor, amount]
              properties:
                debtor:
                  type: object
                  required: [name, account_iban]
                  properties:
                    name: { type: string, maxLength: 140 }
                    account_iban: { type: string, pattern: '^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$' }
                    identification:
                      type: object
                      properties:
                        type: { type: string, enum: [NIDN, TXID, CCPT, DRLC] }
                        value: { type: string }
                    address:
                      type: object
                      properties:
                        street: { type: string }
                        city: { type: string }
                        country: { type: string, pattern: '^[A-Z]{2}$' }
                creditor:
                  type: object
                  required: [name, account_iban]
                  properties:
                    name: { type: string, maxLength: 140 }
                    account_iban: { type: string }
                    agent_bic: { type: string, pattern: '^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$' }
                    address:
                      type: object
                      properties:
                        city: { type: string }
                        country: { type: string }
                amount:
                  type: object
                  required: [value, currency]
                  properties:
                    value: { type: number, minimum: 1, maximum: 999999999999 }
                    currency: { type: string, enum: [XAF, EUR, USD, GBP, XOF] }
                charge_bearer: { type: string, enum: [DEBT, CRED, SHAR, SLEV], default: SHAR }
                purpose: { type: string, enum: [SUPP, SALA, PENS, TAXS, TRAD, CASH, DIVI, GOVT, HEDG, LOAN, OTHR] }
                priority: { type: string, enum: [NORM, HIGH, URGN], default: NORM }
                remittance_info:
                  type: object
                  properties:
                    unstructured: { type: string, maxLength: 140 }
                    structured:
                      type: object
                      properties:
                        type: { type: string, enum: [CINV, CREN, DEBN, MSIN, SOAC] }
                        number: { type: string }
                        date: { type: string, format: date }
                execution_date: { type: string, format: date }
      responses:
        '202':
          description: Payment accepted for processing
          content:
            application/json:
              schema:
                type: object
                properties:
                  transaction_id: { type: string }
                  uetr: { type: string, format: uuid }
                  status: { type: string, enum: [ACTC, ACSP] }
                  status_description: { type: string }
                  created_at: { type: string, format: date-time }
                  estimated_settlement: { type: string, format: date-time }
        '400': { description: 'Validation error' }
        '401': { description: 'Unauthorized' }
        '403': { description: 'Insufficient permissions' }
        '422': { description: 'Business rule violation (e.g., insufficient funds)' }
        '429': { description: 'Rate limit exceeded' }

  /v1/payments/{paymentId}:
    get:
      summary: Obtenir le statut d'un paiement
      tags: [Payments]
      security: [{ oauth2: [payments:read] }]
      parameters:
        - name: paymentId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  transaction_id: { type: string }
                  uetr: { type: string }
                  status: { type: string }
                  status_history:
                    type: array
                    items:
                      type: object
                      properties:
                        status: { type: string }
                        timestamp: { type: string, format: date-time }
                        reason_code: { type: string }
                  debtor: { type: object }
                  creditor: { type: object }
                  amount: { type: object }
                  routing_channel: { type: string }
                  stellar_tx_hash: { type: string }
                  created_at: { type: string, format: date-time }

  /v1/payments/return:
    post:
      summary: Initier un retour de paiement (pacs.004)
      tags: [Payments]
      security: [{ oauth2: [payments:write] }]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [original_transaction_id, return_reason]
              properties:
                original_transaction_id: { type: string }
                original_uetr: { type: string }
                return_amount: { type: object, properties: { value: { type: number }, currency: { type: string } } }
                return_reason:
                  type: object
                  properties:
                    code: { type: string, enum: [AC01, AC04, AC06, AM04, FRAD, MS02, NARR] }
                    additional_info: { type: string }

  /v1/payments/bulk:
    post:
      summary: Traitement en lot (CSV ou pain.001 XML)
      tags: [Payments]
      security: [{ oauth2: [payments:write, bulk:create] }]
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file: { type: string, format: binary }
                debit_account: { type: string }
                execution_date: { type: string, format: date }
                batch_name: { type: string }

  /v1/payments/history:
    get:
      summary: Historique des paiements avec filtres
      tags: [Payments]
      security: [{ oauth2: [payments:read] }]
      parameters:
        - { name: account_id, in: query, schema: { type: string } }
        - { name: status, in: query, schema: { type: string, enum: [ACTC, ACSP, ACSC, RJCT, PDNG] } }
        - { name: date_from, in: query, schema: { type: string, format: date } }
        - { name: date_to, in: query, schema: { type: string, format: date } }
        - { name: min_amount, in: query, schema: { type: number } }
        - { name: max_amount, in: query, schema: { type: number } }
        - { name: currency, in: query, schema: { type: string } }
        - { name: channel, in: query, schema: { type: string, enum: [INTERNAL, MOBILE_MONEY, GIMACPAY, STELLAR, SWIFT] } }
        - { name: page, in: query, schema: { type: integer, default: 1 } }
        - { name: per_page, in: query, schema: { type: integer, default: 25, maximum: 100 } }
```

#### Accounts API

```yaml
  /v1/accounts:
    post:
      summary: Créer un compte (acmt.001)
      tags: [Accounts]
      security: [{ oauth2: [accounts:write] }]
    get:
      summary: Lister les comptes
      tags: [Accounts]
      security: [{ oauth2: [accounts:read] }]
      parameters:
        - { name: owner_id, in: query, schema: { type: string } }
        - { name: account_type, in: query, schema: { type: string } }
        - { name: status, in: query, schema: { type: string } }

  /v1/accounts/{accountId}/balance:
    get:
      summary: Solde du compte
      responses:
        '200':
          content:
            application/json:
              schema:
                properties:
                  account_id: { type: string }
                  balances:
                    type: array
                    items:
                      type: object
                      properties:
                        type: { type: string, enum: [AVAILABLE, BOOKED, PENDING] }
                        amount: { type: number }
                        currency: { type: string }
                        as_of: { type: string, format: date-time }

  /v1/accounts/{accountId}/statement:
    get:
      summary: Relevé bancaire (camt.053)
      parameters:
        - { name: date_from, in: query, required: true, schema: { type: string, format: date } }
        - { name: date_to, in: query, required: true, schema: { type: string, format: date } }
        - { name: format, in: query, schema: { type: string, enum: [json, xml, pdf], default: json } }
```

#### FX API, Mobile Money API, Blockchain API, KYC API

```yaml
  /v1/fx/rates:
    get:
      summary: Taux de change actuels
      parameters:
        - { name: base, in: query, schema: { type: string, default: XAF } }
        - { name: targets, in: query, schema: { type: string, description: 'Comma-separated: EUR,USD,GBP' } }

  /v1/fx/quote:
    post:
      summary: Obtenir un devis FX (valide 30 secondes)
      requestBody:
        content:
          application/json:
            schema:
              properties:
                source_currency: { type: string }
                target_currency: { type: string }
                amount: { type: number }
                direction: { type: string, enum: [BUY, SELL] }

  /v1/mobile-money/deposit:
    post:
      summary: Cash-in via Mobile Money
      requestBody:
        content:
          application/json:
            schema:
              required: [provider, phone, amount]
              properties:
                provider: { type: string, enum: [MTN, AIRTEL, ORANGE] }
                phone: { type: string, pattern: '^242[0-9]{9}$' }
                amount: { type: number, minimum: 100, maximum: 5000000 }
                account_id: { type: string }

  /v1/mobile-money/withdraw:
    post:
      summary: Cash-out via Mobile Money

  /v1/stellar/transfer:
    post:
      summary: Transfert via Stellar Network
      requestBody:
        content:
          application/json:
            schema:
              properties:
                destination: { type: string, description: 'Stellar public key or federated address' }
                amount: { type: number }
                asset: { type: string, enum: [PIMPAY_XAF, PIMPAY_EUR, XLM] }
                memo: { type: string }

  /v1/kyc/verify:
    post:
      summary: Soumettre une vérification KYC
      requestBody:
        content:
          multipart/form-data:
            schema:
              properties:
                tier: { type: integer, enum: [1, 2, 3] }
                first_name: { type: string }
                last_name: { type: string }
                phone: { type: string }
                id_type: { type: string }
                id_number: { type: string }
                id_front: { type: string, format: binary }
                id_back: { type: string, format: binary }
                selfie: { type: string, format: binary }
```

## 8.2 Webhook Notifications

### Types d'Événements

| Événement | Description | Payload clé |
|-----------|-------------|-------------|
| payment.created | Nouveau paiement initié | transaction_id, amount, status |
| payment.status_changed | Changement de statut | transaction_id, old_status, new_status, reason |
| payment.completed | Paiement terminé (ACSC) | transaction_id, amount, settlement_channel |
| payment.failed | Paiement échoué (RJCT) | transaction_id, reason_code, reason_description |
| payment.returned | Retour de paiement (pacs.004) | return_id, original_tx_id, reason |
| account.created | Nouveau compte | account_id, type, currency |
| account.updated | Modification de compte | account_id, changes |
| account.balance_changed | Changement de solde | account_id, old_balance, new_balance |
| kyc.submitted | KYC soumis | customer_id, tier |
| kyc.approved | KYC approuvé | customer_id, tier, new_limits |
| kyc.rejected | KYC rejeté | customer_id, tier, reason |
| fx.rate_updated | Nouveau taux de change | currency_pair, old_rate, new_rate |
| compliance.alert | Alerte compliance | alert_id, type, severity |

### Configuration Webhook

```
POST /api/v1/webhooks
{
  "url": "https://partner-bank.com/pimpay/webhooks",
  "events": ["payment.completed", "payment.failed", "account.balance_changed"],
  "secret": "whsec_...",      // Pour HMAC-SHA256 signature
  "active": true,
  "retry_policy": {
    "max_retries": 5,
    "backoff": "exponential",  // 1s, 2s, 4s, 8s, 16s
    "timeout_ms": 10000
  }
}
```

### Signature HMAC-SHA256

```typescript
// Vérification côté partenaire
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// Headers envoyés par PIMPAY
// X-Pimpay-Signature: sha256=abc123...
// X-Pimpay-Timestamp: 1712556000
// X-Pimpay-Event: payment.completed
// X-Pimpay-Delivery-Id: whd_xxx (pour déduplication)
```

## 8.3 SDK Banques Partenaires

### TypeScript/JavaScript SDK

```typescript
// npm install @pimpay/sdk

import { PimpayClient } from '@pimpay/sdk';

const client = new PimpayClient({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  environment: 'sandbox', // ou 'production'
});

// Initier un virement
const payment = await client.payments.createCreditTransfer({
  debtor: { name: 'Test Corp', accountIban: 'CG39...' },
  creditor: { name: 'Supplier', accountIban: 'CM21...' },
  amount: { value: 1000000, currency: 'XAF' },
});
console.log(payment.transactionId, payment.uetr);

// Vérifier le statut
const status = await client.payments.getStatus(payment.transactionId);

// Écouter les webhooks
client.webhooks.on('payment.completed', (event) => {
  console.log('Payment completed:', event.transactionId);
});
```

### Python SDK

```python
# pip install pimpay-sdk

from pimpay import PimpayClient

client = PimpayClient(
    client_id="your_client_id",
    client_secret="your_client_secret",
    environment="sandbox"
)

# Initier un virement
payment = client.payments.create_credit_transfer(
    debtor={"name": "Test Corp", "account_iban": "CG39..."},
    creditor={"name": "Supplier", "account_iban": "CM21..."},
    amount={"value": 1000000, "currency": "XAF"},
)
print(f"Transaction: {payment.transaction_id}, UETR: {payment.uetr}")
```

## 8.4 OAuth 2.0 / OpenID Connect

### Scopes Disponibles

| Scope | Description | Accès |
|-------|-------------|-------|
| payments:read | Lire les paiements | GET /payments/* |
| payments:write | Créer/modifier des paiements | POST /payments/* |
| accounts:read | Lire les comptes et soldes | GET /accounts/* |
| accounts:write | Créer/modifier des comptes | POST /accounts/* |
| fx:read | Consulter les taux | GET /fx/* |
| fx:write | Exécuter des conversions | POST /fx/* |
| mobile_money:read | Lire les transactions MoMo | GET /mobile-money/* |
| mobile_money:write | Initier des transactions MoMo | POST /mobile-money/* |
| kyc:read | Consulter le statut KYC | GET /kyc/* |
| kyc:write | Soumettre des vérifications KYC | POST /kyc/* |
| bulk:create | Créer des lots de paiements | POST /payments/bulk |
| webhooks:manage | Gérer les webhooks | * /webhooks/* |
| compliance:read | Consulter les alertes compliance | GET /compliance/* |

### Flux OAuth 2.0 Authorization Code

```
1. GET https://auth.pimpay.cg/oauth/authorize?
     response_type=code&
     client_id=CLIENT_ID&
     redirect_uri=https://partner.com/callback&
     scope=payments:read+payments:write+accounts:read&
     state=random_state_value

2. User approves → redirect to:
   https://partner.com/callback?code=AUTH_CODE&state=random_state_value

3. POST https://auth.pimpay.cg/oauth/token
   { grant_type: "authorization_code", code: AUTH_CODE, redirect_uri: ..., client_id: ..., client_secret: ... }

   Response: { access_token: "...", refresh_token: "...", expires_in: 3600, token_type: "Bearer", scope: "..." }

4. Use: Authorization: Bearer {access_token}
```

## 8.5 Rate Limiting et Throttling

### Tiers de Rate Limiting

| Tier | Requêtes/min | Requêtes/heure | Burst | Usage |
|------|-------------|----------------|-------|-------|
| Bronze | 100 | 3 000 | 20/sec | Startups, test |
| Silver | 500 | 15 000 | 50/sec | PME |
| Gold | 2 000 | 60 000 | 200/sec | Banques partenaires |
| Platinum | 10 000 | 300 000 | 1000/sec | Institutions majeures |

### Headers de Rate Limit

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1712556060
X-RateLimit-Tier: Silver

HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1712556060
```

## 8.6 Sandbox / Environnement de Test

### Comptes de Test

| Compte | IBAN | Type | Solde Initial |
|--------|------|------|---------------|
| Test Sender 1 | CG39TEST00010001111 | CACC | 100 000 000 XAF |
| Test Sender 2 | CG39TEST00020002222 | BIZZ | 500 000 000 XAF |
| Test Receiver 1 | CM21TEST00030003333 | CACC | 0 XAF |
| Test MoMo MTN | +242066000001 | EWLT | 5 000 000 XAF |
| Test MoMo Airtel | +242055000001 | EWLT | 5 000 000 XAF |

### Numéros de Test Mobile Money

| Numéro | Comportement |
|--------|-------------|
| +242066000001 | Succès immédiat |
| +242066000002 | Succès après 10 secondes |
| +242066000003 | Échec — Solde insuffisant |
| +242066000004 | Échec — Numéro invalide |
| +242066000005 | Timeout (pas de réponse) |
| +242066000006 | Annulé par l'utilisateur |

## 8.7 Versioning d'API

### Politique de Versioning

| Version | Statut | Sunset Date | Notes |
|---------|--------|-------------|-------|
| v1 | Active (current) | — | Version initiale |
| v2 | Planifiée | — | ISO 20022 2025 updates |

Règles :
- URL-based versioning : /v1/, /v2/
- Minimum 12 mois de support après sunset announcement
- Header `Sunset: Sat, 01 Jan 2028 00:00:00 GMT` sur les versions dépréciées
- Header `Deprecation: true` + `Link: <https://docs.pimpay.cg/migration/v2>`
- Breaking changes uniquement dans nouvelle version majeure
- Non-breaking additions (nouveaux champs optionnels) dans la version courante

---

# 9. FONCTIONNALITÉS INNOVANTES

## 9.1 Request to Pay (R2P)

### Flux R2P (ISO 20022 pain.013 / pain.014)

```
Créancier (Merchant)      PIMPAY API              Débiteur (Client)
       │                       │                        │
       │ POST /r2p/request     │                        │
       │ { payee: merchant,    │                        │
       │   payer_phone: ...,   │                        │
       │   amount: 15000 XAF,  │                        │
       │   expiry: 30min }     │                        │
       ├──────────────────────►│                        │
       │                       │                        │
       │ 201: { r2p_id,        │                        │
       │   status: PENDING }   │                        │
       │◄──────────────────────┤                        │
       │                       │  Push notification:    │
       │                       │  "Boutique X demande   │
       │                       │   15 000 XAF. Payer?"  │
       │                       ├───────────────────────►│
       │                       │                        │
       │                       │  [ACCEPTER] + PIN      │
       │                       │◄───────────────────────┤
       │                       │                        │
       │                       │  Exécuter paiement     │
       │                       │  (pain.001 → pacs.008) │
       │                       │                        │
       │  Webhook: r2p.paid    │                        │
       │◄──────────────────────┤                        │
       │                       │  Notification: payé ✓  │
       │                       ├───────────────────────►│
```

### Endpoint R2P

```
POST /api/v1/r2p/request
{
  "payee": {
    "name": "Boutique Makosso",
    "account_id": "ACC-MERCH-001",
    "merchant_code": "MERCH-BZV-042"
  },
  "payer": {
    "phone": "+242066123456",
    "name": "Jean Client"        // Optionnel
  },
  "amount": { "value": 15000, "currency": "XAF" },
  "description": "Achat marchandises",
  "reference": "INV-2025-042",
  "expiry_minutes": 30,
  "notification_channels": ["push", "sms"]
}

Response 201:
{
  "r2p_id": "R2P-20250408-001",
  "status": "PENDING_APPROVAL",
  "created_at": "2025-04-08T12:00:00+01:00",
  "expires_at": "2025-04-08T12:30:00+01:00",
  "payment_link": "https://pay.pimpay.cg/r2p/R2P-20250408-001"
}
```

### Schéma SQL R2P

```sql
CREATE TABLE payments.request_to_pay (
    r2p_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payee_id        UUID NOT NULL,
    payee_name      VARCHAR(140) NOT NULL,
    payer_phone     VARCHAR(15) NOT NULL,
    payer_id        UUID,
    amount          NUMERIC(18,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'XAF',
    description     TEXT,
    reference       VARCHAR(35),
    status          VARCHAR(20) DEFAULT 'PENDING_APPROVAL',
    -- PENDING_APPROVAL, APPROVED, REJECTED, EXPIRED, PAID, CANCELLED
    expires_at      TIMESTAMPTZ NOT NULL,
    approved_at     TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    payment_tx_id   UUID,
    notification_sent BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

## 9.2 Buy Now Pay Later (BNPL)

### Modèle de Scoring Crédit CEMAC

```typescript
interface CreditScoreInput {
  customer_id: string;
  // Données alternatives (contexte africain — peu d'historique crédit formel)
  mobile_money_history_months: number;        // Ancienneté MoMo
  avg_monthly_mobile_money_volume: number;    // Volume moyen mensuel
  mobile_money_regularity: number;            // 0-1 (régularité des flux)
  utility_payments_on_time_pct: number;       // % factures payées à temps
  account_age_days: number;                   // Ancienneté compte PIMPAY
  kyc_tier: number;
  avg_balance_30d: number;                    // Solde moyen 30 jours
  income_declared: number;                    // Revenu déclaré (KYC Tier 3)
  num_unique_correspondents: number;          // Diversité du réseau
  has_salary_deposit: boolean;                // Virements salaire réguliers
}

function calculateCreditScore(input: CreditScoreInput): {
  score: number;           // 0-1000
  max_bnpl_amount: number; // Montant max BNPL en XAF
  eligible_plans: number[]; // [3, 6, 12] mois
  interest_rate_bps: number;
} {
  let score = 0;

  // Ancienneté MoMo (max 150 pts)
  score += Math.min(input.mobile_money_history_months * 5, 150);

  // Volume MoMo (max 200 pts)
  if (input.avg_monthly_mobile_money_volume > 500000) score += 200;
  else if (input.avg_monthly_mobile_money_volume > 200000) score += 150;
  else if (input.avg_monthly_mobile_money_volume > 50000) score += 80;

  // Régularité (max 150 pts)
  score += Math.round(input.mobile_money_regularity * 150);

  // Factures à temps (max 100 pts)
  score += Math.round(input.utility_payments_on_time_pct * 100);

  // Ancienneté PIMPAY (max 100 pts)
  score += Math.min(Math.round(input.account_age_days / 3.65), 100);

  // KYC tier (max 100 pts)
  score += input.kyc_tier * 33;

  // Solde moyen (max 100 pts)
  if (input.avg_balance_30d > 1000000) score += 100;
  else if (input.avg_balance_30d > 200000) score += 60;
  else if (input.avg_balance_30d > 50000) score += 30;

  // Salaire régulier (max 100 pts)
  if (input.has_salary_deposit) score += 100;

  score = Math.min(score, 1000);

  // Déterminer l'éligibilité
  const maxAmount = score >= 700 ? 5000000
    : score >= 500 ? 2000000
    : score >= 300 ? 500000 : 0;

  const plans = score >= 700 ? [3, 6, 12]
    : score >= 500 ? [3, 6]
    : score >= 300 ? [3] : [];

  // Taux BEAC directeur (estimé 5%) + spread basé sur le score
  const spread = score >= 700 ? 200 : score >= 500 ? 400 : 800; // basis points
  const interestRate = 500 + spread; // 7% à 13% annuel

  return { score, max_bnpl_amount: maxAmount, eligible_plans: plans, interest_rate_bps: interestRate };
}
```

### Endpoint BNPL

```
POST /api/v1/bnpl/plans
{
  "customer_id": "CUST-001",
  "merchant_id": "MERCH-001",
  "purchase_amount": 1500000,     // 1.5M XAF
  "currency": "XAF",
  "num_installments": 6,
  "purchase_reference": "ORDER-2025-789"
}

Response 201:
{
  "plan_id": "BNPL-20250408-001",
  "status": "ACTIVE",
  "purchase_amount": 1500000,
  "total_with_interest": 1590000,  // 6% sur 6 mois
  "interest_rate_annual_pct": 12,
  "installments": [
    { "number": 1, "amount": 265000, "due_date": "2025-04-08", "status": "PAID" },
    { "number": 2, "amount": 265000, "due_date": "2025-05-08", "status": "PENDING" },
    { "number": 3, "amount": 265000, "due_date": "2025-06-08", "status": "PENDING" },
    { "number": 4, "amount": 265000, "due_date": "2025-07-08", "status": "PENDING" },
    { "number": 5, "amount": 265000, "due_date": "2025-08-08", "status": "PENDING" },
    { "number": 6, "amount": 265000, "due_date": "2025-09-08", "status": "PENDING" }
  ],
  "soroban_contract_id": "CDXYZ..."
}
```

## 9.3 Embedded Finance

### Widget de Paiement Intégrable

```html
<!-- Intégration dans un site partenaire -->
<script src="https://js.pimpay.cg/v1/embed.js"></script>
<div id="pimpay-checkout"></div>
<script>
  PimpayCheckout.init({
    partnerId: 'PARTNER_API_KEY',
    amount: 50000,
    currency: 'XAF',
    reference: 'ORDER-123',
    description: 'Achat en ligne',
    methods: ['mobile_money', 'bank_transfer', 'pi_network', 'stellar'],
    locale: 'fr-CG',
    theme: { primaryColor: '#C8A961', borderRadius: '8px' },
    onSuccess: (result) => { console.log('Paid!', result.transaction_id); },
    onError: (error) => { console.error('Error', error); },
    onCancel: () => { console.log('Cancelled'); },
  });
</script>
```

## 9.4 Paiements Programmés et Récurrents

### Configuration

```
POST /api/v1/scheduled-payments
{
  "name": "Loyer mensuel",
  "debtor_account": "CG39...",
  "creditor": { "name": "Propriétaire", "account_iban": "CG39...", "agent_bic": "BGFICGCG" },
  "amount": { "value": 250000, "currency": "XAF" },
  "schedule": {
    "frequency": "MONTHLY",         // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
    "day_of_month": 5,              // Le 5 de chaque mois
    "start_date": "2025-05-05",
    "end_date": "2026-04-05",       // Optionnel
    "max_occurrences": 12           // Optionnel
  },
  "retry_policy": {
    "max_retries": 3,
    "retry_interval_hours": 24
  },
  "notify_before_hours": 24         // Notifier 24h avant exécution
}
```

## 9.5 Multi-Signature pour Transactions à Haut Montant

### Configuration Multi-Sig

```typescript
interface MultiSigConfig {
  account_id: string;
  threshold_xaf: number;           // Seuil d'activation multi-sig
  required_signatures: number;     // M signatures requises
  total_signers: number;           // N signataires total
  signers: {
    user_id: string;
    name: string;
    role: string;
    weight: number;                // Poids de la signature (1-10)
  }[];
  timeout_hours: number;           // Timeout pour collecte signatures
  stellar_multisig: boolean;       // Utiliser aussi multi-sig Stellar on-chain
}

// Exemple: Transaction > 10M XAF → 2 sur 3 signataires requis
const config: MultiSigConfig = {
  account_id: 'ACC-BIZZ-001',
  threshold_xaf: 10000000,
  required_signatures: 2,
  total_signers: 3,
  signers: [
    { user_id: 'U001', name: 'DG', role: 'CEO', weight: 3 },
    { user_id: 'U002', name: 'DAF', role: 'CFO', weight: 2 },
    { user_id: 'U003', name: 'Trésorier', role: 'TREASURER', weight: 1 },
  ],
  timeout_hours: 48,
  stellar_multisig: true,
};
```

## 9.6 Notifications Temps Réel

### Types de Notifications (30+)

| # | Événement | Push | SMS | Email | In-App |
|---|-----------|------|-----|-------|--------|
| 1 | Crédit reçu | ✅ | ✅ | ✅ | ✅ |
| 2 | Débit effectué | ✅ | ✅ | ✅ | ✅ |
| 3 | Paiement échoué | ✅ | ✅ | ✅ | ✅ |
| 4 | R2P reçue | ✅ | ✅ | ❌ | ✅ |
| 5 | BNPL échéance proche | ✅ | ✅ | ✅ | ✅ |
| 6 | BNPL échéance impayée | ✅ | ✅ | ✅ | ✅ |
| 7 | KYC approuvé | ✅ | ❌ | ✅ | ✅ |
| 8 | KYC rejeté | ✅ | ✅ | ✅ | ✅ |
| 9 | Connexion nouveau device | ✅ | ✅ | ✅ | ✅ |
| 10 | Limite atteinte (80%) | ✅ | ❌ | ❌ | ✅ |
| 11 | Taux FX significatif | ❌ | ❌ | ✅ | ✅ |
| 12 | Relevé disponible | ❌ | ❌ | ✅ | ✅ |
| 13 | Transaction programmée exécutée | ✅ | ❌ | ❌ | ✅ |
| 14 | Multi-sig approbation requise | ✅ | ✅ | ✅ | ✅ |
| 15 | Compte bloqué | ✅ | ✅ | ✅ | ✅ |

## 9.7 Export Comptable (OHADA / SYSCOHADA)

### Mapping ISO 20022 → Écritures SYSCOHADA

| Transaction ISO | Compte Débit | Compte Crédit | Libellé |
|-----------------|-------------|---------------|---------|
| pacs.008 (virement sortant) | 521 (Banques locales) | 411 (Clients) | Virement émis |
| pacs.008 (virement entrant) | 411 (Clients) | 521 (Banques locales) | Virement reçu |
| Cash-in MoMo | 571 (Caisse MoMo) | 411 (Clients) | Dépôt Mobile Money |
| Cash-out MoMo | 411 (Clients) | 571 (Caisse MoMo) | Retrait Mobile Money |
| Commission perçue | 411/521 | 706 (Services vendus) | Commission transaction |
| Achat devises | 476 (Devises) | 521 (Banques) | Achat EUR/USD |
| Stellar settlement | 518 (Crypto) | 521 (Banques) | Settlement Stellar |

### Endpoint Export Comptable

```
GET /api/v1/accounting/export?period=2025-03&format=xlsx&standard=SYSCOHADA

Response: { download_url: "https://...", filename: "PIMPAY_Journal_Mars2025.xlsx" }

Contenu du fichier Excel:
- Onglet 1: Journal Général
- Onglet 2: Grand Livre
- Onglet 3: Balance des comptes
- Onglet 4: Rapprochement bancaire
```

## 9.8 Rapprochement Bancaire Automatique

### Moteur de Réconciliation

```typescript
interface ReconciliationJob {
  sources: {
    internal: 'postgresql';          // Transactions PIMPAY
    external: ReconciliationSource[];
  };
  matching_rules: MatchingRule[];
  tolerance: {
    amount_pct: number;              // Tolérance montant (ex: 0.01 = 1%)
    date_days: number;               // Tolérance date (ex: 2 jours)
  };
}

type ReconciliationSource =
  | { type: 'BANK_STATEMENT'; format: 'camt.053'; bank_bic: string }
  | { type: 'MOBILE_MONEY'; provider: 'MTN' | 'AIRTEL' | 'ORANGE' }
  | { type: 'STELLAR'; account_id: string }
  | { type: 'GIMACPAY'; participant_id: string };

interface MatchingRule {
  name: string;
  priority: number;            // 1 = highest
  match_fields: string[];      // ['amount', 'reference', 'date']
  match_type: 'EXACT' | 'FUZZY';
}

// Résultat de réconciliation
interface ReconciliationResult {
  job_id: string;
  period: { from: string; to: string };
  summary: {
    total_internal: number;
    total_external: number;
    matched: number;
    unmatched_internal: number;   // Transactions PIMPAY sans correspondance externe
    unmatched_external: number;   // Transactions externes sans correspondance PIMPAY
    discrepancies: number;        // Correspondances avec écarts
  };
  unmatched_items: UnmatchedItem[];
  discrepancy_items: DiscrepancyItem[];
}
```

---

# 10. ARCHITECTURE TECHNIQUE DÉTAILLÉE

## 10.1 Microservices — Liste Complète

| # | Service | Port | BDD | Kafka Topics | Responsabilité |
|---|---------|------|-----|-------------|----------------|
| 1 | gateway-svc | 8000 | — | — | API Gateway, routing, auth, rate limiting |
| 2 | auth-svc | 8001 | PostgreSQL | user.login, user.logout | OAuth 2.0, JWT, 2FA, sessions |
| 3 | payment-svc | 8010 | PostgreSQL | payment.* | Orchestration paiements, maker-checker |
| 4 | account-svc | 8011 | PostgreSQL | account.* | Gestion comptes, soldes, limites |
| 5 | iso20022-parser-svc | 8012 | MongoDB | iso.parsed | Parsing/génération XML ISO 20022 |
| 6 | kyc-svc | 8020 | PostgreSQL | kyc.* | Vérification identité, OCR, face match |
| 7 | compliance-svc | 8021 | PostgreSQL | compliance.* | AML, sanctions, PEP, STR |
| 8 | notification-svc | 8030 | MongoDB | notification.* | Push, SMS, email, in-app |
| 9 | fx-svc | 8031 | Redis+PG | fx.rate.updated | Taux de change, conversion |
| 10 | mobile-money-svc | 8040 | PostgreSQL | mobile_money.* | MTN, Airtel, Orange bridges |
| 11 | stellar-bridge-svc | 8041 | PostgreSQL | stellar.* | Stellar SDK, Anchors, SEP-24/31 |
| 12 | pi-bridge-svc | 8042 | PostgreSQL | pi.* | Pi Network SDK, PiPay |
| 13 | reconciliation-svc | 8050 | PostgreSQL | recon.* | Rapprochement multi-source |
| 14 | reporting-svc | 8051 | PostgreSQL | report.* | Rapports COBAC/BEAC, camt.053 |
| 15 | bnpl-svc | 8060 | PostgreSQL | bnpl.* | Credit scoring, installments |
| 16 | agent-mgmt-svc | 8061 | PostgreSQL | agent.* | Réseau agents, float, commissions |
| 17 | scheduler-svc | 8070 | PostgreSQL | scheduler.* | Paiements programmés, cron jobs |
| 18 | audit-svc | 8071 | MongoDB | audit.* | Logs immuables, hash chain |
| 19 | treasury-svc | 8080 | PostgreSQL | treasury.* | Liquidité, nostro/vostro, sweep |

## 10.2 Event-Driven Architecture (Kafka)

### Configuration Kafka Cluster

```yaml
# docker-compose.kafka.yml
services:
  kafka-1:
    image: confluentinc/cp-kafka:7.6.0
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_NUM_PARTITIONS: 12
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
      KAFKA_LOG_RETENTION_HOURS: 168
      KAFKA_LOG_RETENTION_BYTES: 10737418240
      KAFKA_MESSAGE_MAX_BYTES: 10485760
      KAFKA_COMPRESSION_TYPE: lz4
```

### Topics Principaux

| Topic | Partitions | Retention | Producteur | Consommateurs |
|-------|-----------|-----------|------------|---------------|
| payment.initiated | 12 | 30j | payment-svc | compliance-svc, stellar-bridge, mobile-money |
| payment.status_changed | 12 | 30j | tous | notification-svc, reporting-svc, audit-svc |
| payment.completed | 12 | 90j | payment-svc | account-svc, reconciliation-svc, reporting |
| payment.failed | 6 | 90j | payment-svc | notification-svc, audit-svc |
| account.created | 6 | 90j | account-svc | kyc-svc, stellar-bridge, notification |
| account.balance_changed | 12 | 30j | account-svc | treasury-svc, notification-svc |
| kyc.submitted | 6 | 90j | kyc-svc | compliance-svc |
| kyc.verified | 6 | 90j | kyc-svc | account-svc, notification-svc |
| compliance.alert | 6 | 365j | compliance-svc | notification-svc, audit-svc |
| fx.rate_updated | 3 | 7j | fx-svc | payment-svc, treasury-svc |
| mobile_money.collection.completed | 12 | 30j | mobile-money-svc | account-svc, stellar-bridge |
| stellar.tx.confirmed | 6 | 90j | stellar-bridge | payment-svc, reconciliation |
| audit.event | 12 | 3650j | tous | audit-svc (consommateur unique) |

### Dead Letter Queue

```typescript
const consumerConfig = {
  'payment-processor': {
    maxRetries: 3,
    retryBackoffMs: [1000, 5000, 30000],
    dlqTopic: 'dlq.payment-processor',
    alertOnDLQ: true,
  },
  'compliance-screener': {
    maxRetries: 5,
    retryBackoffMs: [1000, 5000, 15000, 60000, 300000],
    dlqTopic: 'dlq.compliance-screener',
    alertOnDLQ: true,
    blockProcessingOnDLQ: true,
  },
};
```

## 10.3 Bases de Données

### PostgreSQL — Configuration Production

```yaml
# postgresql.conf (optimisé pour charge bancaire)
max_connections: 200
shared_buffers: 8GB
effective_cache_size: 24GB
work_mem: 64MB
maintenance_work_mem: 2GB
wal_level: replica
max_wal_senders: 5
synchronous_commit: on  # Critique pour données financières
checkpoint_completion_target: 0.9
random_page_cost: 1.1  # SSD

# Partitioning automatique via pg_partman
# Tables partitionnées par mois: messages, payment_transactions, audit_log
# Rétention: 10 ans minimum (COBAC)
```

### Redis — Configuration Cluster

```yaml
# redis.conf
maxmemory: 4gb
maxmemory-policy: allkeys-lru
cluster-enabled: yes
cluster-node-timeout: 5000

# Structures Redis utilisées:
# - Sessions: STRING avec TTL 30min (session:{session_id})
# - Rate limits: SORTED SET (ratelimit:{client_id}:{window})
# - Taux FX: HASH (fx:rates -> { XAF_EUR: 655.957, ... })
# - Balances cache: HASH (balance:{account_id} -> { available, booked, pending })
# - Real-time counters: HYPERLOGLOG, INCRBY
# - Pub/Sub: Channels pour WebSocket broadcasting
```

## 10.4 Containerisation (Docker/Kubernetes)

### Dockerfile Exemple (payment-svc)

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS runner
RUN addgroup -g 1001 -S pimpay && adduser -S pimpay -u 1001
WORKDIR /app
COPY --from=builder --chown=pimpay:pimpay /app/dist ./dist
COPY --from=builder --chown=pimpay:pimpay /app/node_modules ./node_modules
USER pimpay
EXPOSE 8010
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:8010/health || exit 1
CMD ["node", "dist/index.js"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-svc
  namespace: pimpay-prod
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
        - name: payment-svc
          image: registry.pimpay.cg/payment-svc:v1.2.0
          ports:
            - containerPort: 8010
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
          livenessProbe:
            httpGet: { path: /health/live, port: 8010 }
            initialDelaySeconds: 15
          readinessProbe:
            httpGet: { path: /health/ready, port: 8010 }
            initialDelaySeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-svc-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-svc
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
```

## 10.5 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: PIMPAY CI/CD Pipeline
on:
  push:
    branches: [main, develop]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:integration
  security:
    needs: test
    steps:
      - run: npm audit --production
      - uses: aquasecurity/trivy-action@master
  build:
    needs: security
    steps:
      - run: docker build -t registry.pimpay.cg/svc:sha .
      - run: docker push registry.pimpay.cg/svc:sha
  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    steps:
      - run: kubectl set image deployment/svc
  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - run: kubectl set image deployment/svc
      - run: npm run test:smoke
```

## 10.6 Haute Disponibilité et Disaster Recovery

| Paramètre | Cible | Stratégie |
|-----------|-------|-----------|n| RPO | 0 (zéro perte) | Réplication synchrone PostgreSQL |
| RTO | < 15 minutes | Failover automatique Patroni |
| Uptime | 99.99% | Multi-AZ, 3 replicas minimum |
| Backup BDD | Incrémental horaire + Full quotidien | pgBackRest vers S3 |
| Backup Kafka | Réplication 3x | 3 brokers, min.insync=2 |
| DR Site | Actif-passif | Region DR + réplication async |

## 10.7 Monitoring et Observabilité

```
Prometheus (métriques) --> Grafana (dashboards)
     ^                          |
     |                     Alertmanager --> PagerDuty/SMS
     |
Microservices (/metrics endpoint)

ELK Stack:
Microservices --> Filebeat --> Logstash --> Elasticsearch --> Kibana

Distributed Tracing:
Microservices --> OpenTelemetry SDK --> Jaeger
```

### Alertes Critiques

| Alerte | Condition | Sévérité | Notification |
|--------|-----------|----------|-------------|
| Payment service down | health check fail > 30s | P1 CRITICAL | PagerDuty + SMS |
| Database replication lag | lag > 10s | P1 CRITICAL | PagerDuty |
| Kafka consumer lag | lag > 50000 messages | P2 HIGH | Slack + Email |
| Error rate > 5% | 5xx > 5% over 5min | P2 HIGH | PagerDuty |
| Disk usage > 85% | Any node | P3 MEDIUM | Email |
| SSL cert expiry | < 30 days | P3 MEDIUM | Email |
| Sanctions list stale | Not updated > 48h | P2 HIGH | Compliance + Email |

---

# 11. PLAN DE DÉPLOIEMENT (ROADMAP)

| Phase | Période | Livrables | Dépendances |
|-------|---------|-----------|-------------|
| **Phase 1** — Fondations | Mois 1-3 | Infrastructure K8s, PostgreSQL, Kafka, Redis. auth-svc, account-svc, iso20022-parser-svc. KYC Tier 1. CI/CD pipeline. | Hébergement cloud, certificats SSL |
| **Phase 2** — Paiements Core | Mois 4-6 | payment-svc (pacs.008, pacs.002, pacs.004). mobile-money-svc (MTN MoMo). compliance-svc (AML basique). notification-svc. Dashboard v1. | Contrat MTN MoMo API, Agrément COBAC |
| **Phase 3** — Blockchain | Mois 7-9 | stellar-bridge-svc (Anchor, SEP-24, SEP-31). pi-bridge-svc. Soroban contracts (Escrow). KYC Tier 2/3 (OCR, face match). Airtel + Orange Money bridges. | Stellar Anchor certification |
| **Phase 4** — Open Banking | Mois 10-12 | API Open Banking v1. SDK JS/Python/Java. Sandbox. Webhooks. GIMACPAY intégration. Reporting COBAC automatisé. camt.053 statements. QR Code payments. | Certification GIMACPAY |
| **Phase 5** — Innovation | Mois 13-15 | BNPL (scoring + Soroban). R2P. Embedded Finance widget. USSD. Agent network. Export OHADA. Réconciliation auto. Multi-sig. | Licence crédit COBAC (BNPL) |
| **Phase 6** — Expansion | Mois 16-18 | Expansion Cameroun + Gabon. Partenariats bancaires CEMAC. Volume: 1000 TPS. Audit externe. Certification ISO 27001. | Agréments pays CEMAC |

---

# 12. ANNEXES

## Annexe A — Glossaire

| Terme | Définition |
|-------|----------|
| AML | Anti-Money Laundering — Lutte contre le blanchiment d'argent |
| ANIF | Agence Nationale d'Investigation Financière (Congo) |
| BEAC | Banque des États de l'Afrique Centrale |
| BIC | Bank Identifier Code (code SWIFT) |
| BNPL | Buy Now Pay Later — Paiement fractionné |
| CEMAC | Communauté Économique et Monétaire de l'Afrique Centrale |
| COBAC | Commission Bancaire de l'Afrique Centrale |
| camt | Cash Management (famille de messages ISO 20022) |
| CQRS | Command Query Responsibility Segregation |
| DDD | Domain-Driven Design |
| DLT | Distributed Ledger Technology |
| EDD | Enhanced Due Diligence |
| EME | Établissement de Monnaie Électronique |
| EMVCo | Standard pour paiements par carte et QR code |
| EP | Établissement de Paiement |
| FX | Foreign Exchange — Change |
| GIMACPAY | Groupement Interbancaire Monétique de l'Afrique Centrale — Paiements |
| HSM | Hardware Security Module |
| IBAN | International Bank Account Number |
| ISO 20022 | Standard international de messagerie financière |
| KYC | Know Your Customer — Connaissance client |
| MoMo | Mobile Money |
| mTLS | Mutual TLS — authentification TLS bidirectionnelle |
| OHADA | Organisation pour l'Harmonisation en Afrique du Droit des Affaires |
| pacs | Payments Clearing and Settlement (famille ISO 20022) |
| pain | Payment Initiation (famille ISO 20022) |
| PEP | Politically Exposed Person |
| R2P | Request to Pay — Demande de paiement |
| RBAC | Role-Based Access Control |
| RCCM | Registre du Commerce et du Crédit Mobilier |
| SEP | Stellar Ecosystem Proposal |
| Soroban | Plateforme de smart contracts Stellar |
| STR | Suspicious Transaction Report — Déclaration de soupçon |
| STP | Straight-Through Processing |
| SWIFT | Society for Worldwide Interbank Financial Telecommunication |
| SYSCOHADA | Système Comptable OHADA |
| TPS | Transactions Per Second |
| UETR | Unique End-to-End Transaction Reference |
| USSD | Unstructured Supplementary Service Data |
| XAF | Franc CFA CEMAC (ISO 4217: 950) |
| XLM | Stellar Lumens (crypto-monnaie native Stellar) |
| XOF | Franc CFA UEMOA (ISO 4217: 952) |

## Annexe B — Codes Erreur ISO 20022 (Extrait)

| Code | Catégorie | Description |
|------|-----------|-------------|
| AC01 | Account | IncorrectAccountNumber |
| AC04 | Account | ClosedAccountNumber |
| AC06 | Account | BlockedAccount |
| AC13 | Account | InvalidDebtorAccountType |
| AG01 | Agent | TransactionForbidden |
| AG02 | Agent | InvalidBankOperationCode |
| AM01 | Amount | ZeroAmount |
| AM02 | Amount | NotAllowedAmount |
| AM04 | Amount | InsufficientFunds |
| AM05 | Amount | Duplication |
| AM09 | Amount | WrongAmount |
| BE01 | Beneficiary | InconsistentWithEndCustomer |
| BE04 | Beneficiary | MissingCreditorAddress |
| DS02 | Document | OrderCancelled |
| DT01 | Date | InvalidDate |
| FF01 | Format | InvalidFileFormat |
| MD01 | Mandate | NoMandate |
| MS02 | Misc | NotSpecifiedReason |
| RC01 | Routing | BankIdentifierIncorrect |
| RR01 | Regulatory | MissingDebtorAccountOrId |
| RR02 | Regulatory | MissingDebtorNameOrAddress |
| RR03 | Regulatory | MissingCreditorNameOrAddress |
| TM01 | Timing | CutOffTime |

## Annexe C — Devises ISO 4217

| Code | Num | Devise | Décimales | Zone |
|------|-----|--------|-----------|------|
| XAF | 950 | Franc CFA CEMAC | 0 | CEMAC |
| XOF | 952 | Franc CFA UEMOA | 0 | UEMOA |
| EUR | 978 | Euro | 2 | Zone Euro |
| USD | 840 | Dollar US | 2 | USA |
| GBP | 826 | Livre Sterling | 2 | UK |

## Annexe D — BIC/SWIFT Banques CEMAC (Extrait Congo)

| BIC | Institution | Ville |
|-----|-------------|-------|
| BEABORBB | BEAC | Brazzaville |
| BGFICGCG | BGFI Bank Congo | Brazzaville |
| COBRCGCG | Crédit du Congo | Brazzaville |
| SGABCGCG | Société Générale Congo | Brazzaville |
| LCBRCGCG | La Congolaise de Banque | Brazzaville |
| UNAFCGCG | UBA Congo | Brazzaville |
| ECOCGCGX | Ecobank Congo | Brazzaville |
| AFRIORBR | Afriland First Bank | Brazzaville |

## Annexe E — Checklist Conformité COBAC

- [ ] Agrément établissement de paiement obtenu
- [ ] Capital minimum déposé (100M XAF)
- [ ] Ségrégation des fonds clients
- [ ] KYC multi-niveaux conforme
- [ ] AML/CTF dispositif en place
- [ ] STR processus opérationnel
- [ ] Reporting mensuel COBAC automatisé
- [ ] Plan de continuité d'activité (PCA) documenté
- [ ] Audit trail 10 ans
- [ ] Chiffrement données sensibles
- [ ] Tests d'intrusion annuels
- [ ] Formation AML personnel annuelle
- [ ] Nomination d'un responsable conformité
- [ ] Réserves obligatoires BEAC respectées
- [ ] Interopérabilité GIMACPAY certifiée

## Annexe F — Estimations de Performance

| Métrique | Cible | Technologie |
|----------|-------|-------------|
| TPS soutenu | 200 TPS | Kafka + PostgreSQL partitionné |
| TPS burst | 1000 TPS | HPA Kubernetes, Redis cache |
| Latence P50 | < 500ms | Caching Redis, connection pooling |
| Latence P95 | < 2s | Async processing via Kafka |
| Latence P99 | < 5s | Circuit breaker, fallback |
| Settlement Stellar | < 5s | Stellar consensus |
| Settlement MoMo | < 30s | API directe opérateur |
| Settlement GIMACPAY | < 4h | Batch clearing GIMACPAY |
| Uptime | 99.99% | Multi-AZ, 3 replicas, auto-failover |
| Capacity | 50M transactions/mois | Horizontal scaling |

---

**FIN DU DOCUMENT**

*Document généré par PIMPAY — Technologie, Brazzaville, Congo*
*Version 2.0 — Avril 2025*
*Classification: Confidentiel — Usage Interne Développement*
*CEO: Aimard Swana | CTO: Elara AI*
