#!/bin/bash

# Generate self-signed SSL certificates for local development
# Usage: ./generate_ssl.sh

SSL_DIR="nginx/ssl"
mkdir -p $SSL_DIR

echo "Generating self-signed SSL certificates in $SSL_DIR..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout $SSL_DIR/privkey.pem \
    -out $SSL_DIR/fullchain.pem \
    -subj "/C=US/ST=State/L=City/O=StockVerify/OU=Development/CN=stock-verify.local"

echo "✓ Certificates generated:"
echo "  - $SSL_DIR/privkey.pem"
echo "  - $SSL_DIR/fullchain.pem"
echo ""
echo "To use these certificates with Uvicorn directly:"
echo "uvicorn backend.server:app --host 0.0.0.0 --port 8001 --ssl-keyfile $SSL_DIR/privkey.pem --ssl-certfile $SSL_DIR/fullchain.pem"
