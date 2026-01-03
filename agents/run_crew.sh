#!/bin/bash
cd "$(dirname "$0")"

# Check if python3.11 is available
if ! command -v python3.11 &> /dev/null; then
    echo "Error: python3.11 is required but not found."
    exit 1
fi

if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Creating..."
    python3.11 -m venv .venv
    source .venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

echo "Running Stock Verify Crew with Memory Integration..."
python stock_verify_crew.py
