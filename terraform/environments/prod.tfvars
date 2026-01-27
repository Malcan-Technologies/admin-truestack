# Production Environment Configuration

project_name = "trueidentity"
environment  = "prod"
aws_region   = "ap-southeast-5"

# Networking
vpc_cidr    = "10.0.0.0/16"
domain_name = "truestack.my"

# HTTPS - set to true after ACM certificate is validated
enable_https = false

# Database (use secrets for sensitive values)
db_username = "trueidentity"
# db_password - set via TF_VAR_db_password or secrets

# Container
# ecr_repository_url - set via TF_VAR_ecr_repository_url
image_tag = "latest"

# Innovatif (production)
innovatif_package_name = "truestack.gateway.prod"
innovatif_base_url     = "https://ekyc.xendity.com/v1/gateway"
