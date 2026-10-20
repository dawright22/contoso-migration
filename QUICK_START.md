# Quick start

This deploys the included Contoso sample app to **AWS**, without chat.
Use Node.js 22/24 LTS, npm, tar, Terraform >=1.2 and <2.0, and configured AWS
credentials. See [prerequisites](README.md#prerequisites).

From the repository root:

```text
# Verify and package the application before Terraform reads the archive.
npm --prefix app/contoso-web ci
npm --prefix app/contoso-web run lint
npm --prefix app/contoso-web run build
npm --prefix app/contoso-web run test:smoke
node scripts/package-app.mjs

terraform init
terraform validate
terraform plan -out=contoso.tfplan
terraform apply contoso.tfplan
terraform output -raw alb_url
```

The default region is `us-west-1`; the default instance is `t3.small`.
Pass `-var="region=REGION"` or `-var="aws_profile=PROFILE"` to `terraform plan`
when needed. Region/profile variables are also supported through standard
Terraform variable files and `TF_VAR_*` environment variables.

Do not expect a fixed five-minute deployment. EC2 downloads the source archive
from S3 and builds it on first boot. The ALB may return 503 until its target is
healthy. Check the target group using the AWS console, or:

```text
terraform output -raw target_group_arn
aws elbv2 describe-target-health --region us-west-1 --target-group-arn TARGET_GROUP_ARN --no-cli-pager
```

For instance access, use **Session Manager**, not SSH:

```text
terraform output -raw instance_id
aws ssm start-session --region us-west-1 --target INSTANCE_ID
```

Use the same AWS account/profile and region as Terraform. The CLI session command
requires the Session Manager plugin. In the session:

```bash
sudo cloud-init status --wait
sudo tail -n 100 /var/log/cloud-init-output.log
sudo systemctl status contoso-web --no-pager
sudo journalctl -u contoso-web -n 100 --no-pager
```

After app edits, repeat the build/tests, packaging, and plan/apply. The instance
will be replaced so bootstrap can deploy the new artifact.

See [the deployment guide](DEPLOYMENT_GUIDE.md) for configuration, cleanup,
troubleshooting, and production limitations.
