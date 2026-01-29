import { query, queryOne } from "./db";
import { generateInvoicePDF, generateReceiptPDF, InvoiceData, ReceiptData } from "./pdf";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getPresignedUrl } from "./s3";

// ============================================
// Types
// ============================================

export interface InvoiceGenerationOptions {
  endDate?: Date; // Defaults to yesterday
  generatedBy?: string; // User ID if manual, null if cron
}

export interface UsageByTier {
  productId: string;
  tierName: string | null;
  sessionCount: number;
  creditsPerSession: number;
  totalCredits: number;
}

export interface UnpaidInvoice {
  id: string;
  invoiceNumber: string;
  unpaidCredits: number;
}

export interface GeneratedInvoice {
  id: string;
  invoiceNumber: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  totalUsageCredits: number;
  previousBalanceCredits: number;
  amountDueCredits: number;
  amountDueMyr: number;
  s3Key: string;
  status: string;
}

export interface PaymentInput {
  amountCredits: number;
  paymentDate: Date;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  recordedBy?: string;
}

export interface RecordedPayment {
  id: string;
  receiptNumber: string;
  amountCredits: number;
  amountMyr: number;
  s3Key: string;
  invoiceStatus: string;
  newBalance: number;
}

// ============================================
// Constants
// ============================================

const TIMEZONE = "Asia/Kuala_Lumpur";
const PAYMENT_TERMS_DAYS = 14;
const CREDITS_PER_MYR = 10;
const S3_BUCKET = process.env.S3_KYC_BUCKET || "trueidentity-kyc-documents-dev";

// ============================================
// S3 Client
// ============================================

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-5",
});

// ============================================
// Invoice Number Generation
// ============================================

