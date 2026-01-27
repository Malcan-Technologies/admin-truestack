#!/bin/bash
set -e

# Disable AWS CLI pager to prevent output getting stuck
export AWS_PAGER=""

# TrueIdentity AWS Infrastructure Setup Script
# This script sets up the prerequisite AWS resources for Terraform and GitHub Actions

echo "=========================================="
echo "TrueIdentity AWS Infrastructure Setup"
echo "=========================================="
echo ""

# Configuration
AWS_REGION="${AWS_REGION:-ap-southeast-5}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-491694399426}"
PROJECT_NAME="trueidentity"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "       $1"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v terraform &> /dev/null; then
        print_warning "Terraform is not installed. You'll need it to deploy infrastructure."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    # Verify we're using the correct account
    CURRENT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    if [ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
        print_error "Wrong AWS account. Expected: ${AWS_ACCOUNT_ID}, Got: ${CURRENT_ACCOUNT}"
        print_error "Please configure credentials for the correct account."
        exit 1
    fi
    
    print_info "✓ AWS CLI configured for account ${AWS_ACCOUNT_ID}"
}

# Create ECR repository
create_ecr_repository() {
    print_step "Creating ECR repository..."
    
    if aws ecr describe-repositories --repository-names ${PROJECT_NAME} --region ${AWS_REGION} &> /dev/null; then
        print_info "✓ ECR repository already exists"
    else
        aws ecr create-repository \
            --repository-name ${PROJECT_NAME} \
            --region ${AWS_REGION} \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256 > /dev/null
        print_info "✓ ECR repository created"
    fi
    
    ECR_REPOSITORY_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}"
    print_info "  URL: ${ECR_REPOSITORY_URL}"
}

# Create S3 bucket for Terraform state
create_terraform_state_bucket() {
    print_step "Creating S3 bucket for Terraform state..."
    
    BUCKET_NAME="truestack-terraform-state-${AWS_ACCOUNT_ID}"
    
    if aws s3api head-bucket --bucket ${BUCKET_NAME} 2>/dev/null; then
        print_info "✓ S3 bucket already exists"
    else
        aws s3api create-bucket \
            --bucket ${BUCKET_NAME} \
            --region ${AWS_REGION} \
            --create-bucket-configuration LocationConstraint=${AWS_REGION} > /dev/null
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket ${BUCKET_NAME} \
            --versioning-configuration Status=Enabled
        
        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket ${BUCKET_NAME} \
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }]
            }'
        
        # Block public access
        aws s3api put-public-access-block \
            --bucket ${BUCKET_NAME} \
            --public-access-block-configuration \
            "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
        
        print_info "✓ S3 bucket created: ${BUCKET_NAME}"
    fi
}

# Create DynamoDB table for Terraform locks
create_dynamodb_lock_table() {
    print_step "Creating DynamoDB table for Terraform locks..."
    
    TABLE_NAME="truestack-terraform-locks"
    
    if aws dynamodb describe-table --table-name ${TABLE_NAME} --region ${AWS_REGION} &> /dev/null; then
        print_info "✓ DynamoDB table already exists"
    else
        aws dynamodb create-table \
            --table-name ${TABLE_NAME} \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region ${AWS_REGION} > /dev/null
        
        print_info "✓ DynamoDB table created: ${TABLE_NAME}"
    fi
}

# Create IAM role for GitHub Actions OIDC
create_github_actions_role() {
    print_step "Creating IAM role for GitHub Actions..."
    
    ROLE_NAME="github-actions-trueidentity"
    GITHUB_ORG="${GITHUB_ORG:-your-github-org}"
    GITHUB_REPO="${GITHUB_REPO:-admin-truestack}"
    
    if [ "$GITHUB_ORG" == "your-github-org" ]; then
        print_warning "GITHUB_ORG not set. Please set it before running:"
        print_warning "  export GITHUB_ORG=\"your-github-username-or-org\""
        print_warning "  export GITHUB_REPO=\"admin-truestack\""
        return
    fi
    
    # Check if OIDC provider exists
    if ! aws iam get-open-id-connect-provider --open-id-connect-provider-arn "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com" &> /dev/null; then
        print_info "Creating GitHub Actions OIDC provider..."
        
        aws iam create-open-id-connect-provider \
            --url https://token.actions.githubusercontent.com \
            --client-id-list sts.amazonaws.com \
            --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 > /dev/null
        
        print_info "✓ OIDC provider created"
    else
        print_info "✓ OIDC provider already exists"
    fi
    
    # Create trust policy
    TRUST_POLICY=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": "repo:${GITHUB_ORG}/${GITHUB_REPO}:*"
                }
            }
        }
    ]
}
EOF
)
    
    if aws iam get-role --role-name ${ROLE_NAME} &> /dev/null; then
        print_info "✓ IAM role already exists"
        # Update trust policy in case GITHUB_ORG changed
        aws iam update-assume-role-policy \
            --role-name ${ROLE_NAME} \
            --policy-document "${TRUST_POLICY}"
        print_info "  Updated trust policy for ${GITHUB_ORG}/${GITHUB_REPO}"
    else
        aws iam create-role \
            --role-name ${ROLE_NAME} \
            --assume-role-policy-document "${TRUST_POLICY}" > /dev/null
        
        # Attach necessary policies
        aws iam attach-role-policy \
            --role-name ${ROLE_NAME} \
            --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess
        
        aws iam attach-role-policy \
            --role-name ${ROLE_NAME} \
            --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess
        
        # Create and attach custom policy for Terraform
        TERRAFORM_POLICY=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:*"
            ],
            "Resource": [
                "arn:aws:s3:::truestack-terraform-state-${AWS_ACCOUNT_ID}",
                "arn:aws:s3:::truestack-terraform-state-${AWS_ACCOUNT_ID}/*",
                "arn:aws:s3:::trueidentity-*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:DeleteItem"
            ],
            "Resource": "arn:aws:dynamodb:${AWS_REGION}:${AWS_ACCOUNT_ID}:table/truestack-terraform-locks"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:*",
                "rds:*",
                "elasticloadbalancing:*",
                "acm:*",
                "secretsmanager:*",
                "logs:*",
                "iam:*"
            ],
            "Resource": "*"
        }
    ]
}
EOF
)
        
        aws iam put-role-policy \
            --role-name ${ROLE_NAME} \
            --policy-name terraform-access \
            --policy-document "${TERRAFORM_POLICY}"
        
        print_info "✓ IAM role created: ${ROLE_NAME}"
    fi
    
    ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"
    print_info "  Role ARN: ${ROLE_ARN}"
}

