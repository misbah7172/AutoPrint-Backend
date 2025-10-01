module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
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
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    status: {
      type: DataTypes.ENUM(
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
      type: DataTypes.ENUM('card', 'balance', 'cash', 'bkash', 'transfer'),
      allowNull: false
    },
    transactionId: {
      type: DataTypes.STRING,
      unique: true
    },
    txId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING
    },
    description: {
      type: DataTypes.STRING
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    failureReason: {
      type: DataTypes.TEXT
    },
    processedAt: {
      type: DataTypes.DATE
    },
    refundedAt: {
      type: DataTypes.DATE
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    }
  }, {
    tableName: 'payments',
    timestamps: true,
    hooks: {
      beforeCreate: async (payment) => {
        if (!payment.transactionId) {
          // Generate transaction ID: PAY-YYYYMMDD-HHMMSS-XXXX
          const now = new Date();
          const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
          const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
          const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
          payment.transactionId = `PAY-${dateStr}-${timeStr}-${randomStr}`;
        }
      }
    },
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['paymentMethod']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['transactionId'],
        unique: true
      }
    ]
  });

  // Instance methods
  Payment.prototype.canRefund = function() {
    return this.status === 'completed' && 
           this.refundAmount < this.amount &&
           this.paymentMethod !== 'cash';
  };

  Payment.prototype.processPayment = async function() {
    this.status = 'processing';
    this.processedAt = new Date();
    return this.save();
  };

  Payment.prototype.completePayment = async function(metadata = {}) {
    this.status = 'completed';
    this.processedAt = new Date();
    this.metadata = { ...this.metadata, ...metadata };
    return this.save();
  };

  Payment.prototype.failPayment = async function(reason) {
    this.status = 'failed';
    this.failureReason = reason;
    this.processedAt = new Date();
    return this.save();
  };

  Payment.prototype.refund = async function(amount = null) {
    if (!this.canRefund()) {
      throw new Error('Payment cannot be refunded');
    }
    
    const refundAmount = amount || (this.amount - this.refundAmount);
    
    if (refundAmount > (this.amount - this.refundAmount)) {
      throw new Error('Refund amount exceeds available amount');
    }
    
    this.refundAmount = parseFloat(this.refundAmount) + parseFloat(refundAmount);
    this.refundedAt = new Date();
    
    if (this.refundAmount >= this.amount) {
      this.status = 'refunded';
    }
    
    return this.save();
  };

  // Associations
  Payment.associate = (models) => {
    Payment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    Payment.hasOne(models.PrintJob, {
      foreignKey: 'paymentId',
      as: 'printJob'
    });
  };

  return Payment;
};