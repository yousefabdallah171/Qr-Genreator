import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import dotenv from 'dotenv';
import { prisma } from './config/database';
import { AuthController } from './controllers/authController';
import { authenticateToken, checkSubscriptionAccess, requireEmailVerification } from './middleware/auth';
import { QrCodeService, QrStyleConfig, QrContentData } from './services/qrCodeService';
import { SubscriptionService } from './services/subscriptionService';
import { AuthenticatedRequest, ApiResponse } from './types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/register', AuthController.register);
app.post('/api/auth/login', AuthController.login);
app.get('/api/auth/verify-email/:token', AuthController.verifyEmail);
app.post('/api/auth/request-password-reset', AuthController.requestPasswordReset);
app.post('/api/auth/reset-password/:token', AuthController.resetPassword);

// Protected routes
app.get('/api/auth/profile', authenticateToken, AuthController.getProfile);
app.put('/api/auth/profile', authenticateToken, AuthController.updateProfile);

// QR Code generation endpoint
app.post('/api/qr/generate', 
  authenticateToken, 
  requireEmailVerification,
  checkSubscriptionAccess,
  upload.single('logo'),
  async (req: AuthenticatedRequest, res: express.Response<ApiResponse>) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const {
        title,
        qrType,
        content,
        industryTemplate,
        // Style config
        size = 400,
        errorLevel = 'M',
        fgColor = '#000000',
        bgColor = '#ffffff',
        style = 'square',
        logoStyle = 'square',
        // Content specific fields
        emailAddress,
        emailSubject,
        emailBody,
        phoneNumber,
        smsNumber,
        smsMessage,
        wifiSsid,
        wifiPassword,
        wifiSecurity,
        wifiHidden,
        vcardData,
        latitude,
        longitude,
        socialPlatform,
        socialHandle,
        reviewUrl,
      } = req.body;

      // Validate required fields
      if (!qrType || !content) {
        return res.status(400).json({
          success: false,
          error: 'QR type and content are required',
        });
      }

      // Check logo upload permission
      if (req.file) {
        const canUploadLogo = await SubscriptionService.canPerformAction(req.user.id, 'logo_upload');
        if (!canUploadLogo.allowed) {
          return res.status(403).json({
            success: false,
            error: canUploadLogo.reason,
            upgradeRequired: canUploadLogo.upgradeRequired,
          });
        }
      }

      // Create style config
      const styleConfig: QrStyleConfig = {
        size: parseInt(size),
        errorLevel: errorLevel as 'L' | 'M' | 'Q' | 'H',
        fgColor,
        bgColor,
        style: style as any,
        logoStyle: logoStyle as any,
      };

      // Create content data
      const contentData: QrContentData = {
        qrType: qrType as any,
        content,
        industryTemplate,
        emailAddress,
        emailSubject,
        emailBody,
        phoneNumber,
        smsNumber,
        smsMessage,
        wifiSsid,
        wifiPassword,
        wifiSecurity: wifiSecurity as any,
        wifiHidden: wifiHidden === 'true',
        vcardData: vcardData ? JSON.parse(vcardData) : undefined,
        latitude,
        longitude,
        socialPlatform,
        socialHandle,
        reviewUrl,
      };

      // Generate QR code
      const result = await QrCodeService.createQrCode(
        req.user.id,
        contentData,
        styleConfig,
        title,
        req.file?.buffer
      );

      res.json({
        success: true,
        data: {
          id: result.id,
          qrCode: result.qrBuffer.toString('base64'),
        },
        message: 'QR code generated successfully',
      });
    } catch (error) {
      console.error('QR generation error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate QR code',
      });
    }
  }
);

// Get user's QR codes
app.get('/api/qr/my-codes', 
  authenticateToken, 
  async (req: AuthenticatedRequest, res: express.Response<ApiResponse>) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await QrCodeService.getUserQrCodes(req.user.id, page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Get QR codes error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get QR codes',
      });
    }
  }
);

// Get QR code analytics
app.get('/api/qr/:id/analytics', 
  authenticateToken, 
  async (req: AuthenticatedRequest, res: express.Response<ApiResponse>) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const { id } = req.params;
      const analytics = await QrCodeService.getQrCodeAnalytics(id, req.user.id);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get analytics',
      });
    }
  }
);

// Download QR code in different formats
app.get('/api/qr/:id/download/:format', 
  authenticateToken, 
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const { id, format } = req.params;
      
      // Get QR code from database
      const qrCode = await prisma.qrCode.findFirst({
        where: { id, userId: req.user.id },
      });

      if (!qrCode) {
        return res.status(404).json({
          success: false,
          error: 'QR code not found',
        });
      }

      // Check if format is allowed for user's plan
      const planLimits = await SubscriptionService.getPlanLimits(req.user.id);
      if (!planLimits.exportFormats.includes(format)) {
        return res.status(403).json({
          success: false,
          error: `${format.toUpperCase()} export not available in your plan`,
          upgradeRequired: true,
        });
      }

      // Regenerate QR code with current settings
      const content = qrCode.content;
      const styleConfig = qrCode.styleConfig as any;
      
      const qrBuffer = await QrCodeService.generateStyledQrCode(content, styleConfig);
      
      // Convert to requested format
      const convertedBuffer = await QrCodeService.convertToFormat(
        qrBuffer, 
        format as any,
        planLimits.watermark
      );

      // Track download
      await SubscriptionService.trackUsage(req.user.id, 'QR_DOWNLOADED');

      // Set appropriate headers
      const mimeTypes = {
        png: 'image/png',
        jpg: 'image/jpeg',
        svg: 'image/svg+xml',
        pdf: 'application/pdf',
      };

      res.setHeader('Content-Type', (mimeTypes as any)[format] || 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="qr-code-${id}.${format}"`);
      res.send(convertedBuffer);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download QR code',
      });
    }
  }
);

// Get subscription info
app.get('/api/subscription/info', 
  authenticateToken, 
  async (req: AuthenticatedRequest, res: express.Response<ApiResponse>) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const subscriptionInfo = await SubscriptionService.getSubscriptionInfo(req.user.id);
      const planLimits = await SubscriptionService.getPlanLimits(req.user.id);

      // Get current usage
      const currentUsage = {
        qrCodes: await SubscriptionService.getCurrentMonthlyUsage(req.user.id, 'QR_GENERATED'),
        apiCalls: await SubscriptionService.getCurrentMonthlyUsage(req.user.id, 'API_CALL'),
      };

      res.json({
        success: true,
        data: {
          subscription: subscriptionInfo,
          limits: planLimits,
          usage: currentUsage,
        },
      });
    } catch (error) {
      console.error('Get subscription info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get subscription info',
      });
    }
  }
);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 5MB.',
      });
    }
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;