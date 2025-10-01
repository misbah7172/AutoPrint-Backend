const { sequelize, User, Document, PrintJob, Payment, AdminSession } = require('./src/models');

async function resetDatabase() {
  try {
    console.log('🗑️  Resetting database...');

    // Drop all tables
    await sequelize.drop();
    console.log('✅ All tables dropped');

    // Recreate all tables
    await sequelize.sync({ force: true });
    console.log('✅ All tables recreated');

    // Create the single admin user
    const adminUser = await User.create({
      email: 'admin@autoprint.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      authProvider: 'local'
    });

    console.log('✅ Admin user created:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);

    console.log('🎉 Database reset complete!');
    console.log('📋 Summary:');
    console.log('   - All previous users deleted');
    console.log('   - All previous data deleted');
    console.log('   - Single admin user created');
    console.log('   - Credentials: admin@autoprint.com / admin123');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
  } finally {
    await sequelize.close();
  }
}

resetDatabase();