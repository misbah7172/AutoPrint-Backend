const { sequelize, User } = require('./src/models');

async function testDatabase() {
  try {
    console.log('🔄 Testing database connection and schema...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Check if users table exists and has new columns
    const queryInterface = sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable('users');
    
    console.log('📋 Users table columns:');
    Object.keys(tableDescription).forEach(column => {
      console.log(`  - ${column}: ${tableDescription[column].type}`);
    });
    
    // Check if photoUrl, firebaseUid, authProvider columns exist
    const hasPhotoUrl = 'photoUrl' in tableDescription;
    const hasFirebaseUid = 'firebaseUid' in tableDescription;
    const hasAuthProvider = 'authProvider' in tableDescription;
    
    console.log('✅ Schema check:', {
      photoUrl: hasPhotoUrl,
      firebaseUid: hasFirebaseUid,
      authProvider: hasAuthProvider
    });
    
    // Try to find admin user
    const adminUser = await User.findOne({ where: { email: 'admin@autoprint.com' } });
    if (adminUser) {
      console.log('✅ Admin user exists:', {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        isActive: adminUser.isActive
      });
    } else {
      console.log('❌ Admin user not found');
    }
    
    // Test creating a simple user with unique email
    const testEmail = `test${Date.now()}@test.com`;
    let testUser;
    try {
      testUser = await User.create({
        email: testEmail,
        password: 'test123',
        firstName: 'Test',
        lastName: 'User',
        photoUrl: 'https://example.com/photo.jpg',
        authProvider: 'google'
      });
      
      console.log('✅ Test user created successfully:', {
        id: testUser.id,
        email: testUser.email,
        photoUrl: testUser.photoUrl,
        authProvider: testUser.authProvider
      });
    } catch (createError) {
      console.log('❌ Test user creation failed:', createError.message);
      if (createError.errors) {
        createError.errors.forEach(err => {
          console.log(`  - ${err.path}: ${err.message}`);
        });
      }
      return;
    }
    
    // Clean up test user
    await testUser.destroy();
    console.log('✅ Test user cleaned up');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testDatabase();