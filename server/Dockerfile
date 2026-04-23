FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package*.json ./
RUN npm ci && npm cache clean --force

RUN npx prisma generate

COPY . .

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm start"]