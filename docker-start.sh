#!/bin/bash

set -e

echo "🐳 Starting Nobi Wallet Tracker with Docker..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file and add your ALCHEMY_API_KEY"
    echo ""
fi

# Stop and remove existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Services are running!"
    echo ""
    echo "📊 Application: http://localhost:3000"
    echo "📚 API Documentation: http://localhost:3000/api/docs"
    echo "🗄️  MySQL: localhost:3306"
    echo ""
    echo "📝 View logs:"
    echo "   docker-compose logs -f app"
    echo ""
    echo "🛑 Stop services:"
    echo "   docker-compose down"
    echo ""
    echo "🔄 Restart services:"
    echo "   docker-compose restart"
    echo ""
else
    echo ""
    echo "❌ Failed to start services. Check logs:"
    echo "   docker-compose logs"
fi
