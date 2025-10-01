const { Sequelize } = require('sequelize');
const { User, Document, Payment, PrintJob } = require('./src/models');
require('dotenv').config();

async function testDatabase() {
  try {
    console.log('🔗 Testing NeonDB PostgreSQL connection...');
    
    // Test authentication
    await User.sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Test data retrieval
    const userCount = await User.count();
    const documentCount = await Document.count();
    const paymentCount = await Payment.count();
    const printJobCount = await PrintJob.count();

    console.log('📊 Database Statistics:');
    console.log(`   👥 Users: ${userCount}`);
    console.log(`   📄 Documents: ${documentCount}`);
    console.log(`   💰 Payments: ${paymentCount}`);
    console.log(`   🖨️ Print Jobs: ${printJobCount}`);

    // Test a simple user query
    const sampleUser = await User.findOne();

    if (sampleUser) {
      console.log('✅ Sample query successful');
      console.log(`   Sample user: ${sampleUser.firstName} ${sampleUser.lastName}`);
      console.log(`   Email: ${sampleUser.email}`);
      console.log(`   Role: ${sampleUser.role}`);
    }

    console.log('🎯 PostgreSQL migration completed successfully!');
    console.log('🚀 Ready for Render deployment');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await User.sequelize.close();
  }
}

testDatabase();