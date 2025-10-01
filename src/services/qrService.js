const QRCode = require('qrcode');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS S3 for QR code storage
const s3 = new AWS.S3({
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET,
  region: process.env.S3_REGION || 'us-east-1'
});

/**
 * Generate bKash payment QR code
 */
const generateBkashQR = async (amount, reference) => {
  try {
    // bKash payment URL format (this is a placeholder - adjust based on actual bKash API)
    const bkashNumber = process.env.BKASH_MERCHANT_NUMBER || '01XXXXXXXXX';
    const paymentData = {
      merchant: bkashNumber,
      amount: amount,
      reference: reference,
      currency: 'BDT'
    };
    
    // Create QR code data string
    const qrData = `bkash://payment?merchant=${paymentData.merchant}&amount=${paymentData.amount}&ref=${paymentData.reference}`;
    
    // Generate QR code as buffer
    const qrBuffer = await QRCode.toBuffer(qrData, {
      type: 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    });
    
    // Upload QR code to S3
    const fileName = `qr-codes/${reference}-${uuidv4()}.png`;
    
    const uploadParams = {
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      Body: qrBuffer,
      ContentType: 'image/png',
      ACL: 'public-read'
    };
    
    const uploadResult = await s3.upload(uploadParams).promise();
    
    return {
      qrCodeUrl: uploadResult.Location,
      bkashNumber: bkashNumber,
      amount: amount,
      reference: reference,
      paymentData: qrData
    };
    
  } catch (error) {
    console.error('Error generating bKash QR code:', error);
    throw new Error('Failed to generate payment QR code');
  }
};

/**
 * Generate payment instructions with QR code
 */
const generatePaymentInstructions = async (printJob) => {
  const reference = `AP-${printJob.jobNumber}`;
  const amount = parseFloat(printJob.totalCost);
  
  const qrResult = await generateBkashQR(amount, reference);
  
  return {
    paymentMethod: 'bkash',
    amount: amount,
    currency: 'BDT',
    merchantNumber: qrResult.bkashNumber,
    reference: reference,
    qrCodeUrl: qrResult.qrCodeUrl,
    instructions: [
      'Open your bKash app',
      'Scan the QR code or send money to the merchant number',
      `Amount: ${amount} BDT`,
      `Reference: ${reference}`,
      'Keep the transaction ID for verification'
    ]
  };
};

/**
 * Clean up old QR codes from S3 (called periodically)
 */
const cleanupOldQRCodes = async (olderThanHours = 24) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);
    
    const listParams = {
      Bucket: process.env.S3_BUCKET,
      Prefix: 'qr-codes/'
    };
    
    const objects = await s3.listObjectsV2(listParams).promise();
    
    const objectsToDelete = objects.Contents
      .filter(obj => obj.LastModified < cutoffDate)
      .map(obj => ({ Key: obj.Key }));
    
    if (objectsToDelete.length > 0) {
      const deleteParams = {
        Bucket: process.env.S3_BUCKET,
        Delete: {
          Objects: objectsToDelete
        }
      };
      
      await s3.deleteObjects(deleteParams).promise();
      console.log(`Cleaned up ${objectsToDelete.length} old QR codes`);
    }
    
  } catch (error) {
    console.error('Error cleaning up QR codes:', error);
  }
};

module.exports = {
  generateBkashQR,
  generatePaymentInstructions,
  cleanupOldQRCodes
};