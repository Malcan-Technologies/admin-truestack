-- Invoice Billing System Migration
-- Adds invoice, invoice_line_item, and payment tables

-- ============================================
-- Invoice Table
-- ============================================

CREATE TABLE invoice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client(id),
  invoice_number TEXT NOT NULL UNIQUE,
  
  -- Billing period
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  -- Payment terms
  due_date DATE NOT NULL,
  
  -- Amounts (in credits)
  total_usage_credits INT NOT NULL,
  previous_balance_credits INT NOT NULL DEFAULT 0,
  credit_balance_at_generation INT NOT NULL,
  amount_due_credits INT NOT NULL,
  amount_due_myr DECIMAL(10,2) NOT NULL,
  
  -- Payment tracking
  amount_paid_credits INT NOT NULL DEFAULT 0,
  amount_paid_myr DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Storage
  s3_key TEXT NOT NULL,
  
  -- Superseded tracking
  superseded_by_invoice_id UUID REFERENCES invoice(id),
  
  -- Metadata
  status TEXT NOT NULL DEFAULT 'generated',
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by TEXT REFERENCES "user"(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoice_client_id ON invoice(client_id);
CREATE INDEX idx_invoice_period ON invoice(period_start, period_end);
CREATE INDEX idx_invoice_status ON invoice(status);
CREATE INDEX idx_invoice_due_date ON invoice(due_date);

-- ============================================
-- Invoice Line Item Table
-- ============================================

CREATE TABLE invoice_line_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
  
  -- Line item type
  line_type TEXT NOT NULL,
  
  -- For usage lines
  product_id TEXT,
  tier_name TEXT,
  session_count INT,
  credits_per_session INT,
  
  -- For previous_balance lines
  reference_invoice_id UUID REFERENCES invoice(id),
  reference_invoice_number TEXT,
  
  -- Common fields
  total_credits INT NOT NULL,
  total_myr DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoice_line_item_invoice ON invoice_line_item(invoice_id);
CREATE INDEX idx_invoice_line_item_type ON invoice_line_item(line_type);

-- ============================================
-- Payment Table
-- ============================================

CREATE TABLE payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoice(id),
  client_id UUID NOT NULL REFERENCES client(id),
  
  -- Payment details
  amount_credits INT NOT NULL,
  amount_myr DECIMAL(10,2) NOT NULL,
  
  -- Payment info
  payment_date DATE NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  
  -- Receipt
  receipt_number TEXT NOT NULL UNIQUE,
  s3_key TEXT NOT NULL,
  
  -- Metadata
  recorded_by TEXT REFERENCES "user"(id),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_invoice ON payment(invoice_id);
CREATE INDEX idx_payment_client ON payment(client_id);
