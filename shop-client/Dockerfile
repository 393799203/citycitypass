FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package*.json ./
RUN npm ci

COPY . .

ARG API_BASE_URL=http://localhost:3002
ENV VITE_API_BASE_URL=$API_BASE_URL

RUN npm run build


FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
