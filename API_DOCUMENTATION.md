# AutoPrint Backend API Documentation

## Overview
This document provides comprehensive documentation for the AutoPrint backend REST API, including authentication, file upload, payment processing, queue management, and real-time WebSocket integration.

## Base URL
- Development: `http://localhost:3000`
- Production: `https://api.autoprint.com`

## Authentication
All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## WebSocket Connection
Real-time updates are provided via Socket.IO:
```javascript
// Connection requires authentication token
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### WebSocket Events
- `connectionSuccess` - Confirms successful connection
- `queueStatus` - General queue status updates
- `myJobStatus` - Personalized job status for user
- `paymentVerified` - Payment verification notification
- `confirmationTimeout` - Job confirmation timeout notification
- `queueUpdate` - General queue updates

## API Endpoints

### Authentication
#### POST /api/auth/register
Register a new user account.
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "student",
  "studentId": "CS2021001"
}
```

#### POST /api/auth/login
Login and receive JWT token.
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Documents
#### POST /api/documents/upload
Upload a document for printing (requires authentication).
- **Content-Type**: `multipart/form-data`
- **File types**: PDF, DOC, DOCX, TXT, JPG, PNG
- **Max size**: 10MB

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "document=@/path/to/file.pdf"
```

#### GET /api/documents
List user's uploaded documents.

#### DELETE /api/documents/:id
Delete a document.

### Print Jobs
#### POST /api/print-jobs
Create a new print job.
```json
{
  "documentId": "uuid",
  "copies": 2,
  "colorMode": "bw",
  "paperSize": "A4",
  "orientation": "portrait",
  "duplex": false
}
```

#### GET /api/print-jobs
List user's print jobs.

#### GET /api/print-jobs/:id
Get specific print job details.

#### DELETE /api/print-jobs/:id
Cancel a print job (only if not started).

### Payments
#### POST /api/payments/submit
Submit a payment for verification (bKash transaction).
```json
{
  "printJobId": "uuid",
  "amount": 5.00,
  "method": "bkash",
  "txId": "BKash-Transaction-ID"
}
```
**Response includes QR code URL and payment instructions**

#### GET /api/payments/pending
Get pending payments (admin only).

#### POST /api/payments/verify
Verify a payment and generate UPID (admin only).
```json
{
  "paymentId": "uuid",
  "verified": true,
  "adminNotes": "Payment verified successfully"
}
```

#### GET /api/payments/user
Get user's payment history.

### Queue Management
#### GET /api/queue/status
Get current queue status.

#### POST /api/queue/confirm/:upid
Confirm print job when called by Raspberry Pi (requires UPID).

#### GET /api/queue/position/:upid
Get position of specific print job in queue.

### Raspberry Pi Integration
#### GET /api/print/next-job
Get next job for printing (requires API key).
```bash
curl -H "X-API-Key: your-raspi-api-key" \
  http://localhost:3000/api/print/next-job
```

#### POST /api/print/job/:upid/status
Update job status during printing.
```json
{
  "status": "printing|completed|failed",
  "progress": 75,
  "errorMessage": "Optional error message"
}
```

#### POST /api/print/job/:upid/complete
Mark job as completed.

### Admin Routes
#### GET /api/admin/dashboard
Get admin dashboard statistics.

#### GET /api/admin/users
List all users with pagination.

#### GET /api/admin/print-jobs
List all print jobs with filtering.

#### PUT /api/admin/users/:id/balance
Update user balance.

#### GET /api/admin/workers/status
Get status of all background workers.

#### POST /api/admin/workers/queue/start
Start queue worker.

#### POST /api/admin/workers/queue/stop
Stop queue worker.

#### POST /api/admin/workers/cleanup/manual
Manually trigger document cleanup.
```json
{
  "documentId": "uuid"
}
```

## Error Responses
All endpoints return consistent error responses:
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

## Rate Limiting
- 100 requests per 15 minutes per IP address
- Higher limits for authenticated requests

## File Upload Specifications
### Supported Formats
- **Documents**: PDF, DOC, DOCX, TXT
- **Images**: JPG, JPEG, PNG, GIF
- **Max Size**: 10MB per file

### AWS S3 Integration
- Files are uploaded to AWS S3 with signed URLs
- Temporary URLs provided for download
- Automatic cleanup after job completion

## Payment Integration
### bKash Flow
1. User creates print job
2. System calculates cost and creates payment record
3. User receives QR code for bKash payment
4. User completes bKash transaction
5. User submits transaction ID
6. Admin verifies payment
7. System generates UPID and assigns queue position

### Cost Calculation
- Black & White: ৳2 per page
- Color: ৳5 per page
- Duplex: 50% discount on second side

## Queue Management
### Status Flow
1. `awaiting_payment` - Waiting for payment verification
2. `queued` - In queue, waiting for turn
3. `waiting_for_confirm` - At front of queue, waiting for confirmation
4. `printing` - Currently being printed
5. `completed` - Successfully completed
6. `cancelled` - Cancelled by user or admin
7. `failed` - Failed during printing

### UPID System
- 8-character unique print ID (4 letters + 4 digits)
- Format: `ABCD1234`
- Used for queue confirmation and tracking

### Timeout Handling
- Jobs have 5 seconds to confirm when at front of queue
- Timeout moves job down one position
- Automatic retry system prevents job starvation

## Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=autoprint-documents

# Raspberry Pi
RASPI_API_KEY=your-raspi-api-key

# Frontend URLs
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
STUDENT_URL=http://localhost:3002

# Workers
DOCUMENT_RETENTION_HOURS=24
```

## Development Setup
1. Install dependencies: `npm install`
2. Set up environment variables
3. Run database migrations: `npm run migrate`
4. Start development server: `npm run dev`

## Production Deployment
1. Build application: `npm run build`
2. Set production environment variables
3. Run migrations: `npm run migrate:prod`
4. Start server: `npm start`

## Monitoring & Health Checks
- Health check endpoint: `GET /health`
- Worker status: `GET /api/admin/workers/status`
- Real-time monitoring via WebSocket events

## Security Features
- JWT authentication with role-based access control
- Rate limiting on all endpoints
- File type validation and size limits
- SQL injection protection via Sequelize ORM
- CORS configuration for multi-domain setup
- Helmet.js security headers