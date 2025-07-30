import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  QrCodeIcon, 
  SparklesIcon, 
  ChartBarIcon, 
  CloudArrowDownIcon,
  CheckIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import QRGenerator from '../components/qr/QRGenerator';
import { useAuth } from '../components/auth/AuthProvider';

const features = [
  {
    name: 'Multiple QR Types',
    description: 'Generate QR codes for URLs, text, email, phone, WiFi, vCard, and more.',
    icon: QrCodeIcon,
  },
  {
    name: 'Custom Styling',
    description: 'Choose from 7 different styles and customize colors to match your brand.',
    icon: SparklesIcon,
  },
  {
    name: 'Analytics & Tracking',
    description: 'Track scans, locations, devices, and get detailed analytics.',
    icon: ChartBarIcon,
  },
  {
    name: 'Multiple Formats',
    description: 'Download in PNG, JPG, SVG, and PDF formats for any use case.',
    icon: CloudArrowDownIcon,
  },
];

const pricingPlans = [
  {
    name: 'Free Trial',
    price: '$0',
    period: '14 days',
    description: 'Perfect for trying out all features',
    features: [
      '100 QR codes during trial',
      'All QR types and styles',
      'Logo uploads',
      'All export formats',
      'Basic analytics',
      'No watermarks',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: 'month',
    description: 'For individuals and small businesses',
    features: [
      'Unlimited QR codes',
      'All QR types and styles',
      'Logo uploads',
      'All export formats',
      'Advanced analytics',
      'No watermarks',
      'Email support',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Business',
    price: '$29.99',
    period: 'month',
    description: 'For growing businesses',
    features: [
      'Everything in Pro',
      'Dynamic QR codes',
      'Bulk generation',
      'API access (50K calls)',
      'Team collaboration (5 users)',
      'Priority support',
    ],
    cta: 'Get Started',
    popular: false,
  },
];

export default function Home() {
  const { user } = useAuth();
  const [showGenerator, setShowGenerator] = useState(false);

  return (
    <>
      <Head>
        <title>QR Code Generator Pro - Professional QR Codes with Analytics</title>
        <meta name="description" content="Create professional QR codes with custom logos, analytics, and multiple export formats. Start your 14-day free trial today." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        {/* Navigation */}
        <nav className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <QrCodeIcon className="h-8 w-8 text-white" />
                <span className="ml-2 text-xl font-bold text-white">QR Generator Pro</span>
              </div>
              <div className="flex items-center space-x-4">
                {user ? (
                  <Link href="/dashboard" className="btn btn-primary">
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="text-white hover:text-gray-300">
                      Sign In
                    </Link>
                    <Link href="/register" className="btn btn-primary">
                      Start Free Trial
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-pattern opacity-10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-4xl md:text-6xl font-bold text-white mb-6"
              >
                Professional QR Codes
                <span className="block text-gradient">with Analytics</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto"
              >
                Create stunning QR codes with custom logos, track performance with detailed analytics, 
                and export in multiple formats. Start your 14-day free trial today.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                {!user ? (
                  <>
                    <Link href="/register" className="btn btn-primary btn-lg shadow-glow">
                      Start Free Trial
                      <ArrowRightIcon className="ml-2 h-5 w-5" />
                    </Link>
                    <button 
                      onClick={() => setShowGenerator(true)}
                      className="btn btn-secondary btn-lg text-white border-white/30 hover:bg-white/10"
                    >
                      Try Generator
                    </button>
                  </>
                ) : (
                  <Link href="/dashboard" className="btn btn-primary btn-lg shadow-glow">
                    Go to Dashboard
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </Link>
                )}
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.6 }}
                className="mt-12 text-sm text-gray-400"
              >
                ✨ No credit card required • 14-day free trial • Cancel anytime
              </motion.div>
            </div>
          </div>
        </section>

        {/* QR Generator Section */}
        {showGenerator && (
          <section className="py-20 bg-black/20 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">Try Our QR Generator</h2>
                <p className="text-gray-300">
                  Experience the power of our QR generator. Sign up for full access to all features.
                </p>
              </div>
              <QRGenerator isDemo={!user} />
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="py-20 bg-white/5 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">Powerful Features</h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Everything you need to create, customize, and track professional QR codes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="bg-primary-600/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.name}</h3>
                  <p className="text-gray-300">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Start with a free trial and scale as you grow
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`relative bg-white/10 backdrop-blur-sm rounded-2xl p-8 border ${
                    plan.popular 
                      ? 'border-primary-500 shadow-glow' 
                      : 'border-white/20'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="mb-2">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-gray-300">/{plan.period}</span>
                    </div>
                    <p className="text-gray-300">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center text-gray-300">
                        <CheckIcon className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link 
                    href={plan.name === 'Free Trial' ? '/register' : '/register'}
                    className={`btn w-full ${
                      plan.popular ? 'btn-primary' : 'btn-secondary text-white border-white/30 hover:bg-white/10'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-primary">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Create Professional QR Codes?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of businesses using QR Generator Pro to create, track, and optimize their QR campaigns.
            </p>
            <Link href="/register" className="btn btn-lg bg-white text-primary-600 hover:bg-gray-100">
              Start Your Free Trial
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black/20 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center mb-4">
                  <QrCodeIcon className="h-8 w-8 text-white" />
                  <span className="ml-2 text-xl font-bold text-white">QR Generator Pro</span>
                </div>
                <p className="text-gray-400">
                  Professional QR code generation with analytics and customization.
                </p>
              </div>
              
              <div>
                <h3 className="text-white font-semibold mb-4">Product</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/features" className="hover:text-white">Features</Link></li>
                  <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                  <li><Link href="/api" className="hover:text-white">API</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-white font-semibold mb-4">Support</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                  <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                  <li><Link href="/status" className="hover:text-white">Status</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-white font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                  <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 QR Generator Pro. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}