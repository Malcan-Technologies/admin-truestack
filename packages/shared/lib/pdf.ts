import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";

// ============================================
// Types
// ============================================

export interface InvoiceData {
  invoiceNumber: string;
  generatedAt: Date;
  dueDate: Date;
  periodStart: Date;
  periodEnd: Date;
  client: {
    name: string;
    code: string;
    contactEmail?: string;
    contactPhone?: string;
    companyRegistration?: string;
  };
  lineItems: Array<{
    lineType: "usage" | "previous_balance";
    // For usage
    productId?: string;
    tierName?: string;
    sessionCount?: number;
    creditsPerSession?: number;
    // For previous_balance
    referenceInvoiceNumber?: string;
    // Common
    totalCredits: number;
    totalMyr: number;
  }>;
  summary: {
    totalUsageCredits: number;
    previousBalanceCredits: number;
    amountDueCredits: number;
    amountDueMyr: number;
    sstRate: number;
    sstAmountMyr: number;
    totalWithSstMyr: number;
  };
}

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: Date;
  invoiceNumber?: string; // Optional - not present for advance payments
  client: {
    name: string;
    code: string;
  };
  payment: {
    amountCredits: number;
    amountMyr: number;
    sstRate: number;
    sstAmountMyr: number;
    totalWithSstMyr: number;
    method?: string;
    reference?: string;
  };
  newBalance: number;
  isAdvancePayment?: boolean; // True for prepayments without invoice
}

// ============================================
// Helpers
// ============================================

const TIMEZONE = "Asia/Kuala_Lumpur";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-MY", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

function getProductName(productId: string): string {
  const names: Record<string, string> = {
    true_identity: "TrueIdentity",
  };
  return names[productId] || productId;
}

// Company Details
const COMPANY = {
  name: "Truestack Technologies Sdn. Bhd.",
  registration: "Registration No. 202501058714 (1660120-X)",
  email: "hello@truestack.my",
  address: [
    "Lot 08-05, Level 8, Menara K1 No.1,",
    "Jalan 3/137c Off Old Klang Road,",
    "58200 Kuala Lumpur",
  ],
  website: "www.truestack.my",
};

// Colors
const colors = {
  primary: rgb(79 / 255, 70 / 255, 229 / 255), // Indigo
  dark: rgb(30 / 255, 41 / 255, 59 / 255),
  gray: rgb(100 / 255, 116 / 255, 139 / 255),
  lightGray: rgb(241 / 255, 245 / 255, 249 / 255),
  white: rgb(1, 1, 1),
  green: rgb(34 / 255, 197 / 255, 94 / 255),
  amber: rgb(245 / 255, 158 / 255, 11 / 255),
};

