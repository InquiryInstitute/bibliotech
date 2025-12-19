# AWS Route 53 Setup for bibliotech.inquiry.institute

This guide will help you set up the custom domain `bibliotech.inquiry.institute` using AWS Route 53.

## Prerequisites

- AWS Account with Route 53 access
- Domain `inquiry.institute` hosted in Route 53
- GitHub Pages site deployed (see DEPLOYMENT.md)

## Step 1: Get GitHub Pages URL

1. Go to your repository: https://github.com/InquiryInstitute/bibliotech
2. Go to **Settings** → **Pages**
3. Note your GitHub Pages URL (e.g., `https://inquiryinstitute.github.io/bibliotech/`)

## Step 2: Configure GitHub Pages Custom Domain

1. In **Settings** → **Pages**, scroll to **Custom domain**
2. Enter: `bibliotech.inquiry.institute`
3. Click **Save**
4. GitHub will create a `CNAME` file in your repository (already included)

## Step 3: Get GitHub Pages IP Addresses

GitHub Pages uses these IP addresses (as of 2024):
- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

Or use the canonical name: `inquiryinstitute.github.io`

## Step 4: Create Route 53 Record

### Option A: Using AWS Console

1. **Open Route 53 Console**: https://console.aws.amazon.com/route53/
2. **Select Hosted Zone**: `inquiry.institute`
3. **Create Record**:
   - Click **Create record**
   - **Record name**: `bibliotech`
   - **Record type**: `CNAME`
   - **Value**: `inquiryinstitute.github.io` (or your GitHub Pages URL without https://)
   - **TTL**: `300` (5 minutes) or use alias
   - Click **Create records**

### Option B: Using AWS CLI

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "bibliotech.inquiry.institute",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "inquiryinstitute.github.io"}]
      }
    }]
  }'
```

Replace `Z1234567890ABC` with your hosted zone ID.

### Option C: Using Terraform

```hcl
resource "aws_route53_record" "bibliotech" {
  zone_id = var.inquiry_institute_zone_id
  name    = "bibliotech.inquiry.institute"
  type    = "CNAME"
  ttl     = 300
  records = ["inquiryinstitute.github.io"]
}
```

## Step 5: Verify DNS Propagation

After creating the record, verify it's working:

```bash
# Check DNS resolution
dig bibliotech.inquiry.institute +short

# Should return: inquiryinstitute.github.io

# Or use nslookup
nslookup bibliotech.inquiry.institute
```

DNS propagation can take a few minutes to 48 hours, but typically completes within 15-30 minutes.

## Step 6: Enable HTTPS (Automatic)

GitHub Pages automatically provisions SSL certificates for custom domains via Let's Encrypt. This usually happens within 24 hours after DNS is configured.

To check SSL status:
1. Go to repository **Settings** → **Pages**
2. Under **Custom domain**, you should see "Certificate is being provisioned" or "Certificate is active"

## Step 7: Verify Setup

1. **Wait for DNS propagation** (15-30 minutes typically)
2. **Visit**: https://bibliotech.inquiry.institute
3. **Check SSL**: The site should load with HTTPS

## Troubleshooting

### DNS Not Resolving

1. **Check Route 53 record**:
   ```bash
   aws route53 list-resource-record-sets \
     --hosted-zone-id YOUR_ZONE_ID \
     --query "ResourceRecordSets[?Name=='bibliotech.inquiry.institute']"
   ```

2. **Verify CNAME value** matches your GitHub Pages URL

3. **Check DNS propagation**: Use https://dnschecker.org/

### SSL Certificate Not Provisioning

1. **Wait 24-48 hours** for automatic provisioning
2. **Check GitHub Pages settings** for any errors
3. **Verify DNS** is correctly pointing to GitHub
4. **Remove and re-add** the custom domain in GitHub Pages settings

### Site Not Loading

1. **Verify GitHub Pages is enabled** and site is published
2. **Check repository Settings → Pages** for build status
3. **Verify CNAME file** exists in repository root
4. **Check browser console** for any errors

## Alternative: Using A Records (Not Recommended)

If you prefer A records instead of CNAME:

1. Create 4 A records pointing to GitHub Pages IPs:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`

2. Set TTL to 300 seconds

**Note**: CNAME is recommended as GitHub may change IP addresses.

## Maintenance

- **DNS TTL**: Keep at 300 seconds for faster updates
- **Monitor**: Check GitHub Pages status page for outages
- **Backup**: Keep a record of your DNS configuration

## References

- [GitHub Pages Custom Domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [AWS Route 53 Documentation](https://docs.aws.amazon.com/route53/)
- [DNS Propagation Checker](https://dnschecker.org/)
