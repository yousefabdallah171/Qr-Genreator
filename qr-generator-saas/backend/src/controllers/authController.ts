import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthUtils } from '../utils/auth';
import { SubscriptionService } from '../services/subscriptionService';
import { RegisterRequest, LoginRequest, ApiResponse, AuthenticatedRequest } from '../types';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request<{}, ApiResponse, RegisterRequest>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate input
      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
        return;
      }

      // Validate password strength
      const passwordValidation = AuthUtils.validatePassword(password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Password does not meet requirements',
          errors: passwordValidation.errors,
        });
        return;
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User already exists with this email',
        });
        return;
      }

      // Hash password
      const passwordHash = await AuthUtils.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
        },
      });

      // Start 2-week trial
      await SubscriptionService.startTrial(user.id);

      // Generate email verification token
      const { token, expiresAt } = AuthUtils.generateEmailVerificationToken();
      await prisma.emailVerifyToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      // Generate JWT token
      const authToken = AuthUtils.generateToken({
        userId: user.id,
        email: user.email,
      });

      // TODO: Send verification email (implement email service)
      console.log(`Verification token for ${email}: ${token}`);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified,
          },
          token: authToken,
          trialStarted: true,
        },
        message: 'User registered successfully. Please check your email for verification.',
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register user',
      });
    }
  }

  /**
   * Login user
   */
  static async login(req: Request<{}, ApiResponse, LoginRequest>, res: Response<ApiResponse>): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
        return;
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
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
          error: 'Invalid email or password',
        });
        return;
      }

      // Verify password
      const isPasswordValid = await AuthUtils.comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Generate JWT token
      const token = AuthUtils.generateToken({
        userId: user.id,
        email: user.email,
      });

      // Get subscription info
      const subscriptionInfo = await SubscriptionService.getSubscriptionInfo(user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified,
          },
          token,
          subscription: subscriptionInfo,
        },
        message: 'Login successful',
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to login',
      });
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Verification token is required',
        });
        return;
      }

      // Find verification token
      const verifyToken = await prisma.emailVerifyToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!verifyToken) {
        res.status(400).json({
          success: false,
          error: 'Invalid verification token',
        });
        return;
      }

      // Check if token is expired
      if (new Date() > verifyToken.expiresAt) {
        res.status(400).json({
          success: false,
          error: 'Verification token has expired',
        });
        return;
      }

      // Update user as verified
      await prisma.user.update({
        where: { id: verifyToken.userId },
        data: { emailVerified: true },
      });

      // Delete verification token
      await prisma.emailVerifyToken.delete({
        where: { id: verifyToken.id },
      });

      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify email',
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const subscriptionInfo = await SubscriptionService.getSubscriptionInfo(req.user.id);
      const planLimits = await SubscriptionService.getPlanLimits(req.user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            emailVerified: req.user.emailVerified,
          },
          subscription: subscriptionInfo,
          planLimits,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile',
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const { firstName, lastName } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          firstName,
          lastName,
        },
      });

      res.json({
        success: true,
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            emailVerified: updatedUser.emailVerified,
          },
        },
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
      });
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required',
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        res.json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
        });
        return;
      }

      // Generate reset token
      const { token, expiresAt } = AuthUtils.generatePasswordResetToken();
      
      // Delete any existing reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Create new reset token
      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      // TODO: Send password reset email
      console.log(`Password reset token for ${email}: ${token}`);

      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process password reset request',
      });
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!token || !password) {
        res.status(400).json({
          success: false,
          error: 'Token and new password are required',
        });
        return;
      }

      // Validate password strength
      const passwordValidation = AuthUtils.validatePassword(password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Password does not meet requirements',
          errors: passwordValidation.errors,
        });
        return;
      }

      // Find reset token
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!resetToken) {
        res.status(400).json({
          success: false,
          error: 'Invalid reset token',
        });
        return;
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        res.status(400).json({
          success: false,
          error: 'Reset token has expired',
        });
        return;
      }

      // Hash new password
      const passwordHash = await AuthUtils.hashPassword(password);

      // Update user password
      await prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });

      // Delete reset token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password',
      });
    }
  }
}