// ============================================
// Invoice PDF Generation
// ============================================

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;

  // Try to embed logo
  try {
    const logoPath = path.join(process.cwd(), "public", "truestack-black.png");
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoDims = logoImage.scale(0.54); // 3x bigger logo
      page.drawImage(logoImage, {
        x: 50,
        y: y - logoDims.height + 30,
        width: logoDims.width,
        height: logoDims.height,
      });
    } else {
      // Fallback to text logo
      page.drawText("TrueStack", {
        x: 50,
        y,
        size: 28,
        font: helveticaBold,
        color: colors.primary,
      });
    }
  } catch {
    // Fallback to text logo on any error
    page.drawText("TrueStack", {
      x: 50,
      y,
      size: 28,
      font: helveticaBold,
      color: colors.primary,
    });
  }

  // Invoice Title (right side)
  page.drawText("INVOICE", {
    x: width - 150,
    y,
    size: 20,
    font: helveticaBold,
    color: colors.dark,
  });

  page.drawText(data.invoiceNumber, {
    x: width - 150,
    y: y - 18,
    size: 10,
    font: helvetica,
    color: colors.gray,
  });

  // Company details under logo (same size as client details)
  y -= 45;
  page.drawText(COMPANY.name, { x: 50, y, size: 10, font: helveticaBold, color: colors.dark });
  y -= 14;
  page.drawText(COMPANY.registration, { x: 50, y, size: 10, font: helvetica, color: colors.gray });
  y -= 14;
  for (const line of COMPANY.address) {
    page.drawText(line, { x: 50, y, size: 10, font: helvetica, color: colors.gray });
    y -= 14;
  }
  page.drawText(COMPANY.email, { x: 50, y, size: 10, font: helvetica, color: colors.gray });

  // Invoice Details (right side, aligned with company details)
  const detailsX = width - 200;
  const detailsY = height - 95;

  page.drawText("Invoice Date:", { x: detailsX, y: detailsY, size: 10, font: helvetica, color: colors.gray });
  page.drawText(formatDate(data.generatedAt), { x: detailsX + 80, y: detailsY, size: 10, font: helvetica, color: colors.dark });

  page.drawText("Due Date:", { x: detailsX, y: detailsY - 15, size: 10, font: helvetica, color: colors.gray });
  page.drawText(formatDate(data.dueDate), { x: detailsX + 80, y: detailsY - 15, size: 10, font: helvetica, color: colors.dark });

  page.drawText("Payment Terms:", { x: detailsX, y: detailsY - 30, size: 10, font: helvetica, color: colors.gray });
  page.drawText("Net 14 days", { x: detailsX + 80, y: detailsY - 30, size: 10, font: helvetica, color: colors.dark });

  // Divider line after company section
  y -= 20;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: colors.lightGray,
  });

  // Bill To section - starts after divider with spacing
  y -= 20;
  page.drawText("BILL TO:", { x: 50, y, size: 10, font: helveticaBold, color: colors.gray });
  y -= 15;
  page.drawText(data.client.name, { x: 50, y, size: 12, font: helveticaBold, color: colors.dark });
  y -= 15;
  page.drawText(`Client Code: ${data.client.code}`, { x: 50, y, size: 10, font: helvetica, color: colors.gray });
  y -= 15;

  if (data.client.companyRegistration) {
    page.drawText(`SSM: ${data.client.companyRegistration}`, { x: 50, y, size: 10, font: helvetica, color: colors.gray });
    y -= 15;
  }
  if (data.client.contactEmail) {
    page.drawText(data.client.contactEmail, { x: 50, y, size: 10, font: helvetica, color: colors.gray });
    y -= 15;
  }
  if (data.client.contactPhone) {
    page.drawText(data.client.contactPhone, { x: 50, y, size: 10, font: helvetica, color: colors.gray });
    y -= 15;
  }

  // Billing Period
  y -= 10;
  page.drawText(`Billing Period: ${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}`, {
    x: 50,
    y,
    size: 10,
    font: helvetica,
    color: colors.gray,
  });

  // Table Header
  y -= 30;
  const tableTop = y;
  const colWidths = { desc: 250, qty: 60, rate: 80, amount: 100 };

  // Header background
  page.drawRectangle({
    x: 50,
    y: y - 5,
    width: width - 100,
    height: 25,
    color: colors.lightGray,
  });

  page.drawText("Description", { x: 60, y: y + 5, size: 10, font: helveticaBold, color: colors.gray });
  page.drawText("Qty", { x: 60 + colWidths.desc, y: y + 5, size: 10, font: helveticaBold, color: colors.gray });
  page.drawText("Rate", { x: 60 + colWidths.desc + colWidths.qty, y: y + 5, size: 10, font: helveticaBold, color: colors.gray });
  page.drawText("Amount", { x: 60 + colWidths.desc + colWidths.qty + colWidths.rate, y: y + 5, size: 10, font: helveticaBold, color: colors.gray });

  // Table Rows
  y -= 30;
  for (const item of data.lineItems) {
    let description: string;
    let qty = "-";
    let rate = "-";

    if (item.lineType === "usage" && item.productId) {
      const productName = getProductName(item.productId);
      description = item.tierName ? `${productName} - ${item.tierName}` : `${productName} (Default Rate)`;
      qty = String(item.sessionCount || 0);
      rate = `${item.creditsPerSession || 0} cr`;
    } else {
      description = `Previous Balance - ${item.referenceInvoiceNumber}`;
    }

    page.drawText(description, { x: 60, y, size: 10, font: helvetica, color: colors.dark });
    page.drawText(qty, { x: 60 + colWidths.desc, y, size: 10, font: helvetica, color: colors.dark });
    page.drawText(rate, { x: 60 + colWidths.desc + colWidths.qty, y, size: 10, font: helvetica, color: colors.dark });
    page.drawText(`${item.totalCredits} cr`, { x: 60 + colWidths.desc + colWidths.qty + colWidths.rate, y, size: 10, font: helvetica, color: colors.dark });

    y -= 25;

    // Separator line
    page.drawLine({
      start: { x: 50, y: y + 10 },
      end: { x: width - 50, y: y + 10 },
      thickness: 0.5,
      color: colors.lightGray,
    });
  }

  // Totals - right aligned
  y -= 20;
  const totalsLabelX = width - 250;
  const totalsValueX = width - 60;

  page.drawText("Total Usage:", { x: totalsLabelX, y, size: 10, font: helvetica, color: colors.gray });
  const usageText = `${data.summary.totalUsageCredits} credits`;
  const usageWidth = helvetica.widthOfTextAtSize(usageText, 10);
  page.drawText(usageText, { x: totalsValueX - usageWidth, y, size: 10, font: helvetica, color: colors.dark });

  page.drawText("Previous Balance:", { x: totalsLabelX, y: y - 20, size: 10, font: helvetica, color: colors.gray });
  const prevBalText = `${data.summary.previousBalanceCredits} credits`;
  const prevBalWidth = helvetica.widthOfTextAtSize(prevBalText, 10);
  page.drawText(prevBalText, { x: totalsValueX - prevBalWidth, y: y - 20, size: 10, font: helvetica, color: colors.dark });

  // Conversion rate note
  y -= 38;
  page.drawText("Conversion rate: 10 credits = RM 1", { x: totalsLabelX, y, size: 8, font: helvetica, color: colors.gray });

  // Subtotal
  y -= 25;
  page.drawText("Subtotal:", { x: totalsLabelX, y, size: 10, font: helvetica, color: colors.gray });
  const subtotalText = formatCurrency(data.summary.amountDueMyr);
  const subtotalWidth = helvetica.widthOfTextAtSize(subtotalText, 10);
  page.drawText(subtotalText, { x: totalsValueX - subtotalWidth, y, size: 10, font: helvetica, color: colors.dark });

  // SST (8%)
  y -= 18;
  const sstPercent = Math.round(data.summary.sstRate * 100);
  page.drawText(`SST (${sstPercent}%):`, { x: totalsLabelX, y, size: 10, font: helvetica, color: colors.gray });
  const sstText = formatCurrency(data.summary.sstAmountMyr);
  const sstWidth = helvetica.widthOfTextAtSize(sstText, 10);
  page.drawText(sstText, { x: totalsValueX - sstWidth, y, size: 10, font: helvetica, color: colors.dark });

  // Amount Due Box (Total with SST)
  y -= 35;
  const amountBoxWidth = 220;
  const amountBoxX = width - 50 - amountBoxWidth;
  page.drawRectangle({
    x: amountBoxX,
    y: y - 5,
    width: amountBoxWidth,
    height: 35,
    color: colors.primary,
  });

  page.drawText("TOTAL AMOUNT DUE", { x: amountBoxX + 15, y: y + 8, size: 12, font: helveticaBold, color: colors.white });
  const amountText = formatCurrency(data.summary.totalWithSstMyr);
  const amountWidth = helveticaBold.widthOfTextAtSize(amountText, 16);
  page.drawText(amountText, { x: amountBoxX + amountBoxWidth - 15 - amountWidth, y: y + 6, size: 16, font: helveticaBold, color: colors.white });

  // Divider line before Payment Instructions
  y -= 45;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: colors.lightGray,
  });

  // Payment Instructions
  y -= 25;
  page.drawText("Payment Instructions", { x: 50, y, size: 12, font: helveticaBold, color: colors.dark });
  page.drawText("Bank: RHB Bank", { x: 50, y: y - 20, size: 10, font: helvetica, color: colors.gray });
  page.drawText("Account Name: TrueStack Technologies", { x: 50, y: y - 35, size: 10, font: helvetica, color: colors.gray });
  page.drawText("Account Number: 26409400034271", { x: 50, y: y - 50, size: 10, font: helvetica, color: colors.gray });
  page.drawText(`Reference: ${data.invoiceNumber}`, { x: 50, y: y - 65, size: 10, font: helvetica, color: colors.gray });

  // Footer
  page.drawText("Thank you for your business.", { x: width / 2 - 60, y: 50, size: 8, font: helvetica, color: colors.gray });
  page.drawText("Payment due within 14 days. Late payments may incur additional charges.", { x: width / 2 - 150, y: 38, size: 8, font: helvetica, color: colors.gray });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ============================================
