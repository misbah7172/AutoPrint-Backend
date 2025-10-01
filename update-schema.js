const { sequelize } = require('./src/models');

async function addMissingColumns() {
  try {
    console.log('🔄 Checking and adding missing database columns...');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if columns exist and add them if they don't
    try {
      await queryInterface.describeTable('users');
      console.log('✅ Users table exists');
      
      // Try to add photoUrl column
      try {
        await queryInterface.addColumn('users', 'photoUrl', {
          type: sequelize.Sequelize.STRING,
          allowNull: true
        });
        console.log('✅ Added photoUrl column');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('ℹ️ photoUrl column already exists');
        } else {
          console.log('❌ Error adding photoUrl:', error.message);
        }
      }
      
      // Try to add firebaseUid column
      try {
        await queryInterface.addColumn('users', 'firebaseUid', {
          type: sequelize.Sequelize.STRING,
          allowNull: true,
          unique: true
        });
        console.log('✅ Added firebaseUid column');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('ℹ️ firebaseUid column already exists');
        } else {
          console.log('❌ Error adding firebaseUid:', error.message);
        }
      }
      
      // Try to add authProvider column
      try {
        await queryInterface.addColumn('users', 'authProvider', {
          type: sequelize.Sequelize.ENUM('local', 'google', 'facebook'),
          defaultValue: 'local'
        });
        console.log('✅ Added authProvider column');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('ℹ️ authProvider column already exists');
        } else {
          console.log('❌ Error adding authProvider:', error.message);
        }
      }
      
      console.log('✅ Database schema update completed successfully');
      
    } catch (error) {
      console.error('❌ Error updating database schema:', error);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  addMissingColumns();
}

module.exports = addMissingColumns;