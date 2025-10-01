'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('documents', [
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        originalName: 'Assignment_1.pdf',
        fileName: 'assignment_1_john_doe_2024.pdf',
        fileSize: 1024576,
        mimeType: 'application/pdf',
        s3Key: 'documents/2024/assignment_1_john_doe_2024.pdf',
        s3Bucket: 'autoprint-documents',
        pageCount: 5,
        documentType: 'pdf',
        isProcessed: true,
        metadata: JSON.stringify({
          originalUploadName: 'Assignment_1.pdf',
          processingTime: 2.3
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440003',
        originalName: 'Research_Paper.docx',
        fileName: 'research_paper_jane_smith_2024.pdf',
        fileSize: 2048576,
        mimeType: 'application/pdf',
        s3Key: 'documents/2024/research_paper_jane_smith_2024.pdf',
        s3Bucket: 'autoprint-documents',
        pageCount: 12,
        documentType: 'pdf',
        isProcessed: true,
        metadata: JSON.stringify({
          originalUploadName: 'Research_Paper.docx',
          convertedFromDocx: true,
          processingTime: 4.7
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440003',
        userId: '550e8400-e29b-41d4-a716-446655440004',
        originalName: 'Lab_Report.pdf',
        fileName: 'lab_report_alice_johnson_2024.pdf',
        fileSize: 1536000,
        mimeType: 'application/pdf',
        s3Key: 'documents/2024/lab_report_alice_johnson_2024.pdf',
        s3Bucket: 'autoprint-documents',
        pageCount: 8,
        documentType: 'pdf',
        isProcessed: true,
        metadata: JSON.stringify({
          originalUploadName: 'Lab_Report.pdf',
          processingTime: 3.1
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440004',
        userId: '550e8400-e29b-41d4-a716-446655440005',
        originalName: 'Presentation_Slides.pdf',
        fileName: 'presentation_slides_bob_wilson_2024.pdf',
        fileSize: 3072000,
        mimeType: 'application/pdf',
        s3Key: 'documents/2024/presentation_slides_bob_wilson_2024.pdf',
        s3Bucket: 'autoprint-documents',
        pageCount: 20,
        documentType: 'pdf',
        isProcessed: true,
        metadata: JSON.stringify({
          originalUploadName: 'Presentation_Slides.pdf',
          processingTime: 5.2
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('documents', null, {});
  }
};