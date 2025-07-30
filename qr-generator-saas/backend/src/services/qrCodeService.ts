import QRCode from 'qrcode';
import { createCanvas, loadImage, Canvas, CanvasRenderingContext2D } from 'canvas';
import sharp from 'sharp';
import { QrType } from '@prisma/client';
import { prisma } from '../config/database';
import { SubscriptionService } from './subscriptionService';

export interface QrStyleConfig {
  size: number;
  errorLevel: 'L' | 'M' | 'Q' | 'H';
  fgColor: string;
  bgColor: string;
  style: 'square' | 'rounded' | 'circle' | 'diamond' | 'dotted' | 'gradient' | 'neon' | 'minimal';
  logoStyle?: 'square' | 'rounded' | 'circle';
}

export interface QrContentData {
  qrType: QrType;
  content: string;
  industryTemplate?: string;
  // Email specific
  emailAddress?: string;
  emailSubject?: string;
  emailBody?: string;
  // Phone specific
  phoneNumber?: string;
  // SMS specific
  smsNumber?: string;
  smsMessage?: string;
  // WiFi specific
  wifiSsid?: string;
  wifiPassword?: string;
  wifiSecurity?: 'WPA' | 'WEP' | 'nopass';
  wifiHidden?: boolean;
  // vCard specific
  vcardData?: {
    firstName?: string;
    lastName?: string;
    organization?: string;
    phone?: string;
    email?: string;
    url?: string;
  };
  // Location specific
  latitude?: string;
  longitude?: string;
  // Social specific
  socialPlatform?: string;
  socialHandle?: string;
  // Review specific
  reviewUrl?: string;
}

