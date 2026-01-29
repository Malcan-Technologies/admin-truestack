# TrueStack Billing Guide

This guide explains how billing works for TrueStack KYC services, including pricing, invoicing, and payment terms.

---

## Table of Contents

1. [Billing Overview](#billing-overview)
2. [Pricing Structure](#pricing-structure)
3. [When You're Charged](#when-youre-charged)
4. [Monthly Invoicing](#monthly-invoicing)
5. [Payment Terms](#payment-terms)
6. [Invoice Details](#invoice-details)
7. [Making Payments](#making-payments)
8. [Understanding Your Balance](#understanding-your-balance)
9. [FAQ](#faq)

---

## Billing Overview

TrueStack uses a **post-paid billing model** with monthly invoicing. This means:

- **No upfront payment required** - Start using the service immediately
- **Pay only for completed verifications** - You're not charged for failed or abandoned sessions
- **Monthly invoices** - Receive a detailed invoice at the end of each billing period
- **14-day payment terms** - Invoices are due within 14 days of issue

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Monthly Billing Cycle                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1st of Month                              End of Month                 │
│       │                                          │                       │
│       ▼                                          ▼                       │
│   ┌───────────────────────────────────────────────────┐                 │
│   │              Usage Period (1 Month)               │                 │
│   │  • Each completed KYC verification is recorded    │                 │
│   │  • Usage tracked at your contracted rate          │                 │
│   └───────────────────────────────────────────────────┘                 │
│                                                  │                       │
│                                                  ▼                       │
│                                          ┌─────────────┐                │
│                                          │   Invoice   │                │
│                                          │  Generated  │                │
│                                          └──────┬──────┘                │
│                                                 │                        │
│                                                 ▼                        │
│                                          ┌─────────────┐                │
│                                          │  Payment    │                │
│                                          │  Due in     │                │
│                                          │  14 Days    │                │
│                                          └─────────────┘                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Pricing Structure

### Volume-Based Pricing

TrueStack offers volume-based pricing tiers. The more verifications you process, the lower your per-verification cost. Your specific pricing is agreed upon during onboarding.

**Example Pricing Tiers:**

| Monthly Volume | Price per Verification |
|----------------|------------------------|
| 1 - 100 | RM 5.00 |
| 101 - 500 | RM 4.50 |
| 501 - 1,000 | RM 4.00 |
| 1,001+ | RM 3.50 |

*Note: Your actual pricing may differ based on your contract. Contact your account manager for details.*

### How Tier Pricing Works

Pricing tiers apply progressively based on your cumulative monthly volume:

**Example**: If you complete 150 verifications in a month:

| Verifications | Tier | Rate | Subtotal |
|---------------|------|------|----------|
| First 100 | Tier 1 | RM 5.00 | RM 500.00 |
| Next 50 | Tier 2 | RM 4.50 | RM 225.00 |
| **Total** | | | **RM 725.00** |

---

## When You're Charged

You are **only charged for completed verifications**. A verification is considered complete when the user finishes the KYC process, regardless of whether the result is approved or rejected.

### Billable vs Non-Billable Sessions

| Scenario | Billed? |
|----------|---------|
| User completes verification - **Approved** | ✅ Yes |
| User completes verification - **Rejected** | ✅ Yes |
| Session created but user never starts | ❌ No |
| User starts but abandons verification | ❌ No |
| Session expires (24 hours) | ❌ No |
| Technical error during session creation | ❌ No |

### Why Rejected Verifications Are Billed

Rejected verifications are billed because:

1. **Verification work is performed** - Document scanning, OCR, face matching, and liveness detection are all executed
2. **Resources are consumed** - Processing power and analysis are used regardless of outcome
3. **Results are delivered** - You receive detailed verification data including OCR results and match scores

---

## Monthly Invoicing

### Invoice Generation

Invoices are generated at the beginning of each month for the previous month's usage:

- **Billing Period**: 1st to last day of the previous month
- **Invoice Date**: First business day of the new month
- **Due Date**: 14 days from invoice date

### Invoice Delivery

Invoices are delivered via:

- **Email**: Sent to your registered billing contact
- **Portal**: Available for download in the TrueStack portal

### Invoice Format

Invoices are provided as PDF documents and include:

- Detailed breakdown by pricing tier
- Session counts per tier
- Subtotals and grand total
- Any outstanding balance from previous invoices
- Payment instructions

---

## Payment Terms

### Standard Terms

| Term | Details |
|------|---------|
| **Payment Due** | 14 days from invoice date |
| **Currency** | Malaysian Ringgit (MYR) |
| **Payment Methods** | Bank transfer, FPX, Credit card |

### Example Timeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                        January 2026 Example                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Jan 1-31: Usage Period                                              │
│      │                                                               │
│      └──► You use TrueStack KYC for verifications                   │
│                                                                      │
│  Feb 1: Invoice Generated                                            │
│      │                                                               │
│      └──► Invoice INV-2026-02-001 for January usage                 │
│                                                                      │
│  Feb 15: Payment Due                                                 │
│      │                                                               │
│      └──► Invoice must be paid by this date                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Late Payments

If payment is not received by the due date:

1. **Reminder**: You'll receive a payment reminder
2. **Service Continuity**: Service continues under the overdraft facility
3. **Outstanding Balance**: Carried forward to the next invoice

We encourage timely payment to maintain a healthy account status.

---

## Invoice Details

### Sample Invoice Breakdown

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INVOICE                                      │
│                                                                      │
│  Invoice Number: INV-2026-02-001                                    │
│  Invoice Date: February 1, 2026                                     │
│  Due Date: February 15, 2026                                        │
│  Billing Period: January 1 - January 31, 2026                       │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                         USAGE DETAILS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TrueIdentity - KYC Verification                                    │
│                                                                      │
│  ┌────────────────┬───────────┬──────────────┬────────────────┐    │
│  │ Tier           │ Sessions  │ Rate         │ Amount         │    │
│  ├────────────────┼───────────┼──────────────┼────────────────┤    │
│  │ Tier 1 (1-100) │ 100       │ RM 5.00      │ RM 500.00      │    │
│  │ Tier 2 (101+)  │ 75        │ RM 4.50      │ RM 337.50      │    │
│  ├────────────────┼───────────┼──────────────┼────────────────┤    │
│  │ SUBTOTAL       │ 175       │              │ RM 837.50      │    │
│  └────────────────┴───────────┴──────────────┴────────────────┘    │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                         SUMMARY                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Current Period Usage:                           RM 837.50          │
│  Previous Outstanding Balance:                   RM 0.00            │
│                                                 ─────────           │
│  TOTAL AMOUNT DUE:                              RM 837.50           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Invoice Statuses

| Status | Description |
|--------|-------------|
| **Generated** | Invoice issued, awaiting payment |
| **Partial** | Partial payment received |
| **Paid** | Fully paid |

---

## Making Payments

### Payment Methods

| Method | Details |
|--------|---------|
| **Bank Transfer** | Transfer to our business account. Include invoice number as reference. |
| **FPX** | Online banking via the payment portal |
| **Credit Card** | Visa/Mastercard accepted |

### Bank Transfer Details

When making a bank transfer, please include:

- **Reference**: Your invoice number (e.g., `INV-2026-02-001`)
- **Bank**: [Provided in your invoice]
- **Account Name**: TrueStack Sdn Bhd
- **Account Number**: [Provided in your invoice]

### Payment Confirmation

After payment is received:

1. **Receipt**: A receipt (PDF) is generated and sent to your billing email
2. **Balance Update**: Your account balance is updated immediately
3. **Invoice Status**: Invoice status changes to "Paid"

---

## Understanding Your Balance

### Account Balance

Your account balance reflects your current credit status with TrueStack:

- **Positive Balance**: You have prepaid credits available
- **Negative Balance**: You have outstanding usage to be paid (covered by overdraft)
- **Zero Balance**: All usage is paid, no prepaid credits

### Overdraft Facility

Most clients have overdraft enabled by default, which means:

- **Continuous Service**: You can continue using the service even with a negative balance
- **No Interruption**: Verifications are never blocked due to billing
- **Monthly Settlement**: Outstanding balance is invoiced monthly

### Balance Movement Example

```
┌────────────┬──────────────────────────────────┬─────────────────┐
│ Date       │ Activity                         │ Balance (RM)    │
├────────────┼──────────────────────────────────┼─────────────────┤
│ Jan 1      │ Starting balance                 │ 0.00            │
│ Jan 5      │ 10 verifications @ RM 5.00       │ -50.00          │
│ Jan 12     │ 20 verifications @ RM 5.00       │ -150.00         │
│ Jan 20     │ 40 verifications @ RM 5.00       │ -350.00         │
│ Jan 28     │ 30 verifications @ RM 5.00       │ -500.00         │
│ Feb 1      │ Invoice generated                │ -500.00         │
│ Feb 10     │ Payment received                 │ 0.00            │
│ Feb 15     │ 25 verifications @ RM 5.00       │ -125.00         │
│ ...        │ ...                              │ ...             │
└────────────┴──────────────────────────────────┴─────────────────┘
```

---

## FAQ

### Billing Questions

**Q: When will I receive my first invoice?**
A: Your first invoice is generated at the beginning of the month following your first usage. For example, if you start using TrueStack on January 15th, your first invoice covering January 15-31 usage will be generated on February 1st.

**Q: Can I get a mid-month invoice?**
A: Standard invoicing is monthly. For special billing arrangements, please contact your account manager.

**Q: What if I dispute an invoice?**
A: Contact us within 7 days of invoice receipt. We'll review the usage data and resolve any discrepancies.

**Q: Is there a minimum monthly charge?**
A: No. You only pay for completed verifications. If you have no usage in a month, you won't be invoiced.

### Pricing Questions

**Q: How do I know my pricing tier?**
A: Your pricing is specified in your service agreement. Contact your account manager for details.

**Q: Can I negotiate volume discounts?**
A: Yes, we offer custom pricing for high-volume clients. Contact sales to discuss your needs.

**Q: Do prices include tax?**
A: Prices shown are exclusive of any applicable taxes. Tax will be itemized separately on your invoice if applicable.

### Payment Questions

**Q: What happens if I miss the payment deadline?**
A: You'll receive a reminder, and the outstanding amount will be carried to your next invoice. Service continues uninterrupted.

**Q: Can I pay in advance?**
A: Yes. Prepayments are credited to your account and offset against future usage.

**Q: How do I update my billing contact?**
A: Contact your account manager or update it through the admin portal.

**Q: Do you offer payment plans?**
A: For large outstanding balances, contact us to discuss payment arrangements.

### Usage Questions

**Q: How can I track my current usage?**
A: View real-time usage data in the TrueStack admin portal under the KYC Sessions section.

**Q: Why was I charged for a rejected verification?**
A: All completed verifications are billed, regardless of result, because full verification processing was performed. See [Why Rejected Verifications Are Billed](#why-rejected-verifications-are-billed).

**Q: What if a user's session was interrupted by a technical issue?**
A: If the session didn't complete, you won't be charged. Only completed verifications (with a final approved/rejected result) are billed.

---

## Contact

For billing inquiries:

- **Email**: billing@truestack.my
- **Support**: support@truestack.my
- **Portal**: Access your invoices and usage at admin.truestack.my

---

*Last updated: January 2026*
