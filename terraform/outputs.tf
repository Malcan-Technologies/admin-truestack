# Terraform Outputs

output "alb_dns" {
  description = "ALB DNS name - use this for CNAME records in your DNS"
  value       = module.alb.dns_name
}

output "acm_validation" {
  description = "ACM certificate DNS validation records"
  value       = module.acm.domain_validation_options
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_backend_service_name" {
  description = "ECS backend service name"
  value       = module.ecs.backend_service_name
}

output "ecs_frontend_service_name" {
  description = "ECS frontend service name"
  value       = module.ecs.frontend_service_name
}

output "migration_task_definition" {
  description = "Migration task definition ARN"
  value       = module.ecs.migration_task_definition_arn
}

output "ecs_security_group" {
  description = "ECS security group ID"
  value       = module.ecs.security_group_id
}

output "private_subnets" {
  description = "Private subnet IDs for running tasks"
  value       = module.vpc.private_subnet_ids
}

output "run_migrations_command" {
  description = "Command to run migrations manually"
  value = <<-EOT
    aws ecs run-task \
      --cluster ${module.ecs.cluster_name} \
      --task-definition ${module.ecs.migration_task_definition_arn} \
      --launch-type FARGATE \
      --network-configuration "awsvpcConfiguration={subnets=[${join(",", module.vpc.private_subnet_ids)}],securityGroups=[${module.ecs.security_group_id}],assignPublicIp=DISABLED}" \
      --region ap-southeast-5
  EOT
}

output "ecr_push_commands" {
  description = "Commands to push Docker images to ECR"
  value = <<-EOT
    # Login to ECR
    aws ecr get-login-password --region ap-southeast-5 | docker login --username AWS --password-stdin ${var.backend_ecr_repository_url}
    
    # Build and push backend
    docker build -f apps/backend/Dockerfile -t ${var.project_name}-backend .
    docker tag ${var.project_name}-backend:latest ${var.backend_ecr_repository_url}:latest
    docker push ${var.backend_ecr_repository_url}:latest
    
    # Build and push frontend
    docker build -f apps/frontend/Dockerfile -t ${var.project_name}-frontend .
    docker tag ${var.project_name}-frontend:latest ${var.frontend_ecr_repository_url}:latest
    docker push ${var.frontend_ecr_repository_url}:latest
    
    # Build and push migrations
    docker build -f Dockerfile.migrations -t ${var.project_name}-migrations .
    docker tag ${var.project_name}-migrations:latest ${var.backend_ecr_repository_url}:latest-migrations
    docker push ${var.backend_ecr_repository_url}:latest-migrations
  EOT
}

output "dns_records" {
  description = "DNS records to create in your DNS provider"
  value = <<-EOT
    Create these CNAME records in your DNS:
    
    admin.${var.domain_name} -> ${module.alb.dns_name}
    api.${var.domain_name}   -> ${module.alb.dns_name}
    ${var.core_domain}       -> ${module.alb.dns_name}
  EOT
}

