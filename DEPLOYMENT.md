# AutoPrint Backend - Render Deployment Guide

## Prerequisites
1. MongoDB Atlas account with database setup
2. Render account (free tier available)
3. GitHub repository

## Deployment Steps

### 1. Connect to Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Select the `backend` folder as the root directory

### 2. Configure Web Service
- **Name**: `autoprint-backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free`

### 3. Environment Variables
Set these in Render Dashboard:

**Required:**
- `NODE_ENV`: `production`
- `MONGODB_URL`: Your MongoDB Atlas connection string
- `JWT_SECRET`: Generate a secure random string
- `PORT`: `10000` (automatically set by Render)

**Optional:**
- `CORS_ORIGIN`: `*` (allow all origins)
- `LOG_LEVEL`: `info`

### 4. MongoDB Atlas Setup
1. Go to MongoDB Atlas dashboard
2. Navigate to "Network Access"
3. Add IP address: `0.0.0.0/0` (allow all IPs for Render)
4. Copy the connection string and set it as `MONGODB_URL`

### 5. Health Check
- Set health check path to: `/api/health`

### 6. Deploy
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Your API will be available at: `https://your-service-name.onrender.com`

## Testing Deployment

Test your deployed API:
```bash
# Health check
curl https://your-service-name.onrender.com/api/health

# Should return:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "environment": "production"
}
```

## Mobile App Configuration

Update your mobile app's API configuration to use the Render URL:
```dart
static const String baseUrl = 'https://your-service-name.onrender.com';
```

## Troubleshooting

### Common Issues:
1. **Database Connection**: Ensure MongoDB Atlas allows connections from all IPs
2. **Environment Variables**: Double-check all required env vars are set
3. **CORS Issues**: Ensure CORS is configured to allow mobile app requests
4. **Build Failures**: Check build logs in Render dashboard

### Logs Access:
- View logs in Render dashboard under "Logs" tab
- Real-time monitoring available

## Features Available:
- ✅ MongoDB Atlas integration
- ✅ JWT Authentication
- ✅ Admin API endpoints
- ✅ Student API endpoints
- ✅ Real-time WebSocket support
- ✅ File upload capabilities
- ✅ Payment processing
- ✅ Print queue management
- ✅ Health monitoring

## Security Notes:
- JWT secrets are auto-generated
- HTTPS enabled by default on Render
- Database connections encrypted
- Rate limiting enabled
- Security headers configured