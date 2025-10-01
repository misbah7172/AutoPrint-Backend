const { User } = require('../src/models');
const { sequelize } = require('../src/models');

describe('User Model', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('should create a user with valid data', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    const user = await User.create(userData);

    expect(user.email).toBe(userData.email);
    expect(user.firstName).toBe(userData.firstName);
    expect(user.role).toBe('student');
    expect(user.balance).toBe('0.00');
    expect(user.isActive).toBe(true);
  });

  test('should hash password before saving', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    const user = await User.create(userData);
    expect(user.password).not.toBe(userData.password);
    expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
  });

  test('should validate password correctly', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    const user = await User.create(userData);
    
    const isValidCorrect = await user.comparePassword('password123');
    const isValidIncorrect = await user.comparePassword('wrongpassword');

    expect(isValidCorrect).toBe(true);
    expect(isValidIncorrect).toBe(false);
  });

  test('should return full name', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    const user = await User.create(userData);
    expect(user.getFullName()).toBe('Test User');
  });

  test('should exclude password from JSON output', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    const user = await User.create(userData);
    const userJSON = user.toJSON();

    expect(userJSON).not.toHaveProperty('password');
    expect(userJSON).toHaveProperty('email');
  });
});