#!/bin/bash

# MongoDB Authentication Setup Script
# This script automates the setup of MongoDB authentication for local development

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DB_NAME="dynamis_messaging"
ADMIN_USER="adminUser"
ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
APP_USER="dynamisApp"
APP_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
MONGODB_PORT=27017
MONGODB_DATA_DIR="/usr/local/var/mongodb"
ENV_FILE="../.env"

# Function to print section headers
print_section() {
  echo -e "\n${YELLOW}==> $1${NC}"
}

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
  echo "MongoDB is not installed. Please install MongoDB first."
  exit 1
fi

print_section "Stopping MongoDB if it's running"
if pgrep -x "mongod" > /dev/null; then
  echo "Stopping MongoDB..."
  brew services stop mongodb-community || true
  sleep 2
fi

# Kill any remaining mongod processes
echo "Ensuring no MongoDB instances are running..."
pkill -f mongod || true
sleep 2

print_section "Starting MongoDB without access control"
echo "Starting MongoDB on port $MONGODB_PORT..."
# Start mongod in the background without access control
mongod --port $MONGODB_PORT --dbpath $MONGODB_DATA_DIR --fork --logpath /tmp/mongod.log

# Wait for MongoDB to start
sleep 3

print_section "Creating admin user"
echo "Creating admin user: $ADMIN_USER"
mongosh --port $MONGODB_PORT admin --eval "
  db.createUser({
    user: '$ADMIN_USER',
    pwd: '$ADMIN_PASSWORD',
    roles: [
      { role: 'userAdminAnyDatabase', db: 'admin' },
      { role: 'readWriteAnyDatabase', db: 'admin' },
      { role: 'dbAdminAnyDatabase', db: 'admin' }
    ]
  })"

print_section "Creating application database and user"
echo "Creating database: $DB_NAME"
echo "Creating application user: $APP_USER"

mongosh --port $MONGODB_PORT admin --eval "
  db.getSiblingDB('$DB_NAME').createUser({
    user: '$APP_USER',
    pwd: '$APP_PASSWORD',
    roles: [
      { role: 'readWrite', db: '$DB_NAME' },
      { role: 'dbAdmin', db: '$DB_NAME' }
    ]
  })"

print_section "Stopping MongoDB"
pkill -f mongod
sleep 2

print_section "Starting MongoDB with access control"
mongod --auth --port $MONGODB_PORT --dbpath $MONGODB_DATA_DIR --fork --logpath /tmp/mongod.log
sleep 2

print_section "Testing the connection"
if mongosh --port $MONGODB_PORT --authenticationDatabase admin -u $ADMIN_USER -p $ADMIN_PASSWORD --eval "db.adminCommand('ping')" > /dev/null; then
  echo -e "${GREEN}✓ Successfully connected to MongoDB with admin credentials${NC}"
else
  echo "Failed to connect to MongoDB with admin credentials"
  exit 1
fi

if mongosh --port $MONGODB_PORT --authenticationDatabase admin -u $APP_USER -p $APP_PASSWORD $DB_NAME --eval "db.runCommand({ping: 1})" > /dev/null; then
  echo -e "${GREEN}✓ Successfully connected to MongoDB with application credentials${NC}"
else
  echo "Failed to connect to MongoDB with application credentials"
  exit 1
fi

print_section "Updating .env file"
# Create .env if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
  cp "${ENV_FILE}.example" "$ENV_FILE"
fi

# Update MONGODB_URI in .env
MONGODB_URI="mongodb://$APP_USER:$APP_PASSWORD@localhost:$MONGODB_PORT/$DB_NAME?authSource=admin"

# Use sed to update the MONGODB_URI in the .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s|^MONGODB_URI=.*|MONGODB_URI=$MONGODB_URI|" "$ENV_FILE"
else
  # Linux
  sed -i "s|^MONGODB_URI=.*|MONGODB_URI=$MONGODB_URI|" "$ENV_FILE"
fi

echo -e "${GREEN}✓ MongoDB authentication setup complete!${NC}"
echo "Admin username: $ADMIN_USER"
echo "Admin password: $ADMIN_PASSWORD"
echo "Application username: $APP_USER"
echo "Application password: $APP_PASSWORD"
echo "MongoDB URI has been updated in $ENV_FILE"
echo ""
echo -e "${YELLOW}Important: Save these credentials in a secure password manager.${NC}"
echo -e "${YELLOW}The admin password will not be shown again.${NC}"

# Create a backup of the credentials
echo -e "\n${YELLOW}Creating backup of credentials in mongo-credentials.txt${NC}"
cat > mongo-credentials.txt << EOL
MongoDB Authentication Setup
==========================
Date: $(date)

Admin Credentials:
-----------------
Username: $ADMIN_USER
Password: $ADMIN_PASSWORD

Application Credentials:
----------------------
Username: $APP_USER
Password: $APP_PASSWORD
Database: $DB_NAME

Connection String:
----------------
$MONGODB_URI

Important: Keep this file secure and do not commit it to version control.
EOL

chmod 600 mongo-credentials.txt
echo -e "${GREEN}✓ Credentials saved to mongo-credentials.txt${NC}"

exit 0
