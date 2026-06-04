FROM node:20-slim

# Install Python 3 (required by yt-dlp on Linux)
RUN apt-get update && \
    apt-get install -y python3 && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install node modules
RUN npm install

# Copy the rest of your server code
COPY . .

# Ensure the downloads folder exists and is writable
RUN mkdir -p downloads
RUN chmod 777 downloads

# Expose the port your Express server runs on
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
