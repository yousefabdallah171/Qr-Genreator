import { PlanType, Subscription, User } from '@prisma/client';
import { prisma } from '../config/database';
import { SubscriptionInfo, UsageLimits, PlanLimits } from '../types';

export class SubscriptionService {
  // Plan limits configuration
  static readonly PLAN_LIMITS: PlanLimits = {
    TRIAL: {
      qrCodesPerMonth: 100,
      dynamicQrCodes: 10,
      apiCallsPerMonth: 1000,
      logoUploads: true,
      analytics: 'basic',
      exportFormats: ['png', 'jpg', 'svg', 'pdf'],
      watermark: false,
    },
    FREE: {
      qrCodesPerMonth: 10,
      dynamicQrCodes: 0,
      apiCallsPerMonth: 0,
      logoUploads: false,
      analytics: 'none',
      exportFormats: ['png'],
      watermark: true,
    },
    PRO: {
      qrCodesPerMonth: -1, // unlimited
      dynamicQrCodes: 50,
      apiCallsPerMonth: 10000,
      logoUploads: true,
      analytics: 'advanced',
      exportFormats: ['png', 'jpg', 'svg', 'pdf'],
      watermark: false,
    },
    BUSINESS: {
      qrCodesPerMonth: -1, // unlimited
      dynamicQrCodes: 200,
      apiCallsPerMonth: 50000,
      logoUploads: true,
      analytics: 'advanced',
      exportFormats: ['png', 'jpg', 'svg', 'pdf'],
      watermark: false,
    },
    ENTERPRISE: {
      qrCodesPerMonth: -1, // unlimited
      dynamicQrCodes: -1, // unlimited
      apiCallsPerMonth: -1, // unlimited
      logoUploads: true,
      analytics: 'advanced',
      exportFormats: ['png', 'jpg', 'svg', 'pdf'],
      watermark: false,
    },
  };

  /**
   * Start a 2-week trial for a new user
   */
  static async startTrial(userId: string): Promise<Subscription> {
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days

    return prisma.subscription.create({
      data: {
        userId,
        planType: 'TRIAL',
        status: 'TRIALING',
        trialStart,
        trialEnd,
      },
    });
  }

