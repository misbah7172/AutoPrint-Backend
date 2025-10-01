module.exports = (sequelize, DataTypes) => {
  const PrintJob = sequelize.define('PrintJob', {
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
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'documents',
        key: 'id'
      }
    },
    paymentId: {
      type: DataTypes.UUID,
      references: {
        model: 'payments',
        key: 'id'
      }
    },
    jobNumber: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(
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
      type: DataTypes.STRING(8),
      unique: true,
      allowNull: true
    },
    queuePosition: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Print settings are stored as separate columns
    copies: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    colorMode: {
      type: DataTypes.ENUM('color', 'black_and_white'),
      defaultValue: 'black_and_white'
    },
    doubleSided: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    paperSize: {
      type: DataTypes.ENUM('A4', 'A3', 'Letter', 'Legal'),
      defaultValue: 'A4'
    },
    orientation: {
      type: DataTypes.ENUM('portrait', 'landscape'),
      defaultValue: 'portrait'
    },
    printQuality: {
      type: DataTypes.ENUM('draft', 'normal', 'high'),
      defaultValue: 'normal'
    },
    pageRange: {
      type: DataTypes.STRING,
      allowNull: true
    },
    specialInstructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    printerId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high'),
      defaultValue: 'normal'
    },
    costPerPage: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true
    },
    estimatedCompletionTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    totalPages: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    totalCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    printerName: {
      type: DataTypes.STRING
    },
    startedAt: {
      type: DataTypes.DATE
    },
    completedAt: {
      type: DataTypes.DATE
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'printjobs',
    timestamps: true,
    hooks: {
      beforeCreate: async (printJob) => {
        if (!printJob.jobNumber) {
          // Generate job number: YYYY-MM-DD-HHMMSS-XXXX
          const now = new Date();
          const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
          const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
          const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
          printJob.jobNumber = `${dateStr}-${timeStr}-${randomStr}`;
        }
      }
    },
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['documentId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['jobNumber'],
        unique: true
      }
    ]
  });

  // Instance methods
  PrintJob.prototype.calculateCost = function() {
    const baseCostPerPage = parseFloat(process.env.DEFAULT_PRINT_COST || 0.10);
    const colorMultiplier = parseFloat(process.env.COLOR_PRINT_MULTIPLIER || 3);
    
    let costPerPage = baseCostPerPage;
    if (this.printOptions.color) {
      costPerPage *= colorMultiplier;
    }
    
    const totalCost = costPerPage * this.totalPages * this.printOptions.copies;
    return parseFloat(totalCost.toFixed(2));
  };

  PrintJob.prototype.updateStatus = async function(newStatus, metadata = {}) {
    this.status = newStatus;
    this.metadata = { ...this.metadata, ...metadata };
    
    if (newStatus === 'printing' && !this.startedAt) {
      this.startedAt = new Date();
    }
    
    if (['completed', 'failed', 'cancelled'].includes(newStatus) && !this.completedAt) {
      this.completedAt = new Date();
    }
    
    return this.save();
  };

  // Associations
  PrintJob.associate = (models) => {
    PrintJob.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    PrintJob.belongsTo(models.Document, {
      foreignKey: 'documentId',
      as: 'document'
    });
    
    PrintJob.belongsTo(models.Payment, {
      foreignKey: 'paymentId',
      as: 'payment'
    });
  };

  return PrintJob;
};