const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const config = require('../../config/config');
const logger = require('../utils/logger');

const readdir = promisify(fs.readdir);
const { MongoMemoryServer } = require('mongodb-memory-server');

class Migrator {
  constructor() {
    this.migrations = [];
    this.migrationsRun = [];
    this.db = null;
    this.client = null;
    this.isTest = process.env.NODE_ENV === 'test';
  }

  async connect() {
    try {
      if (this.isTest) {
        // Use in-memory MongoDB for testing
        this.mongoServer = await MongoMemoryServer.create();
        const uri = this.mongoServer.getUri();
        await mongoose.connect(uri, config.database.options);
      } else {
        // Connect to the real database
        await mongoose.connect(config.database.uri, config.database.options);
      }
      
      this.db = mongoose.connection.db;
      this.client = mongoose.connection.getClient();
      logger.info('Connected to database for migrations');
    } catch (error) {
      logger.error('Migration connection error:', error);
      process.exit(1);
    }
  }

  async loadMigrations() {
    try {
      const files = await readdir(__dirname);
      const migrationFiles = files
        .filter(file => file.endsWith('.js') && file !== 'migrate.js' && file !== 'migration.template.js')
        .sort();
      
      this.migrations = await Promise.all(
        migrationFiles.map(async (file) => {
          const migration = require(path.join(__dirname, file));
          return {
            name: file.replace(/\.js$/, ''),
            up: migration.up,
            down: migration.down,
            description: migration.description || 'No description'
          };
        })
      );
      
      logger.info(`Loaded ${this.migrations.length} migration(s)`);
    } catch (error) {
      logger.error('Error loading migrations:', error);
      process.exit(1);
    }
  }

  async ensureMigrationsCollection() {
    const collections = await this.db.listCollections({ name: 'migrations' }).toArray();
    if (collections.length === 0) {
      await this.db.createCollection('migrations');
      logger.info('Created migrations collection');
    }
  }

  async getExecutedMigrations() {
    try {
      const migrations = await this.db.collection('migrations')
        .find({})
        .sort({ _id: 1 })
        .toArray();
      return migrations.map(m => m._id);
    } catch (error) {
      logger.error('Error getting executed migrations:', error);
      return [];
    }
  }

  async markAsExecuted(migrationName) {
    await this.db.collection('migrations').insertOne({
      _id: migrationName,
      executedAt: new Date()
    });
  }

  async markAsReverted(migrationName) {
    await this.db.collection('migrations').deleteOne({ _id: migrationName });
  }

  async runMigrations() {
    try {
      await this.ensureMigrationsCollection();
      const executedMigrations = await this.getExecutedMigrations();
      
      for (const migration of this.migrations) {
        if (!executedMigrations.includes(migration.name)) {
          logger.info(`Running migration: ${migration.name} - ${migration.description}`);
          await migration.up(this.db);
          await this.markAsExecuted(migration.name);
          logger.info(`✓ ${migration.name} completed`);
        }
      }
      
      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  async rollbackMigrations(count = 1) {
    try {
      await this.ensureMigrationsCollection();
      const executedMigrations = await this.getExecutedMigrations();
      const migrationsToRevert = this.migrations
        .filter(m => executedMigrations.includes(m.name))
        .slice(-count);
      
      for (const migration of migrationsToRevert.reverse()) {
        logger.info(`Reverting migration: ${migration.name}`);
        if (migration.down) {
          await migration.down(this.db);
        }
        await this.markAsReverted(migration.name);
        logger.info(`✓ ${migration.name} reverted`);
      }
      
      logger.info(`Successfully reverted ${migrationsToRevert.length} migration(s)`);
    } catch (error) {
      logger.error('Rollback failed:', error);
      throw error;
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
  }
}

// Command line interface
async function run() {
  const command = process.argv[2] || 'up';
  const migrator = new Migrator();
  
  try {
    await migrator.connect();
    await migrator.loadMigrations();
    
    switch (command) {
      case 'up':
        await migrator.runMigrations();
        break;
      case 'down':
        const count = parseInt(process.argv[3] || '1', 10);
        await migrator.rollbackMigrations(count);
        break;
      case 'status':
        const executed = await migrator.getExecutedMigrations();
        console.log('Executed migrations:');
        console.log(executed.join('\n') || 'No migrations have been executed');
        break;
      default:
        console.log('Usage: node migrate.js [up|down [count]|status]');
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await migrator.close();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  run();
}

module.exports = Migrator;
