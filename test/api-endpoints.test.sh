#!/bin/bash

# API Testing Script for Payroll and Withdrawal System
# Usage: bash test/api-endpoints.test.sh

API_URL="http://localhost:5000/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Starting API Tests for Payroll System..."
echo "================================================"

# Test 1: Check withdrawal history endpoint (should fail without auth)
echo -e "\n${YELLOW}Test 1: GET /drivers/withdrawal-history (without auth)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/drivers/withdrawal-history")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Correctly returns 401 Unauthorized${NC}"
else
  echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi

# Test 2: Check next payout endpoint (should fail without auth)
echo -e "\n${YELLOW}Test 2: GET /drivers/next-payout (without auth)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/drivers/next-payout")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Correctly returns 401 Unauthorized${NC}"
else
  echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi

# Test 3: Check immediate withdrawal endpoint (should fail without auth)
echo -e "\n${YELLOW}Test 3: POST /drivers/immediate-withdrawal (without auth)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/drivers/immediate-withdrawal" \
  -H "Content-Type: application/json" \
  -d '{"amount": "500"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Correctly returns 401 Unauthorized${NC}"
else
  echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi

# Test 4: Check admin scheduled payouts endpoint (should fail without auth)
echo -e "\n${YELLOW}Test 4: GET /admin/scheduled-payouts (without auth)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/admin/scheduled-payouts")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
  echo -e "${GREEN}✓ Correctly returns auth error ($HTTP_CODE)${NC}"
else
  echo -e "${RED}✗ Expected 401/403, got $HTTP_CODE${NC}"
fi

# Test 5: Test withdrawal with invalid amount (too low)
echo -e "\n${YELLOW}Test 5: POST /drivers/immediate-withdrawal with amount < 500 (without auth)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/drivers/immediate-withdrawal" \
  -H "Content-Type: application/json" \
  -d '{"amount": "200"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✓ Correctly returns error ($HTTP_CODE)${NC}"
else
  echo -e "${RED}✗ Expected 400/401, got $HTTP_CODE${NC}"
fi

echo ""
echo "================================================"
echo "📊 Server Connection Tests Complete"
echo "================================================"
echo ""
echo "Note: Full integration tests require authenticated users."
echo "To run authenticated tests, first create a test user and obtain a session token."
echo ""
