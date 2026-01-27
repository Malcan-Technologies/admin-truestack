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
  db_password        = var.db_password
}

# S3 Bucket for KYC Documents
module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
}

# Secrets Manager
module "secrets" {
  source = "./modules/secrets"

  project_name = var.project_name
  environment  = var.environment
  database_url = module.rds.connection_string
  secrets = {
    better_auth_secret       = var.better_auth_secret
    api_key_encryption       = var.api_key_encryption_secret
    innovatif_api_key        = var.innovatif_api_key
    innovatif_md5_key        = var.innovatif_md5_key
    innovatif_ciphertext     = var.innovatif_ciphertext
  }
}

# ECS Fargate
module "ecs" {
  source = "./modules/ecs"

  project_name           = var.project_name
  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  alb_target_group_arn   = module.alb.target_group_arn
  alb_security_group_id  = module.alb.security_group_id
  ecr_repository_url     = var.ecr_repository_url
  image_tag              = var.image_tag
  
  # Environment variables
  database_url           = module.rds.connection_string
  better_auth_url        = "https://admin.${var.domain_name}"
  s3_kyc_bucket          = module.s3.bucket_name
  secrets_arn            = module.secrets.secrets_arn
  
  # Innovatif config
  innovatif_package_name = var.innovatif_package_name
  innovatif_base_url     = var.innovatif_base_url
}

# Outputs
output "alb_dns_name" {
  description = "ALB DNS name for CNAME records"
  value       = module.alb.dns_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 bucket name for KYC documents"
  value       = module.s3.bucket_name
}
