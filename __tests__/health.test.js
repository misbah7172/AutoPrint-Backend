const request = require('supertest');
const app = require('../src/index');
const { sequelize } = require('../src/models');

describe('Health Check', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  test('GET /health should return healthy status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });
});