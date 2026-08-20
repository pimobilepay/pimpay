-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FlightBookingStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('CLASSIC', 'GOLD', 'BUSINESS', 'ULTRA');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'MERCHANT', 'AGENT', 'SUPERVISEUR', 'SUPERVISEUR_PRINCIPAL', 'BANK_ADMIN', 'BUSINESS_ADMIN');

-- CreateEnum
CREATE TYPE "BankStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BankType" AS ENUM ('CENTRAL_BANK', 'COMMERCIAL_BANK', 'MICROFINANCE', 'CREDIT_UNION');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'CORPORATION', 'LLC', 'COOPERATIVE', 'NGO');

-- CreateEnum
CREATE TYPE "BusinessCategory" AS ENUM ('RETAIL', 'WHOLESALE', 'SERVICES', 'MANUFACTURING', 'TECHNOLOGY', 'HOSPITALITY', 'HEALTHCARE', 'EDUCATION', 'TRANSPORT', 'AGRICULTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED', 'PENDING', 'FROZEN', 'SUSPENDED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('PI', 'FIAT', 'CRYPTO', 'SIDRA', 'OPERATOR');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TRANSFER', 'WITHDRAW', 'DEPOSIT', 'PAYMENT', 'EXCHANGE', 'SWAP', 'STAKING_REWARD', 'AIRDROP', 'CARD_PURCHASE', 'WITHDRAWAL', 'CARD_RECHARGE', 'CARD_WITHDRAW', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAW', 'VAULT_LOCK', 'VAULT_UNLOCK', 'FEE_COLLECTION', 'FEE_CONVERSION', 'FLIGHT_BOOKING');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PENDING_CONFIRMATION', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('PERSONAL', 'BUSINESS', 'MORTGAGE', 'AUTO', 'EDUCATION', 'AGRICULTURE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'COMPLETED', 'DEFAULTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'LATE', 'MISSED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "SavingsType" AS ENUM ('REGULAR', 'FIXED_DEPOSIT', 'RECURRING', 'GOAL_BASED');

-- CreateEnum
CREATE TYPE "SavingsStatus" AS ENUM ('ACTIVE', 'MATURED', 'CLOSED', 'FROZEN');

-- CreateEnum
CREATE TYPE "VaultStatus" AS ENUM ('ACTIVE', 'LOCKED', 'UNLOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SavingsTxType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'PENALTY');

-- CreateEnum
CREATE TYPE "SystemWalletType" AS ENUM ('ADMIN', 'TREASURY', 'HOT', 'LIQUIDITY');

-- CreateEnum
CREATE TYPE "AgentRole" AS ENUM ('AGENT', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('TERRAIN', 'ADMINISTRATIF');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "username" TEXT,
    "password" TEXT,
    "pin" TEXT,
    "refreshToken" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "country" TEXT,
    "city" TEXT,
    "address" TEXT,
    "birthDate" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "nationality" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "sourceOfFunds" TEXT,
    "kycFrontUrl" TEXT,
    "kycBackUrl" TEXT,
    "kycSelfieUrl" TEXT,
    "kycSubmittedAt" TIMESTAMP(3),
    "kycVerifiedAt" TIMESTAMP(3),
    "kycReason" TEXT,
    "referralCode" TEXT,
    "agentId" TEXT,
    "referredById" TEXT,
    "dailyLimit" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "monthlyLimit" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NONE',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "walletAddress" TEXT,
    "piUserId" TEXT,
    "countryOfBirth" TEXT,
    "gender" TEXT,
    "idCountry" TEXT,
    "idDeliveryDate" TIMESTAMP(3),
    "idExpiryDate" TIMESTAMP(3),
    "lastName2" TEXT,
    "middleName" TEXT,
    "nativeName" TEXT,
    "occupation" TEXT,
    "postalCode" TEXT,
    "provinceState" TEXT,
    "sidraAddress" TEXT,
    "sidraPrivateKey" TEXT,
    "stellarPrivateKey" TEXT,
    "walletPrivateKey" TEXT,
    "xlmAddress" TEXT,
    "xrpAddress" TEXT,
    "xrpPrivateKey" TEXT,
    "usdtAddress" TEXT,
    "usdtPrivateKey" TEXT,
    "solAddress" TEXT,
    "solPrivateKey" TEXT,
    "pinUpdatedAt" TIMESTAMP(3),
    "pinVersion" INTEGER NOT NULL DEFAULT 1,
    "statusReason" TEXT,
    "maintenanceUntil" TIMESTAMP(3),
    "agentRole" "AgentRole" DEFAULT 'AGENT',
    "agentType" "AgentType" DEFAULT 'TERRAIN',
    "emailVerified" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentFloat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reserved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentFloat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "P2PContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "P2PContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "type" "WalletType" NOT NULL DEFAULT 'FIAT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "frozenBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositMemo" TEXT,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwapQuote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromAmount" DOUBLE PRECISION NOT NULL,
    "toAmount" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rate" DOUBLE PRECISION NOT NULL,
    "targetCurrency" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceCurrency" TEXT NOT NULL DEFAULT 'USDT',

    CONSTRAINT "SwapQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL DEFAULT 'GLOBAL_CONFIG',
    "piNetwork" TEXT NOT NULL DEFAULT 'testnet',
    "geniuspayEnv" TEXT NOT NULL DEFAULT 'sandbox',
    "appVersion" TEXT NOT NULL DEFAULT '2.4.0',
    "forceUpdate" BOOLEAN NOT NULL DEFAULT false,
    "globalAnnouncement" TEXT,
    "announcementImage" TEXT,
    "announcementLink" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceUntil" TIMESTAMP(3),
    "transactionFee" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "minWithdrawal" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "maxWithdrawal" DOUBLE PRECISION NOT NULL DEFAULT 5000.0,
    "consensusPrice" DOUBLE PRECISION NOT NULL DEFAULT 314159.0,
    "priceMode" TEXT NOT NULL DEFAULT 'GCV',
    "stakingAPY" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastBackupAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "totalVolumePi" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "comingSoonMode" BOOLEAN NOT NULL DEFAULT false,
    "comingSoonUntil" TIMESTAMP(3),
    "withdrawFee" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "depositMobileFee" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "depositCardFee" DOUBLE PRECISION NOT NULL DEFAULT 0.035,
    "exchangeFee" DOUBLE PRECISION NOT NULL DEFAULT 0.001,
    "cardPaymentFee" DOUBLE PRECISION NOT NULL DEFAULT 0.015,
    "transferFee" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "depositCryptoFee" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "withdrawMobileFee" DOUBLE PRECISION NOT NULL DEFAULT 0.025,
    "withdrawBankFee" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "merchantPaymentFee" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "billPaymentFee" DOUBLE PRECISION NOT NULL DEFAULT 0.015,
    "qrPaymentFee" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "fiatTransferFee" DOUBLE PRECISION NOT NULL DEFAULT 0.005,
    "agentFeeShare" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "referralBonus" DOUBLE PRECISION NOT NULL DEFAULT 0.0000318,
    "referralWelcomeBonus" DOUBLE PRECISION NOT NULL DEFAULT 0.0000159,
    "maxLoginAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockoutDuration" INTEGER NOT NULL DEFAULT 30,
    "sessionTimeout" INTEGER NOT NULL DEFAULT 60,
    "proxyDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "proxyDetectionMode" TEXT NOT NULL DEFAULT 'BLOCK',
    "blockVpn" BOOLEAN NOT NULL DEFAULT true,
    "blockProxy" BOOLEAN NOT NULL DEFAULT true,
    "blockTor" BOOLEAN NOT NULL DEFAULT true,
    "blockDatacenter" BOOLEAN NOT NULL DEFAULT false,
    "blockBots" BOOLEAN NOT NULL DEFAULT false,
    "blockHeaderSpoof" BOOLEAN NOT NULL DEFAULT false,
    "riskScoreThreshold" INTEGER NOT NULL DEFAULT 75,
    "ipWhitelist" TEXT,
    "autoBlockOnDetection" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceTitle" TEXT,
    "maintenanceMessage" TEXT,
    "maintenanceSeverity" TEXT NOT NULL DEFAULT 'WARNING',
    "maintenanceStartsAt" TIMESTAMP(3),
    "maintenanceScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maintenanceAllowedRoles" TEXT[] DEFAULT ARRAY['ADMIN']::TEXT[],
    "maintenanceBroadcastId" TEXT,
    "swapPiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "swapSdaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "withdrawMobileMoneyEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "category" TEXT NOT NULL DEFAULT 'ANNOUNCEMENT',
    "scope" TEXT NOT NULL DEFAULT 'ALL',
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "link" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "details" JSONB,
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "consensusPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "stakingAPY" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vault" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetAmount" DOUBLE PRECISION,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lockUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" "VaultStatus" NOT NULL DEFAULT 'ACTIVE',
    "penaltyRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "totalInterest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastInterestAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultTransaction" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SavingsTxType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "penalty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "reference" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "apy" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PI',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rewardsEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Staking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beneficiary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountInfo" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "firstname" TEXT,
    "lastname" TEXT,
    "msisdn" TEXT,
    "relationship" TEXT,

    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "blockchainTx" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromUserId" TEXT,
    "fromWalletId" TEXT,
    "toUserId" TEXT,
    "toWalletId" TEXT,
    "qrPaymentId" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "bankBic" TEXT,
    "countryCode" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "destCurrency" TEXT,
    "externalId" TEXT,
    "operatorId" TEXT,
    "purpose" TEXT,
    "retailFee" DOUBLE PRECISION,
    "retailRate" DOUBLE PRECISION,
    "statusClass" TEXT,
    "wholesaleFxRate" DOUBLE PRECISION,
    "type" "TransactionType" NOT NULL DEFAULT 'TRANSFER',

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'DUFFEL',
    "providerBookingId" TEXT,
    "bookingReference" TEXT,
    "status" "FlightBookingStatus" NOT NULL DEFAULT 'PENDING',
    "tripType" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "baseFare" DOUBLE PRECISION NOT NULL,
    "taxes" DOUBLE PRECISION NOT NULL,
    "serviceFee" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "itinerary" JSONB NOT NULL,
    "passengers" JSONB NOT NULL,
    "paymentTransactionId" TEXT,
    "cancellationStatus" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "piPaymentStatus" TEXT NOT NULL DEFAULT 'ACCEPTED',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "logoUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CardType" NOT NULL DEFAULT 'CLASSIC',
    "number" TEXT NOT NULL,
    "exp" TEXT NOT NULL,
    "cvv" TEXT,
    "holder" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'VISA',
    "cardPin" TEXT,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "dailyLimit" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowedCurrencies" TEXT[] DEFAULT ARRAY['USD', 'XAF']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "balanceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceEUR" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "VirtualCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QRPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "recipientId" TEXT,
    "payerId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PI',
    "note" TEXT,
    "status" "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "deviceName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "browser" TEXT,
    "city" TEXT,
    "country" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "os" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'VERIFICATION',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "adminName" TEXT,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "targetEmail" TEXT,
    "details" TEXT,
    "category" TEXT,
    "targetType" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "title" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ip" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'PAGE_VIEW',
    "ip" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "city" TEXT,
    "host" TEXT,
    "origin" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "subject" TEXT NOT NULL,
    "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestSession" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "city" TEXT,
    "page" TEXT,
    "host" TEXT,
    "origin" TEXT,
    "referrer" TEXT,
    "visitCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "reactions" JSONB,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "BankType" NOT NULL DEFAULT 'COMMERCIAL_BANK',
    "status" "BankStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "email" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "city" TEXT,
    "description" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "logo" TEXT,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "type" "BusinessType" NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
    "category" "BusinessCategory" NOT NULL DEFAULT 'OTHER',
    "status" "BusinessStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "country" TEXT NOT NULL DEFAULT 'CG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "city" TEXT,
    "description" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "logo" TEXT,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessBankAccount" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" TEXT NOT NULL DEFAULT 'active',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "lastSync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessBankStatement" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessBankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "userId" TEXT,
    "requestId" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedIp" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" TEXT,
    "threat" TEXT,
    "blockedBy" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedIp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProxyDetection" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "isProxy" BOOLEAN NOT NULL DEFAULT false,
    "isVpn" BOOLEAN NOT NULL DEFAULT false,
    "isTor" BOOLEAN NOT NULL DEFAULT false,
    "isDatacenter" BOOLEAN NOT NULL DEFAULT false,
    "proxyType" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "country" TEXT,
    "countryCode" TEXT,
    "isp" TEXT,
    "provider" TEXT,
    "action" TEXT NOT NULL DEFAULT 'LOGGED',
    "context" TEXT,
    "userId" TEXT,
    "userAgent" TEXT,
    "source" TEXT NOT NULL DEFAULT 'api',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProxyDetection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAlert" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessEmployee" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "position" TEXT,
    "salary" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatar" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "userId" TEXT,

    CONSTRAINT "BusinessEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LoanType" NOT NULL DEFAULT 'PERSONAL',
    "amount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 12.0,
    "term" INTEGER NOT NULL,
    "monthlyPayment" DOUBLE PRECISION NOT NULL,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingBalance" DOUBLE PRECISION NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "purpose" TEXT,
    "collateral" TEXT,
    "guarantorName" TEXT,
    "guarantorPhone" TEXT,
    "guarantorAddress" TEXT,
    "creditScore" INTEGER,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "disbursedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "nextPaymentDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "missedPayments" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "principal" DOUBLE PRECISION NOT NULL,
    "interest" DOUBLE PRECISION NOT NULL,
    "penalty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "type" "SavingsType" NOT NULL DEFAULT 'REGULAR',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 3.5,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "maturityDate" TIMESTAMP(3),
    "status" "SavingsStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "targetAmount" DOUBLE PRECISION,
    "totalInterest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastInterestAt" TIMESTAMP(3),
    "autoDebitAmount" DOUBLE PRECISION,
    "autoDebitDay" INTEGER,

    CONSTRAINT "SavingsAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SavingsTxType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "penalty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "reference" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestRate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "minRate" DOUBLE PRECISION NOT NULL,
    "maxRate" DOUBLE PRECISION NOT NULL,
    "defaultRate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterestRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 500,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "factors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemWallet" (
    "id" TEXT NOT NULL,
    "type" "SystemWalletType" NOT NULL,
    "name" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "description" TEXT,
    "publicAddress" TEXT NOT NULL,
    "privateKey" TEXT,
    "balanceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balancePi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceXAF" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyLimit" DOUBLE PRECISION NOT NULL DEFAULT 50000,
    "monthlyLimit" DOUBLE PRECISION NOT NULL DEFAULT 500000,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockReason" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastActivity" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT 'LOW',
    "factors" JSONB,
    "flagsCount" INTEGER NOT NULL DEFAULT 0,
    "lastEventAt" TIMESTAMP(3),
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmlRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'AMOUNT',
    "field" TEXT,
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "windowHours" INTEGER NOT NULL DEFAULT 24,
    "currency" TEXT,
    "action" TEXT NOT NULL DEFAULT 'FLAG',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmlRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuspiciousActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "transactionId" TEXT,
    "ruleId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SUSPICIOUS',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "amount" DOUBLE PRECISION,
    "currency" TEXT,
    "description" TEXT,
    "detectedBy" TEXT NOT NULL DEFAULT 'RULE',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuspiciousActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReserveSnapshot" (
    "id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "onChainHot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onChainCold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userLiabilities" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coverageRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'BALANCED',
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReserveSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "transactionId" TEXT,
    "account" TEXT NOT NULL,
    "description" TEXT,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL DEFAULT 'AUTO',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "network" TEXT,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColdWallet" (
    "id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "network" TEXT,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "custodian" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColdWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT,
    "transactionId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DISPUTE',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "reason" TEXT,
    "description" TEXT,
    "evidence" JSONB,
    "resolution" TEXT,
    "assignedTo" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangePair" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marginBps" INTEGER NOT NULL DEFAULT 50,
    "spreadBps" INTEGER NOT NULL DEFAULT 0,
    "minAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "liquidity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangePair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralProgram" (
    "id" TEXT NOT NULL DEFAULT 'GLOBAL_REFERRAL',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "signupBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "currency" TEXT NOT NULL DEFAULT 'PI',
    "tiers" JSONB,
    "minPayout" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralEarning" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'COMMISSION',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PI',
    "transactionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LimitPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'ALL',
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kycTier" TEXT NOT NULL DEFAULT 'ALL',
    "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kycFreeLimitPi" DOUBLE PRECISION,
    "kycMaxPerTxPi" DOUBLE PRECISION,
    "adminApprovalThresholdPi" DOUBLE PRECISION,
    "maxPerDay" INTEGER,
    "dailyTotalPi" DOUBLE PRECISION,
    "minPerTxPi" DOUBLE PRECISION,
    "bypassKyc" BOOLEAN,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LimitPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_refreshToken_key" ON "User"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_agentId_key" ON "User"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_piUserId_key" ON "User"("piUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_sidraAddress_key" ON "User"("sidraAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_xlmAddress_key" ON "User"("xlmAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_xrpAddress_key" ON "User"("xrpAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_usdtAddress_key" ON "User"("usdtAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_solAddress_key" ON "User"("solAddress");

-- CreateIndex
CREATE INDEX "AgentFloat_userId_idx" ON "AgentFloat"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentFloat_userId_currency_key" ON "AgentFloat"("userId", "currency");

-- CreateIndex
CREATE INDEX "P2PContact_userId_idx" ON "P2PContact"("userId");

-- CreateIndex
CREATE INDEX "P2PContact_isFavorite_idx" ON "P2PContact"("isFavorite");

-- CreateIndex
CREATE INDEX "P2PContact_contactId_idx" ON "P2PContact"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "P2PContact_userId_contactId_key" ON "P2PContact"("userId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_depositMemo_key" ON "Wallet"("depositMemo");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_depositMemo_idx" ON "Wallet"("depositMemo");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_currency_key" ON "Wallet"("userId", "currency");

-- CreateIndex
CREATE INDEX "Broadcast_active_idx" ON "Broadcast"("active");

-- CreateIndex
CREATE INDEX "Broadcast_category_idx" ON "Broadcast"("category");

-- CreateIndex
CREATE INDEX "Broadcast_createdAt_idx" ON "Broadcast"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStats_date_key" ON "DailyStats"("date");

-- CreateIndex
CREATE INDEX "Vault_userId_idx" ON "Vault"("userId");

-- CreateIndex
CREATE INDEX "Vault_status_idx" ON "Vault"("status");

-- CreateIndex
CREATE INDEX "Vault_userId_status_idx" ON "Vault"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VaultTransaction_reference_key" ON "VaultTransaction"("reference");

-- CreateIndex
CREATE INDEX "VaultTransaction_vaultId_idx" ON "VaultTransaction"("vaultId");

-- CreateIndex
CREATE INDEX "VaultTransaction_userId_idx" ON "VaultTransaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_blockchainTx_key" ON "Transaction"("blockchainTx");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_externalId_key" ON "Transaction"("externalId");

-- CreateIndex
CREATE INDEX "Transaction_fromUserId_idx" ON "Transaction"("fromUserId");

-- CreateIndex
CREATE INDEX "Transaction_toUserId_idx" ON "Transaction"("toUserId");

-- CreateIndex
CREATE INDEX "Transaction_reference_idx" ON "Transaction"("reference");

-- CreateIndex
CREATE INDEX "Transaction_externalId_idx" ON "Transaction"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "FlightBooking_paymentTransactionId_key" ON "FlightBooking"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "FlightBooking_userId_status_idx" ON "FlightBooking"("userId", "status");

-- CreateIndex
CREATE INDEX "FlightBooking_providerBookingId_idx" ON "FlightBooking"("providerBookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_userId_key" ON "Merchant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualCard_number_key" ON "VirtualCard"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_code_key" ON "PaymentRequest"("code");

-- CreateIndex
CREATE INDEX "PaymentRequest_requesterId_idx" ON "PaymentRequest"("requesterId");

-- CreateIndex
CREATE INDEX "PaymentRequest_recipientId_idx" ON "PaymentRequest"("recipientId");

-- CreateIndex
CREATE INDEX "PaymentRequest_status_idx" ON "PaymentRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "AuditLog_adminId_idx" ON "AuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminProfile_userId_key" ON "AdminProfile"("userId");

-- CreateIndex
CREATE INDEX "AdminProfile_userId_idx" ON "AdminProfile"("userId");

-- CreateIndex
CREATE INDEX "AdminProfile_active_idx" ON "AdminProfile"("active");

-- CreateIndex
CREATE INDEX "UserActivity_userId_idx" ON "UserActivity"("userId");

-- CreateIndex
CREATE INDEX "UserActivity_createdAt_idx" ON "UserActivity"("createdAt");

-- CreateIndex
CREATE INDEX "UserActivity_page_idx" ON "UserActivity"("page");

-- CreateIndex
CREATE INDEX "UserActivity_host_idx" ON "UserActivity"("host");

-- CreateIndex
CREATE UNIQUE INDEX "GuestSession_guestId_key" ON "GuestSession"("guestId");

-- CreateIndex
CREATE INDEX "GuestSession_guestId_idx" ON "GuestSession"("guestId");

-- CreateIndex
CREATE INDEX "GuestSession_lastSeenAt_idx" ON "GuestSession"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bank_name_key" ON "Bank"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Bank_code_key" ON "Bank"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Business_registrationNumber_key" ON "Business"("registrationNumber");

-- CreateIndex
CREATE INDEX "BusinessBankAccount_businessId_idx" ON "BusinessBankAccount"("businessId");

-- CreateIndex
CREATE INDEX "BusinessBankStatement_accountId_idx" ON "BusinessBankStatement"("accountId");

-- CreateIndex
CREATE INDEX "BusinessBankStatement_businessId_idx" ON "BusinessBankStatement"("businessId");

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE INDEX "SystemLog_source_idx" ON "SystemLog"("source");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_userId_idx" ON "SystemLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedIp_ip_key" ON "BlockedIp"("ip");

-- CreateIndex
CREATE INDEX "BlockedIp_ip_idx" ON "BlockedIp"("ip");

-- CreateIndex
CREATE INDEX "BlockedIp_active_idx" ON "BlockedIp"("active");

-- CreateIndex
CREATE INDEX "ProxyDetection_ip_idx" ON "ProxyDetection"("ip");

-- CreateIndex
CREATE INDEX "ProxyDetection_action_idx" ON "ProxyDetection"("action");

-- CreateIndex
CREATE INDEX "ProxyDetection_createdAt_idx" ON "ProxyDetection"("createdAt");

-- CreateIndex
CREATE INDEX "ProxyDetection_riskScore_idx" ON "ProxyDetection"("riskScore");

-- CreateIndex
CREATE UNIQUE INDEX "BankAdmin_userId_key" ON "BankAdmin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessInvoice_invoiceNumber_key" ON "BusinessInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_reference_key" ON "Loan"("reference");

-- CreateIndex
CREATE INDEX "Loan_userId_idx" ON "Loan"("userId");

-- CreateIndex
CREATE INDEX "Loan_status_idx" ON "Loan"("status");

-- CreateIndex
CREATE INDEX "Loan_type_idx" ON "Loan"("type");

-- CreateIndex
CREATE INDEX "Loan_reference_idx" ON "Loan"("reference");

-- CreateIndex
CREATE INDEX "LoanPayment_loanId_idx" ON "LoanPayment"("loanId");

-- CreateIndex
CREATE INDEX "LoanPayment_dueDate_idx" ON "LoanPayment"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsAccount_accountNumber_key" ON "SavingsAccount"("accountNumber");

-- CreateIndex
CREATE INDEX "SavingsAccount_userId_idx" ON "SavingsAccount"("userId");

-- CreateIndex
CREATE INDEX "SavingsAccount_accountNumber_idx" ON "SavingsAccount"("accountNumber");

-- CreateIndex
CREATE INDEX "SavingsAccount_status_idx" ON "SavingsAccount"("status");

-- CreateIndex
CREATE INDEX "SavingsAccount_userId_status_idx" ON "SavingsAccount"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsTransaction_reference_key" ON "SavingsTransaction"("reference");

-- CreateIndex
CREATE INDEX "SavingsTransaction_accountId_idx" ON "SavingsTransaction"("accountId");

-- CreateIndex
CREATE INDEX "SavingsTransaction_userId_idx" ON "SavingsTransaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditScore_userId_key" ON "CreditScore"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemWallet_type_key" ON "SystemWallet"("type");

-- CreateIndex
CREATE INDEX "SystemWallet_type_idx" ON "SystemWallet"("type");

-- CreateIndex
CREATE INDEX "SystemWallet_isLocked_idx" ON "SystemWallet"("isLocked");

-- CreateIndex
CREATE UNIQUE INDEX "RiskProfile_userId_key" ON "RiskProfile"("userId");

-- CreateIndex
CREATE INDEX "RiskProfile_level_idx" ON "RiskProfile"("level");

-- CreateIndex
CREATE INDEX "RiskProfile_score_idx" ON "RiskProfile"("score");

-- CreateIndex
CREATE INDEX "AmlRule_enabled_idx" ON "AmlRule"("enabled");

-- CreateIndex
CREATE INDEX "AmlRule_type_idx" ON "AmlRule"("type");

-- CreateIndex
CREATE INDEX "SuspiciousActivity_userId_idx" ON "SuspiciousActivity"("userId");

-- CreateIndex
CREATE INDEX "SuspiciousActivity_status_idx" ON "SuspiciousActivity"("status");

-- CreateIndex
CREATE INDEX "SuspiciousActivity_severity_idx" ON "SuspiciousActivity"("severity");

-- CreateIndex
CREATE INDEX "SuspiciousActivity_createdAt_idx" ON "SuspiciousActivity"("createdAt");

-- CreateIndex
CREATE INDEX "ReserveSnapshot_asset_idx" ON "ReserveSnapshot"("asset");

-- CreateIndex
CREATE INDEX "ReserveSnapshot_createdAt_idx" ON "ReserveSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_account_idx" ON "LedgerEntry"("account");

-- CreateIndex
CREATE INDEX "LedgerEntry_currency_idx" ON "LedgerEntry"("currency");

-- CreateIndex
CREATE INDEX "LedgerEntry_entryDate_idx" ON "LedgerEntry"("entryDate");

-- CreateIndex
CREATE INDEX "WithdrawalAddress_userId_idx" ON "WithdrawalAddress"("userId");

-- CreateIndex
CREATE INDEX "WithdrawalAddress_asset_idx" ON "WithdrawalAddress"("asset");

-- CreateIndex
CREATE INDEX "WithdrawalAddress_status_idx" ON "WithdrawalAddress"("status");

-- CreateIndex
CREATE INDEX "ColdWallet_asset_idx" ON "ColdWallet"("asset");

-- CreateIndex
CREATE INDEX "ColdWallet_isActive_idx" ON "ColdWallet"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_reference_key" ON "Dispute"("reference");

-- CreateIndex
CREATE INDEX "Dispute_userId_idx" ON "Dispute"("userId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_type_idx" ON "Dispute"("type");

-- CreateIndex
CREATE INDEX "ExchangePair_enabled_idx" ON "ExchangePair"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangePair_base_quote_key" ON "ExchangePair"("base", "quote");

-- CreateIndex
CREATE INDEX "ReferralEarning_referrerId_idx" ON "ReferralEarning"("referrerId");

-- CreateIndex
CREATE INDEX "ReferralEarning_status_idx" ON "ReferralEarning"("status");

-- CreateIndex
CREATE INDEX "LimitPolicy_active_idx" ON "LimitPolicy"("active");

-- CreateIndex
CREATE INDEX "LimitPolicy_scope_idx" ON "LimitPolicy"("scope");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentFloat" ADD CONSTRAINT "AgentFloat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "P2PContact" ADD CONSTRAINT "P2PContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "P2PContact" ADD CONSTRAINT "P2PContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapQuote" ADD CONSTRAINT "SwapQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vault" ADD CONSTRAINT "Vault_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultTransaction" ADD CONSTRAINT "VaultTransaction_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staking" ADD CONSTRAINT "Staking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fromWalletId_fkey" FOREIGN KEY ("fromWalletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_qrPaymentId_fkey" FOREIGN KEY ("qrPaymentId") REFERENCES "QRPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_toWalletId_fkey" FOREIGN KEY ("toWalletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightBooking" ADD CONSTRAINT "FlightBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightBooking" ADD CONSTRAINT "FlightBooking_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualCard" ADD CONSTRAINT "VirtualCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRPayment" ADD CONSTRAINT "QRPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityLog" ADD CONSTRAINT "SecurityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessBankAccount" ADD CONSTRAINT "BusinessBankAccount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BusinessBankStatement" ADD CONSTRAINT "BusinessBankStatement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BusinessBankAccount"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BusinessBankStatement" ADD CONSTRAINT "BusinessBankStatement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BankAdmin" ADD CONSTRAINT "BankAdmin_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BankAlert" ADD CONSTRAINT "BankAlert_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BusinessEmployee" ADD CONSTRAINT "BusinessEmployee_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BusinessInvoice" ADD CONSTRAINT "BusinessInvoice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsAccount" ADD CONSTRAINT "SavingsAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsTransaction" ADD CONSTRAINT "SavingsTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SavingsAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditScore" ADD CONSTRAINT "CreditScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

