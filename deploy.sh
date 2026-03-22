#!/bin/bash
# AWS EC2 Deployment Script for Somvanshi CRM
# Run this on a fresh Ubuntu 22.04 EC2 instance

set -e

echo "=== Installing Docker ==="
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker

echo "=== Docker installed ==="
docker --version
docker compose version

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "1. Copy your project files to this server:"
echo "   scp -r -i your-key.pem /path/to/CRM-main ubuntu@<EC2-IP>:~/crm"
echo ""
echo "2. SSH into the server and go to the project directory:"
echo "   ssh -i your-key.pem ubuntu@<EC2-IP>"
echo "   cd ~/crm"
echo ""
echo "3. Create your .env file:"
echo "   cp .env.example .env"
echo "   nano .env   # fill in your EC2 public IP"
echo ""
echo "4. Build and start:"
echo "   docker compose up -d --build"
echo ""
echo "5. Open these ports in your EC2 Security Group:"
echo "   - Port 3000 (frontend)"
echo "   - Port 5000 (backend API)"
echo ""
echo "Access your CRM at: http://<EC2-PUBLIC-IP>:3000"
