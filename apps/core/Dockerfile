FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY apps ./apps
COPY libs ./libs
COPY nest-cli.json tsconfig*.json ./

RUN npm install
RUN npm run build core

CMD ["node", "dist/apps/core/main.js"]
