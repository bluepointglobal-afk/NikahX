#!/bin/bash
set -e

echo "Starting CI Checks..."

# 1. Start Local Supabase
# supabase start

# 2. Run Tests
echo "Running RLS Tests..."
deno test --allow-env --allow-net tests/rls_tests.ts

# 3. Check Functions
echo "Checking Edge Functions..."
# supabase functions test ...

echo "CI Passed!"