export async function getNextInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `INV-${year}-${month}-`;

  const result = await queryOne<{ max_num: string | null }>(`
    SELECT MAX(invoice_number) as max_num 
    FROM invoice 
    WHERE invoice_number LIKE $1
  `, [`${prefix}%`]);

  let nextNum = 1;
  if (result?.max_num) {
    const lastNum = parseInt(result.max_num.split("-").pop() || "0", 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

export async function getNextReceiptNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `RCP-${year}-${month}-`;

  const result = await queryOne<{ max_num: string | null }>(`
    SELECT MAX(receipt_number) as max_num 
    FROM payment 
    WHERE receipt_number LIKE $1
  `, [`${prefix}%`]);

  let nextNum = 1;
  if (result?.max_num) {
    const lastNum = parseInt(result.max_num.split("-").pop() || "0", 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

// ============================================
// Billing Period Calculation
// ============================================

export async function calculateBillingPeriod(
  clientId: string,
  targetEndDate: Date
): Promise<{ periodStart: Date; periodEnd: Date }> {
  // Find the last successfully completed invoice for this client
  // Only consider invoices that have an S3 key (PDF was generated)
  // Exclude void, pending, and failed invoices
  const lastInvoice = await queryOne<{ period_end: string }>(`
    SELECT period_end 
    FROM invoice 
    WHERE client_id = $1 
      AND status IN ('generated', 'partial', 'paid', 'superseded')
      AND s3_key IS NOT NULL
      AND s3_key != ''
    ORDER BY period_end DESC 
    LIMIT 1
  `, [clientId]);

  let periodStart: Date;
  if (lastInvoice) {
    // Start day after last invoice ended
    periodStart = new Date(lastInvoice.period_end);
    periodStart.setDate(periodStart.getDate() + 1);
    periodStart.setHours(0, 0, 0, 0);
  } else {
    // First invoice - start from client creation date
    const client = await queryOne<{ created_at: string }>(`
      SELECT created_at FROM client WHERE id = $1
    `, [clientId]);
    
    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }
    periodStart = new Date(client.created_at);
    periodStart.setHours(0, 0, 0, 0);
  }

  // Period end is the target date at end of day
  const periodEnd = new Date(targetEndDate);
  periodEnd.setHours(23, 59, 59, 999);

  return { periodStart, periodEnd };
}

// ============================================
// Usage Query by Tier
// ============================================

export async function queryUsageByTier(
  clientId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<UsageByTier[]> {
  // Get all billed sessions in the period with their credit ledger entries
  const usage = await query<{
    product_id: string;
    tier_name: string | null;
    session_count: string;
    credits_per_session: string;
    total_credits: string;
  }>(`
    WITH billed_sessions AS (
      SELECT 
        ks.id,
        cl.product_id,
        cl.amount,
        cl.created_at as billed_at
      FROM kyc_session ks
      JOIN credit_ledger cl ON cl.reference_id = ks.id AND cl.type = 'usage'
      WHERE ks.client_id = $1
        AND ks.billed = true
        AND cl.created_at >= $2
        AND cl.created_at <= $3
    ),
    session_tiers AS (
      SELECT 
        bs.id,
        bs.product_id,
        ABS(bs.amount) as credits_used,
        pt.tier_name,
        pt.credits_per_session
      FROM billed_sessions bs
      LEFT JOIN pricing_tier pt ON pt.client_id = $1 
        AND pt.product_id = bs.product_id
        AND pt.credits_per_session = ABS(bs.amount)
    )
    SELECT 
      product_id,
      COALESCE(tier_name, 'Default') as tier_name,
      COUNT(*) as session_count,
      credits_used as credits_per_session,
      SUM(credits_used) as total_credits
    FROM session_tiers
    GROUP BY product_id, tier_name, credits_used
    ORDER BY product_id, tier_name
  `, [clientId, periodStart.toISOString(), periodEnd.toISOString()]);

  return usage.map(row => ({
    productId: row.product_id,
    tierName: row.tier_name,
    sessionCount: parseInt(row.session_count, 10),
    creditsPerSession: parseInt(row.credits_per_session, 10),
    totalCredits: parseInt(row.total_credits, 10),
  }));
}

// ============================================
// Unpaid Invoices Query
// ============================================

export async function getUnpaidInvoices(clientId: string): Promise<UnpaidInvoice[]> {
  const invoices = await query<{
    id: string;
    invoice_number: string;
    unpaid_credits: string;
  }>(`
    SELECT 
      id, 
      invoice_number,
      amount_due_credits - amount_paid_credits as unpaid_credits
    FROM invoice 
    WHERE client_id = $1 
      AND status IN ('generated', 'partial')
      AND amount_paid_credits < amount_due_credits
    ORDER BY period_end ASC
  `, [clientId]);

  return invoices.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    unpaidCredits: parseInt(inv.unpaid_credits, 10),
  }));
}

// ============================================
// Client Balance Query
// ============================================

export async function getClientBalance(clientId: string): Promise<number> {
  const result = await queryOne<{ balance: string | null }>(`
    SELECT balance_after as balance 
    FROM credit_ledger 
    WHERE client_id = $1 
    ORDER BY created_at DESC 
    LIMIT 1
  `, [clientId]);

  return result?.balance ? parseInt(result.balance, 10) : 0;
}

// ============================================
// Generate Invoice
// ============================================

export async function generateInvoice(
  clientId: string,
  options: InvoiceGenerationOptions = {}
): Promise<GeneratedInvoice> {
  // Default end date is yesterday
  const endDate = options.endDate || (() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  })();

  // Calculate billing period
  const { periodStart, periodEnd } = await calculateBillingPeriod(clientId, endDate);

  // Check if period is valid
  if (periodStart > periodEnd) {
    throw new Error("No billable period available. Start date is after end date.");
  }

  // Get client details
  const client = await queryOne<{
    id: string;
    name: string;
    code: string;
    contact_email: string | null;
    contact_phone: string | null;
    company_registration: string | null;
  }>(`SELECT id, name, code, contact_email, contact_phone, company_registration FROM client WHERE id = $1`, [clientId]);

  if (!client) {
    throw new Error(`Client not found: ${clientId}`);
  }

  // Get usage by tier
  const usage = await queryUsageByTier(clientId, periodStart, periodEnd);
  const totalUsageCredits = usage.reduce((sum, u) => sum + u.totalCredits, 0);

  // Get unpaid invoices
  const unpaidInvoices = await getUnpaidInvoices(clientId);
  const previousBalanceCredits = unpaidInvoices.reduce((sum, inv) => sum + inv.unpaidCredits, 0);

  // Get current balance
  const currentBalance = await getClientBalance(clientId);

  // Calculate amount due
  const amountDueCredits = Math.max(0, -currentBalance);
  const amountDueMyr = amountDueCredits / CREDITS_PER_MYR;

  // Generate invoice number
  const invoiceNumber = await getNextInvoiceNumber();

  // Calculate due date (14 days from now)
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + PAYMENT_TERMS_DAYS);

  // First, clean up any failed/pending invoices for this client
  await query(`
    DELETE FROM invoice 
    WHERE client_id = $1 
      AND status = 'pending'
      AND generated_at < NOW() - INTERVAL '1 hour'
  `, [clientId]);

  // Create invoice record with 'pending' status - will be updated to 'generated' after PDF upload
  const invoiceResult = await queryOne<{ id: string }>(`
    INSERT INTO invoice (
      client_id, invoice_number, period_start, period_end, due_date,
      total_usage_credits, previous_balance_credits, credit_balance_at_generation,
      amount_due_credits, amount_due_myr, s3_key, status, generated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
  `, [
    clientId,
    invoiceNumber,
    periodStart.toISOString(),
    periodEnd.toISOString(),
    dueDate.toISOString().split("T")[0],
    totalUsageCredits,
    previousBalanceCredits,
    currentBalance,
    amountDueCredits,
    amountDueMyr,
    "", // Empty s3_key until PDF is uploaded
    "pending", // Will be updated to 'generated' after PDF upload
    options.generatedBy || null,
  ]);

  if (!invoiceResult) {
    throw new Error("Failed to create invoice record");
  }

  const invoiceId = invoiceResult.id;
  const s3Key = `invoices/${clientId}/${invoiceId}.pdf`;

  // Create line items for usage
  for (const usageItem of usage) {
    await query(`
      INSERT INTO invoice_line_item (
        invoice_id, line_type, product_id, tier_name, 
        session_count, credits_per_session, total_credits, total_myr
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      invoiceId,
      "usage",
      usageItem.productId,
      usageItem.tierName,
      usageItem.sessionCount,
      usageItem.creditsPerSession,
      usageItem.totalCredits,
      usageItem.totalCredits / CREDITS_PER_MYR,
    ]);
  }

  // Create line items for previous unpaid invoices and mark them as superseded
  for (const unpaid of unpaidInvoices) {
    await query(`
      INSERT INTO invoice_line_item (
        invoice_id, line_type, reference_invoice_id, reference_invoice_number,
        total_credits, total_myr
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      invoiceId,
      "previous_balance",
      unpaid.id,
      unpaid.invoiceNumber,
      unpaid.unpaidCredits,
      unpaid.unpaidCredits / CREDITS_PER_MYR,
    ]);

    // Mark the old invoice as superseded
    await query(`
      UPDATE invoice 
      SET status = 'superseded', superseded_by_invoice_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [invoiceId, unpaid.id]);
  }

  // Prepare PDF data
  const pdfData: InvoiceData = {
    invoiceNumber,
    generatedAt: now,
    dueDate,
    periodStart,
    periodEnd,
    client: {
      name: client.name,
      code: client.code,
      contactEmail: client.contact_email || undefined,
      contactPhone: client.contact_phone || undefined,
      companyRegistration: client.company_registration || undefined,
    },
    lineItems: [
      ...usage.map(u => ({
        lineType: "usage" as const,
        productId: u.productId,
        tierName: u.tierName || undefined,
        sessionCount: u.sessionCount,
        creditsPerSession: u.creditsPerSession,
        totalCredits: u.totalCredits,
        totalMyr: u.totalCredits / CREDITS_PER_MYR,
      })),
      ...unpaidInvoices.map(inv => ({
        lineType: "previous_balance" as const,
        referenceInvoiceNumber: inv.invoiceNumber,
        totalCredits: inv.unpaidCredits,
        totalMyr: inv.unpaidCredits / CREDITS_PER_MYR,
      })),
    ],
    summary: {
      totalUsageCredits,
      previousBalanceCredits,
      amountDueCredits,
      amountDueMyr,
    },
  };

  // Generate PDF and upload to S3
  try {
    const pdfBuffer = await generateInvoicePDF(pdfData);

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    }));

    // Update invoice to 'generated' status with s3_key
    await query(`
      UPDATE invoice 
      SET status = 'generated', s3_key = $1, updated_at = NOW()
      WHERE id = $2
    `, [s3Key, invoiceId]);

  } catch (pdfError) {
    // Clean up the failed invoice record
    console.error("Failed to generate/upload PDF, cleaning up invoice:", pdfError);
    await query(`DELETE FROM invoice WHERE id = $1`, [invoiceId]);
    throw pdfError;
  }

  return {
    id: invoiceId,
    invoiceNumber,
    periodStart,
    periodEnd,
    dueDate,
    totalUsageCredits,
    previousBalanceCredits,
    amountDueCredits,
    amountDueMyr,
    s3Key,
    status: "generated",
  };
}

// ============================================
// Record Payment
// ============================================

export async function recordPayment(
  invoiceId: string,
  payment: PaymentInput
): Promise<RecordedPayment> {
  // Get invoice details
  const invoice = await queryOne<{
    id: string;
    client_id: string;
    invoice_number: string;
    amount_due_credits: string;
    amount_paid_credits: string;
    status: string;
  }>(`
    SELECT id, client_id, invoice_number, amount_due_credits, amount_paid_credits, status
    FROM invoice WHERE id = $1
  `, [invoiceId]);

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  if (invoice.status === "paid" || invoice.status === "void" || invoice.status === "superseded") {
    throw new Error(`Cannot record payment for invoice with status: ${invoice.status}`);
  }

  const amountDue = parseInt(invoice.amount_due_credits, 10);
  const amountPaid = parseInt(invoice.amount_paid_credits, 10);
  const remainingDue = amountDue - amountPaid;

  // Cap payment at remaining amount
  const paymentAmount = Math.min(payment.amountCredits, remainingDue);
  const paymentMyr = paymentAmount / CREDITS_PER_MYR;

  // Get client details
  const client = await queryOne<{ name: string; code: string }>(`
    SELECT name, code FROM client WHERE id = $1
  `, [invoice.client_id]);

  if (!client) {
    throw new Error(`Client not found: ${invoice.client_id}`);
  }

  // Generate receipt number
  const receiptNumber = await getNextReceiptNumber();

  // Create payment record
  const paymentResult = await queryOne<{ id: string }>(`
    INSERT INTO payment (
      invoice_id, client_id, amount_credits, amount_myr,
      payment_date, payment_method, payment_reference,
      receipt_number, s3_key, recorded_by, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  `, [
    invoiceId,
    invoice.client_id,
    paymentAmount,
    paymentMyr,
    payment.paymentDate.toISOString().split("T")[0],
    payment.paymentMethod || null,
    payment.paymentReference || null,
    receiptNumber,
    `receipts/${invoice.client_id}/${receiptNumber}.pdf`, // Placeholder
    payment.recordedBy || null,
    payment.notes || null,
  ]);

  if (!paymentResult) {
    throw new Error("Failed to create payment record");
  }

  const paymentId = paymentResult.id;
  const s3Key = `receipts/${invoice.client_id}/${paymentId}.pdf`;

  // Update s3_key
  await query(`UPDATE payment SET s3_key = $1 WHERE id = $2`, [s3Key, paymentId]);

  // Update invoice
  const newAmountPaid = amountPaid + paymentAmount;
  const newStatus = newAmountPaid >= amountDue ? "paid" : "partial";

  await query(`
    UPDATE invoice 
    SET amount_paid_credits = $1, 
        amount_paid_myr = $2,
        status = $3,
        updated_at = NOW()
    WHERE id = $4
  `, [newAmountPaid, newAmountPaid / CREDITS_PER_MYR, newStatus, invoiceId]);

  // Add credits to ledger
  const currentBalance = await getClientBalance(invoice.client_id);
  const newBalance = currentBalance + paymentAmount;

  await query(`
    INSERT INTO credit_ledger (
      client_id, product_id, amount, balance_after, type, reference_id, description, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    invoice.client_id,
    "true_identity", // Default product for payments
    paymentAmount,
    newBalance,
    "payment",
    paymentId,
    `Payment for ${invoice.invoice_number}`,
    payment.recordedBy || null,
  ]);

  // Generate receipt PDF
  const receiptData: ReceiptData = {
    receiptNumber,
    paymentDate: payment.paymentDate,
    invoiceNumber: invoice.invoice_number,
    client: {
      name: client.name,
      code: client.code,
    },
    payment: {
      amountCredits: paymentAmount,
      amountMyr: paymentMyr,
      method: payment.paymentMethod,
      reference: payment.paymentReference,
    },
    newBalance,
  };

  const receiptBuffer = await generateReceiptPDF(receiptData);

  // Upload to S3
  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: receiptBuffer,
    ContentType: "application/pdf",
  }));

  return {
    id: paymentId,
    receiptNumber,
    amountCredits: paymentAmount,
    amountMyr: paymentMyr,
    s3Key,
    invoiceStatus: newStatus,
    newBalance,
  };
}

