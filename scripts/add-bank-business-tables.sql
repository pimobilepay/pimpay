-- Migration: Add Bank and Business tables with new roles
-- Date: 2026-03-24

-- Add new enum values to UserRole
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BANK_ADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'BANK_ADMIN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BUSINESS_ADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
        ALTER TYPE "UserRole" ADD VALUE 'BUSINESS_ADMIN';
    END IF;
END $$;

-- Create BankStatus enum
DO $$ BEGIN
    CREATE TYPE "BankStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create BankType enum
DO $$ BEGIN
    CREATE TYPE "BankType" AS ENUM ('CENTRAL_BANK', 'COMMERCIAL_BANK', 'MICROFINANCE', 'CREDIT_UNION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create BusinessStatus enum
DO $$ BEGIN
    CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create BusinessType enum
DO $$ BEGIN
    CREATE TYPE "BusinessType" AS ENUM ('SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'CORPORATION', 'LLC', 'COOPERATIVE', 'NGO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create BusinessCategory enum
DO $$ BEGIN
    CREATE TYPE "BusinessCategory" AS ENUM ('RETAIL', 'WHOLESALE', 'SERVICES', 'MANUFACTURING', 'TECHNOLOGY', 'HOSPITALITY', 'HEALTHCARE', 'EDUCATION', 'TRANSPORT', 'AGRICULTURE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Bank table
CREATE TABLE IF NOT EXISTS "Bank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "BankType" NOT NULL DEFAULT 'COMMERCIAL_BANK',
    "status" "BankStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CG',
    "licenseNumber" TEXT,
    "swiftCode" TEXT,
    "registrationNumber" TEXT,
    "dailyTransferLimit" DOUBLE PRECISION NOT NULL DEFAULT 100000000,
    "monthlyTransferLimit" DOUBLE PRECISION NOT NULL DEFAULT 1000000000,
    "transactionFee" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "reserveBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minReserveRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "amlCompliant" BOOLEAN NOT NULL DEFAULT false,
    "lastAuditDate" TIMESTAMP(3),
    "logoUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints for Bank
CREATE UNIQUE INDEX IF NOT EXISTS "Bank_name_key" ON "Bank"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Bank_code_key" ON "Bank"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "Bank_licenseNumber_key" ON "Bank"("licenseNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Bank_swiftCode_key" ON "Bank"("swiftCode");
CREATE INDEX IF NOT EXISTS "Bank_code_idx" ON "Bank"("code");
CREATE INDEX IF NOT EXISTS "Bank_status_idx" ON "Bank"("status");

-- Create BankAdmin table
CREATE TABLE IF NOT EXISTS "BankAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAdmin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BankAdmin_userId_key" ON "BankAdmin"("userId");
CREATE INDEX IF NOT EXISTS "BankAdmin_bankId_idx" ON "BankAdmin"("bankId");
CREATE INDEX IF NOT EXISTS "BankAdmin_userId_idx" ON "BankAdmin"("userId");

-- Create InterbankTransfer table
CREATE TABLE IF NOT EXISTS "InterbankTransfer" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "fromBankId" TEXT NOT NULL,
    "toBankId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "type" TEXT NOT NULL DEFAULT 'SWIFT',
    "purpose" TEXT,
    "description" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterbankTransfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InterbankTransfer_reference_key" ON "InterbankTransfer"("reference");
CREATE INDEX IF NOT EXISTS "InterbankTransfer_fromBankId_idx" ON "InterbankTransfer"("fromBankId");
CREATE INDEX IF NOT EXISTS "InterbankTransfer_toBankId_idx" ON "InterbankTransfer"("toBankId");
CREATE INDEX IF NOT EXISTS "InterbankTransfer_reference_idx" ON "InterbankTransfer"("reference");

-- Create BankComplianceReport table
CREATE TABLE IF NOT EXISTS "BankComplianceReport" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "findings" JSONB,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankComplianceReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BankComplianceReport_bankId_idx" ON "BankComplianceReport"("bankId");
CREATE INDEX IF NOT EXISTS "BankComplianceReport_type_idx" ON "BankComplianceReport"("type");

-- Create BankAlert table
CREATE TABLE IF NOT EXISTS "BankAlert" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "BankAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BankAlert_bankId_idx" ON "BankAlert"("bankId");
CREATE INDEX IF NOT EXISTS "BankAlert_severity_idx" ON "BankAlert"("severity");
CREATE INDEX IF NOT EXISTS "BankAlert_isResolved_idx" ON "BankAlert"("isResolved");

-- Create Business table
CREATE TABLE IF NOT EXISTS "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "taxId" TEXT,
    "type" "BusinessType" NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
    "category" "BusinessCategory" NOT NULL DEFAULT 'OTHER',
    "status" "BusinessStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CG',
    "postalCode" TEXT,
    "bankAccountNumber" TEXT,
    "bankName" TEXT,
    "bankCode" TEXT,
    "dailyTransactionLimit" DOUBLE PRECISION NOT NULL DEFAULT 10000000,
    "monthlyTransactionLimit" DOUBLE PRECISION NOT NULL DEFAULT 100000000,
    "paymentFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NONE',
    "logoUrl" TEXT,
    "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Business_registrationNumber_key" ON "Business"("registrationNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Business_taxId_key" ON "Business"("taxId");
CREATE INDEX IF NOT EXISTS "Business_registrationNumber_idx" ON "Business"("registrationNumber");
CREATE INDEX IF NOT EXISTS "Business_status_idx" ON "Business"("status");
CREATE INDEX IF NOT EXISTS "Business_category_idx" ON "Business"("category");

-- Create BusinessAdmin table
CREATE TABLE IF NOT EXISTS "BusinessAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MANAGER',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessAdmin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessAdmin_userId_key" ON "BusinessAdmin"("userId");
CREATE INDEX IF NOT EXISTS "BusinessAdmin_businessId_idx" ON "BusinessAdmin"("businessId");
CREATE INDEX IF NOT EXISTS "BusinessAdmin_userId_idx" ON "BusinessAdmin"("userId");

-- Create BusinessEmployee table
CREATE TABLE IF NOT EXISTS "BusinessEmployee" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "department" TEXT,
    "salary" DOUBLE PRECISION,
    "hireDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessEmployee_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BusinessEmployee_businessId_idx" ON "BusinessEmployee"("businessId");

-- Create BusinessPayment table
CREATE TABLE IF NOT EXISTS "BusinessPayment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "type" TEXT NOT NULL DEFAULT 'SALE',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessPayment_reference_key" ON "BusinessPayment"("reference");
CREATE INDEX IF NOT EXISTS "BusinessPayment_businessId_idx" ON "BusinessPayment"("businessId");
CREATE INDEX IF NOT EXISTS "BusinessPayment_reference_idx" ON "BusinessPayment"("reference");
CREATE INDEX IF NOT EXISTS "BusinessPayment_status_idx" ON "BusinessPayment"("status");

-- Create BusinessInvoice table
CREATE TABLE IF NOT EXISTS "BusinessInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessInvoice_invoiceNumber_key" ON "BusinessInvoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "BusinessInvoice_businessId_idx" ON "BusinessInvoice"("businessId");
CREATE INDEX IF NOT EXISTS "BusinessInvoice_status_idx" ON "BusinessInvoice"("status");

-- Create BusinessProduct table
CREATE TABLE IF NOT EXISTS "BusinessProduct" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessProduct_businessId_sku_key" ON "BusinessProduct"("businessId", "sku");
CREATE INDEX IF NOT EXISTS "BusinessProduct_businessId_idx" ON "BusinessProduct"("businessId");
CREATE INDEX IF NOT EXISTS "BusinessProduct_category_idx" ON "BusinessProduct"("category");

-- Add foreign key constraints
ALTER TABLE "BankAdmin" DROP CONSTRAINT IF EXISTS "BankAdmin_bankId_fkey";
ALTER TABLE "BankAdmin" ADD CONSTRAINT "BankAdmin_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InterbankTransfer" DROP CONSTRAINT IF EXISTS "InterbankTransfer_fromBankId_fkey";
ALTER TABLE "InterbankTransfer" ADD CONSTRAINT "InterbankTransfer_fromBankId_fkey" FOREIGN KEY ("fromBankId") REFERENCES "Bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InterbankTransfer" DROP CONSTRAINT IF EXISTS "InterbankTransfer_toBankId_fkey";
ALTER TABLE "InterbankTransfer" ADD CONSTRAINT "InterbankTransfer_toBankId_fkey" FOREIGN KEY ("toBankId") REFERENCES "Bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BankComplianceReport" DROP CONSTRAINT IF EXISTS "BankComplianceReport_bankId_fkey";
ALTER TABLE "BankComplianceReport" ADD CONSTRAINT "BankComplianceReport_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankAlert" DROP CONSTRAINT IF EXISTS "BankAlert_bankId_fkey";
ALTER TABLE "BankAlert" ADD CONSTRAINT "BankAlert_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessAdmin" DROP CONSTRAINT IF EXISTS "BusinessAdmin_businessId_fkey";
ALTER TABLE "BusinessAdmin" ADD CONSTRAINT "BusinessAdmin_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessEmployee" DROP CONSTRAINT IF EXISTS "BusinessEmployee_businessId_fkey";
ALTER TABLE "BusinessEmployee" ADD CONSTRAINT "BusinessEmployee_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessPayment" DROP CONSTRAINT IF EXISTS "BusinessPayment_businessId_fkey";
ALTER TABLE "BusinessPayment" ADD CONSTRAINT "BusinessPayment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessInvoice" DROP CONSTRAINT IF EXISTS "BusinessInvoice_businessId_fkey";
ALTER TABLE "BusinessInvoice" ADD CONSTRAINT "BusinessInvoice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessProduct" DROP CONSTRAINT IF EXISTS "BusinessProduct_businessId_fkey";
ALTER TABLE "BusinessProduct" ADD CONSTRAINT "BusinessProduct_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert sample Bank (Banque Centrale)
INSERT INTO "Bank" ("id", "name", "code", "type", "status", "email", "city", "country", "description", "updatedAt")
VALUES (
    'bank_central_001',
    'Banque Centrale du Congo',
    'BCC',
    'CENTRAL_BANK',
    'ACTIVE',
    'contact@bcc.cg',
    'Brazzaville',
    'CG',
    'Banque Centrale - Institution de regulation monetaire',
    NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Insert sample Business
INSERT INTO "Business" ("id", "name", "registrationNumber", "type", "category", "status", "email", "city", "country", "description", "updatedAt")
VALUES (
    'business_demo_001',
    'PIMPAY Enterprise Demo',
    'RC-BZV-2024-001',
    'CORPORATION',
    'TECHNOLOGY',
    'ACTIVE',
    'contact@pimpay-demo.cg',
    'Brazzaville',
    'CG',
    'Entreprise de demonstration PIMPAY',
    NOW()
) ON CONFLICT ("id") DO NOTHING;
