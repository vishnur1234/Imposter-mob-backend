FROM node:20-alpine

WORKDIR /app

# Copy only the dependency manifests first, so Docker can cache this layer.
# If package.json hasn't changed, Docker skips `npm install` on rebuilds.
COPY package*.json ./
RUN npm install --omit=dev

# Now copy the rest of the source code.
COPY . .

EXPOSE 5050

CMD ["node", "server.js"]
