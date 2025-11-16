import React from 'react';
import { TrendingUp } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  isDarkMode: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  value,
  change,
  trend,
  isDarkMode
}) => (
  <div
    className={`${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    } rounded-lg p-6 shadow-lg border ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    }`}
  >
    <div className="flex items-center justify-between mb-4">
      <div
        className={`p-3 rounded-lg ${
          isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
        }`}
      >
        <div className="text-blue-500">{icon}</div>
      </div>
      {change && (
        <div
          className={`flex items-center text-sm ${
            trend === 'up' ? 'text-green-500' : 'text-red-500'
          }`}
        >
          <TrendingUp className="w-4 h-4 mr-1" />
          {change}
        </div>
      )}
    </div>
    <h3
      className={`text-sm font-medium ${
        isDarkMode ? 'text-gray-400' : 'text-gray-600'
      }`}
    >
      {title}
    </h3>
    <p
      className={`text-2xl font-bold mt-1 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}
    >
      {value}
    </p>
  </div>
);

