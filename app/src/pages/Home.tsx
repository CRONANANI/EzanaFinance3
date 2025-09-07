
import React from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="pt-6 pb-16">
          <nav className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-600">
              Ezana Finance
            </div>
            <div className="space-x-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6">
            Take Control of Your
            <span className="block text-blue-600">Financial Future</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Manage your money with confidence. Track expenses, set budgets, and achieve your financial goals with our comprehensive finance management platform.
          </p>
          
          {!isAuthenticated && (
            <div className="space-x-4">
              <Link
                to="/register"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md text-lg font-medium transition-colors"
              >
                Start Free Today
              </Link>
              <Link
                to="/login"
                className="inline-block border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-3 rounded-md text-lg font-medium transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Track Expenses</h3>
              <p className="text-gray-600">
                Monitor your spending across multiple accounts and categories to understand where your money goes.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Budget Planning</h3>
              <p className="text-gray-600">
                Set realistic budgets and get alerts when you're approaching your limits.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Financial Reports</h3>
              <p className="text-gray-600">
                Get detailed insights with comprehensive reports and visualizations of your financial data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home