  /**
   * Get user's current subscription info
   */
  static async getSubscriptionInfo(userId: string): Promise<SubscriptionInfo | null> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return null;
    }

    let trialDaysLeft = 0;
    let isTrialActive = false;

    if (subscription.planType === 'TRIAL' && subscription.trialEnd) {
      const now = new Date();
      const timeDiff = subscription.trialEnd.getTime() - now.getTime();
      trialDaysLeft = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
      isTrialActive = trialDaysLeft > 0;

      // Auto-expire trial if time is up
      if (trialDaysLeft === 0 && subscription.status === 'TRIALING') {
        await this.expireTrial(subscription.id);
      }
    }

    return {
      planType: subscription.planType,
      status: subscription.status,
      trialDaysLeft,
      isTrialActive,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  /**
   * Get plan limits for a user
   */
  static async getPlanLimits(userId: string): Promise<UsageLimits> {
    const subscriptionInfo = await this.getSubscriptionInfo(userId);
    
    if (!subscriptionInfo) {
      return this.PLAN_LIMITS.FREE;
    }

    return this.PLAN_LIMITS[subscriptionInfo.planType] || this.PLAN_LIMITS.FREE;
  }

  /**
   * Check if user can perform an action based on their plan limits
   */
  static async canPerformAction(
    userId: string,
    action: 'qr_generated' | 'api_call' | 'dynamic_qr' | 'logo_upload'
  ): Promise<{ allowed: boolean; reason?: string; upgradeRequired?: boolean }> {
    const limits = await this.getPlanLimits(userId);
    const subscriptionInfo = await this.getSubscriptionInfo(userId);

    // Check trial expiration
    if (subscriptionInfo?.planType === 'TRIAL' && !subscriptionInfo.isTrialActive) {
      return {
        allowed: false,
        reason: 'Trial has expired',
        upgradeRequired: true,
      };
    }

    switch (action) {
      case 'logo_upload':
        if (!limits.logoUploads) {
          return {
            allowed: false,
            reason: 'Logo uploads not available in your plan',
            upgradeRequired: true,
          };
        }
        break;

      case 'qr_generated':
        if (limits.qrCodesPerMonth !== -1) {
          const currentUsage = await this.getCurrentMonthlyUsage(userId, 'QR_GENERATED');
          if (currentUsage >= limits.qrCodesPerMonth) {
            return {
              allowed: false,
              reason: 'Monthly QR code limit reached',
              upgradeRequired: true,
            };
          }
        }
        break;

      case 'api_call':
        if (limits.apiCallsPerMonth === 0) {
          return {
            allowed: false,
            reason: 'API access not available in your plan',
            upgradeRequired: true,
          };
        }
        if (limits.apiCallsPerMonth !== -1) {
          const currentUsage = await this.getCurrentMonthlyUsage(userId, 'API_CALL');
          if (currentUsage >= limits.apiCallsPerMonth) {
            return {
              allowed: false,
              reason: 'Monthly API call limit reached',
              upgradeRequired: true,
            };
          }
        }
        break;

      case 'dynamic_qr':
        if (limits.dynamicQrCodes === 0) {
          return {
            allowed: false,
            reason: 'Dynamic QR codes not available in your plan',
            upgradeRequired: true,
          };
        }
        if (limits.dynamicQrCodes !== -1) {
          const currentDynamicQrs = await prisma.qrCode.count({
            where: {
              userId,
              isDynamic: true,
              isActive: true,
            },
          });
          if (currentDynamicQrs >= limits.dynamicQrCodes) {
            return {
              allowed: false,
              reason: 'Dynamic QR code limit reached',
              upgradeRequired: true,
            };
          }
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Get current monthly usage for a specific action
   */
  static async getCurrentMonthlyUsage(userId: string, actionType: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usage = await prisma.usageTracking.aggregate({
      where: {
        userId,
        actionType: actionType as any,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        count: true,
      },
    });

    return usage._sum.count || 0;
  }

  /**
   * Track usage for billing and limits
   */
  static async trackUsage(userId: string, actionType: string, count: number = 1): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.usageTracking.upsert({
      where: {
        userId_actionType_date: {
          userId,
          actionType: actionType as any,
          date: today,
        },
      },
      update: {
        count: {
          increment: count,
        },
      },
      create: {
        userId,
        actionType: actionType as any,
        count,
        date: today,
      },
    });
  }

  /**
   * Expire a trial subscription
   */
  static async expireTrial(subscriptionId: string): Promise<void> {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'EXPIRED' },
    });

    // Create a free plan subscription
    const expiredSub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (expiredSub) {
      await prisma.subscription.create({
        data: {
          userId: expiredSub.userId,
          planType: 'FREE',
          status: 'ACTIVE',
        },
      });
    }
  }

  /**
   * Upgrade subscription
   */
  static async upgradeSubscription(
    userId: string,
    newPlanType: PlanType,
    stripeSubscriptionId?: string,
    stripeCustomerId?: string
  ): Promise<Subscription> {
    // Deactivate current subscription
    await prisma.subscription.updateMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
      },
      data: { status: 'CANCELED' },
    });

    // Create new subscription
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    return prisma.subscription.create({
      data: {
        userId,
        planType: newPlanType,
        status: 'ACTIVE',
        stripeSubscriptionId,
        stripeCustomerId,
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
      },
    });
  }

  /**
   * Check for expired trials and auto-downgrade them
   */
  static async processExpiredTrials(): Promise<void> {
    const now = new Date();
    
    const expiredTrials = await prisma.subscription.findMany({
      where: {
        planType: 'TRIAL',
        status: 'TRIALING',
        trialEnd: {
          lt: now,
        },
      },
    });

    for (const trial of expiredTrials) {
      await this.expireTrial(trial.id);
    }
  }

  /**
   * Get subscription analytics for admin
   */
  static async getSubscriptionAnalytics() {
    const [totalUsers, activeTrials, paidSubscriptions, trialConversions] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({
        where: {
          planType: 'TRIAL',
          status: 'TRIALING',
        },
      }),
      prisma.subscription.count({
        where: {
          planType: { in: ['PRO', 'BUSINESS', 'ENTERPRISE'] },
          status: 'ACTIVE',
        },
      }),
      prisma.subscription.count({
        where: {
          planType: { in: ['PRO', 'BUSINESS', 'ENTERPRISE'] },
          status: 'ACTIVE',
          // Users who previously had a trial
          userId: {
            in: await prisma.subscription
              .findMany({
                where: { planType: 'TRIAL' },
                select: { userId: true },
              })
              .then(subs => subs.map(s => s.userId)),
          },
        },
      }),
    ]);

    const conversionRate = activeTrials > 0 ? (trialConversions / activeTrials) * 100 : 0;

    return {
      totalUsers,
      activeTrials,
      paidSubscriptions,
      trialConversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }
}