# Usa un'immagine base di Node.js
FROM node:20

# Imposta la directory di lavoro nel container
WORKDIR /app

# Copia il package.json e il package-lock.json
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia tutto il resto del codice dell'app
COPY . .

# Espone la porta su cui il server Node.js ascolta
EXPOSE 3000

# Comando per avviare l'app
CMD ["npm", "start"]