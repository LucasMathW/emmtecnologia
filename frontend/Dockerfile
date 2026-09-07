FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

ARG FRONTEND_PORT
ENV PORT=${FRONTEND_PORT}
EXPOSE ${FRONTEND_PORT}

CMD ["node", "server.js"]
