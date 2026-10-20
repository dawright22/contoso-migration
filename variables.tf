# Copyright (c) HashiCorp, Inc.
# SPDX-License-Identifier: MPL-2.0

variable "region" {
  description = "AWS region"
  default     = "us-west-1"
}

variable "aws_profile" {
  description = "Optional AWS shared-config profile; null uses the standard AWS credential chain"
  type        = string
  default     = null
}

variable "instance_type" {
  description = "Type of EC2 instance to provision"
  default     = "t3.small"
}

variable "instance_name" {
  description = "EC2 instance name"
  default     = "contoso-web-server"
}

variable "app_name" {
  description = "Application name"
  default     = "contoso-web"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,22}[a-z0-9]$", var.app_name))
    error_message = "app_name must be 3-24 lowercase letters, digits or hyphens, starting with a letter and ending with a letter or digit."
  }
}

variable "app_artifact_path" {
  description = "Source archive produced by node scripts/package-app.mjs, relative to the Terraform working directory or absolute"
  type        = string
  default     = "app/contoso-web.tar.gz"
}

variable "node_env" {
  description = "Node environment"
  default     = "production"

  validation {
    condition     = var.node_env == "production"
    error_message = "This deployment runs a production Next.js build; node_env must be production."
  }
}
