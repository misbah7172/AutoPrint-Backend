'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add deletedAt column to documents table for paranoid mode
    await queryInterface.addColumn('documents', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add deletedAt column to other tables that might use paranoid mode
    await queryInterface.addColumn('users', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('payments', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('printjobs', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add indexes for deletedAt columns
    await queryInterface.addIndex('documents', ['deletedAt']);
    await queryInterface.addIndex('users', ['deletedAt']);
    await queryInterface.addIndex('payments', ['deletedAt']);
    await queryInterface.addIndex('printjobs', ['deletedAt']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove deletedAt columns
    await queryInterface.removeColumn('documents', 'deletedAt');
    await queryInterface.removeColumn('users', 'deletedAt');
    await queryInterface.removeColumn('payments', 'deletedAt');
    await queryInterface.removeColumn('printjobs', 'deletedAt');
  }
};