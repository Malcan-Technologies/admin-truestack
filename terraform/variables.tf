# General
variable "project_name" {
  description = "Project name"
  type        = string
  default     = "trueidentity"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "ap-southeast-5"
}

# Networking
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "domain_name" {
  description = "Base domain name (e.g., truestack.my)"
  type        = string
  default     = "truestack.my"
}

variable "enable_https" {
  description = "Enable HTTPS listener. Set to true after ACM certificate is validated."
  type        = bool
  default     = false
}

# Database
variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "trueidentity"
  sensitive   = true
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

# Container
variable "ecr_repository_url" {
  description = "ECR repository URL for the application image"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

# Secrets
variable "better_auth_secret" {
  description = "BetterAuth secret key"
  type        = string
  sensitive   = true
}

variable "api_key_encryption_secret" {
  description = "API key encryption secret (64 hex chars)"
  type        = string
  sensitive   = true
}

# Innovatif
variable "innovatif_api_key" {
  description = "Innovatif API key"
  type        = string
  sensitive   = true
}

variable "innovatif_md5_key" {
  description = "Innovatif MD5 key"
  type        = string
  sensitive   = true
}

variable "innovatif_ciphertext" {
  description = "Innovatif ciphertext (IV)"
  type        = string
  sensitive   = true
}

variable "innovatif_package_name" {
  description = "Innovatif package name"
  type        = string
  default     = "truestack.gateway.test"
}

variable "innovatif_base_url" {
  description = "Innovatif API base URL"
  type        = string
  default     = "https://staging.ekyc.xendity.com/v1/gateway"
}
