'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Documents table
    await queryInterface.createTable('documents', {
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
      originalName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fileName: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      fileSize: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      mimeType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      s3Key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      s3Bucket: {
        type: Sequelize.STRING,
        allowNull: false
      },
      pageCount: {
        type: Sequelize.INTEGER
      },
      documentType: {
        type: Sequelize.ENUM('pdf', 'docx', 'txt', 'image'),
        allowNull: false
      },
      isProcessed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      processingError: {
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
    await queryInterface.addIndex('documents', ['userId']);
    await queryInterface.addIndex('documents', ['fileName']);
    await queryInterface.addIndex('documents', ['documentType']);
    await queryInterface.addIndex('documents', ['isProcessed']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('documents');
  }
};