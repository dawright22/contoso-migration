mock_provider "aws" {
  mock_resource "aws_lb" {
    defaults = {
      arn = "arn:aws:elasticloadbalancing:us-west-1:123456789012:loadbalancer/app/contoso-web-alb/1234567890123456"
    }
  }

  mock_resource "aws_lb_target_group" {
    defaults = {
      arn = "arn:aws:elasticloadbalancing:us-west-1:123456789012:targetgroup/contoso-web-tg/1234567890123456"
    }
  }

  mock_data "aws_availability_zones" {
    defaults = {
      names = ["us-west-1a", "us-west-1b"]
    }
  }

  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
    }
  }
}

run "deployment_wiring" {
  command = apply

  assert {
    condition     = startswith(local.user_data_script, "#!/bin/bash\n")
    error_message = "EC2 must receive a plain-text cloud-init shell script, not base64."
  }

  assert {
    condition     = aws_instance.web.user_data == local.user_data_script
    error_message = "The rendered bootstrap script must be passed directly to user_data."
  }

  assert {
    condition     = strcontains(aws_s3_object.app_archive.key, filesha256(var.app_artifact_path)) && strcontains(local.user_data_script, aws_s3_object.app_archive.key)
    error_message = "Changing the application archive must change its S3 key and EC2 bootstrap."
  }

  assert {
    condition     = strcontains(local.user_data_script, "${filesha256(var.app_artifact_path)}  /tmp/contoso-app.tar.gz")
    error_message = "Bootstrap must verify the archive checksum before extraction."
  }

  assert {
    condition     = aws_instance.web.user_data_replace_on_change
    error_message = "An application or bootstrap change must replace the demo instance."
  }

  assert {
    condition     = contains(tolist(aws_security_group.web.ingress)[0].security_groups, aws_security_group.alb.id) && tolist(aws_security_group.web.ingress)[0].cidr_blocks == null
    error_message = "The application must only accept ingress from the load balancer."
  }

  assert {
    condition     = aws_iam_role_policy_attachment.ssm.role == aws_iam_role.ec2_role.name
    error_message = "The instance role must support Session Manager access."
  }
}
