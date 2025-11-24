#!/bin/bash

echo "🔍 Validating Environment Variables"
echo "===================================="
echo ""

MISSING_VARS=0

check_var() {
  VAR_NAME=$1
  REQUIRED=$2
  
  if [ -z "${!VAR_NAME}" ]; then
    if [ "$REQUIRED" = "true" ]; then
      echo "❌ $VAR_NAME - NOT SET (REQUIRED)"
      MISSING_VARS=$((MISSING_VARS + 1))
    else
      echo "⚠️  $VAR_NAME - Not set (optional)"
    fi
  else
    echo "✅ $VAR_NAME - Set"
  fi
}

echo "Required Variables:"
check_var "DATABASE_URL" true
check_var "SESSION_SECRET" true
check_var "VITE_GOOGLE_MAPS_API_KEY" true
check_var "STRIPE_SECRET_KEY" true
check_var "VITE_STRIPE_PUBLIC_KEY" true
check_var "VITE_VAPID_PUBLIC_KEY" true
check_var "VAPID_PRIVATE_KEY" true

echo ""
echo "Optional Variables:"
check_var "TWILIO_ACCOUNT_SID" false
check_var "TWILIO_AUTH_TOKEN" false
check_var "TWILIO_PHONE_NUMBER" false
check_var "STRIPE_WEBHOOK_SECRET" false
check_var "ALLOWED_ORIGINS" false
check_var "NODE_ENV" false
check_var "PORT" false

echo ""
if [ $MISSING_VARS -gt 0 ]; then
  echo "❌ $MISSING_VARS required variable(s) missing!"
  echo "See ENV_VARS.md for configuration details"
  exit 1
else
  echo "✅ All required variables are set"
fi
