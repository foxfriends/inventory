FROM node:22.14.0
WORKDIR /app
COPY ./package.json ./package-lock.json .
RUN npm ci
COPY ./src/ ./src/
COPY ./res/ ./res/

ENV PORT=3000
EXPOSE $PORT

ENTRYPOINT ["npm", "start"]
