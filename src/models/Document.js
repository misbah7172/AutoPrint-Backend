module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    s3Key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    s3Bucket: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pageCount: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1
      }
    },
    status: {
      type: DataTypes.ENUM('uploading', 'processing', 'ready', 'error'),
      defaultValue: 'uploading'
    },
    processingError: {
      type: DataTypes.TEXT
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deletedAt: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'documents',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  // Instance methods
  Document.prototype.getS3Url = function() {
    return `https://${this.s3Bucket}.s3.amazonaws.com/${this.s3Key}`;
  };

  Document.prototype.getFileSizeFormatted = function() {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (this.fileSize === 0) return '0 Bytes';
    const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
    return Math.round(this.fileSize / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Associations
  Document.associate = (models) => {
    Document.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    Document.hasMany(models.PrintJob, {
      foreignKey: 'documentId',
      as: 'printJobs'
    });
  };

  return Document;
};