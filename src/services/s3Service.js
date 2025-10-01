const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET,
  region: process.env.S3_REGION || 'us-east-1'
});

const uploadToS3 = async (file, userId) => {
  const fileExtension = path.extname(file.originalname);
  const fileName = `${userId}/${uuidv4()}${fileExtension}`;
  
  const uploadParams = {
    Bucket: process.env.S3_BUCKET,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ServerSideEncryption: 'AES256',
    Metadata: {
      'original-name': file.originalname,
      'user-id': userId,
      'upload-timestamp': new Date().toISOString()
    }
  };

  try {
    const result = await s3.upload(uploadParams).promise();
    return {
      key: fileName,
      bucket: process.env.S3_BUCKET,
      location: result.Location,
      etag: result.ETag
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

const deleteFromS3 = async (key, bucket = process.env.S3_BUCKET) => {
  const deleteParams = {
    Bucket: bucket,
    Key: key
  };

  try {
    await s3.deleteObject(deleteParams).promise();
    return { success: true };
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete file from S3');
  }
};

const getSignedUrl = async (key, bucket = process.env.S3_BUCKET, expires = 3600) => {
  const params = {
    Bucket: bucket,
    Key: key,
    Expires: expires
  };

  try {
    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error('S3 signed URL error:', error);
    throw new Error('Failed to generate signed URL');
  }
};

const copyFile = async (sourceKey, destKey, bucket = process.env.S3_BUCKET) => {
  const copyParams = {
    Bucket: bucket,
    CopySource: `${bucket}/${sourceKey}`,
    Key: destKey
  };

  try {
    const result = await s3.copyObject(copyParams).promise();
    return {
      key: destKey,
      bucket: bucket,
      etag: result.ETag
    };
  } catch (error) {
    console.error('S3 copy error:', error);
    throw new Error('Failed to copy file in S3');
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  getSignedUrl,
  copyFile,
  s3
};