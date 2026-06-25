const axios = require('axios');

/**
 * AWS S3 Service for file uploads and management
 * Requires: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, AWS_REGION
 */

const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET = process.env.AWS_S3_BUCKET || 'canviet-exchange-uploads';
const BASE_URL = process.env.AWS_S3_BASE_URL || `https://${BUCKET}.s3.amazonaws.com`;

/**
 * Generate a presigned URL for direct browser uploads (POST policy)
 * Allows frontend to upload directly to S3 without backend intermediary
 */
async function getUploadSignedUrl(fileName, fileType, requestId, userId) {
  try {
    const timestamp = Date.now();
    const s3Key = `payment-proofs/${requestId}/${userId}/${timestamp}_${fileName}`;

    const params = {
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: fileType,
      Expires: 3600, // 1 hour
      Metadata: {
        requestId: String(requestId),
        userId: String(userId),
        uploadedAt: new Date().toISOString()
      }
    };

    const signedUrl = await s3.getSignedUrlPromise('putObject', params);
    const publicUrl = `${BASE_URL}/${s3Key}`;

    return {
      uploadUrl: signedUrl, // Use this for direct browser upload
      s3Key,
      publicUrl, // Immediate URL (may need CloudFront)
      expires: 3600
    };
  } catch (err) {
    throw new Error(`Failed to generate S3 upload URL: ${err.message}`);
  }
}

/**
 * Upload file to S3 from backend (if frontend can't do direct upload)
 */
async function uploadToS3(fileBuffer, fileName, fileType, requestId, userId) {
  try {
    const timestamp = Date.now();
    const s3Key = `payment-proofs/${requestId}/${userId}/${timestamp}_${fileName}`;

    const params = {
      Bucket: BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: fileType,
      Metadata: {
        requestId: String(requestId),
        userId: String(userId),
        uploadedAt: new Date().toISOString()
      }
    };

    const result = await s3.upload(params).promise();

    return {
      s3Key: result.Key,
      s3Url: result.Location,
      bucket: result.Bucket,
      etag: result.ETag
    };
  } catch (err) {
    throw new Error(`Failed to upload to S3: ${err.message}`);
  }
}

/**
 * Delete file from S3
 */
async function deleteFromS3(s3Key) {
  try {
    const params = {
      Bucket: BUCKET,
      Key: s3Key
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (err) {
    throw new Error(`Failed to delete from S3: ${err.message}`);
  }
}

/**
 * Generate CloudFront signed URL (if using CloudFront distribution)
 */
function getCloudFrontSignedUrl(s3Key, expiresIn = 3600) {
  try {
    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
    if (!cloudFrontDomain) {
      return `${BASE_URL}/${s3Key}`; // Fallback to direct S3 URL
    }

    const url = `https://${cloudFrontDomain}/${s3Key}`;
    // If you have CloudFront key pair, implement signing here
    // For now, return direct URL
    return url;
  } catch (err) {
    return `${BASE_URL}/${s3Key}`;
  }
}

module.exports = {
  getUploadSignedUrl,
  uploadToS3,
  deleteFromS3,
  getCloudFrontSignedUrl,
  BUCKET,
  BASE_URL
};