export class QrCodeService {
  /**
   * Generate QR code content based on type and data
   */
  static generateQrContent(data: QrContentData): string {
    switch (data.qrType) {
      case 'EMAIL':
        let emailContent = `mailto:${data.emailAddress || ''}`;
        const params = [];
        if (data.emailSubject) params.push(`subject=${encodeURIComponent(data.emailSubject)}`);
        if (data.emailBody) params.push(`body=${encodeURIComponent(data.emailBody)}`);
        if (params.length > 0) emailContent += `?${params.join('&')}`;
        return emailContent;

      case 'PHONE':
        return `tel:${data.phoneNumber || ''}`;

      case 'SMS':
        return `sms:${data.smsNumber || ''}${data.smsMessage ? `?body=${encodeURIComponent(data.smsMessage)}` : ''}`;

      case 'WIFI':
        const security = data.wifiSecurity || 'WPA';
        const hidden = data.wifiHidden ? 'true' : 'false';
        return `WIFI:T:${security};S:${data.wifiSsid || ''};P:${data.wifiPassword || ''};H:${hidden};;`;

      case 'VCARD':
        const vcard = data.vcardData || {};
        return [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${vcard.firstName || ''} ${vcard.lastName || ''}`.trim(),
          vcard.organization ? `ORG:${vcard.organization}` : '',
          vcard.phone ? `TEL:${vcard.phone}` : '',
          vcard.email ? `EMAIL:${vcard.email}` : '',
          vcard.url ? `URL:${vcard.url}` : '',
          'END:VCARD'
        ].filter(line => line && !line.endsWith(':')).join('\n');

      case 'LOCATION':
        return `geo:${data.latitude || 0},${data.longitude || 0}`;

      case 'SOCIAL':
        const socialUrls = {
          twitter: 'https://twitter.com/',
          instagram: 'https://instagram.com/',
          facebook: 'https://facebook.com/',
          linkedin: 'https://linkedin.com/in/',
          youtube: 'https://youtube.com/@',
          tiktok: 'https://tiktok.com/@',
          github: 'https://github.com/',
        };
        const platform = data.socialPlatform || 'twitter';
        const handle = (data.socialHandle || '').replace('@', '');
        return (socialUrls as any)[platform] + handle;

      case 'REVIEW':
        return data.reviewUrl || '';

      case 'TEXT':
        return data.content;

      case 'URL':
      default:
        return data.content;
    }
  }

  /**
   * Generate QR code with custom styling
   */
  static async generateStyledQrCode(
    content: string,
    styleConfig: QrStyleConfig,
    logoBuffer?: Buffer
  ): Promise<Buffer> {
    const { size, errorLevel, fgColor, bgColor, style } = styleConfig;

    // Create canvas
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Generate QR code data
    const qrData = await QRCode.create(content, {
      errorCorrectionLevel: errorLevel,
      margin: 1,
    });

    const modules = qrData.modules;
    const moduleCount = modules.size;
    const cellSize = size / moduleCount;

    // Clear canvas with background color
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // Reserve space for logo
    const logoAreaSize = logoBuffer ? size * 0.25 : 0;
    const logoAreaStart = (size - logoAreaSize) / 2;
    const logoAreaEnd = logoAreaStart + logoAreaSize;

    // Draw QR modules with styling
    ctx.fillStyle = fgColor;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules.get(col, row)) {
          const x = col * cellSize;
          const y = row * cellSize;

          // Skip logo area
          if (logoBuffer && x >= logoAreaStart && x <= logoAreaEnd && 
              y >= logoAreaStart && y <= logoAreaEnd) {
            continue;
          }

          this.drawStyledModule(ctx, x, y, cellSize, style, fgColor);
        }
      }
    }

    // Add logo if provided
    if (logoBuffer) {
      await this.addLogoToCanvas(ctx, logoBuffer, size, styleConfig.logoStyle);
    }

    return canvas.toBuffer('image/png');
  }

  /**
   * Draw styled QR module
   */
  private static drawStyledModule(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    style: string,
    color: string
  ): void {
    ctx.fillStyle = color;

    switch (style) {
      case 'rounded':
        this.drawRoundedRect(ctx, x, y, size, size, size * 0.2);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size/2 * 0.85, 0, 2 * Math.PI);
        ctx.fill();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(x + size/2, y);
        ctx.lineTo(x + size, y + size/2);
        ctx.lineTo(x + size/2, y + size);
        ctx.lineTo(x, y + size/2);
        ctx.closePath();
        ctx.fill();
        break;
      case 'dotted':
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size/3, 0, 2 * Math.PI);
        ctx.fill();
        break;
      case 'gradient':
        const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, this.adjustBrightness(color, -20));
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        break;
      case 'neon':
        ctx.shadowColor = color;
        ctx.shadowBlur = size / 3;
        ctx.fillRect(x + size * 0.2, y + size * 0.2, size * 0.6, size * 0.6);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        break;
      case 'minimal':
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.8, size * 0.8);
        ctx.globalAlpha = 1;
        break;
      default:
        ctx.fillRect(x, y, size, size);
    }
  }

  /**
   * Draw rounded rectangle
   */
  private static drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Add logo to canvas
   */
  private static async addLogoToCanvas(
    ctx: CanvasRenderingContext2D,
    logoBuffer: Buffer,
    canvasSize: number,
    logoStyle: string = 'square'
  ): Promise<void> {
    try {
      const logo = await loadImage(logoBuffer);
      const logoSize = canvasSize * 0.2;
      const logoX = (canvasSize - logoSize) / 2;
      const logoY = (canvasSize - logoSize) / 2;

      // Create background for logo
      ctx.fillStyle = '#ffffff';
      const bgPadding = logoSize * 0.1;
      
      if (logoStyle === 'circle') {
        ctx.beginPath();
        ctx.arc(logoX + logoSize/2, logoY + logoSize/2, logoSize/2 + bgPadding, 0, 2 * Math.PI);
        ctx.fill();
      } else if (logoStyle === 'rounded') {
        this.drawRoundedRect(ctx, logoX - bgPadding, logoY - bgPadding, 
                           logoSize + bgPadding * 2, logoSize + bgPadding * 2, bgPadding);
      } else {
        ctx.fillRect(logoX - bgPadding, logoY - bgPadding, 
                    logoSize + bgPadding * 2, logoSize + bgPadding * 2);
      }

      // Draw logo
      if (logoStyle === 'circle') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 0, 2 * Math.PI);
        ctx.clip();
      }

      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
      
      if (logoStyle === 'circle') {
        ctx.restore();
      }
    } catch (error) {
      console.error('Error adding logo to QR code:', error);
    }
  }

  /**
   * Adjust color brightness
   */
  private static adjustBrightness(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Convert QR code to different formats
   */
  static async convertToFormat(
    qrBuffer: Buffer,
    format: 'png' | 'jpg' | 'svg' | 'pdf',
    addWatermark: boolean = false
  ): Promise<Buffer> {
    let processedBuffer = qrBuffer;

    // Add watermark if required
    if (addWatermark) {
      processedBuffer = await this.addWatermark(qrBuffer);
    }

    switch (format) {
      case 'jpg':
        return sharp(processedBuffer)
          .jpeg({ quality: 90 })
          .toBuffer();
      
      case 'png':
        return sharp(processedBuffer)
          .png({ quality: 90 })
          .toBuffer();
      
      case 'svg':
        // For SVG, we'd need to recreate the QR code as SVG
        // For now, return PNG (in production, implement proper SVG generation)
        return processedBuffer;
      
      case 'pdf':
        // For PDF, we'd use a PDF library like PDFKit
        // For now, return PNG (in production, implement proper PDF generation)
        return processedBuffer;
      
      default:
        return processedBuffer;
    }
  }

  /**
   * Add watermark to QR code
   */
  private static async addWatermark(qrBuffer: Buffer): Promise<Buffer> {
    try {
      const watermarkText = 'QR Generator Pro';
      const image = sharp(qrBuffer);
      const { width, height } = await image.metadata();

      // Create watermark overlay
      const watermarkSvg = `
        <svg width="${width}" height="${height}">
          <text x="${width! - 10}" y="${height! - 10}" 
                font-family="Arial" font-size="12" 
                fill="rgba(0,0,0,0.5)" text-anchor="end">
            ${watermarkText}
          </text>
        </svg>
      `;

      return image
        .composite([{
          input: Buffer.from(watermarkSvg),
          gravity: 'southeast'
        }])
        .toBuffer();
    } catch (error) {
      console.error('Error adding watermark:', error);
      return qrBuffer;
    }
  }

  /**
   * Create QR code record in database
   */
  static async createQrCode(
    userId: string,
    contentData: QrContentData,
    styleConfig: QrStyleConfig,
    title?: string,
    logoBuffer?: Buffer
  ): Promise<{ id: string; qrBuffer: Buffer }> {
    // Check if user can generate QR codes
    const canGenerate = await SubscriptionService.canPerformAction(userId, 'qr_generated');
    if (!canGenerate.allowed) {
      throw new Error(canGenerate.reason || 'Cannot generate QR code');
    }

    // Generate QR content
    const content = this.generateQrContent(contentData);

    // Generate QR code
    const qrBuffer = await this.generateStyledQrCode(content, styleConfig, logoBuffer);

    // Save to database
    const qrCode = await prisma.qrCode.create({
      data: {
        userId,
        title,
        content,
        qrType: contentData.qrType,
        industryTemplate: contentData.industryTemplate,
        styleConfig: styleConfig as any,
        isDynamic: false, // Static by default
      },
    });

    // Track usage
    await SubscriptionService.trackUsage(userId, 'QR_GENERATED');

    return {
      id: qrCode.id,
      qrBuffer,
    };
  }

  /**
   * Get user's QR codes with pagination
   */
  static async getUserQrCodes(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const [qrCodes, total] = await Promise.all([
      prisma.qrCode.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          scans: {
            select: { id: true },
          },
        },
      }),
      prisma.qrCode.count({
        where: { userId, isActive: true },
      }),
    ]);

    return {
      data: qrCodes.map(qr => ({
        ...qr,
        scanCount: qr.scans.length,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get QR code analytics
   */
  static async getQrCodeAnalytics(qrCodeId: string, userId: string) {
    // Verify ownership
    const qrCode = await prisma.qrCode.findFirst({
      where: { id: qrCodeId, userId },
    });

    if (!qrCode) {
      throw new Error('QR code not found');
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalScans, scansToday, scansThisWeek, scansThisMonth, topCountries, deviceTypes] = await Promise.all([
      prisma.qrScan.count({ where: { qrCodeId } }),
      prisma.qrScan.count({ where: { qrCodeId, scannedAt: { gte: todayStart } } }),
      prisma.qrScan.count({ where: { qrCodeId, scannedAt: { gte: weekStart } } }),
      prisma.qrScan.count({ where: { qrCodeId, scannedAt: { gte: monthStart } } }),
      prisma.qrScan.groupBy({
        by: ['country'],
        where: { qrCodeId, country: { not: null } },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 5,
      }),
      prisma.qrScan.groupBy({
        by: ['deviceType'],
        where: { qrCodeId, deviceType: { not: null } },
        _count: { deviceType: true },
        orderBy: { _count: { deviceType: 'desc' } },
      }),
    ]);

    return {
      totalScans,
      scansToday,
      scansThisWeek,
      scansThisMonth,
      topCountries: topCountries.map(item => ({
        country: item.country!,
        count: item._count.country,
      })),
      deviceTypes: deviceTypes.map(item => ({
        type: item.deviceType!,
        count: item._count.deviceType,
      })),
    };
  }
}