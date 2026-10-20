# Copyright (c) HashiCorp, Inc.
# SPDX-License-Identifier: MPL-2.0

output "instance_ami" {
  value       = aws_instance.web.ami
  description = "AMI ID of the EC2 instance"
}

output "instance_arn" {
  value       = aws_instance.web.arn
  description = "ARN of the EC2 instance"
}

output "instance_id" {
  value       = aws_instance.web.id
  description = "EC2 instance ID for AWS Systems Manager Session Manager"
}

output "target_group_arn" {
  value       = aws_lb_target_group.main.arn
  description = "Target group ARN for checking application readiness"
}

output "instance_public_ip" {
  value       = aws_instance.web.public_ip
  description = "Public IP address of the EC2 instance"
}

output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "DNS name of the load balancer (use this to access the website)"
}

output "alb_url" {
  value       = "http://${aws_lb.main.dns_name}"
  description = "URL to access the Contoso web application"
}

output "vpc_id" {
  value       = aws_vpc.main.id
  description = "VPC ID"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.app_bucket.id
  description = "S3 bucket for application artifacts"
}
