import React, { useState, useEffect, useRef } from "react";
import { Bell, X, AlertCircle } from "lucide-react";
import { supabase } from "@/services/supabase";
import toast from "react-hot-toast";

interface ReportNotification {
  id: string;
  type: "user" | "post" | "message" | "conversation";
  reason: string;
  description: string | null;
  reportedBy: string | null;
  createdAt: string;
  readAt: string | null;
  table: string;
  recordId: string;
}

interface NotificationBellProps {
  isDarkMode: boolean;
  onNotificationClick?: (notification: ReportNotification) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  isDarkMode,
  onNotificationClick,
}) => {
  const [notifications, setNotifications] = useState<ReportNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load initial pending reports
  const loadInitialReports = async () => {
    try {
      const [userReports, postReports, messageReports, convReports] =
        await Promise.all([
          supabase
            .from("user_reports")
            .select("id, reason, description, reported_by, created_at, read_at, reported_user_id")
            .or("status.is.null,status.eq.pending")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("post_reports")
            .select("id, reason, description, reported_by, created_at, read_at, post_id")
            .or("status.is.null,status.eq.pending")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("message_reports")
            .select("id, reason, description, reported_by, created_at, read_at, message_id")
            .or("status.is.null,status.eq.pending")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("conversation_reports")
            .select("id, reason, description, reported_by, created_at, read_at, conversation_id")
            .or("status.is.null,status.eq.pending")
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

      const allReports: ReportNotification[] = [];

      if (userReports.data) {
        userReports.data.forEach((r: any) => {
          allReports.push({
            id: r.id,
            type: "user",
            reason: r.reason,
            description: r.description,
            reportedBy: r.reported_by,
            createdAt: r.created_at,
            readAt: r.read_at,
            table: "user_reports",
            recordId: r.reported_user_id,
          });
        });
      }

      if (postReports.data) {
        postReports.data.forEach((r: any) => {
          allReports.push({
            id: r.id,
            type: "post",
            reason: r.reason,
            description: r.description,
            reportedBy: r.reported_by,
            createdAt: r.created_at,
            readAt: r.read_at,
            table: "post_reports",
            recordId: r.post_id,
          });
        });
      }

      if (messageReports.data) {
        messageReports.data.forEach((r: any) => {
          allReports.push({
            id: r.id,
            type: "message",
            reason: r.reason,
            description: r.description,
            reportedBy: r.reported_by,
            createdAt: r.created_at,
            readAt: r.read_at,
            table: "message_reports",
            recordId: r.message_id,
          });
        });
      }

      if (convReports.data) {
        convReports.data.forEach((r: any) => {
          allReports.push({
            id: r.id,
            type: "conversation",
            reason: r.reason,
            description: r.description,
            reportedBy: r.reported_by,
            createdAt: r.created_at,
            readAt: r.read_at,
            table: "conversation_reports",
            recordId: r.conversation_id,
          });
        });
      }

      // Sort by created_at descending
      allReports.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Count unread (read_at is null)
      const unread = allReports.filter((n) => !n.readAt).length;

      setNotifications(allReports);
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error loading initial reports:", error);
    }
  };

  // Setup Supabase Realtime subscriptions
  useEffect(() => {
    loadInitialReports();

    // Subscribe to user_reports
    const userReportsChannel = supabase
      .channel("user_reports_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_reports",
        },
        (payload) => {
          // Only process if status is null or pending (new reports)
          const status = payload.new.status;
          if (status && status !== "pending") {
            return; // Skip if already reviewed/resolved
          }
          const newReport: ReportNotification = {
            id: payload.new.id,
            type: "user",
            reason: payload.new.reason,
            description: payload.new.description,
            reportedBy: payload.new.reported_by,
            createdAt: payload.new.created_at,
            readAt: payload.new.read_at || null,
            table: "user_reports",
            recordId: payload.new.reported_user_id,
          };
          handleNewReport(newReport);
        }
      )
      .subscribe();

    // Subscribe to post_reports
    const postReportsChannel = supabase
      .channel("post_reports_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "post_reports",
        },
        (payload) => {
          // Only process if status is null or pending (new reports)
          const status = payload.new.status;
          if (status && status !== "pending") {
            return; // Skip if already reviewed/resolved
          }
          const newReport: ReportNotification = {
            id: payload.new.id,
            type: "post",
            reason: payload.new.reason,
            description: payload.new.description,
            reportedBy: payload.new.reported_by,
            createdAt: payload.new.created_at,
            readAt: payload.new.read_at || null,
            table: "post_reports",
            recordId: payload.new.post_id,
          };
          handleNewReport(newReport);
        }
      )
      .subscribe();

    // Subscribe to message_reports
    const messageReportsChannel = supabase
      .channel("message_reports_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reports",
        },
        (payload) => {
          // Only process if status is null or pending (new reports)
          const status = payload.new.status;
          if (status && status !== "pending") {
            return; // Skip if already reviewed/resolved
          }
          const newReport: ReportNotification = {
            id: payload.new.id,
            type: "message",
            reason: payload.new.reason,
            description: payload.new.description,
            reportedBy: payload.new.reported_by,
            createdAt: payload.new.created_at,
            readAt: payload.new.read_at || null,
            table: "message_reports",
            recordId: payload.new.message_id,
          };
          handleNewReport(newReport);
        }
      )
      .subscribe();

    // Subscribe to conversation_reports
    const convReportsChannel = supabase
      .channel("conversation_reports_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_reports",
        },
        (payload) => {
          // Only process if status is null or pending (new reports)
          const status = payload.new.status;
          if (status && status !== "pending") {
            return; // Skip if already reviewed/resolved
          }
          const newReport: ReportNotification = {
            id: payload.new.id,
            type: "conversation",
            reason: payload.new.reason,
            description: payload.new.description,
            reportedBy: payload.new.reported_by,
            createdAt: payload.new.created_at,
            readAt: payload.new.read_at || null,
            table: "conversation_reports",
            recordId: payload.new.conversation_id,
          };
          handleNewReport(newReport);
        }
      )
      .subscribe();

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      userReportsChannel.unsubscribe();
      postReportsChannel.unsubscribe();
      messageReportsChannel.unsubscribe();
      convReportsChannel.unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNewReport = (report: ReportNotification) => {
    setNotifications((prev) => [report, ...prev]);
    // Only increment if not read yet
    if (!report.readAt) {
      setUnreadCount((prev) => prev + 1);
    }

    // Show toast notification
    const typeLabels: Record<string, string> = {
      user: "Người dùng",
      post: "Bài đăng",
      message: "Tin nhắn",
      conversation: "Cuộc trò chuyện",
    };

    toast(
      (t) => (
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              Báo cáo mới: {typeLabels[report.type]}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Lý do: {report.reason}
            </p>
            {report.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {report.description}
              </p>
            )}
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      {
        duration: 5000,
        position: "top-right",
        icon: "🔔",
      }
    );
  };

  const handleNotificationClick = async (notification: ReportNotification) => {
    // If already read, just navigate
    if (notification.readAt) {
      setShowDropdown(false);
      if (onNotificationClick) {
        onNotificationClick(notification);
      }
      return;
    }

    // Update read_at in database
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from(notification.table)
        .update({ read_at: now })
        .eq("id", notification.id);

      if (error) {
        console.error("Error updating read_at:", error);
        toast.error("Không thể đánh dấu đã đọc");
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, readAt: now } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setShowDropdown(false);

      if (onNotificationClick) {
        onNotificationClick(notification);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Không thể đánh dấu đã đọc");
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.readAt);
    if (unreadNotifications.length === 0) return;

    try {
      const now = new Date().toISOString();

      // Group by table to batch updates
      const updatesByTable: Record<string, string[]> = {};
      unreadNotifications.forEach((n) => {
        if (!updatesByTable[n.table]) {
          updatesByTable[n.table] = [];
        }
        updatesByTable[n.table].push(n.id);
      });

      // Update each table
      const updatePromises = Object.entries(updatesByTable).map(
        ([table, ids]) =>
          supabase
            .from(table)
            .update({ read_at: now })
            .in("id", ids)
      );

      const results = await Promise.all(updatePromises);
      const hasError = results.some((r) => r.error);

      if (hasError) {
        console.error("Error marking all as read:", results);
        toast.error("Không thể đánh dấu tất cả đã đọc");
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.readAt ? n : { ...n, readAt: now }))
      );
      setUnreadCount(0);
      toast.success("Đã đánh dấu tất cả đã đọc");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Không thể đánh dấu tất cả đã đọc");
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "short",
    });
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      user: "Người dùng",
      post: "Bài đăng",
      message: "Tin nhắn",
      conversation: "Cuộc trò chuyện",
    };
    return labels[type] || type;
  };

  const getReasonLabel = (reason: string): string => {
    const labels: Record<string, string> = {
      spam: "Spam",
      harassment: "Quấy rối",
      inappropriate_content: "Nội dung không phù hợp",
      violence: "Bạo lực",
      hate_speech: "Ngôn từ thù địch",
      fake_news: "Tin giả",
      other: "Khác",
    };
    return labels[reason] || reason;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative p-2 rounded-lg transition-colors ${
          isDarkMode
            ? "bg-gray-700 hover:bg-gray-600"
            : "bg-gray-100 hover:bg-gray-200"
        }`}
      >
        <Bell
          className={`w-5 h-5 ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          className={`absolute right-0 mt-2 w-96 rounded-lg shadow-xl border z-50 ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <div
            className={`flex items-center justify-between p-4 border-b ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <h3
              className={`font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Thông báo ({unreadCount > 0 ? unreadCount : "0"})
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className={`text-xs ${
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                } hover:underline`}
              >
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Chưa có thông báo
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notifications.map((notification) => {
                  const isRead = !!notification.readAt;
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left p-4 hover:bg-gray-700/50 transition-colors ${
                        !isRead
                          ? isDarkMode
                            ? "bg-blue-900/20"
                            : "bg-blue-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isDarkMode
                              ? "bg-orange-900/30"
                              : "bg-orange-100"
                          }`}
                        >
                          <AlertCircle
                            className={`w-4 h-4 ${
                              isDarkMode ? "text-orange-400" : "text-orange-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p
                              className={`text-sm font-semibold ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              Báo cáo: {getTypeLabel(notification.type)}
                            </p>
                            {!isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                            )}
                          </div>
                          <p
                            className={`text-xs mb-1 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Lý do: {getReasonLabel(notification.reason)}
                          </p>
                          {notification.description && (
                            <p
                              className={`text-xs line-clamp-2 mb-2 ${
                                isDarkMode ? "text-gray-500" : "text-gray-700"
                              }`}
                            >
                              {notification.description}
                            </p>
                          )}
                          <p
                            className={`text-xs ${
                              isDarkMode ? "text-gray-500" : "text-gray-500"
                            }`}
                          >
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div
              className={`p-3 border-t text-center ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <button
                onClick={() => {
                  setShowDropdown(false);
                  if (onNotificationClick) {
                    // Navigate to reports tab
                    window.location.hash = "#reports";
                  }
                }}
                className={`text-sm ${
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                } hover:underline`}
              >
                Xem tất cả báo cáo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

