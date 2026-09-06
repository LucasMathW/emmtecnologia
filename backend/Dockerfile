FROM node:20-alpine

RUN apk add --no-cache tzdata git

ENV TZ=America/Manaus
RUN cp /usr/share/zoneinfo/America/Manaus /etc/localtime && \
    echo "America/Manaus" > /etc/timezone

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN npm run build

EXPOSE 4099
CMD ["node", "dist/server.js"]
