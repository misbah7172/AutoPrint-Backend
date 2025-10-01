const { User } = require('./src/models');

async function createAdminUser() {
  try {
    console.log('🔄 Connecting to production database...');
    
    // Check if admin user already exists
    let adminUser = await User.findOne({ where: { email: 'admin@autoprint.com' } });
    
    if (adminUser) {
      console.log('✅ Admin user already exists:', {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        isActive: adminUser.isActive
      });
    } else {
      console.log('🆕 Creating admin user...');
      adminUser = await User.create({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'admin@autoprint.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        authProvider: 'local'
      });
      
      console.log('✅ Admin user created successfully:', {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
    }
    
    console.log('✅ Admin user setup complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

createAdminUser();