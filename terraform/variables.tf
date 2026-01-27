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

variable "core_domain" {
  description = "Core/user domain"
  type        = string
  default     = "core.truestack.my"
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

# Container - Backend
variable "backend_ecr_repository_url" {
  description = "ECR repository URL for backend image"
  type        = string
  default     = "491694399426.dkr.ecr.ap-southeast-5.amazonaws.com/trueidentity-backend"
}

# Container - Frontend
variable "frontend_ecr_repository_url" {
  description = "ECR repository URL for frontend image"
  type        = string
  default     = "491694399426.dkr.ecr.ap-southeast-5.amazonaws.com/trueidentity-frontend"
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

# Innovatif (non-sensitive config only)
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
