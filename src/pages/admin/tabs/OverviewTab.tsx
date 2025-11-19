import React, { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  MessagesSquare,
  MessageSquare,
  FileText,
  AlertTriangle,
  RefreshCw,
  Phone,
  Video,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { CallStatsSection } from "../components/CallStatsSection";
import { supabase } from "@/services/supabase";
import { formatDate } from "../utils";
import type { SystemStats } from "../types";

interface OverviewTabProps {
  stats: SystemStats;
  isDarkMode: boolean;
  onRefresh?: () => void;
}

interface RecentActivity {
  type: "user" | "post";
  id: string;
  title: string;
  time: string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  isDarkMode,
  onRefresh,
}) => {
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadRecentActivities = async () => {
      try {
        setLoading(true);
        // Get recent users
        const { data: recentUsers } = await supabase
          .from("profiles")
          .select("id, username, display_name, created_at")
          .or("is_deleted.is.null,is_deleted.eq.false")
          .order("created_at", { ascending: false })
          .limit(5);

        // Get recent posts
        const { data: recentPosts } = await supabase
          .from("posts")
          .select("id, content, created_at, author_id")
          .or("is_deleted.is.null,is_deleted.eq.false")
          .order("created_at", { ascending: false })
          .limit(5);

        // Combine and sort by created_at
        const activities: RecentActivity[] = [];

        if (recentUsers) {
          recentUsers.forEach((user) => {
            activities.push({
              type: "user",
              id: user.id,
              title: `Người dùng mới: ${user.display_name || user.username}`,
              time: user.created_at,
            });
          });
        }

        if (recentPosts) {
          recentPosts.forEach((post) => {
            activities.push({
              type: "post",
              id: post.id,
              title: `Bài đăng mới: ${
                post.content?.substring(0, 50) || "Không có nội dung"
              }...`,
              time: post.created_at,
            });
          });
        }

        // Sort by time and take top 5
        activities.sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        setRecentActivities(activities.slice(0, 5));
      } catch (e) {
        console.error("Error loading recent activities:", e);
      } finally {
        setLoading(false);
      }
    };

    loadRecentActivities();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Reload recent activities
      const loadRecentActivities = async () => {
        try {
          setLoading(true);
          // Get recent users
          const { data: recentUsers } = await supabase
            .from("profiles")
            .select("id, username, display_name, created_at")
            .or("is_deleted.is.null,is_deleted.eq.false")
            .order("created_at", { ascending: false })
            .limit(5);

          // Get recent posts
          const { data: recentPosts } = await supabase
            .from("posts")
            .select("id, content, created_at, author_id")
            .or("is_deleted.is.null,is_deleted.eq.false")
            .order("created_at", { ascending: false })
            .limit(5);

          // Combine and sort by created_at
          const activities: RecentActivity[] = [];

          if (recentUsers) {
            recentUsers.forEach((user) => {
              activities.push({
                type: "user",
                id: user.id,
                title: `Người dùng mới: ${user.display_name || user.username}`,
                time: user.created_at,
              });
            });
          }

          if (recentPosts) {
            recentPosts.forEach((post) => {
              activities.push({
                type: "post",
                id: post.id,
                title: `Bài đăng mới: ${
                  post.content?.substring(0, 50) || "Không có nội dung"
                }...`,
                time: post.created_at,
              });
            });
          }

          // Sort by time and take top 5
          activities.sort(
            (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
          );
          setRecentActivities(activities.slice(0, 5));
        } catch (e) {
          console.error("Error loading recent activities:", e);
        } finally {
          setLoading(false);
        }
      };

      await Promise.all([
        loadRecentActivities(),
        onRefresh ? onRefresh() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <h2
          className={`text-2xl font-bold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Tổng quan hệ thống
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing || loading ? "animate-spin" : ""}`}
          />
          <span>{refreshing || loading ? "Đang tải..." : "Làm mới"}</span>
        </button>
      </div>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          title="Tổng người dùng"
          value={stats.total_users.toLocaleString()}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<UserCheck className="w-5 h-5" />}
          title="Người dùng hoạt động"
          value={stats.active_users.toLocaleString()}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<MessagesSquare className="w-5 h-5" />}
          title="Cuộc trò chuyện"
          value={stats.total_conversations.toLocaleString()}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          title="Tin nhắn"
          value={stats.total_messages.toLocaleString()}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          title="Bài đăng"
          value={(stats.total_posts || 0).toLocaleString()}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Báo cáo chờ xử lý"
          value={(stats.pending_reports || 0).toLocaleString()}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Additional Stats and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-xl p-6 shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          } lg:col-span-2`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3
              className={`text-lg font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Hoạt động gần đây
            </h3>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? "hover:bg-gray-700 text-gray-400"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title="Làm mới"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  refreshing || loading ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Đang tải...
                </p>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Chưa có hoạt động nào
                </p>
              </div>
            ) : (
              recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    isDarkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      activity.type === "user"
                        ? "bg-blue-500/20"
                        : "bg-green-500/20"
                    }`}
                  >
                    {activity.type === "user" ? (
                      <Users
                        className={`w-6 h-6 ${
                          activity.type === "user"
                            ? "text-blue-500"
                            : "text-green-500"
                        }`}
                      />
                    ) : (
                      <FileText className="w-6 h-6 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {activity.title}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {formatDate(activity.time)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Call Stats */}
        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-xl p-6 shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <h3
            className={`text-lg font-semibold mb-6 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Thống kê cuộc gọi
          </h3>
          <CallStatsSection isDarkMode={isDarkMode} />
        </div>
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-xl p-6 shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div
              className={`p-3 rounded-lg ${
                isDarkMode ? "bg-blue-500/20" : "bg-blue-100"
              }`}
            >
              <Phone className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h4
                className={`text-sm font-medium ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Tổng cuộc gọi
              </h4>
              <p
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {stats.total_calls.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-xl p-6 shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div
              className={`p-3 rounded-lg ${
                isDarkMode ? "bg-purple-500/20" : "bg-purple-100"
              }`}
            >
              <Video className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h4
                className={`text-sm font-medium ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Lưu trữ
              </h4>
              <p
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {stats.storage_used}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