// ============================================
// Get Invoice PDF URL
// ============================================

export async function getInvoicePdfUrl(invoiceId: string): Promise<string> {
  const invoice = await queryOne<{ s3_key: string }>(`
    SELECT s3_key FROM invoice WHERE id = $1
  `, [invoiceId]);

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  return getPresignedUrl(invoice.s3_key);
}

// ============================================
// Get Receipt PDF URL
// ============================================

export async function getReceiptPdfUrl(paymentId: string): Promise<string> {
  const payment = await queryOne<{ s3_key: string }>(`
    SELECT s3_key FROM payment WHERE id = $1
  `, [paymentId]);

  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  return getPresignedUrl(payment.s3_key);
}

// ============================================
// Generate All Monthly Invoices (for cron)
// ============================================

export async function generateAllMonthlyInvoices(): Promise<{
  success: number;
  failed: number;
  errors: Array<{ clientId: string; error: string }>;
}> {
  // Get all active clients
  const clients = await query<{ id: string; name: string }>(`
    SELECT id, name FROM client WHERE status = 'active'
  `);

  // Calculate end date (last day of previous month)
  const now = new Date();
  const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ clientId: string; error: string }>,
  };

  for (const client of clients) {
    try {
      await generateInvoice(client.id, { endDate: lastDayPrevMonth });
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        clientId: client.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
