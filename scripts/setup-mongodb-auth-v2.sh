#!/bin/bash

# MongoDB Authentication Setup Script v2
# This script automates the setup of MongoDB authentication for local development

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Function to check if MongoDB is running
is_mongodb_running() {
  if pgrep -x "mongod" > /dev/null; then
    return 0
  else
    return 1
  fi
}

# Function to stop MongoDB
stop_mongodb() {
  if is_mongodb_running; then
    echo "Stopping MongoDB..."
    pkill -f "mongod" || true
    sleep 2
    # Double check and force kill if needed
    if is_mongodb_running; then
      killall -9 mongod 2>/dev/null || true
      sleep 1
    fi
  fi
}

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
  echo -e "${RED}MongoDB is not installed. Please install MongoDB first.${NC}"
  exit 1
fi

print_section "Stopping any running MongoDB instances"
stop_mongodb

print_section "Starting MongoDB without access control"
echo "Starting MongoDB on port $MONGODB_PORT..."
# Start mongod in the background without access control
mongod --port $MONGODB_PORT --dbpath $MONGODB_DATA_DIR --fork --logpath /tmp/mongod.log

# Wait for MongoDB to start
sleep 3

print_section "Creating admin user"
echo "Creating admin user: $ADMIN_USER"

# Create admin user in the admin database
mongosh --port $MONGODB_PORT admin --eval "
  db.createUser({
    user: '$ADMIN_USER',
    pwd: '$ADMIN_PASSWORD',
    roles: [
      { role: 'userAdminAnyDatabase', db: 'admin' },
      { role: 'readWriteAnyDatabase', db: 'admin' },
      { role: 'dbAdminAnyDatabase', db: 'admin' },
      { role: 'clusterAdmin', db: 'admin' }
    ]
  })" || {
    echo -e "${RED}Failed to create admin user${NC}"
    exit 1
  }

print_section "Creating application database and user"
echo "Creating database: $DB_NAME"
echo "Creating application user: $APP_USER"

# First create the database by inserting a document
mongosh --port $MONGODB_PORT admin --eval "
  db = db.getSiblingDB('$DB_NAME');
  db.testCollection.insertOne({ status: 'setup' });"

# Create the application user with proper roles
mongosh --port $MONGODB_PORT admin --eval "
  db.getSiblingDB('$DB_NAME').createUser({
    user: '$APP_USER',
    pwd: '$APP_PASSWORD',
    roles: [
      { role: 'readWrite', db: '$DB_NAME' },
      { role: 'dbAdmin', db: '$DB_NAME' },
      { role: 'readWrite', db: 'local' },
      { role: 'clusterMonitor', db: 'admin' }
    ]
  })" || {
    echo -e "${RED}Failed to create application user${NC}"
    exit 1
  }

print_section "Stopping MongoDB"
stop_mongodb

print_section "Starting MongoDB with access control"
# Start mongod with authentication
mongod --auth --port $MONGODB_PORT --dbpath $MONGODB_DATA_DIR --fork --logpath /tmp/mongod.log
sleep 3

print_section "Testing the admin connection"
if mongosh --port $MONGODB_PORT --authenticationDatabase admin -u $ADMIN_USER -p $ADMIN_PASSWORD --eval "db.adminCommand('ping')" > /dev/null; then
  echo -e "${GREEN}✓ Successfully connected to MongoDB with admin credentials${NC}"
else
  echo -e "${RED}Failed to connect to MongoDB with admin credentials${NC}"
  exit 1
fi

print_section "Testing the application connection"
if mongosh --port $MONGODB_PORT --authenticationDatabase admin -u $APP_USER -p $APP_PASSWORD --eval "db.runCommand({ping: 1})" $DB_NAME > /dev/null; then
  echo -e "${GREEN}✓ Successfully connected to MongoDB with application credentials${NC}"
else
  echo -e "${RED}Failed to connect to MongoDB with application credentials${NC}"
  echo "Trying alternative authentication method..."
  
  # Try alternative authentication method
  if mongosh --port $MONGODB_PORT -u $APP_USER -p $APP_PASSWORD --authenticationDatabase $DB_NAME --eval "db.runCommand({ping: 1})" $DB_NAME > /dev/null; then
    echo -e "${GREEN}✓ Successfully connected using alternative authentication method${NC}"
  else
    echo -e "${RED}All connection attempts failed${NC}"
    exit 1
  fi
fi

print_section "Updating .env file"
# Create .env if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
  cp "${ENV_FILE}.example" "$ENV_FILE"
fi

# Update MONGODB_URI in .env
MONGODB_URI="mongodb://$APP_USER:$APP_PASSWORD@localhost:$MONGODB_PORT/$DB_NAME?authSource=admin&retryWrites=true&w=majority"

# Use sed to update the MONGODB_URI in the .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s|^MONGODB_URI=.*|MONGODB_URI=$MONGODB_URI|" "$ENV_FILE"
  # Also update any other related environment variables
  sed -i '' "s|^MONGODB_USER=.*|MONGODB_USER=$APP_USER|" "$ENV_FILE"
  sed -i '' "s|^MONGODB_PASSWORD=.*|MONGODB_PASSWORD=$APP_PASSWORD|" "$ENV_FILE"
else
  # Linux
  sed -i "s|^MONGODB_URI=.*|MONGODB_URI=$MONGODB_URI|" "$ENV_FILE"
  sed -i "s|^MONGODB_USER=.*|MONGODB_USER=$APP_USER|" "$ENV_FILE"
  sed -i "s|^MONGODB_PASSWORD=.*|MONGODB_PASSWORD=$APP_PASSWORD|" "$ENV_FILE"
fi

echo -e "${GREEN}✓ MongoDB authentication setup complete!${NC}"
echo ""
echo "Admin Credentials:"
echo "-----------------"
echo "Username: $ADMIN_USER"
echo "Password: $ADMIN_PASSWORD"
echo ""
echo "Application Credentials:"
echo "----------------------"
echo "Username: $APP_USER"
echo "Password: $APP_PASSWORD"
echo "Database: $DB_NAME"
echo ""
echo "Connection String:"
echo "----------------"
echo "$MONGODB_URI"

# Create a backup of the credentials
print_section "Saving credentials to mongo-credentials.txt"
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
echo -e "${YELLOW}Important: Save these credentials in a secure password manager.${NC}"
echo -e "${YELLOW}The admin password will not be shown again.${NC}"

exit 0
