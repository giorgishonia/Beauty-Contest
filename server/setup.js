#!/usr/bin/env node

/**
 * Socket Server Setup and Validation Script
 * Ensures the Balance Scale socket server is properly configured
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎮 Balance Scale - Socket Server Setup');
console.log('======================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('📝 Creating .env file...\n');

  const envTemplate = `# Socket.IO Server Environment Variables

# Server Configuration
PORT=3001
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# CORS Configuration (for development)
CLIENT_URL=http://localhost:5173

# Socket.IO Configuration
SOCKET_PING_TIMEOUT=5000
SOCKET_PING_INTERVAL=25000
SOCKET_MAX_CONNECTIONS=1000

# Room Cleanup Configuration
ROOM_CLEANUP_INTERVAL_MINUTES=5
ROOM_INACTIVE_THRESHOLD_MINUTES=30
`;

  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env file');
  console.log('⚠️  Please update the environment variables with your actual values\n');
} else {
  console.log('✅ .env file exists');
}

// Check package.json dependencies
console.log('📦 Checking dependencies...');
const packagePath = path.join(__dirname, 'package.json');

if (!fs.existsSync(packagePath)) {
  console.log('❌ package.json not found!');
  console.log('Please ensure you are in the server directory');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const requiredDeps = [
  'express',
  'socket.io',
  '@supabase/supabase-js',
  'dotenv',
  'cors'
];

let missingDeps = [];
for (const dep of requiredDeps) {
  if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
    missingDeps.push(dep);
  }
}

if (missingDeps.length > 0) {
  console.log('❌ Missing dependencies:', missingDeps.join(', '));
  console.log('Run: npm install');
} else {
  console.log('✅ All dependencies installed');
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('❌ node_modules not found!');
  console.log('Run: npm install');
} else {
  console.log('✅ node_modules exists');
}

console.log('\n🚀 Setup complete!');
console.log('To start the server, run: npm run dev');
console.log('Health check available at: http://localhost:3001/health');
console.log('Environment info at: http://localhost:3001/env (development only)\n');
