FROM node:20.11-alpine AS base
WORKDIR /app
RUN npm install -g npm@10.8.2

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV EXPO_NO_TELEMETRY=1
RUN npm run build:web

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
