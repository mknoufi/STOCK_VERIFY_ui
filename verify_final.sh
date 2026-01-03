#!/bin/bash

# 1. Login
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Login failed: $LOGIN_RESPONSE"
  exit 1
fi

echo "Token obtained."

# 2. List Sessions (Should work with new query logic)
echo "Listing sessions..."
LIST_RESPONSE=$(curl -s -X GET "http://localhost:8001/api/sessions" \
  -H "Authorization: Bearer $TOKEN")

echo "List Response: $LIST_RESPONSE"

# 3. Get Specific Session (Test get_session_by_id with session_id query)
# Extract first session ID
SESSION_ID=$(echo $LIST_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$SESSION_ID" ]; then
  echo "Fetching session $SESSION_ID..."
  GET_RESPONSE=$(curl -s -X GET "http://localhost:8001/api/sessions/$SESSION_ID" \
    -H "Authorization: Bearer $TOKEN")
  echo "Get Response: $GET_RESPONSE"
else
  echo "No sessions found to fetch."
fi
