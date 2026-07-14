# Mingo Backend EC2 Deployment Guide

This guide details the steps to deploy the **Mingo Node.js Backend** on an **AWS EC2** instance (Ubuntu 22.04 LTS) using **PM2** for process management, **Nginx** as a reverse proxy with WebSocket support (for Socket.io), and securing it with an **sslip.io** wildcard domain and **Let's Encrypt (Certbot)** SSL.

---

## 1. AWS EC2 Instance Security Group Configuration
Ensure your EC2 Security Group allows inbound traffic on the following ports:

| Protocol | Port | Source | Description |
| :--- | :--- | :--- | :--- |
| **SSH** | `22` | `My IP` or `0.0.0.0/0` | Secure shell access |
| **HTTP** | `80` | `0.0.0.0/0` | Web traffic (redirected to HTTPS) |
| **HTTPS** | `443` | `0.0.0.0/0` | Secure SSL web traffic |

Connect to your instance:
```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## 2. Install System Dependencies (Node.js & Redis)

Once logged in, update your package index:
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js v20 (LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify versions
node -v
npm -v
```

### Install Redis
Redis is required by the Mingo backend. Install and run it locally:
```bash
sudo apt install redis-server -y

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

---

## 3. Clone and Setup the Mingo Backend

1. **Clone the Repository:**
   ```bash
   git clone <YOUR_GIT_REPO_URL> mingo-backend
   cd mingo-backend/backend
   ```

2. **Install Production Dependencies:**
   ```bash
   npm install --production
   ```

3. **Configure Environment Variables:**
   Create a `.env` file using the template:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *Make sure to configure the correct secrets, ports, MongoDB URI (use your MongoDB Atlas connection string starting with `mongodb+srv://`), and Redis details.*

   > [!IMPORTANT]
   > **MongoDB Atlas Network Security:**
   > You must whitelist your EC2 instance's Public IP in your MongoDB Atlas dashboard under **Network Access** to allow the instance to connect to your database.

4. **Initialize the Database (Seed Gifts):**
   ```bash
   npm run db:init
   ```

---

## 4. PM2 Process Manager Configuration

PM2 keeps your Node.js application running in the background and restarts it if it crashes.

1. **Install PM2 globally:**
   ```bash
   sudo npm install pm2 -g
   ```

2. **Start the backend:**
   ```bash
   pm2 start src/server.js --name "mingo-backend"
   ```

3. **Configure startup behavior (survives instance reboot):**
   ```bash
   pm2 startup systemd
   ```
   *Copy and run the `sudo env PATH=...` command generated in the output of the command above.*

4. **Save the current PM2 state:**
   ```bash
   pm2 save
   ```

---

## 5. Nginx Configuration with sslip.io

**sslip.io** is a free wildcard DNS service that resolves any hostname containing an IP address back to that IP address (e.g., `54.210.12.34.sslip.io` resolves to `54.210.12.34`). This allows you to generate a valid SSL certificate for free.

1. **Install Nginx:**
   ```bash
   sudo apt install nginx -y
   ```

2. **Create the configuration file:**
   ```bash
   sudo nano /etc/nginx/sites-available/YOUR_EC2_PUBLIC_IP.sslip.io
   ```

3. **Paste the following Nginx block:**
   *Replace `YOUR_EC2_PUBLIC_IP` with your actual EC2 public IP address, and confirm that `3000` is the port your Express app is running on:*

   ```nginx
   server {
       listen 80;
       server_name YOUR_EC2_PUBLIC_IP.sslip.io;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;

           # Forwarding real IP address headers
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. **Enable the site and disable default configuration:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/YOUR_EC2_PUBLIC_IP.sslip.io /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   ```

5. **Test and reload Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 6. Secure with Let's Encrypt HTTPS (Certbot)

1. **Install Certbot:**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```

2. **Obtain SSL Certificate:**
   ```bash
   sudo certbot --nginx -d YOUR_EC2_PUBLIC_IP.sslip.io
   ```
   *Follow the prompts (enter email, accept terms). Certbot will automatically issue the SSL certificate and modify your Nginx file to redirect all HTTP traffic to HTTPS.*

3. **Verify Auto-Renewal:**
   ```bash
   sudo certbot renew --dry-run
   ```

---

## 7. App Updates & Best Practices

### trust proxy setting
In `src/app.js`, add `app.set('trust proxy', 1);` so rate limiters or security logic read client IPs correctly:
```javascript
// Add before mounting routes:
app.set('trust proxy', 1);
```

### PM2 Commands
* **Logs:** `pm2 logs mingo-backend`
* **Restart:** `pm2 restart mingo-backend`
* **Status:** `pm2 status`
