/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  Database,
  Settings,
  Shield,
  TrendingUp,
  UserCheck,
  MessagesSquare,
  Search,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Trash2,
  Ban,
  CheckCircle,
  Phone,
  Video,
  Clock,
  Download,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/services/auth";
import { supabase } from "@/services/supabase";

type TabType =
  | "overview"
  | "users"
  | "conversations"
  | "posts"
  | "backup"
  | "reports"
  | "settings";

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  status: "online" | "offline";
  created_at: string;
  is_disabled: boolean;
  last_seen_at: string | null;
}

interface Conversation {
  id: string;
  type: "direct" | "group";
  title: string | null;
  photo_url: string;
  created_at: string;
  participants_count: number;
  messages_count: number;
  last_message_at: string;
}

interface Post {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_reported: boolean;
}

interface SystemStats {
  total_users: number;
  active_users: number;
  total_conversations: number;
  total_messages: number;
  total_calls: number;
  storage_used: string;
}

const AdminDashboard: React.FC = () => {
  const { user, reload } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [usersSearchQuery, setUsersSearchQuery] = useState("");

  // Remove mock data - now using real data from Supabase

  // Stats state - will be loaded from Supabase
  const [stats, setStats] = useState<SystemStats>({
    total_users: 0,
    active_users: 0,
    total_conversations: 0,
    total_messages: 0,
    total_calls: 0,
    storage_used: "0 GB",
  });

  const loadStats = async () => {
    try {
      // Count users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Count active users (online)
      const { count: activeUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "online");

      // Count conversations
      const { count: totalConvs } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true });

      // Count messages
      const { count: totalMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true });

      // Count calls (if you have a calls table)
      // const { count: totalCalls } = await supabase
      //   .from("calls")
      //   .select("*", { count: "exact", head: true });

      setStats({
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        total_conversations: totalConvs || 0,
        total_messages: totalMessages || 0,
        total_calls: 0, // Update when you have calls table
        storage_used: "N/A", // Would need storage calculation
      });
    } catch (e) {
      console.error("Error loading stats:", e);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const StatCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: string | number;
    change?: string;
    trend?: "up" | "down";
  }> = ({ icon, title, value, change, trend }) => (
    <div
      className={`${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } rounded-lg p-6 shadow-lg border ${
        isDarkMode ? "border-gray-700" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`p-3 rounded-lg ${
            isDarkMode ? "bg-blue-900/30" : "bg-blue-100"
          }`}
        >
          <div className="text-blue-500">{icon}</div>
        </div>
        {change && (
          <div
            className={`flex items-center text-sm ${
              trend === "up" ? "text-green-500" : "text-red-500"
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            {change}
          </div>
        )}
      </div>
      <h3
        className={`text-sm font-medium ${
          isDarkMode ? "text-gray-400" : "text-gray-600"
        }`}
      >
        {title}
      </h3>
      <p
        className={`text-2xl font-bold mt-1 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );

  const OverviewTab: React.FC = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Tổng người dùng"
          value={stats.total_users.toLocaleString()}
          change="+12%"
          trend="up"
        />
        <StatCard
          icon={<UserCheck className="w-6 h-6" />}
          title="Người dùng hoạt động"
          value={stats.active_users.toLocaleString()}
          change="+8%"
          trend="up"
        />
        <StatCard
          icon={<MessagesSquare className="w-6 h-6" />}
          title="Tổng cuộc trò chuyện"
          value={stats.total_conversations.toLocaleString()}
          change="+15%"
          trend="up"
        />
        <StatCard
          icon={<MessageSquare className="w-6 h-6" />}
          title="Tổng tin nhắn"
          value={stats.total_messages.toLocaleString()}
          change="+23%"
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <h3
            className={`text-lg font-semibold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Hoạt động gần đây
          </h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-full ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-200"
                  } flex items-center justify-center`}
                >
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Người dùng mới đăng ký
                  </p>
                  <p
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
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
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <h3
            className={`text-lg font-semibold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Thống kê cuộc gọi
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Phone className="w-5 h-5 text-green-500" />
                <span
                  className={`text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Cuộc gọi thoại
                </span>
              </div>
              <span
                className={`font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                2,145
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Video className="w-5 h-5 text-blue-500" />
                <span
                  className={`text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Cuộc gọi video
                </span>
              </div>
              <span
                className={`font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                1,311
              </span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-700">
              <span
                className={`text-sm font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Tổng cộng
              </span>
              <span
                className={`font-bold text-lg ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {stats.total_calls.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const UsersTab: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        let query = supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (usersSearchQuery) {
          query = query.or(
            `username.ilike.%${usersSearchQuery}%,display_name.ilike.%${usersSearchQuery}%`
          );
        }

        const { data, error: err } = await query.limit(100);

        if (err) throw err;
        setUsers(
          (data || []).map((u: any) => ({
            id: u.id,
            username: u.username,
            display_name: u.display_name,
            avatar_url: u.avatar_url
              ? `https://mpfrdrchsngwmfeelwua.supabase.co/${u.avatar_url}`
              : "",
            status: u.status,
            created_at: u.created_at,
            is_disabled: u.is_disabled || false,
            last_seen_at: u.last_seen_at,
          }))
        );
      } catch (e) {
        const err = e as Error;
        setError(err.message || "Không tải được danh sách người dùng");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    const handleDisableUser = async (
      userId: string,
      currentStatus: boolean
    ) => {
      if (
        !confirm(
          `Bạn có chắc muốn ${
            currentStatus ? "mở khóa" : "khóa"
          } người dùng này?`
        )
      )
        return;
      try {
        const { error: err } = await supabase
          .from("profiles")
          .update({ is_disabled: !currentStatus })
          .eq("id", userId);
        if (err) throw err;
        await loadUsers();
      } catch (e) {
        const err = e as Error;
        alert(err.message || "Thao tác thất bại");
      }
    };

    const handleDeleteUser = async (userId: string) => {
      if (
        !confirm(
          "Bạn có chắc muốn xóa người dùng này? Hành động này không thể hoàn tác."
        )
      )
        return;
      try {
        const { error: err } = await supabase
          .from("profiles")
          .delete()
          .eq("id", userId);
        if (err) throw err;
        await loadUsers();
      } catch (e) {
        const err = e as Error;
        alert(err.message || "Xóa thất bại");
      }
    };

    useEffect(() => {
      loadUsers();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usersSearchQuery]);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2
            className={`text-2xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Quản lý người dùng
          </h2>
          <div className="flex space-x-3">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Đang tải..." : "Làm mới"}
            </button>
          </div>
        </div>

        {error && (
          <Alert>
            <AlertDescription className="text-red-500">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-lg shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="p-6">
            <div className="relative mb-4">
              <Search
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              />
              <input
                type="text"
                placeholder="Tìm kiếm người dùng..."
                value={usersSearchQuery}
                onChange={(e) => setUsersSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className={`border-b ${
                      isDarkMode ? "border-gray-700" : "border-gray-200"
                    }`}
                  >
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Người dùng
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Trạng thái
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Ngày tham gia
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Hoạt động cuối
                    </th>
                    <th
                      className={`px-4 py-3 text-right text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <p
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          Đang tải...
                        </p>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <p
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          Không tìm thấy người dùng nào
                        </p>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        className={`border-b ${
                          isDarkMode ? "border-gray-700" : "border-gray-200"
                        } hover:${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-3">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.display_name}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div
                                className={`w-10 h-10 rounded-full ${
                                  isDarkMode ? "bg-gray-700" : "bg-gray-300"
                                } flex items-center justify-center`}
                              >
                                <span className="text-sm font-medium text-blue-500">
                                  {user.display_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p
                                className={`font-medium ${
                                  isDarkMode ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {user.display_name}
                              </p>
                              <p
                                className={`text-sm ${
                                  isDarkMode ? "text-gray-400" : "text-gray-500"
                                }`}
                              >
                                @{user.username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                user.status === "online"
                                  ? "bg-green-500"
                                  : "bg-gray-500"
                              }`}
                            />
                            <span
                              className={`text-sm ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              } capitalize`}
                            >
                              {user.status === "online"
                                ? "Trực tuyến"
                                : "Ngoại tuyến"}
                            </span>
                            {user.is_disabled && (
                              <span className="px-2 py-1 text-xs bg-red-500/20 text-red-500 rounded">
                                Bị khóa
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className={`px-4 py-4 text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {formatDate(user.created_at)}
                        </td>
                        <td
                          className={`px-4 py-4 text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {user.last_seen_at
                            ? formatDate(user.last_seen_at)
                            : "Chưa xác định"}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end items-center space-x-2">
                            <button
                              onClick={() =>
                                handleDisableUser(user.id, user.is_disabled)
                              }
                              className={`p-2 rounded-lg transition-colors ${
                                user.is_disabled
                                  ? "hover:bg-green-500/20 text-green-500"
                                  : "hover:bg-yellow-500/20 text-yellow-500"
                              }`}
                              title={user.is_disabled ? "Mở khóa" : "Khóa"}
                            >
                              {user.is_disabled ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <Ban className="w-5 h-5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ConversationsTab: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadConversations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Lấy danh sách conversations
        const { data: convs, error: convErr } = await supabase
          .from("conversations")
          .select("*")
          .order("updated_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(100);

        if (convErr) throw convErr;

        // Lấy thông tin participants và messages cho từng conversation
        const conversationsWithCounts = await Promise.all(
          (convs || []).map(async (conv: any) => {
            // Đếm participants (chưa rời - left_at is null)
            const { count: participantsCount } = await supabase
              .from("conversation_participants")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conv.id)
              .is("left_at", null);

            // Đếm messages
            const { count: messagesCount } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conv.id);

            // Lấy last message để có last_message_at
            const { data: lastMessage } = await supabase
              .from("messages")
              .select("created_at")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              id: conv.id,
              type: conv.type,
              title: conv.title,
              photo_url: conv.photo_url
                ? `https://mpfrdrchsngwmfeelwua.supabase.co/storage/v1/object/public/chat-attachments/${conv.photo_url}`
                : "",
              created_at: conv.created_at,
              participants_count: participantsCount || 0,
              messages_count: messagesCount || 0,
              last_message_at:
                lastMessage?.created_at || conv.updated_at || conv.created_at,
            };
          })
        );

        setConversations(conversationsWithCounts);
      } catch (e) {
        const err = e as Error;
        setError(err.message || "Không tải được danh sách cuộc trò chuyện");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    const handleDeleteConversation = async (conversationId: string) => {
      if (
        !confirm(
          "Bạn có chắc muốn xóa cuộc trò chuyện này? Tất cả tin nhắn và dữ liệu liên quan sẽ bị xóa vĩnh viễn."
        )
      )
        return;
      try {
        // Xóa conversation sẽ cascade delete participants và messages (nếu có foreign key cascade)
        const { error: err } = await supabase
          .from("conversations")
          .delete()
          .eq("id", conversationId);
        if (err) throw err;
        await loadConversations();
      } catch (e) {
        const err = e as Error;
        alert(err.message || "Xóa thất bại");
      }
    };

    useEffect(() => {
      loadConversations();
    }, []);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2
            className={`text-2xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Quản lý cuộc trò chuyện
          </h2>
          <button
            onClick={loadConversations}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>

        {error && (
          <Alert>
            <AlertDescription className="text-red-500">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-lg shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className={`border-b ${
                      isDarkMode ? "border-gray-700" : "border-gray-200"
                    }`}
                  >
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Cuộc trò chuyện
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Loại
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Thành viên
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Tin nhắn
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Hoạt động cuối
                    </th>
                    <th
                      className={`px-4 py-3 text-right text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && conversations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <p
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          Đang tải...
                        </p>
                      </td>
                    </tr>
                  ) : conversations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <p
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          Không có cuộc trò chuyện nào
                        </p>
                      </td>
                    </tr>
                  ) : (
                    conversations.map((conv) => (
                      <tr
                        key={conv.id}
                        className={`border-b ${
                          isDarkMode ? "border-gray-700" : "border-gray-200"
                        } hover:${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-3">
                            {conv.photo_url ? (
                              <img
                                src={conv.photo_url}
                                alt={conv.title || "Conversation"}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div
                                className={`w-10 h-10 rounded-full ${
                                  isDarkMode ? "bg-gray-700" : "bg-gray-300"
                                } flex items-center justify-center`}
                              >
                                <MessagesSquare className="w-5 h-5 text-blue-500" />
                              </div>
                            )}
                            <div>
                              <p
                                className={`font-medium ${
                                  isDarkMode ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {conv.title || "Direct Message"}
                              </p>
                              <p
                                className={`text-sm ${
                                  isDarkMode ? "text-gray-400" : "text-gray-500"
                                }`}
                              >
                                ID: {conv.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
                              conv.type === "group"
                                ? "bg-purple-500/20 text-purple-500"
                                : "bg-blue-500/20 text-blue-500"
                            }`}
                          >
                            {conv.type === "group" ? "Nhóm" : "Riêng tư"}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-4 text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {conv.participants_count} người
                        </td>
                        <td
                          className={`px-4 py-4 text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {conv.messages_count.toLocaleString()}
                        </td>
                        <td
                          className={`px-4 py-4 text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {formatDate(conv.last_message_at)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleDeleteConversation(conv.id)}
                              className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PostsTab: React.FC = () => {
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<
      Array<{ id: string; display_name: string; username: string }>
    >([]);
    const [items, setItems] = useState<
      Array<{
        id: string;
        author_id: string;
        author_name: string;
        author_username: string;
        content: string;
        image_url: string | null;
        created_at: string;
        updated_at: string | null;
        comments_count: number;
        reactions_count: number;
      }>
    >([]);

    const loadUsers = async () => {
      try {
        const { data, error: err } = await supabase
          .from("profiles")
          .select("id, display_name, username")
          .limit(100);
        if (err) throw err;
        setUsers(
          (data || []) as Array<{
            id: string;
            display_name: string;
            username: string;
          }>
        );
      } catch (e) {
        console.error("Error loading users:", e);
      }
    };

    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Query posts đơn giản trước
        let query = supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (search) {
          query = query.ilike("content", `%${search}%`);
        }

        const { data: postsData, error: err } = await query;

        if (err) {
          console.error("Error loading posts:", err);
          throw err;
        }

        console.log("Posts data:", postsData);

        const rows = (postsData || []) as Array<any>;

        if (rows.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // Lấy danh sách author_ids unique
        const authorIds = [...new Set(rows.map((r) => r.author_id))];

        // Load tất cả authors một lần
        const { data: authorsData } = await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", authorIds);

        const authorsMap = new Map(
          (authorsData || []).map((a: any) => [a.id, a])
        );

        // Load counts cho từng post
        const withCounts = await Promise.all(
          rows.map(async (r) => {
            const author = authorsMap.get(r.author_id);

            const [{ count: commentsCount }, { count: reactionsCount }] =
              await Promise.all([
                supabase
                  .from("post_comments")
                  .select("*", { count: "exact", head: true })
                  .eq("post_id", r.id),
                supabase
                  .from("post_reactions")
                  .select("*", { count: "exact", head: true })
                  .eq("post_id", r.id),
              ]);

            return {
              id: r.id,
              author_id: r.author_id,
              author_name:
                author?.display_name ||
                author?.username ||
                r.author_id ||
                "Unknown",
              author_username: author?.username || "",
              content: r.content || "",
              image_url: r.image_url || null,
              created_at: r.created_at,
              updated_at: r.updated_at,
              comments_count: commentsCount || 0,
              reactions_count: reactionsCount || 0,
            };
          })
        );

        console.log("Processed posts:", withCounts);
        setItems(withCounts);
      } catch (e) {
        const err = e as Error;
        const errorMsg = err.message || "Không tải được bài đăng";
        setError(errorMsg);
        console.error("Load posts error:", e);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadUsers();
      loadPosts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handleDelete = async (postId: string) => {
      if (!confirm("Xóa bài đăng này?")) return;
      try {
        const { error: err } = await supabase
          .from("posts")
          .delete()
          .eq("id", postId);
        if (err) throw err;
        await loadPosts();
      } catch (e) {
        const err = e as Error;
        alert(err.message || "Xóa thất bại");
      }
    };

    const [newContent, setNewContent] = useState("");
    const [newAuthorId, setNewAuthorId] = useState("");
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
      if (!newAuthorId || !newContent.trim()) {
        alert("Nhập author_id và nội dung");
        return;
      }
      try {
        setCreating(true);
        const { error: err } = await supabase
          .from("posts")
          .insert({ author_id: newAuthorId, content: newContent.trim() });
        if (err) throw err;
        setNewAuthorId("");
        setNewContent("");
        await loadPosts();
      } catch (e) {
        const err = e as Error;
        alert(err.message || "Tạo bài đăng thất bại");
      } finally {
        setCreating(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2
            className={`text-2xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Quản lý bài đăng
          </h2>
          <button
            onClick={loadPosts}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Đang tải..." : "Làm mới"}</span>
          </button>
        </div>

        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <input
              placeholder="Tìm theo nội dung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <select
              value={newAuthorId}
              onChange={(e) => setNewAuthorId(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="">Chọn tác giả...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name || u.username} ({u.username})
                </option>
              ))}
            </select>
            <input
              placeholder="Nội dung bài đăng"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className={`px-4 py-2 rounded-lg border md:col-span-2 ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
          </div>
          <div className="mb-4">
            <button
              onClick={handleCreate}
              disabled={creating || !newAuthorId || !newContent.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Đang tạo..." : "Tạo bài đăng"}
            </button>
          </div>

          {error && (
            <Alert>
              <AlertDescription className="text-red-500">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {loading && items.length === 0 ? (
            <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Đang tải...
            </p>
          ) : items.length === 0 ? (
            <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Chưa có bài đăng
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {items.map((post) => (
                <div
                  key={post.id}
                  className={`${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  } rounded-lg p-6 shadow-lg border ${
                    isDarkMode ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-12 h-12 rounded-full ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-300"
                        } flex items-center justify-center`}
                      >
                        <span className="text-lg font-medium text-blue-500">
                          {(post.author_name || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {post.author_name}
                        </p>
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {formatDate(post.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                    {post.content}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-700 mt-4">
                    <div
                      className={isDarkMode ? "text-gray-400" : "text-gray-600"}
                    >
                      ❤️ {post.reactions_count} • 💬 {post.comments_count}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-500"
                        title="Xóa"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const BackupTab: React.FC = () => {
    const [backups, setBackups] = useState<
      Array<{ filename: string; size: number; createdAt: string }>
    >([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const adminToken = (import.meta as any).env.VITE_ADMIN_API_TOKEN as
      | string
      | undefined;

    const loadBackups = async () => {
      try {
        setLoading(true);
        setMessage(null);
        const res = await fetch("/api/backups", {
          headers: {
            Authorization: `Bearer ${adminToken || ""}`,
          },
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error || "Không tải được danh sách backup");
        setBackups(data.backups || []);
      } catch (e: any) {
        setMessage(e.message || "Lỗi tải danh sách backup");
      } finally {
        setLoading(false);
      }
    };

    const handleBackup = async () => {
      try {
        setLoading(true);
        setMessage(null);
        const res = await fetch("/api/backup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken || ""}`,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Sao lưu thất bại");
        setMessage(`Đã tạo bản sao lưu: ${data.filename}`);
        await loadBackups();
      } catch (e: any) {
        setMessage(e.message || "Sao lưu thất bại");
      } finally {
        setLoading(false);
      }
    };

    const handleRestore = async (filename: string) => {
      if (
        !confirm(
          `Khôi phục từ ${filename}? Hành động này sẽ ghi đè dữ liệu hiện tại.`
        )
      )
        return;
      try {
        setLoading(true);
        setMessage(null);
        const res = await fetch("/api/restore", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken || ""}`,
          },
          body: JSON.stringify({ filename }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Khôi phục thất bại");
        setMessage(`Khôi phục thành công từ ${data.restoredFrom}`);
      } catch (e: any) {
        setMessage(e.message || "Khôi phục thất bại");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadBackups();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2
            className={`text-2xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Sao lưu & Khôi phục
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            className={`${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } rounded-lg p-6 shadow-lg border ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <Database className="w-8 h-8 text-blue-500" />
              <h3
                className={`text-xl font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Tạo bản sao lưu
              </h3>
            </div>

            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  } mb-2`}
                >
                  Dung lượng lưu trữ hiện tại
                </p>
                <p
                  className={`text-2xl font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {stats.storage_used}
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span
                    className={`text-sm ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Người dùng
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span
                    className={`text-sm ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Cuộc trò chuyện
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span
                    className={`text-sm ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Tin nhắn
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span
                    className={`text-sm ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Tệp đính kèm
                  </span>
                </label>
              </div>

              <button
                onClick={handleBackup}
                disabled={loading}
                className={`w-full mt-6 px-4 py-3 ${
                  loading ? "bg-blue-400" : "bg-blue-600"
                } text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2`}
              >
                <Database className="w-5 h-5" />
                <span>Tạo bản sao lưu ngay</span>
              </button>
              {message && (
                <p
                  className={`text-sm mt-3 ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {message}
                </p>
              )}
            </div>
          </div>

          <div
            className={`${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } rounded-lg p-6 shadow-lg border ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <RefreshCw className="w-8 h-8 text-green-500" />
              <h3
                className={`text-xl font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Lịch sử sao lưu
              </h3>
            </div>

            <div className="space-y-3">
              {loading && backups.length === 0 && (
                <p
                  className={`${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Đang tải...
                </p>
              )}
              {backups.map((b, index) => (
                <div
                  key={b.filename + index}
                  className={`${
                    isDarkMode ? "bg-gray-700" : "bg-gray-100"
                  } p-4 rounded-lg flex items-center justify-between`}
                >
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p
                        className={`font-medium ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {b.filename}
                      </p>
                      <p
                        className={`text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {new Date(b.createdAt).toLocaleString()} •{" "}
                        {(b.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRestore(b.filename)}
                      disabled={loading}
                      className={`px-3 py-1 rounded ${
                        isDarkMode
                          ? "bg-gray-600 text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      Khôi phục
                    </button>
                  </div>
                </div>
              ))}
              {!loading && backups.length === 0 && (
                <p
                  className={`${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Chưa có bản sao lưu nào.
                </p>
              )}
            </div>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            <div className="flex items-start space-x-2">
              <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Lưu ý quan trọng</p>
                <p className="text-sm">
                  Bản sao lưu sẽ được mã hóa và lưu trữ an toàn. Quá trình sao
                  lưu có thể mất vài phút tùy thuộc vào dung lượng dữ liệu.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  };

  const ReportsTab: React.FC = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2
          className={`text-2xl font-bold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Báo cáo & Thống kê
        </h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
          <Download className="w-5 h-5" />
          <span>Xuất báo cáo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-sm font-medium ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Nội dung bị báo cáo
            </h3>
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <p
            className={`text-3xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            127
          </p>
          <p className="text-sm text-red-500 mt-2">+12 trong 24h qua</p>
        </div>

        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-sm font-medium ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Tài khoản bị khóa
            </h3>
            <Ban className="w-5 h-5 text-yellow-500" />
          </div>
          <p
            className={`text-3xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            45
          </p>
          <p className="text-sm text-yellow-500 mt-2">+3 trong 7 ngày qua</p>
        </div>

        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-sm font-medium ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Thời gian phản hồi TB
            </h3>
            <Clock className="w-5 h-5 text-green-500" />
          </div>
          <p
            className={`text-3xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            2.4h
          </p>
          <p className="text-sm text-green-500 mt-2">-0.8h so với tuần trước</p>
        </div>
      </div>

      <div
        className={`${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } rounded-lg p-6 shadow-lg border ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <h3
          className={`text-lg font-semibold mb-6 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Báo cáo gần đây
        </h3>
        <div className="space-y-4">
          {[
            {
              type: "Nội dung không phù hợp",
              reporter: "user123",
              target: "post456",
              time: "5 phút trước",
              status: "pending",
            },
            {
              type: "Spam",
              reporter: "user789",
              target: "message321",
              time: "15 phút trước",
              status: "resolved",
            },
            {
              type: "Quấy rối",
              reporter: "user456",
              target: "user654",
              time: "1 giờ trước",
              status: "investigating",
            },
          ].map((report, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                isDarkMode ? "bg-gray-700" : "bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-red-500" />
                  <div>
                    <p
                      className={`font-medium ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {report.type}
                    </p>
                    <p
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Báo cáo bởi {report.reporter} • Mục tiêu: {report.target}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    report.status === "pending"
                      ? "bg-yellow-500/20 text-yellow-500"
                      : report.status === "resolved"
                      ? "bg-green-500/20 text-green-500"
                      : "bg-blue-500/20 text-blue-500"
                  }`}
                >
                  {report.status === "pending"
                    ? "Chờ xử lý"
                    : report.status === "resolved"
                    ? "Đã giải quyết"
                    : "Đang điều tra"}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600">
                <span
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {report.time}
                </span>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
                    Xem chi tiết
                  </button>
                  <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors">
                    Giải quyết
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const SettingsTab: React.FC = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2
          className={`text-2xl font-bold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Cài đặt hệ thống
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <h3
            className={`text-lg font-semibold mb-6 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Cài đặt chung
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`font-medium ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Cho phép đăng ký mới
                </p>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Người dùng có thể tạo tài khoản mới
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div>
                <p
                  className={`font-medium ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Xác minh email
                </p>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Yêu cầu xác minh email khi đăng ký
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div>
                <p
                  className={`font-medium ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Chế độ bảo trì
                </p>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Tạm khóa truy cập cho người dùng
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <h3
            className={`text-lg font-semibold mb-6 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Cài đặt tin nhắn
          </h3>
          <div className="space-y-4">
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Kích thước tệp tối đa (MB)
              </label>
              <input
                type="number"
                defaultValue={50}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Số tin nhắn lưu trữ mỗi cuộc trò chuyện
              </label>
              <input
                type="number"
                defaultValue={10000}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div className="pt-4 border-t border-gray-700">
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Loại tệp được phép
              </label>
              <div className="space-y-2">
                {["Hình ảnh", "Video", "Tài liệu", "Âm thanh"].map((type) => (
                  <label key={type} className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span
                      className={`text-sm ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } rounded-lg p-6 shadow-lg border ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <h3
          className={`text-lg font-semibold mb-6 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Cài đặt bảo mật
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Thời gian phiên làm việc (phút)
            </label>
            <input
              type="number"
              defaultValue={60}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Số lần đăng nhập sai tối đa
            </label>
            <input
              type="number"
              defaultValue={5}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = (): React.ReactNode => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "users":
        return <UsersTab />;
      case "conversations":
        return <ConversationsTab />;
      case "posts":
        return <PostsTab />;
      case "backup":
        return <BackupTab />;
      case "reports":
        return <ReportsTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div
      className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        } border-r z-10`}
      >
        <div className="p-6">
          <h1
            className={`text-2xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Admin Panel
          </h1>
          <p
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            } mt-1`}
          >
            Chat App Management
          </p>
        </div>

        <nav className="px-3 space-y-1">
          {[
            { id: "overview", icon: LayoutDashboard, label: "Tổng quan" },
            { id: "users", icon: Users, label: "Người dùng" },
            {
              id: "conversations",
              icon: MessageSquare,
              label: "Cuộc trò chuyện",
            },
            { id: "posts", icon: FileText, label: "Bài đăng" },
            { id: "reports", icon: Shield, label: "Báo cáo" },
            { id: "backup", icon: Database, label: "Sao lưu" },
            { id: "settings", icon: Settings, label: "Cài đặt" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? "bg-blue-600 text-white"
                    : isDarkMode
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Bar */}
        <div
          className={`${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          } border-b sticky top-0 z-10`}
        >
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg ${
                  isDarkMode
                    ? "bg-gray-700 text-yellow-500"
                    : "bg-gray-100 text-gray-700"
                } hover:opacity-80 transition-opacity`}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              <button
                className={`relative p-2 rounded-lg ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-100"
                } hover:opacity-80 transition-opacity`}
              >
                <Bell
                  className={`w-5 h-5 ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-full ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-300"
                  } flex items-center justify-center`}
                >
                  <span className="text-sm font-medium text-blue-500">A</span>
                </div>
                <div className="hidden md:block">
                  <p
                    className={`text-sm font-medium ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {user?.fullName || user?.email}
                  </p>
                  <p
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {user?.roles?.join(", ")}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                />
              </div>
              <button
                onClick={async () => {
                  await logout();
                  await reload();
                }}
                className={`px-3 py-2 rounded-lg ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-200"
                    : "bg-gray-100 text-gray-800"
                } hover:opacity-80`}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">{renderContent()}</div>
      </div>
    </div>
  );
};

export default AdminDashboard;
