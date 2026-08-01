FROM node:22-alpine

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable
RUN pnpm install

COPY . .

RUN pnpm prisma generate

EXPOSE 3000

CMD ["pnpm", "start:dev"]