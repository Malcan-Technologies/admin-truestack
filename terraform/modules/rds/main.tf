# RDS PostgreSQL Module

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "ecs_security_group" {
  type = string
}

variable "db_username" {
  type      = string
  sensitive = true
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for RDS"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_security_group]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  }
}

# RDS Instance
# Note: For existing RDS, password is already set and managed via Secrets Manager
# For new deployments, use manage_master_user_password = true
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}"

  # Engine
  engine               = "postgres"
  engine_version       = "16.11"
  instance_class       = "db.t4g.micro"
  
  # Storage
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  # Database
  db_name  = "trueidentity"
  username = var.db_username
  port     = 5432

  # Password management - let AWS manage the master user password
  # The password is stored in Secrets Manager automatically
  manage_master_user_password = true

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false # Single AZ for MVP cost optimization

  # Backup
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Monitoring
  performance_insights_enabled = false # Not available on t4g.micro

  # Protection
  deletion_protection = var.environment == "prod"
  skip_final_snapshot = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.project_name}-${var.environment}-final" : null

  # Apply changes immediately in non-prod
  apply_immediately = var.environment != "prod"

  # Ignore password changes since it's managed by AWS
  lifecycle {
    ignore_changes = [password]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}"
  }
}

# Outputs
output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "db_name" {
  value = aws_db_instance.main.db_name
}

# Note: Connection string is stored in the app's Secrets Manager secret
# This output is only available if manage_master_user_password was enabled
output "master_user_secret_arn" {
  value       = length(aws_db_instance.main.master_user_secret) > 0 ? aws_db_instance.main.master_user_secret[0].secret_arn : null
  description = "ARN of the secret containing the RDS master user credentials (null if not using managed password)"
}

output "security_group_id" {
  value = aws_security_group.rds.id
}
