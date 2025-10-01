'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    await queryInterface.bulkInsert('users', [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'admin@autoprint.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        studentId: null,
        balance: 0.00,
        isActive: true,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'operator@autoprint.com',
        password: hashedPassword,
        firstName: 'Print',
        lastName: 'Operator',
        role: 'operator',
        studentId: null,
        balance: 0.00,
        isActive: true,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'student1@university.edu',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'student',
        studentId: 'STU2024001',
        balance: 25.00,
        isActive: true,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        email: 'student2@university.edu',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'student',
        studentId: 'STU2024002',
        balance: 15.50,
        isActive: true,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        email: 'student3@university.edu',
        password: hashedPassword,
        firstName: 'Alice',
        lastName: 'Johnson',
        role: 'student',
        studentId: 'STU2024003',
        balance: 10.75,
        isActive: true,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        email: 'student4@university.edu',
        password: hashedPassword,
        firstName: 'Bob',
        lastName: 'Wilson',
        role: 'student',
        studentId: 'STU2024004',
        balance: 0.00,
        isActive: true,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};