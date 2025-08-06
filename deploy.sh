#!/bin/bash

# Grant Predictor Deployment Script
# This script handles the complete deployment process to Vercel

echo "🚀 Grant Predictor Deployment Starting..."

# Check if required environment variables are set
check_env_vars() {
    echo "📋 Checking environment variables..."
    
    required_vars=(
        "OPENAI_API_KEY"
        "DATABASE_URL"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" && ! -f .env.local ]] || [[ -f .env.local && ! $(grep -q "$var" .env.local) ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        echo "❌ Missing environment variables:"
        printf '%s\n' "${missing_vars[@]}"
        echo "Please add them to .env.local or set them in your deployment platform."
        return 1
    fi
    
    echo "✅ All required environment variables are set"
    return 0
}

# Install dependencies
install_deps() {
    echo "📦 Installing dependencies..."
    npm install
    if [[ $? -ne 0 ]]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
}

# Build the application
build_app() {
    echo "🏗️  Building application..."
    npm run build
    if [[ $? -ne 0 ]]; then
        echo "❌ Build failed"
        exit 1
    fi
    echo "✅ Build successful"
}

# Run type check
type_check() {
    echo "🔍 Running type check..."
    npm run type-check
    if [[ $? -ne 0 ]]; then
        echo "⚠️  Type check failed, but continuing..."
    else
        echo "✅ Type check passed"
    fi
}

# Deploy to Vercel
deploy_to_vercel() {
    echo "🌐 Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Deploy to production
    vercel --prod
    
    if [[ $? -eq 0 ]]; then
        echo "✅ Deployment successful!"
        echo "🎉 Grant Predictor is now live!"
    else
        echo "❌ Deployment failed"
        exit 1
    fi
}

# Set environment variables in Vercel (optional helper)
set_vercel_env() {
    echo "🔧 Setting up Vercel environment variables..."
    echo "Please run these commands manually in your terminal:"
    echo ""
    
    if [[ -f .env.local ]]; then
        while IFS= read -r line; do
            if [[ $line =~ ^[A-Z_]+=.+ ]]; then
                var_name=$(echo "$line" | cut -d'=' -f1)
                echo "vercel env add $var_name"
            fi
        done < .env.local
    fi
    
    echo ""
    echo "Or add them through the Vercel dashboard: https://vercel.com/dashboard"
}

# Main deployment flow
main() {
    echo "Grant Predictor - DoNotPay Style"
    echo "================================"
    
    # Run checks and build
    install_deps
    type_check
    build_app
    
    # Check environment variables
    if ! check_env_vars; then
        echo ""
        echo "💡 To set environment variables in Vercel:"
        set_vercel_env
        echo ""
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Deployment cancelled."
            exit 1
        fi
    fi
    
    # Deploy
    deploy_to_vercel
    
    echo ""
    echo "🎯 Post-deployment checklist:"
    echo "  □ Test Google OAuth login"
    echo "  □ Verify payment processing"
    echo "  □ Check AI predictions"
    echo "  □ Test mobile responsiveness"
    echo "  □ Verify database connections"
    echo ""
    echo "📊 Monitor your app:"
    echo "  - Vercel Analytics: https://vercel.com/analytics"
    echo "  - Error tracking: Check Vercel Functions logs"
    echo "  - Performance: Run Lighthouse audit"
}

# Run the deployment
main "$@"