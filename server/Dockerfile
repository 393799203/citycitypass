FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]