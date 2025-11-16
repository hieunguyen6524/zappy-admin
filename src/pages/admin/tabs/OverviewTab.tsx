import React from 'react';
import { Users, UserCheck, MessagesSquare, MessageSquare } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { CallStatsSection } from '../components/CallStatsSection';
import type { SystemStats } from '../types';

interface OverviewTabProps {
  stats: SystemStats;
  isDarkMode: boolean;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  isDarkMode
}) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        icon={<Users className="w-6 h-6" />}
        title="Tổng người dùng"
        value={stats.total_users.toLocaleString()}
        change="+12%"
        trend="up"
        isDarkMode={isDarkMode}
      />
      <StatCard
        icon={<UserCheck className="w-6 h-6" />}
        title="Người dùng hoạt động"
        value={stats.active_users.toLocaleString()}
        change="+8%"
        trend="up"
        isDarkMode={isDarkMode}
      />
      <StatCard
        icon={<MessagesSquare className="w-6 h-6" />}
        title="Tổng cuộc trò chuyện"
        value={stats.total_conversations.toLocaleString()}
        change="+15%"
        trend="up"
        isDarkMode={isDarkMode}
      />
      <StatCard
        icon={<MessageSquare className="w-6 h-6" />}
        title="Tổng tin nhắn"
        value={stats.total_messages.toLocaleString()}
        change="+23%"
        trend="up"
        isDarkMode={isDarkMode}
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        className={`${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-lg p-6 shadow-lg border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <h3
          className={`text-lg font-semibold mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          Hoạt động gần đây
        </h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-full ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                } flex items-center justify-center`}
              >
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Người dùng mới đăng ký
                </p>
                <p
                  className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {i} phút trước
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-lg p-6 shadow-lg border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <h3
          className={`text-lg font-semibold mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          Thống kê cuộc gọi
        </h3>
        <CallStatsSection isDarkMode={isDarkMode} />
      </div>
    </div>
  </div>
);
