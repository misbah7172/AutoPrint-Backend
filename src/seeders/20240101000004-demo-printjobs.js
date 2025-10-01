'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('printjobs', [
      {
        id: '880e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        documentId: '660e8400-e29b-41d4-a716-446655440001',
        paymentId: '770e8400-e29b-41d4-a716-446655440001',
        jobNumber: 'APR-2024-001',
        status: 'completed',
        upid: 'A1B2C3D4',
        copies: 1,
        paperSize: 'A4',
        orientation: 'portrait',
        colorMode: 'blackwhite',
        printQuality: 'normal',
        doubleSided: false,
        pageRange: '1-5',
        totalPages: 5,
        costPerPage: 0.05,
        totalCost: 0.25,
        printerName: 'HP LaserJet Pro M404dn',
        printerId: 'printer_001',
        queuePosition: null,
        priority: 'normal',
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        completedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
        specialInstructions: 'Please staple the pages together',
        metadata: JSON.stringify({
          printDuration: 1800, // 30 minutes in seconds
          paperUsed: 5
        }),
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        updatedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000)
      },
      {
        id: '880e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440003',
        documentId: '660e8400-e29b-41d4-a716-446655440002',
        paymentId: '770e8400-e29b-41d4-a716-446655440002',
        jobNumber: 'APR-2024-002',
        status: 'printing',
        upid: 'E5F6G7H8',
        copies: 2,
        paperSize: 'A4',
        orientation: 'portrait',
        colorMode: 'blackwhite',
        printQuality: 'high',
        doubleSided: true,
        pageRange: '1-12',
        totalPages: 24, // 12 pages x 2 copies
        costPerPage: 0.05,
        totalCost: 0.60,
        printerName: 'Canon PIXMA G3020',
        printerId: 'printer_002',
        queuePosition: 1,
        priority: 'normal',
        startedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        estimatedCompletionTime: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        specialInstructions: 'Print double-sided, bind with spiral binding',
        metadata: JSON.stringify({
          estimatedDuration: 2400, // 40 minutes in seconds
          currentPage: 8
        }),
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        updatedAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      },
      {
        id: '880e8400-e29b-41d4-a716-446655440003',
        userId: '550e8400-e29b-41d4-a716-446655440004',
        documentId: '660e8400-e29b-41d4-a716-446655440003',
        paymentId: '770e8400-e29b-41d4-a716-446655440003',
        jobNumber: 'APR-2024-003',
        status: 'awaiting_payment',
        upid: 'I9J0K1L2',
        copies: 1,
        paperSize: 'A4',
        orientation: 'portrait',
        colorMode: 'blackwhite',
        printQuality: 'normal',
        doubleSided: false,
        pageRange: '1-8',
        totalPages: 8,
        costPerPage: 0.05,
        totalCost: 0.40,
        printerName: null,
        printerId: null,
        queuePosition: null,
        priority: 'normal',
        specialInstructions: 'Use recycled paper if available',
        metadata: JSON.stringify({
          awaitingPaymentSince: new Date()
        }),
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        id: '880e8400-e29b-41d4-a716-446655440004',
        userId: '550e8400-e29b-41d4-a716-446655440005',
        documentId: '660e8400-e29b-41d4-a716-446655440004',
        paymentId: '770e8400-e29b-41d4-a716-446655440004',
        jobNumber: 'APR-2024-004',
        status: 'failed',
        upid: 'M3N4O5P6',
        copies: 1,
        paperSize: 'A4',
        orientation: 'landscape',
        colorMode: 'color',
        printQuality: 'high',
        doubleSided: false,
        pageRange: '1-20',
        totalPages: 20,
        costPerPage: 0.15, // Higher cost for color
        totalCost: 3.00,
        printerName: null,
        printerId: null,
        queuePosition: null,
        priority: 'normal',
        errorMessage: 'Payment failed: Insufficient balance. Required: $3.00, Available: $0.00',
        specialInstructions: 'Color printing required for charts and graphs',
        metadata: JSON.stringify({
          failureReason: 'insufficient_balance',
          requiredAmount: 3.00,
          availableBalance: 0.00
        }),
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        updatedAt: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        id: '880e8400-e29b-41d4-a716-446655440005',
        userId: '550e8400-e29b-41d4-a716-446655440003',
        documentId: '660e8400-e29b-41d4-a716-446655440002',
        paymentId: null,
        jobNumber: 'APR-2024-005',
        status: 'queued',
        upid: 'Q7R8S9T0',
        copies: 1,
        paperSize: 'A4',
        orientation: 'portrait',
        colorMode: 'blackwhite',
        printQuality: 'normal',
        doubleSided: false,
        pageRange: '5-10',
        totalPages: 6,
        costPerPage: 0.05,
        totalCost: 0.30,
        printerName: 'HP LaserJet Pro M404dn',
        printerId: 'printer_001',
        queuePosition: 2,
        priority: 'low',
        estimatedCompletionTime: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes from now
        specialInstructions: 'Print only pages 5-10 of the research paper',
        metadata: JSON.stringify({
          queuedSince: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          estimatedWaitTime: 2700 // 45 minutes in seconds
        }),
        createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        updatedAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('printjobs', null, {});
  }
};