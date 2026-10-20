# Deployment guide

## Architecture

```text
Internet -> public HTTP ALB (two availability zones)
         -> EC2 port 3000 (allowed only from the ALB security group)
         -> Next.js catalog, managed by systemd

Local source -> tar.gz -> private, versioned S3 artifact bucket
                      -> EC2 downloads and verifies SHA-256
```

The instance runs Ubuntu 22.04, Node.js 22 and the vendored Next.js application.
It uses an IAM instance profile to read the artifact and register with Systems
Manager. No AWS keys are copied to the instance. The root EBS volume is encrypted,
and IMDSv2 is required.

There is one app instance, not an Auto Scaling Group. Both subnets are public;
the instance needs outbound internet access for npm, NodeSource and Ubuntu
packages. Its security group allows no direct inbound internet connections.

## 1. Verify the application

Install the [prerequisites](README.md#prerequisites), then run from the repo root:

```text
npm --prefix app/contoso-web ci
npm --prefix app/contoso-web run lint
npm --prefix app/contoso-web run build
npm --prefix app/contoso-web run test:smoke
```

No environment file or Azure credentials are needed. The app is a sample
catalog with static product data, not a backend commerce system.

## 2. Package

```text
node scripts/package-app.mjs
node --test scripts/package-app.test.mjs
```

This creates `app/contoso-web.tar.gz` with exactly one top-level directory,
`contoso-web/`, matching bootstrap's `tar --strip-components=1`.
An allowlist includes package manifests, build configuration, source, public
assets and license/provenance. Local `.env*`, `node_modules`, `.next`, Git
metadata and tests are not packaged.

The archive contains source, not Windows binaries or a Windows Next.js build.
EC2 runs `npm ci --include=dev`, `npm run build`, and then `npm prune --omit=dev`
on Linux before starting the service. The included public
assets are approximately 326 MB uncompressed; do not omit the product data,
manuals or images when making a custom artifact.

Regenerate the archive after any app edit. Terraform reads its checksum during
planning, so it must already exist. Keep it unchanged between a saved plan and
apply. If using remote Terraform, run packaging in that workspace before plan;
the generated archive is ignored by Git.

## 3. Configure and plan

The default AWS credential chain is used. To select a shared AWS profile, set
`AWS_PROFILE` or pass the optional `aws_profile` variable. The old hardcoded
`terraform` profile is no longer required.

Key variables in [variables.tf](variables.tf):

| Variable | Default | Meaning |
|----------|---------|---------|
| `region` | `us-west-1` | AWS region with at least two available AZs |
| `aws_profile` | `null` | Optional shared-config profile |
| `instance_type` | `t3.small` | 2 GiB memory for the on-instance build |
| `instance_name` | `contoso-web-server` | EC2 Name tag |
| `app_name` | `contoso-web` | Resource prefix, Linux service and user name |
| `app_artifact_path` | `app/contoso-web.tar.gz` | Local source archive |
| `node_env` | `production` | Must remain production |

`app_name` must be 3-24 lowercase letters, digits or hyphens, start with a letter,
and end with a letter or digit. Use a unique name per deployment in an account.
The artifact bucket's name includes the AWS account ID.

```text
terraform init
terraform fmt -check -recursive
terraform validate
terraform test
terraform plan -out=contoso.tfplan
```

`terraform test` requires Terraform 1.7+ and uses mocked AWS resources. It does
not deploy anything or validate actual AWS permissions, quota, regional capacity
or cloud-init execution. `terraform plan` uses your real AWS identity.

## 4. Apply and verify readiness

```text
terraform apply contoso.tfplan
terraform output -raw alb_url
terraform output -raw target_group_arn
```

The artifact's checksum is part of its S3 key and rendered user data. Bootstrap
receives plain-text user data with LF line endings, verifies the download,
installs dependencies, builds, and starts an unprivileged systemd service. It
checks local HTTP health before reporting success. Failures are written to the
cloud-init log and system journal.

Terraform completion alone does **not** verify bootstrap or application health.
Wait for a healthy target in the console or with the CLI:

```text
aws elbv2 describe-target-health --region us-west-1 --target-group-arn TARGET_GROUP_ARN --no-cli-pager
```

Use the configured region and profile for all AWS CLI commands. Once healthy,
open the ALB URL and a product page. Chat UI should be absent. A request to
`/api/chat/promptflow` should return HTTP 404 and a JSON disabled message.

## Management and troubleshooting

Get the instance ID and connect using Session Manager:

```text
terraform output -raw instance_id
aws ssm start-session --region us-west-1 --target INSTANCE_ID
```

Install the Session Manager plugin locally, or use the console's Session Manager
interface. Canonical's Ubuntu AWS image includes the SSM agent, and Terraform
attaches `AmazonSSMManagedInstanceCore`. Your operator identity also needs
permission to start sessions. Allow a newly launched instance time to register.

Inside the session (substitute your custom `app_name` if applicable):

```bash
sudo cloud-init status --wait
sudo tail -n 200 /var/log/cloud-init-output.log
sudo systemctl status contoso-web --no-pager
sudo journalctl -u contoso-web -n 100 --no-pager
curl -f http://127.0.0.1:3000/
sudo systemctl restart contoso-web
```

For early boot problems, EC2 console system logs can help even if SSM is not
registered yet:

```text
aws ec2 get-console-output --region us-west-1 --instance-id INSTANCE_ID --latest --output text --no-cli-pager
```

| Symptom | Check |
|---------|-------|
| Missing archive during plan | Run packaging from the repository root |
| ALB 503/unhealthy target | Wait for bootstrap, then check cloud-init and service logs |
| Dependency download failure | Verify outbound routing, DNS, npm/Ubuntu/NodeSource access |
| Build killed/out of memory | Increase `instance_type`; `t3.micro` is not recommended |
| S3 access denied | Verify instance role, artifact object key and organizational policies |
| Session Manager unavailable | Verify agent, IAM permissions, outbound HTTPS and registration |
| Chat returns 404 | Expected: chat is explicitly disabled |

## Application updates

Repeat build, smoke tests, packaging, then Terraform plan/apply. A changed
archive changes the instance's user data and replaces the EC2 instance.
Bootstrap changes also trigger replacement. This causes downtime; use immutable
images, CI/CD and an Auto Scaling Group for rolling production deployments.

Do not edit the running instance as the source of truth. Those edits disappear
on replacement. Logs on the instance are also lost on replacement.

## HTTPS and production use

This demo exposes HTTP only. There is no `enable_https` variable. To add TLS,
configure a domain, a validated ACM certificate in the ALB region, an HTTPS
listener and its security-group rule, and an HTTP-to-HTTPS redirect.

Before production, also address availability/rolling updates, centralized logs
and monitoring, secret management, authentication, patching, backups, and a
secured remote Terraform state backend. Review regional AWS charges; the
instance, ALB, public IPv4 addresses, EBS, S3 and traffic can all incur costs.

The runtime npm audit is clean. The inherited Tailwind 3/ESLint 8 build toolchain
still has audit advisories (including pattern-parsing denial-of-service issues)
and should only build trusted source. Its dependencies are pruned from the
instance before service startup. Migrating those tools to their next major
versions is separate modernization work.

## Cleanup

```text
terraform destroy
```

Review the destruction plan first. The artifact bucket is versioned and
`force_destroy` is not enabled. If AWS reports that the bucket is not empty,
remove the artifact bucket's remaining object versions/delete markers using the
S3 console, then retry. Do not delete unrelated buckets or deployment state.

## Licenses

Terraform configuration is covered by the repository's [MPL-2.0 license](LICENSE).
The imported Microsoft application and assets retain their
[upstream MIT notice](app/contoso-web/LICENSE.md).
