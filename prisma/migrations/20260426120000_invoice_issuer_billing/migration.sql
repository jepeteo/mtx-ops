-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "invoiceIssuer" JSONB;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "billingRecipient" TEXT,
ADD COLUMN "billingEmail" TEXT,
ADD COLUMN "billingAddress" TEXT,
ADD COLUMN "billingVatId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "billingAddress" TEXT,
ADD COLUMN "billingVatId" TEXT;
