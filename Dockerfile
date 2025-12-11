# Use official Node.js 18 Alpine image as base
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Install Hardhat globally for convenience
RUN npm install -g hardhat

# Compile contracts
RUN npx hardhat compile

# Default command runs the test suite
CMD ["npx", "hardhat", "test"]
