# TrueIdentity MVP Infrastructure
# AWS Region: ap-southeast-5 (Malaysia)

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment for remote state
  # backend "s3" {
  #   bucket         = "truestack-terraform-state"
  #   key            = "trueidentity/terraform.tfstate"
  #   region         = "ap-southeast-5"
  #   dynamodb_table = "truestack-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "TrueIdentity"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Reference existing secret (do not manage it)
data "aws_secretsmanager_secret" "app" {
  name = "${var.project_name}-${var.environment}"
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
}

# ACM Certificate
module "acm" {
  source = "./modules/acm"

  domain_name = var.domain_name
  environment = var.environment
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"

  project_name        = var.project_name
  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  certificate_arn     = module.acm.certificate_arn
  admin_domain        = "admin.${var.domain_name}"
  api_domain          = "api.${var.domain_name}"
  core_domain         = var.core_domain
  enable_https        = var.enable_https
}

# RDS PostgreSQL
module "rds" {
  source = "./modules/rds"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  ecs_security_group = module.ecs.security_group_id
  db_username        = var.db_username
}

# S3 Bucket for KYC Documents
module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
}

# ECS Fargate (Backend + Frontend services)
module "ecs" {
  source = "./modules/ecs"

  project_name                = var.project_name
  environment                 = var.environment
  vpc_id                      = module.vpc.vpc_id
  private_subnet_ids          = module.vpc.private_subnet_ids
  alb_security_group_id       = module.alb.security_group_id
  
  # Target groups for backend and frontend
  backend_target_group_arn    = module.alb.backend_target_group_arn
  frontend_target_group_arn   = module.alb.frontend_target_group_arn
  
  # Ensure listener rules are ready before creating ECS services
  depends_on = [module.alb]
  
  # ECR repositories
  backend_ecr_repository_url  = var.backend_ecr_repository_url
  frontend_ecr_repository_url = var.frontend_ecr_repository_url
  image_tag                   = var.image_tag
  
  # Environment variables
  better_auth_url             = "https://api.${var.domain_name}"
  s3_kyc_bucket               = module.s3.bucket_name
  secrets_arn                 = data.aws_secretsmanager_secret.app.arn
  
  # Innovatif config
  innovatif_package_name      = var.innovatif_package_name
  innovatif_base_url          = var.innovatif_base_url
}

# Outputs
output "alb_dns_name" {
  description = "ALB DNS name for CNAME records"
  value       = module.alb.dns_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "rds_master_user_secret_arn" {
  description = "ARN of the RDS master user secret in Secrets Manager (managed by AWS)"
  value       = module.rds.master_user_secret_arn
}

output "database_url_template" {
  description = "Template to construct DATABASE_URL (replace <PASSWORD> with actual password from RDS secret)"
  value       = "postgresql://${var.db_username}:<PASSWORD>@${module.rds.endpoint}/${module.rds.db_name}"
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 bucket name for KYC documents"
  value       = module.s3.bucket_name
}
