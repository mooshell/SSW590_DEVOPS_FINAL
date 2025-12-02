#!/bin/bash

# Setup script for Digital Ocean Droplet
# Run this on your droplet to prepare it for deployment

set -e

echo "🚀 Setting up Digital Ocean Droplet for Endless Runner Game"

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
sudo apt-get install -y docker-compose-plugin

# Install monitoring tools
echo "📊 Installing monitoring tools..."
sudo apt-get install -y htop nethogs iotop

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/endless-runner-game
sudo chown $USER:$USER /opt/endless-runner-game
cd /opt/endless-runner-game

# Clone repository (replace with your repo URL)
echo "📥 Cloning repository..."
read -p "Enter your GitHub repository URL: " REPO_URL
git clone $REPO_URL .

# Set up environment variables
echo "⚙️  Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Please edit .env file with your configuration:"
    echo "  nano .env"
fi

# Set up firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8080/tcp
sudo ufw --force enable

# Install Nginx for reverse proxy
echo "🌐 Installing Nginx..."
sudo apt-get install -y nginx

# Create Nginx configuration
cat > /tmp/endless-runner-nginx.conf << 'EOF'
server {
    listen 80;
    server_name _;

    # Client - Game interface
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API - Backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
EOF

sudo mv /tmp/endless-runner-nginx.conf /etc/nginx/sites-available/endless-runner
sudo ln -sf /etc/nginx/sites-available/endless-runner /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Create monitoring script
cat > /opt/endless-runner-game/monitor.sh << 'EOF'
#!/bin/bash
echo "=== System Resources ==="
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "Disk Usage:"
df -h /
echo ""
echo "=== Docker Containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "=== Container Stats ==="
docker stats --no-stream
EOF

chmod +x /opt/endless-runner-game/monitor.sh

# Create deployment script
cat > /opt/endless-runner-game/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying Endless Runner Game..."

# Pull latest changes
git pull origin main

# Pull and rebuild containers
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build

# Clean up
docker system prune -af --volumes

echo "✅ Deployment complete!"
echo "Run ./monitor.sh to check system status"
EOF

chmod +x /opt/endless-runner-game/deploy.sh

# Set up log rotation
sudo tee /etc/logrotate.d/endless-runner << EOF
/opt/endless-runner-game/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $USER $USER
    sharedscripts
}
EOF

# Create systemd service for auto-start
sudo tee /etc/systemd/system/endless-runner.service << EOF
[Unit]
Description=Endless Runner Game
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/endless-runner-game
ExecStart=/usr/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.prod.yml down
User=$USER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable endless-runner.service

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file: nano /opt/endless-runner-game/.env"
echo "2. Start the application: cd /opt/endless-runner-game && docker-compose -f docker-compose.prod.yml up -d"
echo "3. Monitor system: ./monitor.sh"
echo "4. Check logs: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Your game will be accessible at: http://$(curl -s ifconfig.me)"
echo ""