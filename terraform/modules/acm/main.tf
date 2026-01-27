# ACM Certificate Module

variable "domain_name" {
  type = string
}

variable "environment" {
  type = string
}

# Wildcard certificate
resource "aws_acm_certificate" "main" {
  domain_name       = "*.${var.domain_name}"
  validation_method = "DNS"

  subject_alternative_names = [
    var.domain_name
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = var.domain_name
    Environment = var.environment
  }
}

# Note: DNS validation records need to be created manually in your DNS provider
# or you can add Route53 resources here if using Route53

# Outputs
output "certificate_arn" {
  value = aws_acm_certificate.main.arn
}

output "domain_validation_options" {
  value = aws_acm_certificate.main.domain_validation_options
}
