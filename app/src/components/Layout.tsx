import React from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Accounts', href: '/accounts', icon: '🏦' },
    { name: 'Transactions', href: '/transactions', icon: '💰' },
    { name: 'Budgets', href: '/budgets', icon: '📈' },
    { name: 'Reports', href: '/reports', icon: '📋' },
  ];

  const isActive = (path: string) => location.pathname === path;

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="text-2xl font-bold text-blue-600">
                Ezana Finance
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user?.first_name || user?.username}
              </span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen border-r border-gray-200">
          <div className="p-4">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
