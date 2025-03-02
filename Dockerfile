FROM node:22

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 1337

CMD ["npm", "run" ,"start"]