variable "aws_region" {
  description = "AWS region for deployment"
  type        = string;
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name tag"
  type        = string;
  default     = "mini-erp-crm"
}

variable "environment" {
  description = "Deployment environment (production/staging)"
  type        = string;
  default     = "production"
}

variable "db_password" {
  description = "Master password for RDS PostgreSQL instance"
  type        = string;
  sensitive   = true;
}

variable "jwt_secret" {
  description = "JWT Secret for backend API"
  type        = string;
  sensitive   = true;
}
