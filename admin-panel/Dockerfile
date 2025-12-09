# Admin Panel Dockerfile
# Simple static site served via nginx

FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application (Vite)
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config for SPA routing
RUN echo 'server { \
  listen 80; \
  server_name localhost; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { \
  try_files $uri $uri/ /index.html; \
  } \
  location /api { \
  proxy_pass http://backend:8001; \
  proxy_http_version 1.1; \
  proxy_set_header Upgrade $http_upgrade; \
  proxy_set_header Connection "upgrade"; \
  proxy_set_header Host $host; \
  proxy_set_header X-Real-IP $remote_addr; \
  } \
  }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
