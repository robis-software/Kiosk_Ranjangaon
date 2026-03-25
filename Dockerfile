# # build stage
# FROM node:22.17-alpine AS build
# WORKDIR /app

# # copies only the package.json and package-lock.json in the /app (working dir)
# COPY package*.json ./

# RUN npm i

# RUN npm install cors @types/cors

# # specify src as . (later)
# COPY . .
# RUN npm run build

# # production stage
# FROM node:22.17-alpine

# COPY --from=build /app/package*.json ./
# RUN npm ci --production

# COPY --from=build /app/dist ./dist
# COPY --from=build /app/.env .

# EXPOSE 3000
# CMD ["node", "dist/app.js"]


#Only copies the folder and Run it in developement mode
FROM node:22.17-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install all dependencies (including devDependencies like ts-node)
RUN npm install

# Copy the rest of your source code
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Run directly using ts-node from your source path
CMD ["npx", "ts-node", "src/app.ts"]