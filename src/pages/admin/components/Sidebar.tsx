import React from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  Database,
  Settings,
  Shield,
  BarChart3,
} from 'lucide-react';
import type { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  isDarkMode: boolean;
  onTabChange: (tab: TabType) => void;
}

const menuItems = [
  { id: 'overview' as TabType, icon: LayoutDashboard, label: 'Tổng quan' },
  { id: 'users' as TabType, icon: Users, label: 'Người dùng' },
  { id: 'conversations' as TabType, icon: MessageSquare, label: 'Cuộc trò chuyện' },
  { id: 'posts' as TabType, icon: FileText, label: 'Bài đăng' },
  { id: 'reports' as TabType, icon: Shield, label: 'Báo cáo' },
  { id: 'statistics' as TabType, icon: BarChart3, label: 'Thống kê' },
  { id: 'backup' as TabType, icon: Database, label: 'Sao lưu' },
  { id: 'settings' as TabType, icon: Settings, label: 'Cài đặt' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  isDarkMode,
  onTabChange,
}) => {
  return (
    <div
      className={`fixed left-0 top-0 h-full w-64 ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      } border-r z-10`}
    >
      <div className="p-6">
        <h1
          className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          Admin Panel
        </h1>
        <p
          className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          } mt-1`}
        >
          Chat App Management
        </p>
      </div>

      <nav className="px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white'
                  : isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

