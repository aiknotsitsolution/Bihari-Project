# One Dockerfile for every service:  docker build --build-arg SERVICE=auth-service .
FROM node:22-alpine AS build
ARG SERVICE
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx nest build ${SERVICE}

FROM node:22-alpine
ARG SERVICE
ENV NODE_ENV=production SERVICE=${SERVICE}
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist/apps/${SERVICE} ./dist
CMD ["node", "dist/main.js"]
