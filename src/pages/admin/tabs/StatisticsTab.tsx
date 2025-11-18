/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  BarChart as ReBarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/services/supabase';
import type { StatTagType } from '../types';

interface StatisticsTabProps {
  isDarkMode: boolean;
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({ isDarkMode }) => {
  const [activeTag, setActiveTag] = useState<StatTagType>('posts');
  const [loading, setLoading] = useState(false);
  const [statsData, setStatsData] = useState<{
    [key: string]: { name: string; value: number }[];
  }>({});

  const COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
  ];

  const getChartType = (
    tag: StatTagType
  ): 'bar' | 'line' | 'area' | 'pie' => {
    switch (tag) {
      case 'posts':
        return 'bar';
      case 'groups':
        return 'area';
      case 'messages':
        return 'line';
      case 'users':
        return 'bar';
      case 'user_reports':
        return 'pie';
      case 'group_reports':
        return 'area';
      case 'message_reports':
        return 'bar';
      default:
        return 'bar';
    }
  };

  const renderChart = (
    data: { name: string; value: number }[],
    title: string,
    chartType: 'bar' | 'line' | 'area' | 'pie'
  ) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <p
            className={`text-center ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Không có dữ liệu
          </p>
        </div>
      );
    }

    const chartData = data.map((item) => ({
      name: item.name,
      value: item.value,
      'Số lượng': item.value,
    }));

    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const gridColor = isDarkMode ? '#374151' : '#e5e7eb';

    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        return (
          <div
            className={`p-3 rounded-lg shadow-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <p
              className={`font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-900'
              }`}
            >
              {payload[0].payload.name}
            </p>
            <p
              className={`text-sm ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}
            >
              Số lượng: {payload[0].value}
            </p>
          </div>
        );
      }
      return null;
    };

    if (chartType === 'pie') {
      return (
        <div className="w-full p-6">
          <h3
            className={`text-lg font-semibold mb-6 text-center ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {title}
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                }
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: textColor }}
                formatter={(value) => (
                  <span style={{ color: textColor }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="w-full p-6">
        <h3
          className={`text-lg font-semibold mb-6 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          {title}
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'bar' ? (
            <ReBarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="name"
                stroke={textColor}
                tick={{ fill: textColor }}
              />
              <YAxis stroke={textColor} tick={{ fill: textColor }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: textColor }}
                formatter={(value) => (
                  <span style={{ color: textColor }}>{value}</span>
                )}
              />
              <Bar
                dataKey="value"
                fill={COLORS[0]}
                radius={[8, 8, 0, 0]}
                name="Số lượng"
              />
            </ReBarChart>
          ) : chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="name"
                stroke={textColor}
                tick={{ fill: textColor }}
              />
              <YAxis stroke={textColor} tick={{ fill: textColor }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: textColor }}
                formatter={(value) => (
                  <span style={{ color: textColor }}>{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={COLORS[1]}
                strokeWidth={3}
                dot={{ fill: COLORS[1], r: 6 }}
                activeDot={{ r: 8 }}
                name="Số lượng"
              />
            </LineChart>
          ) : (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS[2]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="name"
                stroke={textColor}
                tick={{ fill: textColor }}
              />
              <YAxis stroke={textColor} tick={{ fill: textColor }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: textColor }}
                formatter={(value) => (
                  <span style={{ color: textColor }}>{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={COLORS[2]}
                fillOpacity={1}
                fill="url(#colorValue)"
                strokeWidth={3}
                name="Số lượng"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  };

  const loadStatistics = async (tag: StatTagType) => {
    setLoading(true);
    try {
      let data: { name: string; value: number }[] = [];

      const generateMonths = () => {
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push({
            label: date.toLocaleDateString('vi-VN', {
              month: 'short',
              year: 'numeric',
            }),
            start: date.toISOString(),
            end:
              i === 0
                ? new Date(
                    now.getFullYear(),
                    now.getMonth() + 1,
                    0
                  ).toISOString()
                : new Date(
                    date.getFullYear(),
                    date.getMonth() + 1,
                    0
                  ).toISOString(),
          });
        }
        return months;
      };

      switch (tag) {
        case 'posts': {
          const months = generateMonths();
          const counts = await Promise.all(
            months.map(async (month) => {
              const { count } = await supabase
                .from('posts')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', month.start)
                .lte('created_at', month.end);
              return { name: month.label, value: count || 0 };
            })
          );
          data = counts;
          break;
        }

        case 'groups': {
          const months = generateMonths();
          const counts = await Promise.all(
            months.map(async (month) => {
              const { count } = await supabase
                .from('conversations')
                .select('*', { count: 'exact', head: true })
                .eq('type', 'group')
                .gte('created_at', month.start)
                .lte('created_at', month.end);
              return { name: month.label, value: count || 0 };
            })
          );
          data = counts;
          break;
        }

        case 'messages': {
          const months = generateMonths();
          const counts = await Promise.all(
            months.map(async (month) => {
              const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', month.start)
                .lte('created_at', month.end);
              return { name: month.label, value: count || 0 };
            })
          );
          data = counts;
          break;
        }

        case 'users': {
          const months = generateMonths();
          const counts = await Promise.all(
            months.map(async (month) => {
              const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', month.start)
                .lte('created_at', month.end);
              return { name: month.label, value: count || 0 };
            })
          );
          data = counts;
          break;
        }

        case 'user_reports': {
          const months = generateMonths();
          const counts = await Promise.all(
            months.map(async (month) => {
              const { count } = await supabase
                .from('user_reports')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', month.start)
                .lte('created_at', month.end);
              return { name: month.label, value: count || 0 };
            })
          );
          data = counts;
          break;
        }

        case 'group_reports': {
          const months = generateMonths();
          const counts = await Promise.all(
            months.map(async (month) => {
              const { data: reports } = await supabase
                .from('message_reports')
                .select('message_id')
                .gte('created_at', month.start)
                .lte('created_at', month.end);

              if (!reports || reports.length === 0) {
                return { name: month.label, value: 0 };
              }

              const messageIds = [
                ...new Set(reports.map((r) => r.message_id)),
              ];
              const { data: messages } = await supabase
                .from('messages')
                .select('conversation_id')
                .in('id', messageIds);

              if (!messages || messages.length === 0) {
                return { name: month.label, value: 0 };
              }

              const conversationIds = [
                ...new Set(messages.map((m) => m.conversation_id)),
              ];
              const { count } = await supabase
                .from('conversations')
                .select('*', { count: 'exact', head: true })
                .eq('type', 'group')
                .in('id', conversationIds);

              return { name: month.label, value: count || 0 };
            })
          );
          data = counts;
          break;
        }

        case 'message_reports': {
          const months = generateMonths();
          const counts = await Promise.all(
            months.map(async (month) => {
              const { count } = await supabase
                .from('message_reports')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', month.start)
                .lte('created_at', month.end);
              return { name: month.label, value: count || 0 };
            })
          );
          data = counts;
          break;
        }
      }

      setStatsData((prev) => ({ ...prev, [tag]: data }));
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics(activeTag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTag]);

  const tagLabels: { [key in StatTagType]: string } = {
    posts: 'Bài Post',
    groups: 'Nhóm',
    messages: 'Message',
    users: 'User',
    user_reports: 'Report User',
    group_reports: 'Report Nhóm',
    message_reports: 'Report Message',
  };

  const currentData = statsData[activeTag] || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2
          className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          Thống kê hệ thống
        </h2>
      </div>

      <div
        className={`${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-lg p-4 shadow-lg border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <div className="flex flex-wrap gap-2">
          {(Object.keys(tagLabels) as StatTagType[]).map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                activeTag === tag
                  ? 'bg-blue-600 text-white'
                  : isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tagLabels[tag]}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-lg shadow-lg border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <span
              className={`ml-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Đang tải dữ liệu...
            </span>
          </div>
        ) : (
          renderChart(
            currentData,
            `Biểu đồ thống kê ${tagLabels[activeTag]}`,
            getChartType(activeTag)
          )
        )}
      </div>
    </div>
  );
};

