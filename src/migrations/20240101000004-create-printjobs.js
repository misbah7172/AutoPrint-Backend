'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create PrintJobs table
    await queryInterface.createTable('printjobs', {
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
      documentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'documents',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      paymentId: {
        type: Sequelize.UUID,
        references: {
          model: 'payments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      jobNumber: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM(
          'awaiting_payment',
          'queued',
          'waiting_for_confirm',
          'printing',
          'completed',
          'failed',
          'cancelled'
        ),
        defaultValue: 'awaiting_payment'
      },
      upid: {
        type: Sequelize.STRING(8),
        unique: true
      },
      copies: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      paperSize: {
        type: Sequelize.ENUM('A4', 'A5', 'Letter', 'Legal'),
        defaultValue: 'A4'
      },
      orientation: {
        type: Sequelize.ENUM('portrait', 'landscape'),
        defaultValue: 'portrait'
      },
      colorMode: {
        type: Sequelize.ENUM('color', 'grayscale', 'blackwhite'),
        defaultValue: 'blackwhite'
      },
      printQuality: {
        type: Sequelize.ENUM('draft', 'normal', 'high'),
        defaultValue: 'normal'
      },
      doubleSided: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      pageRange: {
        type: Sequelize.STRING
      },
      totalPages: {
        type: Sequelize.INTEGER
      },
      costPerPage: {
        type: Sequelize.DECIMAL(8, 4),
        defaultValue: 0.05
      },
      totalCost: {
        type: Sequelize.DECIMAL(10, 2)
      },
      printerName: {
        type: Sequelize.STRING
      },
      printerId: {
        type: Sequelize.STRING
      },
      queuePosition: {
        type: Sequelize.INTEGER
      },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
        defaultValue: 'normal'
      },
      startedAt: {
        type: Sequelize.DATE
      },
      completedAt: {
        type: Sequelize.DATE
      },
      estimatedCompletionTime: {
        type: Sequelize.DATE
      },
      errorMessage: {
        type: Sequelize.TEXT
      },
      specialInstructions: {
        type: Sequelize.TEXT
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
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
    await queryInterface.addIndex('printjobs', ['userId']);
    await queryInterface.addIndex('printjobs', ['documentId']);
    await queryInterface.addIndex('printjobs', ['paymentId']);
    await queryInterface.addIndex('printjobs', ['jobNumber']);
    await queryInterface.addIndex('printjobs', ['status']);
    await queryInterface.addIndex('printjobs', ['upid']);
    await queryInterface.addIndex('printjobs', ['queuePosition']);
    await queryInterface.addIndex('printjobs', ['priority']);
    await queryInterface.addIndex('printjobs', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('printjobs');
  }
};