# QR Code Generator Pro - SaaS Platform

A complete SaaS platform for generating professional QR codes with analytics, custom styling, and subscription management. Built with Next.js, Node.js, PostgreSQL, and includes a 2-week free trial system.

## 🚀 Features

### Core QR Generation
- **Multiple QR Types**: URL, Text, Email, Phone, SMS, WiFi, vCard, Location, Social Media, Reviews
- **Custom Styling**: 7+ visual styles (square, rounded, circle, diamond, dotted, gradient, neon, minimal)
- **Logo Integration**: Upload and embed custom logos in QR codes
- **Industry Templates**: Pre-configured templates for different business types
- **Multiple Export Formats**: PNG, JPG, SVG, PDF downloads

### SaaS Features
- **2-Week Free Trial**: Full access to all features for 14 days
- **Subscription Management**: Multiple pricing tiers with Stripe integration
- **Usage Tracking**: Monitor QR generation, API calls, and feature usage
- **User Authentication**: JWT-based auth with email verification
- **Analytics Dashboard**: Track QR scans, locations, devices, and performance

### Advanced Features
- **Dynamic QR Codes**: Update content without regenerating QR codes
- **Bulk Generation**: Create multiple QR codes from CSV uploads
- **API Access**: RESTful API for developers
- **Team Collaboration**: Multi-user accounts for businesses
- **Admin Panel**: User management and platform analytics

## 🏗️ Architecture

```
qr-generator-saas/
├── frontend/          # Next.js React application
├── backend/           # Node.js Express API
├── database/          # PostgreSQL with Prisma ORM
├── docker/            # Docker configurations
└── docs/              # API documentation
```

### Tech Stack

**Frontend:**
- Next.js 14 with TypeScript
- Tailwind CSS for styling
- React Query for state management
- Framer Motion for animations

**Backend:**
- Node.js with Express.js
- TypeScript
- PostgreSQL with Prisma ORM
- JWT authentication
- Stripe for payments
- Canvas for QR generation

**Infrastructure:**
- Docker & Docker Compose
- Redis for caching
- AWS S3 for file storage
- Vercel/Railway for deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd qr-generator-saas
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

3. **Environment Setup**

Create `.env` files in both backend and frontend directories:

**Backend (.env):**
```env
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/qr_generator_saas"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
PORT=3001
CORS_ORIGIN="http://localhost:3000"

# Stripe (get from Stripe dashboard)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (SendGrid)
SENDGRID_API_KEY="SG..."
FROM_EMAIL="noreply@yourdomain.com"

# AWS S3 (optional)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="qr-generator-uploads"
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

4. **Database Setup**

Using Docker (recommended):
```bash
docker-compose up -d postgres redis
```

Or install PostgreSQL and Redis locally, then:
```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

5. **Start Development Servers**

```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:backend    # Backend on http://localhost:3001
npm run dev:frontend   # Frontend on http://localhost:3000
```

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 Database Schema

The application uses PostgreSQL with the following main tables:

- **users**: User accounts and profiles
- **subscriptions**: Trial and paid subscription management
- **qr_codes**: Generated QR codes and metadata
- **qr_scans**: Analytics data for QR code scans
- **usage_tracking**: Feature usage tracking for billing
- **api_keys**: API access keys for developers

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration with trial start
- `POST /api/auth/login` - User login
- `GET /api/auth/verify-email/:token` - Email verification
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### QR Code Generation
- `POST /api/qr/generate` - Generate QR code
- `GET /api/qr/my-codes` - Get user's QR codes
- `GET /api/qr/:id/analytics` - Get QR code analytics
- `GET /api/qr/:id/download/:format` - Download QR code

### Subscriptions
- `GET /api/subscription/info` - Get subscription details
- `POST /api/subscription/upgrade` - Upgrade subscription
- `POST /api/subscription/cancel` - Cancel subscription

## 💳 Subscription Plans

### Free Trial (14 days)
- 100 QR codes during trial
- All QR types and styles
- Logo uploads
- All export formats
- Basic analytics
- No watermarks

### Pro ($9.99/month)
- Unlimited QR codes
- All features from trial
- Advanced analytics
- Email support

### Business ($29.99/month)
- Everything in Pro
- Dynamic QR codes
- Bulk generation
- API access (50K calls/month)
- Team collaboration
- Priority support

### Enterprise ($99.99/month)
- Everything in Business
- White-label solution
- Unlimited API calls
- Custom integrations
- Dedicated support

## 🔧 Configuration

### Environment Variables

**Backend Configuration:**
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT token signing
- `STRIPE_SECRET_KEY`: Stripe secret key
- `SENDGRID_API_KEY`: SendGrid API key for emails

**Frontend Configuration:**
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key

### Feature Flags

Control features through environment variables:
- `ENABLE_STRIPE_PAYMENTS`: Enable/disable Stripe integration
- `ENABLE_EMAIL_VERIFICATION`: Require email verification
- `ENABLE_API_ACCESS`: Enable API key generation

## 🚀 Deployment

### Production Deployment

1. **Build the application**
```bash
npm run build
```

2. **Deploy with Docker**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. **Deploy to Cloud Platforms**

**Vercel (Frontend):**
```bash
cd frontend
vercel --prod
```

**Railway (Backend):**
```bash
cd backend
railway up
```

**AWS/DigitalOcean (Full Stack):**
- Use provided Docker configurations
- Set up PostgreSQL and Redis instances
- Configure environment variables
- Set up SSL certificates

### Environment-Specific Configurations

**Development:**
- Local PostgreSQL and Redis
- Hot reloading enabled
- Debug logging
- CORS enabled for localhost

**Production:**
- Managed database services
- Redis clustering
- CDN for static assets
- Rate limiting enabled
- Security headers

## 📈 Monitoring & Analytics

### Application Metrics
- User registration and conversion rates
- QR code generation volume
- API usage and rate limiting
- Subscription lifecycle events

### Performance Monitoring
- Database query performance
- API response times
- Error rates and logging
- Resource utilization

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- API key authentication for developers
- Rate limiting per user/IP

### Data Protection
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Infrastructure Security
- HTTPS everywhere
- CORS configuration
- Security headers
- Regular dependency updates

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

## 📚 Documentation

- [API Documentation](./docs/api.md)
- [Database Schema](./docs/database.md)
- [Deployment Guide](./docs/deployment.md)
- [Contributing Guide](./docs/contributing.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@qrgeneratorpro.com
- 💬 Discord: [Join our community](https://discord.gg/qrgeneratorpro)
- 📖 Documentation: [docs.qrgeneratorpro.com](https://docs.qrgeneratorpro.com)
- 🐛 Issues: [GitHub Issues](https://github.com/qrgeneratorpro/issues)

## 🙏 Acknowledgments

- QR Code generation powered by [qrcode](https://github.com/soldair/node-qrcode)
- Canvas rendering with [node-canvas](https://github.com/Automattic/node-canvas)
- UI components from [Headless UI](https://headlessui.dev/)
- Icons from [Heroicons](https://heroicons.com/)

---

**QR Generator Pro** - Professional QR codes with analytics and customization.
Built with ❤️ for businesses worldwide.