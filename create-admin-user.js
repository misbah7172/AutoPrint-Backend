const { sequelize, User } = require('./src/models');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ 
      where: { 
        email: 'admin@autoprint.com' 
      } 
    });

    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists');
      
      // Update password if needed
      const isValidPassword = await existingAdmin.comparePassword('admin123');
      if (!isValidPassword) {
        await existingAdmin.update({ password: 'admin123' });
        console.log('✅ Admin password updated');
      }
      
      console.log('Admin User Details:');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      console.log('Active:', existingAdmin.isActive);
      return;
    }

    // Create admin user
    const adminUser = await User.create({
      email: 'admin@autoprint.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      authProvider: 'local'
    });

    console.log('✅ Admin user created successfully');
    console.log('Admin User Details:');
    console.log('ID:', adminUser.id);
    console.log('Email:', adminUser.email);
    console.log('Role:', adminUser.role);
    console.log('Active:', adminUser.isActive);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await sequelize.close();
  }
}

// Run only if this file is executed directly
if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;