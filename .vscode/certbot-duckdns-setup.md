# Guida Completa: Configurazione Certbot, DuckDNS e HTTPS su Node.js

Questa guida ti mostrerà come configurare Certbot per ottenere un certificato SSL gratuito, come configurare un subdominio con DuckDNS, e come impostare il server Node.js per supportare HTTPS.

---

## 1. **Installare Certbot su Ubuntu**

Certbot è lo strumento che useremo per ottenere un certificato SSL gratuito da Let's Encrypt.

### 1.1 **Installazione di Certbot**

Esegui i seguenti comandi per installare Certbot su un server Ubuntu:

```bash
sudo apt update
sudo apt install certbot
```

### 1.2 **Verifica dell'installazione**

Verifica che Certbot sia stato installato correttamente eseguendo:

```bash
certbot --version
```

## 2. **Ottenere un Subdominio con DuckDNS**

DuckDNS offre un servizio gratuito per ottenere un subdominio che punta al tuo indirizzo IP pubblico. È utile per i server che potrebbero avere un IP dinamico (come una macchina EC2 di AWS).

### 2.1 **Registrati su DuckDNS**

1. Vai su [DuckDNS](https://www.duckdns.org).
2. Autenticati con uno dei metodi offerti (es. Google, GitHub, ecc.).
3. Una volta autenticato, vai alla sezione **"Add Domain"**.
4. Scegli un nome per il tuo subdominio, ad esempio `mioserver.duckdns.org`, e clicca su **"Add Domain"**.

### 2.2 **Aggiornamento dell'IP del Server**

Per mantenere aggiornato il tuo indirizzo IP su DuckDNS, puoi utilizzare uno script per aggiornare automaticamente il tuo IP. Su un server Ubuntu, esegui i seguenti passaggi:

1. Installa il client DuckDNS:

```bash
sudo apt install curl
```

2. Crea uno script per aggiornare DuckDNS:

```bash
nano /home/ubuntu/duckdns-update.sh
```

3. Aggiungi il seguente contenuto nel file, sostituendo `YOUR_TOKEN` con il tuo token DuckDNS e `mioserver` con il tuo subdominio:

```bash
#!/bin/bash
curl "https://www.duckdns.org/update?domains=mioserver&token=YOUR_TOKEN&ip="
```

4. Rendi eseguibile lo script:

```bash
chmod +x /home/ubuntu/duckdns-update.sh
```

5. Aggiungi un cron job per aggiornare l'IP ogni 5 minuti:

```bash
crontab -e
```

Aggiungi questa riga al file crontab:

```bash
*/5 * * * * /home/ubuntu/duckdns-update.sh >/dev/null 2>&1
```

### 2.3 **Verifica che il dominio punti correttamente al tuo server**

Esegui un comando `nslookup` per verificare che il tuo dominio punti correttamente al server:

```bash
nslookup mioserver.duckdns.org
```

---

## 3. **Richiedere il Certificato SSL con Certbot**

### 3.1 **Aprire la Porta 80 (HTTP)**

Assicurati che la porta 80 (per HTTP) e la porta 443 (per HTTPS) siano aperte nel tuo firewall e nel gruppo di sicurezza AWS per consentire a Let's Encrypt di verificare il tuo dominio.

Esegui i seguenti comandi per aprire la porta 80 e 443 nel firewall di Ubuntu:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 3.2 **Ottenere il Certificato SSL**

Esegui il comando seguente per richiedere il certificato SSL da Let's Encrypt usando Certbot:

```bash
sudo certbot certonly --standalone -d mioserver.duckdns.org
```

Segui le istruzioni per inserire il tuo indirizzo email e accettare i termini di servizio. Certbot genererà i certificati SSL e li salverà in:

- **`/etc/letsencrypt/live/mioserver.duckdns.org/fullchain.pem`** (certificato)
- **`/etc/letsencrypt/live/mioserver.duckdns.org/privkey.pem`** (chiave privata)

### 3.3 **Verifica il Certificato**

Verifica che il certificato sia stato ottenuto correttamente con:

```bash
sudo certbot certificates
```

---

## 4. **Configurare HTTPS con Node.js**

Ora che hai ottenuto il certificato, devi configurare il server Node.js per utilizzarlo.

### 4.1 **Modifica il Codice del Server Node.js**

Modifica il tuo codice Node.js per avviare un server HTTPS utilizzando il certificato SSL che hai appena ottenuto. Ecco un esempio:

```javascript
import fs from 'fs';
import https from 'https';
import express from 'express';

const app = express();

// Percorsi ai file del certificato
const httpsOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/mioserver.duckdns.org/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/mioserver.duckdns.org/fullchain.pem')
};

// Porta HTTPS
const PORT = process.env.PORT || 443;

// Avvia il server HTTPS
https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`☑️ Server HTTPS attivo => https://mioserver.duckdns.org`);
});
```

### 4.2 **Verifica che il Server Funzioni**

Avvia il server Node.js:

```bash
node server.js
```

Apri un browser e vai su `https://mioserver.duckdns.org`. Dovresti vedere il tuo sito con una connessione sicura.

---

## 5. **Rinnovo Automatico del Certificato SSL**

I certificati Let's Encrypt scadono ogni 90 giorni, ma Certbot configura automaticamente un rinnovo periodico.

### 5.1 **Verifica del Rinnovo**

Per verificare il rinnovo del certificato, esegui un test:

```bash
sudo certbot renew --dry-run
```

### 5.2 **Rinnovo Automatico**

Certbot configura un cron job per il rinnovo automatico del certificato. Puoi verificare che il cron job sia attivo con:

```bash
sudo systemctl list-timers
```

---

## 6. **Conclusioni**

Congratulazioni! Ora hai configurato con successo un certificato SSL gratuito per il tuo server Node.js utilizzando Let's Encrypt e Certbot, con un dominio personalizzato da DuckDNS. Il tuo sito è ora sicuro e protetto con HTTPS!

Ricorda che il certificato SSL verrà rinnovato automaticamente ogni 90 giorni.
```