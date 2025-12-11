#!/bin/bash

# Manual CI/CD Pipeline Trigger Script
# This script allows you to manually trigger the GitHub Actions pipeline

set -e

echo "================================================"
echo "🎵 Music Runner - Manual Pipeline Trigger"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) is not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  macOS: brew install gh"
    echo "  Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    echo ""
    echo "Or trigger manually via GitHub web interface:"
    echo "  1. Go to: https://github.com/YOUR_USERNAME/SSW590_DEVOPS_FINAL/actions"
    echo "  2. Click 'Music Runner CI/CD Pipeline'"
    echo "  3. Click 'Run workflow' button"
    echo ""
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with GitHub${NC}"
    echo ""
    echo "Run: gh auth login"
    echo ""
    exit 1
fi

echo "Select deployment environment:"
echo "  1) Production"
echo "  2) Staging"
echo "  3) Development"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        environment="production"
        ;;
    2)
        environment="staging"
        ;;
    3)
        environment="development"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}🚀 Triggering pipeline for: ${environment}${NC}"
echo ""

# Trigger the workflow
gh workflow run ci-cd.yml -f environment=$environment

echo ""
echo -e "${GREEN}✅ Pipeline triggered successfully!${NC}"
echo ""
echo "View progress at:"
echo "https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/actions"
echo ""
echo "Or run: gh run list"
echo ""
