#!/bin/bash
# Setup Route 53 DNS for bibliotech.inquiry.institute
# 
# Usage: ./setup-route53.sh [hosted-zone-id]
# 
# Prerequisites:
# 1. AWS CLI installed and configured
# 2. Route 53 hosted zone for inquiry.institute
# 3. GitHub Pages site deployed

set -e

HOSTED_ZONE_ID=$1
GITHUB_PAGES_URL="inquiryinstitute.github.io"

if [ -z "$HOSTED_ZONE_ID" ]; then
    echo "Bibliotech Route 53 Setup"
    echo "========================"
    echo ""
    echo "This script will create a CNAME record for bibliotech.inquiry.institute"
    echo "pointing to your GitHub Pages site."
    echo ""
    echo "Usage: ./setup-route53.sh [hosted-zone-id]"
    echo ""
    echo "To find your hosted zone ID:"
    echo "  aws route53 list-hosted-zones --query \"HostedZones[?Name=='inquiry.institute.'].Id\" --output text"
    echo ""
    exit 1
fi

echo "Setting up Route 53 for bibliotech.inquiry.institute..."
echo "Hosted Zone ID: $HOSTED_ZONE_ID"
echo "GitHub Pages: $GITHUB_PAGES_URL"
echo ""

# Create the change batch JSON
CHANGE_BATCH=$(cat <<EOF
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "bibliotech.inquiry.institute",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "$GITHUB_PAGES_URL"}]
    }
  }]
}
EOF
)

echo "Creating CNAME record..."
echo ""

# Execute the change
CHANGE_ID=$(aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch "$CHANGE_BATCH" \
  --query "ChangeInfo.Id" \
  --output text)

echo "✅ CNAME record created successfully!"
echo ""
echo "Change ID: $CHANGE_ID"
echo ""
echo "Next steps:"
echo "1. Wait 5-15 minutes for DNS propagation"
echo "2. Configure custom domain in GitHub Pages:"
echo "   - Go to: https://github.com/InquiryInstitute/bibliotech/settings/pages"
echo "   - Under 'Custom domain', enter: bibliotech.inquiry.institute"
echo "   - Click Save"
echo ""
echo "3. Verify DNS propagation:"
echo "   dig bibliotech.inquiry.institute +short"
echo ""
echo "4. Wait for SSL certificate (up to 24 hours)"
echo "   GitHub will automatically provision SSL via Let's Encrypt"
echo ""
echo "5. Test the site:"
echo "   https://bibliotech.inquiry.institute"
