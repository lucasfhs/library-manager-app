FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY index.js ./index.js
COPY src ./src

USER node
EXPOSE 3000

CMD ["npm", "start"]
