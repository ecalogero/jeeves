FROM node:20-slim
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Vite bakes these into the frontend bundle at build time
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_MICROSOFT_CLIENT_ID
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_MICROSOFT_CLIENT_ID=$VITE_MICROSOFT_CLIENT_ID

RUN npx prisma generate
RUN npm run build

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080

CMD ["npx", "tsx", "server.ts"]
