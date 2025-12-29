FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for pyodbc (SQL Server)
RUN apt-get update && apt-get install -y \
    unixodbc \
    unixodbc-dev \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Microsoft ODBC Driver for SQL Server (if needed, usually good for pyodbc)
# For now, we stick to basic unixodbc unless specific driver version is required.

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8001"]
