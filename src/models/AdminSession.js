module.exports = (sequelize, DataTypes) => {
  const AdminSession = sequelize.define('AdminSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    adminId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['sessionId']
      },
      {
        fields: ['adminId']
      },
      {
        fields: ['expiresAt']
      }
    ]
  });

  AdminSession.associate = function(models) {
    AdminSession.belongsTo(models.User, {
      foreignKey: 'adminId',
      as: 'admin'
    });
  };

  return AdminSession;
};