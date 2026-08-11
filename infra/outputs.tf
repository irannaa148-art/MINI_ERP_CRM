output "alb_dns_name" {
  description = "Public DNS name of the Application Load Balancer"
  value       = aws_lb.alb.dns_name
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront CDN distribution"
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "s3_bucket_name" {
  description = "Name of the created S3 assets bucket"
  value       = aws_s3_bucket.assets.id
}

output "rds_endpoint" {
  description = "PostgreSQL RDS database endpoint"
  value       = aws_db_instance.postgres.endpoint
}
