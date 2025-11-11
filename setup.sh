#!/bin/bash

# Omega Nobi Wallet Setup Script

echo "🚀 Setting up Omega Nobi Wallet Tracker..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Check if MySQL is running
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL command not found. Please ensure MySQL is installed and running."
else
    echo "✅ MySQL found"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "🔧 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created from .env.example"
    echo "⚠️  Please edit .env file with your configuration before starting the application"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your database and Alchemy API configuration"
echo "2. Create MySQL database: CREATE DATABASE omega_nobi_wallet;"
echo "3. Start development server: npm run start:dev"
echo "4. Visit API docs: http://localhost:3000/api/docs"
echo ""
echo "For production:"
echo "1. Build: npm run build"
echo "2. Start: npm run start:prod"