const { Sequelize } = require('sequelize');
const { Client } = require('pg');

async function testMultipleConnections() {
  console.log('🔍 Testing multiple connection methods to Neon...\n');
  
  // Test 1: Direct pg client with pooler endpoint
  console.log('1️⃣  Testing pg client with pooler endpoint...');
  try {
    const client1 = new Client({
      connectionString: 'postgresql://neondb_owner:npg_8uexFD5ArTqV@ep-divine-credit-ad52ykm7-pooler.c-2.us-east-1.aws.neon.tech/neondb',
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    });
    
    await client1.connect();
    const result1 = await client1.query('SELECT NOW() as current_time');
    console.log('   ✅ SUCCESS - Connected with pg client (pooler)');
    console.log('   📅 Database time:', result1.rows[0].current_time);
    await client1.end();
  } catch (error) {
    console.log('   ❌ FAILED - pg client (pooler):', error.message);
  }
  
  // Test 2: Direct pg client with direct endpoint (try to guess direct endpoint)
  console.log('\n2️⃣  Testing pg client with direct endpoint...');
  try {
    const client2 = new Client({
      connectionString: 'postgresql://neondb_owner:npg_8uexFD5ArTqV@ep-divine-credit-ad52ykm7.c-2.us-east-1.aws.neon.tech/neondb',
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    });
    
    await client2.connect();
    const result2 = await client2.query('SELECT NOW() as current_time');
    console.log('   ✅ SUCCESS - Connected with pg client (direct)');
    console.log('   📅 Database time:', result2.rows[0].current_time);
    await client2.end();
  } catch (error) {
    console.log('   ❌ FAILED - pg client (direct):', error.message);
  }
  
  // Test 3: Sequelize with pooler endpoint
  console.log('\n3️⃣  Testing Sequelize with pooler endpoint...');
  try {
    const sequelize1 = new Sequelize('postgresql://neondb_owner:npg_8uexFD5ArTqV@ep-divine-credit-ad52ykm7-pooler.c-2.us-east-1.aws.neon.tech/neondb', {
      dialect: 'postgres',
      logging: false, // Suppress logs for cleaner output
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
    
    await sequelize1.authenticate();
    const [result3] = await sequelize1.query('SELECT NOW() as current_time');
    console.log('   ✅ SUCCESS - Connected with Sequelize (pooler)');
    console.log('   📅 Database time:', result3[0].current_time);
    await sequelize1.close();
  } catch (error) {
    console.log('   ❌ FAILED - Sequelize (pooler):', error.message);
  }
  
  // Test 4: Sequelize with direct endpoint
  console.log('\n4️⃣  Testing Sequelize with direct endpoint...');
  try {
    const sequelize2 = new Sequelize('postgresql://neondb_owner:npg_8uexFD5ArTqV@ep-divine-credit-ad52ykm7.c-2.us-east-1.aws.neon.tech/neondb', {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
    
    await sequelize2.authenticate();
    const [result4] = await sequelize2.query('SELECT NOW() as current_time');
    console.log('   ✅ SUCCESS - Connected with Sequelize (direct)');
    console.log('   📅 Database time:', result4[0].current_time);
    await sequelize2.close();
  } catch (error) {
    console.log('   ❌ FAILED - Sequelize (direct):', error.message);
  }
  
  // Test 5: Try with different SSL configurations
  console.log('\n5️⃣  Testing with different SSL configurations...');
  
  // Test 5a: No SSL rejection
  try {
    const sequelize3 = new Sequelize('postgresql://neondb_owner:npg_8uexFD5ArTqV@ep-divine-credit-ad52ykm7-pooler.c-2.us-east-1.aws.neon.tech/neondb', {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: true
      }
    });
    
    await sequelize3.authenticate();
    console.log('   ✅ SUCCESS - Connected with ssl: true');
    await sequelize3.close();
  } catch (error) {
    console.log('   ❌ FAILED - ssl: true:', error.message);
  }
  
  console.log('\n🏁 Connection tests completed!');
}

testMultipleConnections().catch(console.error);