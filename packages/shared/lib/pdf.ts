import PDFDocument from "pdfkit";

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
  };
}

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: Date;
  invoiceNumber: string;
  client: {
    name: string;
    code: string;
  };
  payment: {
    amountCredits: number;
    amountMyr: number;
    method?: string;
    reference?: string;
  };
  newBalance: number;
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

// ============================================
// Invoice PDF Generation
// ============================================

export function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.fontSize(24).fillColor("#4F46E5").text("TrueStack", 50, 50);
      doc.fontSize(10).fillColor("#64748B").text("www.truestack.my", 50, 80);

      // Invoice Title
      doc.fontSize(20).fillColor("#1E293B").text("INVOICE", 400, 50, { align: "right" });
      doc.fontSize(10).fillColor("#64748B").text(data.invoiceNumber, 400, 75, { align: "right" });

      // Invoice Details Box
      const detailsY = 120;
      doc.fontSize(10).fillColor("#64748B");
      doc.text("Invoice Date:", 400, detailsY);
      doc.text("Due Date:", 400, detailsY + 15);
      doc.text("Payment Terms:", 400, detailsY + 30);
      
      doc.fillColor("#1E293B");
      doc.text(formatDate(data.generatedAt), 480, detailsY);
      doc.text(formatDate(data.dueDate), 480, detailsY + 15);
      doc.text("Net 14 days", 480, detailsY + 30);

      // Bill To
      doc.fontSize(10).fillColor("#64748B").text("BILL TO:", 50, detailsY);
      doc.fontSize(12).fillColor("#1E293B").text(data.client.name, 50, detailsY + 15);
      doc.fontSize(10).fillColor("#64748B").text(`Client Code: ${data.client.code}`, 50, detailsY + 32);
      
      let clientY = detailsY + 47;
      if (data.client.companyRegistration) {
        doc.text(`SSM: ${data.client.companyRegistration}`, 50, clientY);
        clientY += 15;
      }
      if (data.client.contactEmail) {
        doc.text(data.client.contactEmail, 50, clientY);
        clientY += 15;
      }
      if (data.client.contactPhone) {
        doc.text(data.client.contactPhone, 50, clientY);
      }

      // Billing Period
      doc.fontSize(10).fillColor("#64748B");
      doc.text(`Billing Period: ${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}`, 50, 210);

      // Line Items Table
      const tableTop = 240;
      const tableLeft = 50;
      const colWidths = { desc: 250, qty: 60, rate: 80, amount: 100 };

      // Table Header
      doc.fillColor("#F1F5F9").rect(tableLeft, tableTop, 495, 25).fill();
      doc.fontSize(10).fillColor("#475569");
      doc.text("Description", tableLeft + 10, tableTop + 8);
      doc.text("Qty", tableLeft + colWidths.desc + 10, tableTop + 8, { width: colWidths.qty, align: "right" });
      doc.text("Rate", tableLeft + colWidths.desc + colWidths.qty + 10, tableTop + 8, { width: colWidths.rate, align: "right" });
      doc.text("Amount", tableLeft + colWidths.desc + colWidths.qty + colWidths.rate + 10, tableTop + 8, { width: colWidths.amount, align: "right" });

      // Table Rows
      let rowY = tableTop + 30;
      for (const item of data.lineItems) {
        let description: string;
        let qty = "-";
        let rate = "-";

        if (item.lineType === "usage" && item.productId) {
          const productName = getProductName(item.productId);
          description = item.tierName 
            ? `${productName} - ${item.tierName}`
            : `${productName} (Default Rate)`;
          qty = String(item.sessionCount || 0);
          rate = `${item.creditsPerSession || 0} cr`;
        } else {
          description = `Previous Balance - ${item.referenceInvoiceNumber}`;
        }

        doc.fontSize(10).fillColor("#1E293B");
        doc.text(description, tableLeft + 10, rowY, { width: colWidths.desc - 10 });
        doc.text(qty, tableLeft + colWidths.desc + 10, rowY, { width: colWidths.qty, align: "right" });
        doc.text(rate, tableLeft + colWidths.desc + colWidths.qty + 10, rowY, { width: colWidths.rate, align: "right" });
        doc.text(`${item.totalCredits} cr`, tableLeft + colWidths.desc + colWidths.qty + colWidths.rate + 10, rowY, { width: colWidths.amount, align: "right" });

        rowY += 25;

        // Add separator line
        doc.strokeColor("#E2E8F0").lineWidth(0.5);
        doc.moveTo(tableLeft, rowY - 5).lineTo(tableLeft + 495, rowY - 5).stroke();
      }

      // Totals Section
      const totalsY = rowY + 20;
      const totalsX = tableLeft + colWidths.desc + colWidths.qty;

      doc.fontSize(10).fillColor("#64748B");
      doc.text("Total Usage:", totalsX, totalsY);
      doc.text("Previous Balance:", totalsX, totalsY + 20);
      
      doc.fillColor("#1E293B");
      doc.text(`${data.summary.totalUsageCredits} credits`, totalsX + colWidths.rate + 10, totalsY, { width: colWidths.amount, align: "right" });
      doc.text(`${data.summary.previousBalanceCredits} credits`, totalsX + colWidths.rate + 10, totalsY + 20, { width: colWidths.amount, align: "right" });

      // Amount Due Box
      const dueY = totalsY + 50;
      doc.fillColor("#4F46E5").rect(totalsX - 10, dueY, 215, 40).fill();
      doc.fontSize(12).fillColor("#FFFFFF");
      doc.text("AMOUNT DUE", totalsX, dueY + 8);
      doc.fontSize(14).text(formatCurrency(data.summary.amountDueMyr), totalsX + colWidths.rate + 10, dueY + 8, { width: colWidths.amount, align: "right" });
      doc.fontSize(10).text(`(${data.summary.amountDueCredits} credits)`, totalsX + colWidths.rate + 10, dueY + 25, { width: colWidths.amount, align: "right" });

      // Payment Instructions
      const paymentY = dueY + 70;
      doc.fontSize(12).fillColor("#1E293B").text("Payment Instructions", 50, paymentY);
      doc.fontSize(10).fillColor("#64748B");
      doc.text("Bank: Maybank", 50, paymentY + 20);
      doc.text("Account Name: TrueStack Sdn Bhd", 50, paymentY + 35);
      doc.text("Account Number: 5123-4567-8901", 50, paymentY + 50);
      doc.text(`Reference: ${data.invoiceNumber}`, 50, paymentY + 65);

      // Footer
      const footerY = 750;
      doc.fontSize(8).fillColor("#94A3B8");
      doc.text("Thank you for your business.", 50, footerY, { align: "center", width: 495 });
      doc.text("Payment due within 14 days. Late payments may incur additional charges.", 50, footerY + 12, { align: "center", width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================
// Receipt PDF Generation
// ============================================

export function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.fontSize(24).fillColor("#4F46E5").text("TrueStack", 50, 50);
      doc.fontSize(10).fillColor("#64748B").text("www.truestack.my", 50, 80);

      // Receipt Title
      doc.fontSize(20).fillColor("#1E293B").text("PAYMENT RECEIPT", 350, 50, { align: "right" });
      doc.fontSize(10).fillColor("#64748B").text(data.receiptNumber, 350, 75, { align: "right" });

      // Receipt Details
      const detailsY = 130;
      doc.fontSize(10).fillColor("#64748B");
      doc.text("Payment Date:", 50, detailsY);
      doc.text("Invoice Reference:", 50, detailsY + 20);
      doc.text("Client:", 50, detailsY + 40);
      doc.text("Client Code:", 50, detailsY + 60);

      doc.fillColor("#1E293B");
      doc.text(formatDate(data.paymentDate), 180, detailsY);
      doc.text(data.invoiceNumber, 180, detailsY + 20);
      doc.text(data.client.name, 180, detailsY + 40);
      doc.text(data.client.code, 180, detailsY + 60);

      // Payment Details Box
      const boxY = 230;
      doc.fillColor("#F1F5F9").rect(50, boxY, 495, 100).fill();
      
      doc.fontSize(12).fillColor("#1E293B").text("Payment Details", 70, boxY + 15);
      
      doc.fontSize(10).fillColor("#64748B");
      doc.text("Amount Paid:", 70, boxY + 40);
      doc.text("Payment Method:", 70, boxY + 60);
      doc.text("Reference:", 70, boxY + 80);

      doc.fillColor("#1E293B");
      doc.text(`${formatCurrency(data.payment.amountMyr)} (${data.payment.amountCredits} credits)`, 180, boxY + 40);
      doc.text(data.payment.method || "-", 180, boxY + 60);
      doc.text(data.payment.reference || "-", 180, boxY + 80);

      // New Balance
      const balanceY = boxY + 130;
      doc.fillColor("#4F46E5").rect(300, balanceY, 245, 50).fill();
      doc.fontSize(10).fillColor("#FFFFFF").text("New Credit Balance:", 320, balanceY + 12);
      doc.fontSize(16).text(`${data.newBalance.toLocaleString()} credits`, 320, balanceY + 28);

      // Footer
      const footerY = 700;
      doc.fontSize(8).fillColor("#94A3B8");
      doc.text("Thank you for your payment.", 50, footerY, { align: "center", width: 495 });
      doc.text("This is an official receipt for your records.", 50, footerY + 12, { align: "center", width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
