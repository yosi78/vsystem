# Environment Variables for Secure Teacher App
# Copy this file to .env and replace with your actual values
# NEVER commit this file to version control!

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Admin Configuration
VITE_ADMIN_EMAILS=admin1@example.com,admin2@example.com,yosiel3@gmail.com

# Security Configuration
VITE_MAX_LOGIN_ATTEMPTS=3
VITE_LOCKOUT_DURATION=300000
VITE_COMMENT_RATE_LIMIT=5
VITE_SESSION_TIMEOUT=3600000

# Encryption Keys (generate new random keys)
VITE_ENCRYPTION_KEY=your_32_character_encryption_key_here
VITE_JWT_SECRET=your_jwt_secret_key_here

# Application Settings
VITE_APP_VERSION=1.0
VITE_APP_ENVIRONMENT=production
VITE_DEBUG_MODE=false

# External Services
VITE_IP_SERVICE_URL=https://api.ipify.org?format=json
VITE_ALLOWED_DOMAINS=drive.google.com,docs.google.com