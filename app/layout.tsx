import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from './components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Poco.ai - Smart Health Insurance Comparison',
  description: 'AI-powered Australian health insurance comparison platform. Get personalized recommendations with complete privacy protection.',
  keywords: ['health insurance', 'Australia', 'AI comparison', 'privacy-first'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground font-sans antialiased transition-colors">
        <ThemeProvider>
          {/* Header */}
          <header className="bg-background border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Logo */}
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">P</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-foreground">Poco.ai</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">Smart Insurance Comparison</p>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="hidden md:flex items-center space-x-8">
                  <a href="#how-it-works" className="text-sm text-gray-600 dark:text-gray-300 hover:text-brand-primary transition-colors">
                    How it Works
                  </a>
                  <a href="#privacy" className="text-sm text-gray-600 dark:text-gray-300 hover:text-brand-primary transition-colors">
                    Privacy
                  </a>
                  <a href="#about" className="text-sm text-gray-600 dark:text-gray-300 hover:text-brand-primary transition-colors">
                    About
                  </a>
                </nav>

                {/* Trust Indicators */}
                <div className="flex items-center space-x-4">
                  <div className="hidden sm:flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <div className="status-dot bg-success-500 mr-2 animate-pulse-slow"></div>
                    <span>Privacy Compliant</span>
                  </div>
                  <div className="hidden md:flex items-center text-xs text-gray-500 dark:text-gray-400">
                    🛡️ Bank-Level Security
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-gray-900 dark:bg-gray-950 text-gray-300 py-12 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">P</span>
                    </div>
                    <span className="text-lg font-bold text-white">Poco.ai</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-4 max-w-md">
                    Privacy-first health insurance comparison powered by AI. 
                    Making complex policy decisions simple and transparent.
                  </p>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-gray-500">🇦🇺 Australian Privacy Act Compliant</span>
                    <span className="text-xs text-gray-500">🔒 Zero-Knowledge Architecture</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Privacy</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li><a href="#" className="hover:text-white transition-colors">How We Protect You</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Data Handling</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Your Rights</a></li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Support</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                    <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                  </ul>
                </div>
              </div>
              
              <div className="border-t border-gray-800 pt-8 mt-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <p className="text-xs text-gray-500">
                    © 2025 Poco.ai. All rights reserved. Made with ❤️ for Australian consumers.
                  </p>
                  <div className="flex items-center space-x-6 mt-4 md:mt-0">
                    <a href="#" className="text-xs text-gray-500 hover:text-white transition-colors">Terms</a>
                    <a href="#" className="text-xs text-gray-500 hover:text-white transition-colors">Privacy Policy</a>
                    <a href="#" className="text-xs text-gray-500 hover:text-white transition-colors">Cookies</a>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}