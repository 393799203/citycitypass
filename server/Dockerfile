FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

RUN corepack enable

COPY package*.json ./server/
COPY prisma ./server/prisma
WORKDIR /app/server
RUN npm install && npm cache clean --force

RUN npx prisma generate

COPY src ./src
COPY tsconfig.json ./
COPY entrypoint.sh ./

RUN chmod +x entrypoint.sh

RUN npm run build

EXPOSE 3001

CMD ["./entrypoint.sh"]
