# S3 Module for KYC Documents

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

# S3 Bucket
resource "aws_s3_bucket" "kyc_documents" {
  bucket = "${var.project_name}-kyc-documents-${var.environment}"

  tags = {
    Name = "${var.project_name}-kyc-documents-${var.environment}"
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "kyc_documents" {
  bucket = aws_s3_bucket.kyc_documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server-side encryption (SSE-S3)
resource "aws_s3_bucket_server_side_encryption_configuration" "kyc_documents" {
  bucket = aws_s3_bucket.kyc_documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Versioning (disabled for cost optimization)
resource "aws_s3_bucket_versioning" "kyc_documents" {
  bucket = aws_s3_bucket.kyc_documents.id

  versioning_configuration {
    status = "Disabled"
  }
}

# No lifecycle rules - indefinite retention per requirements

# Outputs
output "bucket_name" {
  value = aws_s3_bucket.kyc_documents.id
}

output "bucket_arn" {
  value = aws_s3_bucket.kyc_documents.arn
}
