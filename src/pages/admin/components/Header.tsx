import React from 'react';
import { Search, Bell, Moon, Sun, ChevronDown } from 'lucide-react';
import { logout } from '@/services/auth';
import type { AuthUser } from '@/services/auth';

interface HeaderProps {
  isDarkMode: boolean;
  user: AuthUser | null;
  onToggleDarkMode: () => void;
  onLogout: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  user,
  onToggleDarkMode,
  onLogout,
}) => {
  return (
    <div
      className={`${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      } border-b sticky top-0 z-10`}
    >
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-lg ${
              isDarkMode
                ? 'bg-gray-700 text-yellow-500'
                : 'bg-gray-100 text-gray-700'
            } hover:opacity-80 transition-opacity`}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            className={`relative p-2 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            } hover:opacity-80 transition-opacity`}
          >
            <Bell
              className={`w-5 h-5 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-full ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
              } flex items-center justify-center`}
            >
              <span className="text-sm font-medium text-blue-500">A</span>
            </div>
            <div className="hidden md:block">
              <p
                className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                {user?.fullName || user?.email}
              </p>
              <p
                className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {user?.roles?.join(', ')}
              </p>
            </div>
            <ChevronDown
              className={`w-4 h-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            />
          </div>
          <button
            onClick={onLogout}
            className={`px-3 py-2 rounded-lg ${
              isDarkMode
                ? 'bg-gray-700 text-gray-200'
                : 'bg-gray-100 text-gray-800'
            } hover:opacity-80`}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

