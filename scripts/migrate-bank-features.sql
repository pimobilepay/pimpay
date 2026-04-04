-- Add Loan table for bank lending management
CREATE TABLE IF NOT EXISTS "Loan" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PERSONAL',
    "amount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 12.0,
    "term" INTEGER NOT NULL,
    "monthlyPayment" DOUBLE PRECISION NOT NULL,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingBalance" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "purpose" TEXT,
    "collateral" TEXT,
    "guarantorName" TEXT,
    "guarantorPhone" TEXT,
    "guarantorAddress" TEXT,
    "creditScore" INTEGER,
    "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "disbursedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "nextPaymentDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "missedPayments" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- Add LoanPayment table for tracking loan payments
CREATE TABLE IF NOT EXISTS "LoanPayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "principal" DOUBLE PRECISION NOT NULL,
    "interest" DOUBLE PRECISION NOT NULL,
    "penalty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- Add SavingsAccount table for savings management
CREATE TABLE IF NOT EXISTS "SavingsAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'REGULAR',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 3.5,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "maturityDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsAccount_pkey" PRIMARY KEY ("id")
);

-- Add InterestRate table for configuring rates
CREATE TABLE IF NOT EXISTS "InterestRate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "minRate" DOUBLE PRECISION NOT NULL,
    "maxRate" DOUBLE PRECISION NOT NULL,
    "defaultRate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterestRate_pkey" PRIMARY KEY ("id")
);

-- Add CreditScore table for credit scoring
CREATE TABLE IF NOT EXISTS "CreditScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 500,
    "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "factors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditScore_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on Loan reference
CREATE UNIQUE INDEX IF NOT EXISTS "Loan_reference_key" ON "Loan"("reference");

-- Create unique constraint on SavingsAccount accountNumber
CREATE UNIQUE INDEX IF NOT EXISTS "SavingsAccount_accountNumber_key" ON "SavingsAccount"("accountNumber");

-- Create unique constraint on CreditScore userId
CREATE UNIQUE INDEX IF NOT EXISTS "CreditScore_userId_key" ON "CreditScore"("userId");

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "Loan_userId_idx" ON "Loan"("userId");
CREATE INDEX IF NOT EXISTS "Loan_status_idx" ON "Loan"("status");
CREATE INDEX IF NOT EXISTS "Loan_type_idx" ON "Loan"("type");
CREATE INDEX IF NOT EXISTS "Loan_reference_idx" ON "Loan"("reference");
CREATE INDEX IF NOT EXISTS "LoanPayment_loanId_idx" ON "LoanPayment"("loanId");
CREATE INDEX IF NOT EXISTS "LoanPayment_dueDate_idx" ON "LoanPayment"("dueDate");
CREATE INDEX IF NOT EXISTS "SavingsAccount_userId_idx" ON "SavingsAccount"("userId");
CREATE INDEX IF NOT EXISTS "SavingsAccount_accountNumber_idx" ON "SavingsAccount"("accountNumber");

-- Add foreign key constraints
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavingsAccount" ADD CONSTRAINT "SavingsAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditScore" ADD CONSTRAINT "CreditScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default interest rates
INSERT INTO "InterestRate" ("id", "type", "minRate", "maxRate", "defaultRate", "currency")
VALUES 
    ('rate_personal', 'LOAN_PERSONAL', 10.0, 18.0, 12.0, 'XAF'),
    ('rate_business', 'LOAN_BUSINESS', 8.0, 15.0, 10.0, 'XAF'),
    ('rate_mortgage', 'LOAN_MORTGAGE', 5.0, 10.0, 7.0, 'XAF'),
    ('rate_auto', 'LOAN_AUTO', 8.0, 14.0, 11.0, 'XAF'),
    ('rate_education', 'LOAN_EDUCATION', 6.0, 12.0, 8.0, 'XAF'),
    ('rate_savings_regular', 'SAVINGS_REGULAR', 2.0, 5.0, 3.5, 'XAF'),
    ('rate_savings_fixed', 'SAVINGS_FIXED_DEPOSIT', 4.0, 8.0, 6.0, 'XAF')
ON CONFLICT DO NOTHING;
