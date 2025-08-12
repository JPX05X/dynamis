#!/bin/bash

# MongoDB Authentication Update Script
# This script updates or creates MongoDB users with proper authentication

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

# Check if MongoDB is installed
if ! command -v mongosh &> /dev/null; then
  echo -e "${RED}MongoDB shell (mongosh) is not installed. Please install it first.${NC}"
  exit 1
fi

print_section "Checking MongoDB connection"
if ! is_mongodb_running; then
  echo -e "${RED}MongoDB is not running. Please start MongoDB first.${NC}"
  exit 1
fi

# Check if we can connect to MongoDB
if ! mongosh --port $MONGODB_PORT --eval "db.adminCommand('ping')" &> /dev/null; then
  echo -e "${RED}Failed to connect to MongoDB. Is it running on port $MONGODB_PORT?${NC}"
  exit 1
fi

print_section "Updating admin user"
echo "Updating/Creating admin user: $ADMIN_USER"

# Update or create admin user
mongosh --port $MONGODB_PORT admin --eval "
  try {
    db.getUser('$ADMIN_USER');
    print('Admin user exists, updating password...');
    db.changeUserPassword('$ADMIN_USER', '$ADMIN_PASSWORD');
  } catch (err) {
    print('Creating new admin user...');
    db.createUser({
      user: '$ADMIN_USER',
      pwd: '$ADMIN_PASSWORD',
      roles: [
        { role: 'userAdminAnyDatabase', db: 'admin' },
        { role: 'readWriteAnyDatabase', db: 'admin' },
        { role: 'dbAdminAnyDatabase', db: 'admin' },
        { role: 'clusterAdmin', db: 'admin' }
      ]
    });
  }
" || {
  echo -e "${RED}Failed to update/create admin user${NC}"
  exit 1
}

print_section "Updating application database and user"
echo "Ensuring database exists: $DB_NAME"

# Create the database by inserting a document
mongosh --port $MONGODB_PORT admin --eval "
  db = db.getSiblingDB('$DB_NAME');
  db.testCollection.insertOne({ status: 'setup', timestamp: new Date() });"

echo "Updating/Creating application user: $APP_USER"

# Update or create application user
mongosh --port $MONGODB_PORT admin --eval "
  db = db.getSiblingDB('$DB_NAME');
  try {
    db.getUser('$APP_USER');
    print('Application user exists, updating password...');
    db.changeUserPassword('$APP_USER', '$APP_PASSWORD');
  } catch (err) {
    print('Creating new application user...');
    db.createUser({
      user: '$APP_USER',
      pwd: '$APP_PASSWORD',
      roles: [
        { role: 'readWrite', db: '$DB_NAME' },
        { role: 'dbAdmin', db: '$DB_NAME' },
        { role: 'readWrite', db: 'local' },
        { role: 'clusterMonitor', db: 'admin' }
      ]
    });
  }
" || {
  echo -e "${RED}Failed to update/create application user${NC}"
  exit 1
}

print_section "Testing the admin connection"
if mongosh --port $MONGODB_PORT --authenticationDatabase admin -u $ADMIN_USER -p $ADMIN_PASSWORD --eval "db.adminCommand('ping')" > /dev/null; then
  echo -e "${GREEN}✓ Successfully connected to MongoDB with admin credentials${NC}"
else
  echo -e "${RED}Failed to connect to MongoDB with admin credentials${NC}"
  exit 1
fi

print_section "Testing the application connection"
if mongosh --port $MONGODB_PORT --authenticationDatabase $DB_NAME -u $APP_USER -p $APP_PASSWORD --eval "db.runCommand({ping: 1})" $DB_NAME > /dev/null; then
  echo -e "${GREEN}✓ Successfully connected to MongoDB with application credentials${NC}"
else
  echo -e "${YELLOW}Primary authentication method failed, trying alternative...${NC}"
  if mongosh --port $MONGODB_PORT --authenticationDatabase admin -u $APP_USER -p $APP_PASSWORD --eval "db.runCommand({ping: 1})" $DB_NAME > /dev/null; then
    echo -e "${GREEN}✓ Successfully connected using admin authentication database${NC}"
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

print_section "MongoDB Authentication Update Complete"
echo -e "${GREEN}✓ Successfully updated MongoDB authentication!${NC}"
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

exit 0
