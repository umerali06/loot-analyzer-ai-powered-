'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Camera, 
  BarChart3, 
  TrendingUp, 
  Shield, 
  Zap, 
  Users, 
  CheckCircle,
  ArrowRight,
  Star,
  Clock,
  Target
} from 'lucide-react'

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const features = [
    {
      icon: <Camera className="h-8 w-8 text-slate-600" />,
      title: "AI-Powered Recognition",
      description: "Advanced computer vision identifies items and extracts features with 94% accuracy"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-slate-600" />,
      title: "Market Intelligence",
      description: "Real-time eBay data and market trend analysis for informed decisions"
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-slate-600" />,
      title: "Profit Optimization",
      description: "Smart pricing recommendations and profit potential analysis"
    },
    {
      icon: <Shield className="h-8 w-8 text-slate-600" />,
      title: "Secure & Private",
      description: "Enterprise-grade security with end-to-end encryption"
    }
  ]

  const stats = [
    { number: "10,000+", label: "Analyses Completed" },
    { number: "94%", label: "Accuracy Rate" },
    { number: "$2.5M+", label: "Value Analyzed" },
    { number: "500+", label: "Active Users" }
  ]

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Professional Reseller",
      content: "SIBI has transformed how I evaluate lots. The AI insights are incredibly accurate and save me hours of research.",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "Antique Dealer",
      content: "The market analysis feature is game-changing. I've increased my profit margins by 35% since using SIBI.",
      rating: 5
    },
    {
      name: "Emma Thompson",
      role: "Estate Sale Specialist",
      content: "Professional, reliable, and incredibly insightful. SIBI is now an essential part of my business toolkit.",
      rating: 5
    }
  ]

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="h-16 w-16 bg-slate-200 rounded-2xl animate-pulse mx-auto mb-4"></div>
            <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-medium mb-8">
              <Star className="h-4 w-4 mr-2 text-amber-500" />
              Trusted by 500+ professional resellers
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Should I Buy It?
              <span className="block text-4xl md:text-5xl font-normal text-slate-600 mt-2">
                Let AI Decide
              </span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              Upload images of your lot items and get comprehensive AI analysis with market insights, 
              pricing recommendations, and profit potential analysis in minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link
                  href="/analyze"
                  className="inline-flex items-center px-8 py-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Start Analyzing
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth"
                    className="inline-flex items-center px-8 py-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Get Started Free
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                  <Link
                    href="/auth"
                    className="inline-flex items-center px-8 py-4 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">{stat.number}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Professional Tools for Smart Decisions
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Our AI-powered platform combines advanced computer vision, real-time market data, 
              and intelligent analytics to give you the insights you need.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200/60 hover:shadow-xl transition-all duration-300">
                <div className="h-16 w-16 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Get professional-grade analysis in three simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-20 w-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Upload Images</h3>
              <p className="text-slate-600">Take photos of your lot items or upload existing images</p>
            </div>
            
            <div className="text-center">
              <div className="h-20 w-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">AI Analysis</h3>
              <p className="text-slate-600">Our AI identifies items and gathers market data</p>
            </div>
            
            <div className="text-center">
              <div className="h-20 w-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Get Insights</h3>
              <p className="text-slate-600">Receive comprehensive analysis and recommendations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Trusted by Professionals
            </h2>
            <p className="text-xl text-slate-600">
              See what resellers and dealers are saying about SIBI
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200/60">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-amber-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold text-slate-900">{testimonial.name}</div>
                  <div className="text-sm text-slate-600">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Make Smarter Decisions?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join hundreds of professional resellers who trust SIBI for their lot analysis needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link
                href="/analyze"
                className="inline-flex items-center px-8 py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-all duration-200 transform hover:scale-105"
              >
                Start Analyzing
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center px-8 py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-all duration-200 transform hover:scale-105"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center mr-3">
                  <span className="text-slate-900 font-bold text-lg">🔍</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">SIBI</h3>
                  <p className="text-sm text-slate-400">Should I Buy It</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                AI-powered lot analyzer for professional resellers and dealers.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/analyze" className="hover:text-white transition-colors">Analyze</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link href="/history" className="hover:text-white transition-colors">History</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 SIBI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

