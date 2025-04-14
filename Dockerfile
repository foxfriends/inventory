FROM node:22.14.0
ENV NODE_ENV=production
WORKDIR /app
COPY ./package.json ./package-lock.json .
RUN npm ci
COPY ./src/ ./src/
COPY ./res/ ./res/

ENV PORT=3000
EXPOSE $PORT

CMD ["npm", "start"]