// Receipt PDF Generation
// ============================================

export async function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;

  // Try to embed logo
  try {
    const logoPath = path.join(process.cwd(), "public", "truestack-black.png");
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoDims = logoImage.scale(0.54); // 3x bigger logo
      page.drawImage(logoImage, {
        x: 50,
        y: y - logoDims.height + 30,
        width: logoDims.width,
        height: logoDims.height,
      });
    } else {
      // Fallback to text logo
      page.drawText("TrueStack", {
        x: 50,
        y,
        size: 28,
        font: helveticaBold,
        color: colors.primary,
      });
    }
  } catch {
    // Fallback to text logo on any error
    page.drawText("TrueStack", {
      x: 50,
      y,
      size: 28,
      font: helveticaBold,
      color: colors.primary,
    });
  }

  // Receipt Title (right side)
  page.drawText("RECEIPT", {
    x: width - 200,
    y,
    size: 20,
    font: helveticaBold,
    color: colors.dark,
  });

  page.drawText(data.receiptNumber, {
    x: width - 200,
    y: y - 18,
    size: 10,
    font: helvetica,
    color: colors.gray,
  });

  // Company details under logo (same size as client details)
  y -= 45;
  page.drawText(COMPANY.name, { x: 50, y, size: 10, font: helveticaBold, color: colors.dark });
  y -= 14;
  page.drawText(COMPANY.registration, { x: 50, y, size: 10, font: helvetica, color: colors.gray });
  y -= 14;
  for (const line of COMPANY.address) {
    page.drawText(line, { x: 50, y, size: 10, font: helvetica, color: colors.gray });
    y -= 14;
  }
  page.drawText(COMPANY.email, { x: 50, y, size: 10, font: helvetica, color: colors.gray });

  // Receipt info on right side (aligned with company details)
  const detailsX = width - 200;
  const detailsY = height - 95;

  page.drawText("Payment Date:", { x: detailsX, y: detailsY, size: 10, font: helvetica, color: colors.gray });
  page.drawText(formatDate(data.paymentDate), { x: detailsX + 80, y: detailsY, size: 10, font: helvetica, color: colors.dark });

  let detailOffset = 15;
  if (data.isAdvancePayment) {
    page.drawText("Type:", { x: detailsX, y: detailsY - detailOffset, size: 10, font: helvetica, color: colors.gray });
    page.drawText("Advance Payment", { x: detailsX + 80, y: detailsY - detailOffset, size: 10, font: helveticaBold, color: colors.primary });
    detailOffset += 15;
  } else if (data.invoiceNumber) {
    page.drawText("Invoice Ref:", { x: detailsX, y: detailsY - detailOffset, size: 10, font: helvetica, color: colors.gray });
    page.drawText(data.invoiceNumber, { x: detailsX + 80, y: detailsY - detailOffset, size: 10, font: helvetica, color: colors.dark });
    detailOffset += 15;
  }

  if (data.payment.method) {
    page.drawText("Method:", { x: detailsX, y: detailsY - detailOffset, size: 10, font: helvetica, color: colors.gray });
    page.drawText(data.payment.method, { x: detailsX + 80, y: detailsY - detailOffset, size: 10, font: helvetica, color: colors.dark });
    detailOffset += 15;
  }

  if (data.payment.reference) {
    page.drawText("Reference:", { x: detailsX, y: detailsY - detailOffset, size: 10, font: helvetica, color: colors.gray });
    page.drawText(data.payment.reference, { x: detailsX + 80, y: detailsY - detailOffset, size: 10, font: helvetica, color: colors.dark });
  }

  // Divider line after company section
  y -= 20;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: colors.lightGray,
  });

  // Received From section - starts after divider with spacing
  y -= 20;
  page.drawText("RECEIVED FROM:", { x: 50, y, size: 10, font: helveticaBold, color: colors.gray });
  y -= 15;
  page.drawText(data.client.name, { x: 50, y, size: 12, font: helveticaBold, color: colors.dark });
  y -= 15;
  page.drawText(`Client Code: ${data.client.code}`, { x: 50, y, size: 10, font: helvetica, color: colors.gray });

  // Payment Details Box
  y -= 25;
  page.drawRectangle({
    x: 50,
    y: y - 130,
    width: width - 100,
    height: 150,
    color: colors.lightGray,
  });

  page.drawText("Payment Details", { x: 70, y: y - 5, size: 12, font: helveticaBold, color: colors.dark });

  page.drawText("Subtotal:", { x: 70, y: y - 30, size: 10, font: helvetica, color: colors.gray });
  page.drawText(`${formatCurrency(data.payment.amountMyr)} (${data.payment.amountCredits} credits)`, { x: 180, y: y - 30, size: 10, font: helvetica, color: colors.dark });

  const sstPercent = Math.round(data.payment.sstRate * 100);
  page.drawText(`SST (${sstPercent}%):`, { x: 70, y: y - 50, size: 10, font: helvetica, color: colors.gray });
  page.drawText(formatCurrency(data.payment.sstAmountMyr), { x: 180, y: y - 50, size: 10, font: helvetica, color: colors.dark });

  page.drawText("Total Paid:", { x: 70, y: y - 70, size: 10, font: helveticaBold, color: colors.gray });
  page.drawText(formatCurrency(data.payment.totalWithSstMyr), { x: 180, y: y - 70, size: 10, font: helveticaBold, color: colors.dark });

  page.drawText("Payment Method:", { x: 70, y: y - 95, size: 10, font: helvetica, color: colors.gray });
  page.drawText(data.payment.method || "-", { x: 180, y: y - 95, size: 10, font: helvetica, color: colors.dark });

  page.drawText("Reference:", { x: 70, y: y - 115, size: 10, font: helvetica, color: colors.gray });
  page.drawText(data.payment.reference || "-", { x: 180, y: y - 115, size: 10, font: helvetica, color: colors.dark });

  // New Balance Box
  y -= 155;
  page.drawRectangle({
    x: width - 295,
    y: y - 30,
    width: 245,
    height: 50,
    color: colors.primary,
  });

  page.drawText("New Credit Balance:", { x: width - 275, y: y - 5, size: 10, font: helvetica, color: colors.white });
  page.drawText(`${data.newBalance.toLocaleString()} credits`, { x: width - 275, y: y - 22, size: 16, font: helveticaBold, color: colors.white });

  // Footer
  page.drawText("Thank you for your payment.", { x: width / 2 - 60, y: 50, size: 8, font: helvetica, color: colors.gray });
  page.drawText("This is an official receipt for your records.", { x: width / 2 - 80, y: 38, size: 8, font: helvetica, color: colors.gray });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
