FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite bakes these into the frontend bundle at build time
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_MICROSOFT_CLIENT_ID
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_MICROSOFT_CLIENT_ID=$VITE_MICROSOFT_CLIENT_ID

RUN npm run build

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080

CMD ["npx", "tsx", "server.ts"]