# Initialize Terraform backend config
init_terraform_backend() {
    print_step "Creating Terraform backend configuration..."
    
    BACKEND_FILE="terraform/backend.tf"
    
    cat > ${BACKEND_FILE} <<EOF
terraform {
  backend "s3" {
    bucket               = "truestack-terraform-state-${AWS_ACCOUNT_ID}"
    key                  = "trueidentity/prod/terraform.tfstate"
    region               = "${AWS_REGION}"
    dynamodb_table       = "truestack-terraform-locks"
    encrypt              = true
    skip_region_validation = true
  }
}
EOF
    
    print_info "✓ Created ${BACKEND_FILE}"
}

# Generate secrets
generate_secrets() {
    print_step "Generating secrets..."
    
    DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    AUTH_SECRET=$(openssl rand -base64 32)
    API_KEY_SECRET=$(openssl rand -hex 32)
    
    echo ""
    echo "=========================================="
    echo "SAVE THESE SECRETS SECURELY!"
    echo "=========================================="
    echo ""
    echo "# Terraform Variables (set before running terraform apply)"
    echo "export TF_VAR_db_password=\"${DB_PASSWORD}\""
    echo "export TF_VAR_better_auth_secret=\"${AUTH_SECRET}\""
    echo "export TF_VAR_api_key_encryption_secret=\"${API_KEY_SECRET}\""
    echo "export TF_VAR_ecr_repository_url=\"${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}\""
    echo ""
    echo "# Innovatif credentials (get from Innovatif)"
    echo "export TF_VAR_innovatif_api_key=\"your-innovatif-api-key\""
    echo "export TF_VAR_innovatif_md5_key=\"your-innovatif-md5-key\""
    echo "export TF_VAR_innovatif_ciphertext=\"your-innovatif-ciphertext\""
    echo ""
}

# Print next steps
print_next_steps() {
    echo ""
    echo "=========================================="
    echo "Setup Complete!"
    echo "=========================================="
    echo ""
    echo "NEXT STEPS:"
    echo ""
    echo "1. GitHub Repository Setup:"
    echo "   - Go to: https://github.com/${GITHUB_ORG}/${GITHUB_REPO}/settings/environments"
    echo "   - Create environment: production"
    echo "   - Add secret: AWS_ROLE_ARN = arn:aws:iam::${AWS_ACCOUNT_ID}:role/github-actions-trueidentity"
    echo ""
    echo "2. Set Terraform variables (from generated secrets above):"
    echo "   export TF_VAR_db_password=\"...\""
    echo "   export TF_VAR_better_auth_secret=\"...\""
    echo "   export TF_VAR_api_key_encryption_secret=\"...\""
    echo "   export TF_VAR_ecr_repository_url=\"...\""
    echo "   export TF_VAR_innovatif_api_key=\"...\""
    echo "   export TF_VAR_innovatif_md5_key=\"...\""
    echo "   export TF_VAR_innovatif_ciphertext=\"...\""
    echo ""
    echo "3. Run Terraform:"
    echo "   cd terraform"
    echo "   terraform init"
    echo "   terraform plan -var-file=environments/prod.tfvars"
    echo "   terraform apply -var-file=environments/prod.tfvars"
    echo ""
    echo "4. After Terraform completes:"
    echo "   - Note the ALB DNS name from outputs"
    echo "   - Create DNS CNAME records:"
    echo "     admin.truestack.my -> [ALB DNS name]"
    echo "     api.truestack.my   -> [ALB DNS name]"
    echo "   - Add ACM validation DNS records"
    echo ""
    echo "5. Push to GitHub to trigger deployment:"
    echo "   git add ."
    echo "   git commit -m \"Initial deployment\""
    echo "   git push origin main"
    echo ""
    echo "   This will:"
    echo "   - Build Docker images"
    echo "   - Push to ECR"
    echo "   - Run database migrations"
    echo "   - Deploy to ECS"
    echo ""
}

# Main execution
main() {
    echo "Configuration:"
    echo "  AWS Account ID: ${AWS_ACCOUNT_ID}"
    echo "  AWS Region:     ${AWS_REGION}"
    echo "  GitHub Org:     ${GITHUB_ORG:-not set}"
    echo "  GitHub Repo:    ${GITHUB_REPO:-not set}"
    echo ""
    
    check_prerequisites
    create_ecr_repository
    create_terraform_state_bucket
    create_dynamodb_lock_table
    create_github_actions_role
    init_terraform_backend
    generate_secrets
    print_next_steps
}

# Run main function
main "$@"
