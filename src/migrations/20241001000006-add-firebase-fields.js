'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new fields for Firebase integration and profile photos
    await queryInterface.addColumn('users', 'photoUrl', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'firebaseUid', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });
    
    await queryInterface.addColumn('users', 'authProvider', {
      type: Sequelize.ENUM('local', 'google', 'facebook'),
      defaultValue: 'local'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'photoUrl');
    await queryInterface.removeColumn('users', 'firebaseUid');
    await queryInterface.removeColumn('users', 'authProvider');
  }
};