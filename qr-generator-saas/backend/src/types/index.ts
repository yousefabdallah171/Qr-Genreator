import { Request } from 'express';
import { User, PlanType, SubscriptionStatus, QrType } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface QrCodeCreateRequest {
  title?: string;
  content: string;
  qrType: QrType;
  industryTemplate?: string;
  styleConfig?: any;
  isDynamic?: boolean;
}

export interface QrCodeUpdateRequest {
  title?: string;
  content?: string;
  styleConfig?: any;
  isActive?: boolean;
}

export interface SubscriptionInfo {
  planType: PlanType;
  status: SubscriptionStatus;
  trialDaysLeft?: number;
  isTrialActive: boolean;
  currentPeriodEnd?: Date;
}

export interface UsageLimits {
  qrCodesPerMonth: number;
  dynamicQrCodes: number;
  apiCallsPerMonth: number;
  logoUploads: boolean;
  analytics: 'none' | 'basic' | 'advanced';
  exportFormats: string[];
  watermark: boolean;
}

export interface PlanLimits {
  [key: string]: UsageLimits;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QrAnalytics {
  totalScans: number;
  scansToday: number;
  scansThisWeek: number;
  scansThisMonth: number;
  topCountries: Array<{ country: string; count: number }>;
  deviceTypes: Array<{ type: string; count: number }>;
  scansByDate: Array<{ date: string; count: number }>;
}