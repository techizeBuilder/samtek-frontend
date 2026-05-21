#!/bin/bash

echo "🧪 Testing production-shift endpoint for unique batch numbers..."
echo ""

# Login first
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "unit_head01", "password": "unit123"}')

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed. Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Login successful"
echo ""

# Test production-shift endpoint
echo "🏭 Fetching production shift data..."
SHIFT_RESPONSE=$(curl -s -X GET http://localhost:5000/api/production/production-shift \
  -H "Authorization: Bearer $TOKEN")

echo "📊 Production Shift Response:"
echo "$SHIFT_RESPONSE" | jq '.'

echo ""
echo "🔍 Extracting batch numbers only..."
echo "$SHIFT_RESPONSE" | jq '.data[].items[] | {name: .name, batchNo: .batchNo, batchNumber: .batchNumber, status: .productionStatus}'