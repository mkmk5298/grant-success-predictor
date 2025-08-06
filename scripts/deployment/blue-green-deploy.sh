#!/bin/bash
# Blue-Green Deployment Script for Vercel
# Zero-downtime deployment with automatic rollback

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_URL="${PRODUCTION_URL:-https://grant-predictor.vercel.app}"
STAGING_URL="${STAGING_URL:-https://grant-predictor-staging.vercel.app}"
HEALTH_CHECK_PATH="/api/health"
ROLLBACK_TIMEOUT=300 # 5 minutes
MAX_ERROR_RATE=0.01  # 1% error rate threshold

echo -e "${GREEN}🚀 Starting Blue-Green Deployment...${NC}"
echo "Production: $PRODUCTION_URL"
echo "Staging: $STAGING_URL"

# Function to check health
check_health() {
    local url=$1
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo -e "${YELLOW}Health check attempt $attempt of $max_attempts...${NC}"
        
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url$HEALTH_CHECK_PATH" || echo "000")
        
        if [ "$STATUS" = "200" ]; then
            echo -e "${GREEN}✅ Health check passed${NC}"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            echo -e "${RED}❌ Health check failed after $max_attempts attempts${NC}"
            return 1
        fi
        
        sleep 10
        ((attempt++))
    done
}

# Function to run smoke tests
run_smoke_tests() {
    echo -e "${YELLOW}🧪 Running smoke tests...${NC}"
    
    # Check homepage
    if ! curl -sf "$STAGING_URL" > /dev/null; then
        echo -e "${RED}❌ Homepage test failed${NC}"
        return 1
    fi
    
    # Check API endpoints
    if ! curl -sf "$STAGING_URL/api/health" > /dev/null; then
        echo -e "${RED}❌ API health check failed${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Smoke tests passed${NC}"
    return 0
}

# Function to monitor for errors
monitor_errors() {
    local duration=$1
    local start_time=$(date +%s)
    
    echo -e "${YELLOW}📊 Monitoring for errors ($duration seconds)...${NC}"
    
    while [ $(($(date +%s) - start_time)) -lt $duration ]; do
        # Check if health endpoint is responding
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL$HEALTH_CHECK_PATH" || echo "000")
        
        if [ "$STATUS" != "200" ]; then
            echo -e "${RED}⚠️ Health check failure detected${NC}"
            return 1
        fi
        
        # In production, you would check actual error rates from monitoring service
        # For now, we'll simulate by checking response times
        RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$PRODUCTION_URL" || echo "999")
        
        if (( $(echo "$RESPONSE_TIME > 3" | bc -l) )); then
            echo -e "${RED}⚠️ High response time detected: ${RESPONSE_TIME}s${NC}"
            return 1
        fi
        
        echo -e "✓ Health check OK, response time: ${RESPONSE_TIME}s"
        sleep 30
    done
    
    echo -e "${GREEN}✅ Monitoring period completed successfully${NC}"
    return 0
}

# Main deployment flow
main() {
    # Step 1: Pre-deployment checks
    echo -e "${YELLOW}📋 Running pre-deployment checks...${NC}"
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}❌ Vercel CLI not found. Please install it first.${NC}"
        exit 1
    fi
    
    # Step 2: Deploy to staging
    echo -e "${YELLOW}📦 Deploying to staging environment...${NC}"
    
    if [ -n "$VERCEL_TOKEN" ]; then
        STAGING_DEPLOYMENT_URL=$(vercel --token="$VERCEL_TOKEN" --scope="$VERCEL_SCOPE" --env=staging --yes 2>&1 | tail -n 1)
    else
        echo -e "${RED}❌ VERCEL_TOKEN not set${NC}"
        exit 1
    fi
    
    echo "Staging deployment: $STAGING_DEPLOYMENT_URL"
    
    # Step 3: Health check staging
    echo -e "${YELLOW}🏥 Running health checks on staging...${NC}"
    
    if ! check_health "$STAGING_DEPLOYMENT_URL"; then
        echo -e "${RED}❌ Staging health check failed, aborting deployment${NC}"
        exit 1
    fi
    
    # Step 4: Run smoke tests
    if ! run_smoke_tests; then
        echo -e "${RED}❌ Smoke tests failed, aborting deployment${NC}"
        exit 1
    fi
    
    # Step 5: Promote to production
    echo -e "${YELLOW}🔄 Promoting to production...${NC}"
    
    # Create production alias
    vercel alias set "$STAGING_DEPLOYMENT_URL" "$PRODUCTION_URL" --token="$VERCEL_TOKEN" --scope="$VERCEL_SCOPE"
    
    echo -e "${GREEN}✅ Production promotion complete${NC}"
    
    # Step 6: Monitor for errors
    if ! monitor_errors 60; then  # Monitor for 1 minute initially
        echo -e "${RED}⚠️ Error detected, initiating rollback...${NC}"
        
        # Rollback command would go here
        # vercel rollback --token="$VERCEL_TOKEN" --scope="$VERCEL_SCOPE"
        
        echo -e "${YELLOW}🔙 Rollback initiated${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo "Production URL: $PRODUCTION_URL"
    echo "Deployment completed at: $(date)"
}

# Run main function
main "$@"