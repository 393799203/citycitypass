FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY server/package*.json ./server/
COPY server/prisma ./server/prisma
WORKDIR /app/server
RUN npm ci && npm cache clean --force

RUN npx prisma generate

COPY server/src ./src
COPY server/tsconfig.json ./

RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm start"]