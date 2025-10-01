'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Payments table
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD'
      },
      status: {
        type: Sequelize.ENUM(
          'pending',
          'verified',
          'processing',
          'completed',
          'failed',
          'cancelled',
          'refunded'
        ),
        defaultValue: 'pending'
      },
      paymentMethod: {
        type: Sequelize.ENUM('card', 'balance', 'cash', 'bkash', 'transfer'),
        allowNull: false
      },
      transactionId: {
        type: Sequelize.STRING,
        unique: true
      },
      txId: {
        type: Sequelize.STRING,
        unique: true
      },
      bkashNumber: {
        type: Sequelize.STRING
      },
      qrCode: {
        type: Sequelize.TEXT
      },
      paymentReference: {
        type: Sequelize.STRING
      },
      gatewayData: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      processedAt: {
        type: Sequelize.DATE
      },
      expiresAt: {
        type: Sequelize.DATE
      },
      notes: {
        type: Sequelize.TEXT
      },
      refundAmount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      refundedAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Add indexes
    await queryInterface.addIndex('payments', ['userId']);
    await queryInterface.addIndex('payments', ['status']);
    await queryInterface.addIndex('payments', ['paymentMethod']);
    await queryInterface.addIndex('payments', ['transactionId']);
    await queryInterface.addIndex('payments', ['txId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payments');
  }
};