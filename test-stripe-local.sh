#!/bin/bash

# Stripe Payment Integration - Local Testing Script
# Usage: ./test-stripe-local.sh

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend-test"

echo "🎯 NikahX Stripe Payment Integration - Local Testing"
echo "=========================================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi
echo "✅ Node.js found: $(node --version)"

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi
echo "✅ npm found: $(npm --version)"

# Verify environment files
echo ""
echo "🔧 Checking environment configuration..."
if [ ! -f "$PROJECT_DIR/.env.local" ]; then
    echo "⚠️  .env.local not found. Creating with defaults..."
    cat > "$PROJECT_DIR/.env.local" << 'EOF'
VITE_SUPABASE_URL=https://vgrwttaitvrqfvnepyum.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZncnd0dGFpdHZycWZ2bmVweXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyODc5NTYsImV4cCI6MjA4NTg2Mzk1Nn0.GEYX-sU_hzzJHgwMNmY4RHc-YJqrCYXXXilA1BRFZNg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZncnd0dGFpdHZycWZ2bmVweXVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI4Nzk1NiwiZXhwIjoyMDg1ODYzOTU2fQ.hdiFMzpAleXZsksROxsCm0p7l4iqoFrTmF4lDInBMzo
SUPABASE_URL=https://vgrwttaitvrqfvnepyum.supabase.co
STRIPE_SECRET_KEY=sk_test_51SxZKe4b4Crudawq7lU09S7B_test
STRIPE_WEBHOOK_SECRET=whsec_1SxZKe4b4Crudawq7lU09S7B_test
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SxZKe4b4Crudawq7lU09S7B
VITE_STRIPE_PRICE_ID=price_1SxZKe4b4Crudawq7lU09S7B
EOF
    echo "✅ Created .env.local"
fi

if [ ! -f "$FRONTEND_DIR/.env" ]; then
    echo "⚠️  frontend-test/.env not found. Creating with defaults..."
    cat > "$FRONTEND_DIR/.env" << 'EOF'
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SxZKe4b4Crudawq7lU09S7B
VITE_STRIPE_PRICE_ID=price_1SxZKe4b4Crudawq7lU09S7B
EOF
    echo "✅ Created frontend-test/.env"
fi

# Check Stripe keys in .env.local
if grep -q "VITE_STRIPE_PUBLISHABLE_KEY" "$PROJECT_DIR/.env.local"; then
    STRIPE_KEY=$(grep "VITE_STRIPE_PUBLISHABLE_KEY" "$PROJECT_DIR/.env.local" | cut -d= -f2)
    echo "✅ Stripe publishable key configured: ${STRIPE_KEY:0:20}..."
else
    echo "❌ Missing VITE_STRIPE_PUBLISHABLE_KEY in .env.local"
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    npm install --legacy-peer-deps
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Check build
echo ""
echo "🔨 Building frontend..."
if npm run build > /tmp/build.log 2>&1; then
    echo "✅ Frontend build successful"
    # Show build size
    if [ -f "dist/index.html" ]; then
        SIZE=$(du -sh dist | cut -f1)
        echo "   Build size: $SIZE"
    fi
else
    echo "❌ Frontend build failed"
    echo "Build log:"
    cat /tmp/build.log
    exit 1
fi

# Show next steps
echo ""
echo "✅ All checks passed! You're ready to test locally."
echo ""
echo "📝 Next steps:"
echo "1. Start the dev server:"
echo "   cd frontend-test && npm run dev"
echo ""
echo "2. Open browser:"
echo "   http://localhost:5173/auth"
echo ""
echo "3. Create a test account:"
echo "   Email: test@example.com"
echo "   Password: Any password"
echo ""
echo "4. Complete onboarding to reach home page"
echo ""
echo "5. Click 'Upgrade to Premium' or go to /premium"
echo ""
echo "6. Use test card to complete payment:"
echo "   Card: 4242 4242 4242 4242"
echo "   Expiry: 12/25 (any future date)"
echo "   CVC: 123 (any 3 digits)"
echo "   ZIP: 12345 (any 5 digits)"
echo ""
echo "7. Verify success:"
echo "   - Success page shows 'You're Premium'"
echo "   - Database shows is_premium=true"
echo "   - /account/subscription shows premium status"
echo ""
echo "📚 For more details, see:"
echo "   - STRIPE_INTEGRATION.md (technical overview)"
echo "   - STRIPE_TESTING_GUIDE.md (detailed testing)"
echo ""
echo "=========================================================="
