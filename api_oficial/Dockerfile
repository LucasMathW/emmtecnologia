FROM node:20
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*
ENV TZ=America/Manaus
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build
ARG APIOFICIAL_PORT
EXPOSE ${APIOFICIAL_PORT}
CMD ["node", "dist/main.js"]
