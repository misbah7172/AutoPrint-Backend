const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(config[process.env.NODE_ENV || 'development']);

// Import models
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Document = require('./Document')(sequelize, Sequelize.DataTypes);
const Payment = require('./Payment')(sequelize, Sequelize.DataTypes);
const PrintJob = require('./PrintJob')(sequelize, Sequelize.DataTypes);

// Define associations
const models = { User, Document, Payment, PrintJob };

Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = {
  sequelize,
  Sequelize,
  ...models
};