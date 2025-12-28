FROM node:20-alpine

RUN apk add --no-cache bash netcat-openbsd

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

RUN npm run build

ENV PORT=3000

EXPOSE 3000

CMD ["/app/start.sh"]
