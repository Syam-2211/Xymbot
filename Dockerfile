FROM node:20-alpine

# Install ffmpeg (required for audio/video features)
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

RUN npm install --production

# Copy rest of the code
COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["node", "index.js"]
