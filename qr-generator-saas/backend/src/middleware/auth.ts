import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthUtils } from '../utils/auth';
import { AuthenticatedRequest, ApiResponse } from '../types';

/**
 * Middleware to authenticate JWT token
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const token = AuthUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
      });
      return;
    }

    const decoded = AuthUtils.verifyToken(token);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIALING'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/**
 * Middleware to check if user's email is verified
 */
export const requireEmailVerification = (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  if (!req.user?.emailVerified) {
    res.status(403).json({
      success: false,
      error: 'Email verification required',
      message: 'Please verify your email address to access this feature',
    });
    return;
  }
  
  next();
};

/**
 * Middleware to check subscription status and trial
 */
export const checkSubscriptionAccess = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Get user's current subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      res.status(403).json({
        success: false,
        error: 'No active subscription found',
        message: 'Please subscribe to access this feature',
      });
      return;
    }

    // Check if trial has expired
    if (subscription.planType === 'TRIAL' && subscription.trialEnd) {
      const now = new Date();
      if (now > subscription.trialEnd) {
        // Update subscription status to expired
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        });

        res.status(403).json({
          success: false,
          error: 'Trial expired',
          message: 'Your free trial has expired. Please upgrade to continue using the service',
        });
        return;
      }
    }

    // Attach subscription info to request
    req.subscription = subscription;
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify subscription status',
    });
  }
};

/**
 * Middleware to check if user has access to specific plan features
 */
export const requirePlan = (requiredPlans: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: req.user.id,
          status: { in: ['ACTIVE', 'TRIALING'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription || !requiredPlans.includes(subscription.planType)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient plan access',
          message: `This feature requires one of the following plans: ${requiredPlans.join(', ')}`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Plan check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify plan access',
      });
    }
  };
};

/**
 * Middleware for API key authentication
 */
export const authenticateApiKey = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: 'API key required',
      });
      return;
    }

    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey, isActive: true },
      include: {
        user: {
          include: {
            subscriptions: {
              where: { status: { in: ['ACTIVE', 'TRIALING'] } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!keyRecord) {
      res.status(401).json({
        success: false,
        error: 'Invalid API key',
      });
      return;
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsed: new Date() },
    });

    req.user = keyRecord.user;
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

// Extend the Request interface to include subscription
declare global {
  namespace Express {
    interface Request {
      subscription?: any;
    }
  }
}