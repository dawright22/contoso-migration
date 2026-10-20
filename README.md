# Contoso Web on AWS

Deploy the Contoso Outdoors sample catalog to AWS with Terraform. The application
source, product data, manuals, images, and upstream MIT license are included in
[app/contoso-web](app/contoso-web). This is not an Azure deployment.

The app is based on a pinned revision of
[Azure-Samples/contoso-web](https://github.com/Azure-Samples/contoso-web).
See [application provenance](app/contoso-web/UPSTREAM.md) for the revision and
local changes. Chat is explicitly disabled: no chat UI or Azure services are
required, and chat API requests return HTTP 404 with a disabled message.

## Prerequisites

- Node.js 22 or 24 LTS and npm.
- `tar` on your PATH (included in current Windows installations).
- Terraform 1.2 or newer, below 2.0. Terraform 1.7+ is needed for mock tests.
- AWS credentials with permission to create VPC, EC2, ALB, S3 and IAM resources.
  Use the standard AWS credential chain, `AWS_PROFILE`, or `-var="aws_profile=NAME"`.
- For management/troubleshooting: AWS CLI and the Session Manager plugin, or the
  AWS console's Session Manager interface.

## Deploy

Run from the repository root. These commands work in PowerShell and Bash:

```text
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

The packaging command creates `app/contoso-web.tar.gz` **before Terraform planning**.
The archive is generated, ignored by Git, and must be regenerated after app edits.
For remote Terraform execution, generate the archive in the execution workspace
before planning; it is not available from a Git checkout alone.

Terraform uploads the source archive to a private S3 bucket. EC2 verifies its
SHA-256 checksum, installs Node.js 22 and locked npm dependencies, builds the app
on Linux, prunes build-only dependencies, and starts it as an unprivileged systemd
service. Windows dependencies and build output are never shipped to Linux.

The public HTTP ALB spans two availability zones and forwards to port 3000 on one
Ubuntu 22.04 instance. The default instance is `t3.small` (2 GiB RAM). Builds happen
on first boot, so Terraform finishing does **not** mean the site is ready yet.
Wait for the ALB target to become healthy; see the
[deployment guide](DEPLOYMENT_GUIDE.md).

## Local development and verification

```text
npm --prefix app/contoso-web run dev
```

Open `http://localhost:3000`. For production smoke tests, run a build first; the
tests start and stop their own production server on an available local port.
They check the catalog, all 20 products, manuals, images, image optimization,
unknown-product 404s, and disabled chat API responses.

```text
node --test scripts/package-app.test.mjs
terraform fmt -check -recursive
terraform validate
terraform test
```

Package the app before the packaging test and Terraform tests. The Terraform
tests use a mock AWS provider and create **no cloud resources**.

## Updating the app

Edit the vendored source, run the build and tests, regenerate the archive, and
plan/apply again. Artifact keys include the archive checksum. An app change
therefore changes EC2 user data and replaces the instance, rerunning bootstrap.
This demo has downtime during instance replacement; it is not a rolling deployment.

To use a custom archive destination:

```text
node scripts/package-app.mjs app/custom.tar.gz
terraform plan -var="app_artifact_path=app/custom.tar.gz"
```

## Scope and limitations

- Demo infrastructure, not a production-ready ecommerce system. User identity is
  sample data; checkout, payments, authentication, and a transactional database
  are not implemented.
- HTTP only. HTTPS requires an ACM certificate and an ALB HTTPS listener; there
  is no `enable_https` switch.
- Only the ALB is publicly accessible. No inbound SSH or direct port-3000 access;
  manage the instance through Session Manager.
- systemd restarts the app after failure and reboot. This replaces the previous
  PM2 bootstrap, avoiding a separate global process-manager dependency.
- AWS charges apply. Review your plan and regional pricing before applying.
- Terraform state is local by default. Use a secured remote backend for teamwork.
- Legacy Tailwind 3/ESLint 8 build dependencies still have npm audit advisories.
  They process trusted repository content during builds and are pruned before
  service startup. The production dependency audit is clean; build-tool
  modernization is separate work before adopting untrusted build inputs.

## Documentation and licenses

- [Quick start](QUICK_START.md)
- [Deployment and troubleshooting](DEPLOYMENT_GUIDE.md)
- [Chat-disabled behavior](CHAT_DISABLING_OPTIONS.md)
- Terraform configuration: [MPL-2.0](LICENSE).
- Imported application: [upstream MIT license](app/contoso-web/LICENSE.md).
