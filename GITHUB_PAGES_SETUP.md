# GitHub Pages Setup for bibliotech.inquiry.institute

This guide will help you enable GitHub Pages and configure the custom domain.

## Step 1: Enable GitHub Pages

1. **Go to Repository Settings**:
   - Navigate to: https://github.com/InquiryInstitute/bibliotech/settings/pages

2. **Configure Source**:
   - Under **Source**, select:
     - **Branch**: `main`
     - **Folder**: `/ (root)`
   - Click **Save**

3. **Wait for Deployment**:
   - GitHub will build and deploy your site
   - This usually takes 1-2 minutes
   - You can check the status in the **Actions** tab

## Step 2: Configure Custom Domain

1. **In Pages Settings**, scroll to **Custom domain**

2. **Enter Domain**:
   - Type: `bibliotech.inquiry.institute`
   - Click **Save**

3. **Verify CNAME File**:
   - GitHub will create/update a `CNAME` file in your repository
   - This file is already included in the repo

4. **Note the GitHub Pages URL**:
   - Your site will be available at: `https://inquiryinstitute.github.io/bibliotech/`
   - This is what you'll point your DNS to

## Step 3: Set Up Route 53 DNS

### Option A: Using the Setup Script

1. **Find your Hosted Zone ID**:
   ```bash
   aws route53 list-hosted-zones --query "HostedZones[?Name=='inquiry.institute.'].Id" --output text
   ```

2. **Run the setup script**:
   ```bash
   ./setup-route53.sh YOUR_HOSTED_ZONE_ID
   ```

### Option B: Manual Setup via AWS Console

1. **Open Route 53 Console**: https://console.aws.amazon.com/route53/

2. **Select Hosted Zone**: `inquiry.institute`

3. **Create CNAME Record**:
   - Click **Create record**
   - **Record name**: `bibliotech`
   - **Record type**: `CNAME`
   - **Value**: `inquiryinstitute.github.io`
   - **TTL**: `300`
   - Click **Create records**

See [AWS_ROUTE53_SETUP.md](./AWS_ROUTE53_SETUP.md) for detailed instructions.

## Step 4: Verify DNS Propagation

Wait 5-15 minutes, then verify:

```bash
# Check DNS resolution
dig bibliotech.inquiry.institute +short
# Should return: inquiryinstitute.github.io

# Or use nslookup
nslookup bibliotech.inquiry.institute
```

## Step 5: Enable HTTPS

1. **Wait for DNS to propagate** (15-30 minutes typically)

2. **GitHub will automatically provision SSL**:
   - Go back to **Settings** → **Pages**
   - Under **Custom domain**, you should see "Certificate is being provisioned"
   - This can take up to 24 hours

3. **Enable HTTPS enforcement**:
   - Once certificate is active, check **Enforce HTTPS**
   - This ensures all traffic uses HTTPS

## Step 6: Configure GitHub Secrets (Optional)

If you want the GitHub Actions workflow to automatically build `config.js` from secrets:

1. **Go to Repository Settings** → **Secrets and variables** → **Actions**

2. **Add Secrets**:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key

3. **The workflow will automatically**:
   - Build `config.js` from these secrets during deployment
   - Deploy with your Supabase configuration

## Step 7: Test the Site

1. **Visit**: https://bibliotech.inquiry.institute
2. **Check SSL**: Verify the lock icon appears in your browser
3. **Test functionality**: Make sure books are loading from Supabase

## Troubleshooting

### Pages Not Deploying

- Check **Actions** tab for build errors
- Verify `index.html` exists in the root
- Check that the branch is `main` or `master`

### Custom Domain Not Working

- Verify DNS has propagated (use https://dnschecker.org/)
- Check CNAME record in Route 53
- Verify CNAME file exists in repository
- Wait up to 24 hours for full DNS propagation

### SSL Certificate Not Provisioning

- Ensure DNS is correctly pointing to GitHub
- Wait up to 24 hours for certificate provisioning
- Remove and re-add custom domain if needed
- Check GitHub Pages status page for issues

### Site Not Loading

- Verify GitHub Pages is enabled
- Check repository is public (or you have Pages access)
- Verify `index.html` is in the root directory
- Check browser console for errors

## Status Check

After setup, verify everything is working:

```bash
# Check DNS
dig bibliotech.inquiry.institute

# Check HTTPS
curl -I https://bibliotech.inquiry.institute

# Check GitHub Pages status
# Visit: https://github.com/InquiryInstitute/bibliotech/settings/pages
```

## Next Steps

1. ✅ GitHub Pages enabled
2. ✅ Custom domain configured
3. ✅ DNS records created
4. ⏳ Wait for SSL certificate (up to 24 hours)
5. ✅ Test the site

Your site will be live at: **https://bibliotech.inquiry.institute**
