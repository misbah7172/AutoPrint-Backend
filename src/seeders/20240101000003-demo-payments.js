'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('payments', [
      {
        id: '770e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        amount: 0.25,
        currency: 'USD',
        status: 'completed',
        paymentMethod: 'balance',
        transactionId: 'TXN_2024_001',
        txId: null,
        processedAt: new Date(),
        notes: 'Payment for Assignment_1.pdf printing',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440003',
        amount: 0.60,
        currency: 'USD',
        status: 'completed',
        paymentMethod: 'bkash',
        transactionId: 'TXN_2024_002',
        txId: 'BKS123456789',
        bkashNumber: '+8801711223344',
        processedAt: new Date(),
        notes: 'Payment for Research_Paper.docx printing',
        gatewayData: JSON.stringify({
          bkash_transaction_id: 'BKS123456789',
          sender_number: '+8801711223344'
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440003',
        userId: '550e8400-e29b-41d4-a716-446655440004',
        amount: 0.40,
        currency: 'USD',
        status: 'pending',
        paymentMethod: 'bkash',
        transactionId: 'TXN_2024_003',
        bkashNumber: '+8801712345678',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        notes: 'Payment for Lab_Report.pdf printing',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440004',
        userId: '550e8400-e29b-41d4-a716-446655440005',
        amount: 1.00,
        currency: 'USD',
        status: 'failed',
        paymentMethod: 'balance',
        transactionId: 'TXN_2024_004',
        notes: 'Insufficient balance for Presentation_Slides.pdf printing',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('payments', null, {});
  }
};