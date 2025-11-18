/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import {
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/services/supabase";
import { formatDate } from "../utils";

interface ReportsTabProps {
  isDarkMode: boolean;
}

type ReportType = "user" | "conversation" | "post";
type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

interface UserReport {
  id: string;
  reported_user_id: string;
  reported_by: string;
  reason: string;
  description: string | null;
  status: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reported_user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
  reporter?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface ConversationReport {
  id: string;
  conversation_id: string;
  reported_by: string;
  reason: string;
  description: string | null;
  status: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  conversation?: {
    id: string;
    title: string | null;
    type: string;
    photo_url: string;
  };
  reporter?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface PostReport {
  id: string;
  post_id: string;
  reported_by: string;
  reason: string;
  description: string | null;
  status: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  post?: {
    id: string;
    content: string;
    author_id: string;
    image_url: string | null;
    video_url: string | null;
  };
  reporter?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

const ITEMS_PER_PAGE = 10;

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Quấy rối",
  inappropriate_content: "Nội dung không phù hợp",
  violence: "Bạo lực",
  hate_speech: "Ngôn từ thù địch",
  fake_news: "Tin giả",
  other: "Khác",
};

export const ReportsTab: React.FC<ReportsTabProps> = ({ isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<ReportType>("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "reviewed" | "resolved" | "dismissed"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<
    UserReport | ConversationReport | PostReport | null
  >(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);
  const [selectedPostDetail, setSelectedPostDetail] = useState<any>(null);
  const [selectedConversationDetail, setSelectedConversationDetail] =
    useState<any>(null);

  // Dropdown states for resolve action menu
  const [openResolveMenu, setOpenResolveMenu] = useState<string | null>(null);

  // User Reports
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [userReportsPage, setUserReportsPage] = useState(1);
  const [userReportsTotal, setUserReportsTotal] = useState(0);

  // Conversation Reports
  const [conversationReports, setConversationReports] = useState<
    ConversationReport[]
  >([]);
  const [conversationReportsPage, setConversationReportsPage] = useState(1);
  const [conversationReportsTotal, setConversationReportsTotal] = useState(0);

  // Post Reports
  const [postReports, setPostReports] = useState<PostReport[]>([]);
  const [postReportsPage, setPostReportsPage] = useState(1);
  const [postReportsTotal, setPostReportsTotal] = useState(0);

  const loadUserReports = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from("user_reports").select("*", { count: "exact" });

      // Apply status filter
      if (statusFilter === "pending") {
        query = query.is("status", null);
      } else if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply search (if needed, search in description)
      if (searchQuery) {
        query = query.ilike("description", `%${searchQuery}%`);
      }

      // Get total count
      const { count } = await query;
      setUserReportsTotal(count || 0);

      // Get reports with pagination
      const { data, error: err } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (err) throw err;

      // Load related user data
      const userIds = new Set<string>();
      (data || []).forEach((r: any) => {
        userIds.add(r.reported_user_id);
        userIds.add(r.reported_by);
      });

      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", Array.from(userIds));

      const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]));

      setUserReports(
        (data || []).map((r: any) => ({
          ...r,
          reported_user: usersMap.get(r.reported_user_id),
          reporter: usersMap.get(r.reported_by),
        }))
      );
    } catch (e) {
      const err = e as Error;
      setError(err.message || "Không tải được báo cáo người dùng");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationReports = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("conversation_reports")
        .select("*", { count: "exact" });

      // Apply status filter
      if (statusFilter === "pending") {
        query = query.is("status", null);
      } else if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply search
      if (searchQuery) {
        query = query.ilike("description", `%${searchQuery}%`);
      }

      // Get total count
      const { count } = await query;
      setConversationReportsTotal(count || 0);

      // Get reports with pagination
      const { data, error: err } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (err) throw err;

      // Load related data
      const conversationIds = new Set<string>();
      const userIds = new Set<string>();
      (data || []).forEach((r: any) => {
        conversationIds.add(r.conversation_id);
        userIds.add(r.reported_by);
      });

      const [conversationsData, usersData] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, title, type, photo_url")
          .in("id", Array.from(conversationIds)),
        supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", Array.from(userIds)),
      ]);

      const conversationsMap = new Map(
        (conversationsData.data || []).map((c: any) => [c.id, c])
      );
      const usersMap = new Map(
        (usersData.data || []).map((u: any) => [u.id, u])
      );

      setConversationReports(
        (data || []).map((r: any) => ({
          ...r,
          conversation: conversationsMap.get(r.conversation_id),
          reporter: usersMap.get(r.reported_by),
        }))
      );
    } catch (e) {
      const err = e as Error;
      setError(err.message || "Không tải được báo cáo cuộc trò chuyện");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPostReports = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from("post_reports").select("*", { count: "exact" });

      // Apply status filter
      if (statusFilter === "pending") {
        query = query.is("status", null);
      } else if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply search
      if (searchQuery) {
        query = query.ilike("description", `%${searchQuery}%`);
      }

      // Get total count
      const { count } = await query;
      setPostReportsTotal(count || 0);

      // Get reports with pagination
      const { data, error: err } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (err) throw err;

      // Load related data
      const postIds = new Set<string>();
      const userIds = new Set<string>();
      (data || []).forEach((r: any) => {
        postIds.add(r.post_id);
        userIds.add(r.reported_by);
      });

      const [postsData, usersData] = await Promise.all([
        supabase
          .from("posts")
          .select("id, content, author_id, image_url, video_url")
          .in("id", Array.from(postIds)),
        supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", Array.from(userIds)),
      ]);

      const postsMap = new Map(
        (postsData.data || []).map((p: any) => [p.id, p])
      );
      const usersMap = new Map(
        (usersData.data || []).map((u: any) => [u.id, u])
      );

      setPostReports(
        (data || []).map((r: any) => ({
          ...r,
          post: postsMap.get(r.post_id),
          reporter: usersMap.get(r.reported_by),
        }))
      );
    } catch (e) {
      const err = e as Error;
      setError(err.message || "Không tải được báo cáo bài đăng");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (
    table: "user_reports" | "conversation_reports" | "post_reports",
    reportId: string,
    status: ReportStatus,
    skipReload: boolean = false
  ) => {
    try {
      const updateData: any = {
        status,
        reviewed_at: new Date().toISOString(),
      };

      const { error: err } = await supabase
        .from(table)
        .update(updateData)
        .eq("id", reportId);

      if (err) {
        console.error("Supabase update error:", err);
        throw err;
      }

      // Update local state immediately for better UX
      const updatedFields = {
        status,
        reviewed_at: updateData.reviewed_at,
      };

      if (activeTab === "user") {
        setUserReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, ...updatedFields } : r))
        );
      } else if (activeTab === "conversation") {
        setConversationReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, ...updatedFields } : r))
        );
      } else {
        setPostReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, ...updatedFields } : r))
        );
      }

      // Update selected report if it's the same one
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport((prev) =>
          prev ? { ...prev, ...updatedFields } : null
        );
      }

      // Reload current tab if not skipping to ensure data consistency
      if (!skipReload) {
        if (activeTab === "user") {
          await loadUserReports(userReportsPage);
        } else if (activeTab === "conversation") {
          await loadConversationReports(conversationReportsPage);
        } else {
          await loadPostReports(postReportsPage);
        }
      }
    } catch (e) {
      const err = e as Error;
      console.error("Error updating report status:", e);
      alert(err.message || "Cập nhật trạng thái thất bại");
      throw e; // Re-throw to allow caller to handle
    }
  };

  const banUser = async (userId: string, reportId: string) => {
    if (!confirm("Bạn có chắc muốn khóa người dùng này?")) return;
    try {
      // Ban user first
      const { error: err } = await supabase
        .from("profiles")
        .update({ is_disabled: true })
        .eq("id", userId);
      if (err) throw err;

      // Then update report status to resolved
      await updateReportStatus("user_reports", reportId, "resolved");
    } catch (e) {
      const err = e as Error;
      alert(err.message || "Khóa người dùng thất bại");
    }
  };

  const loadUserDetail = async (userId: string) => {
    try {
      const { data, error: err } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (err) throw err;
      setSelectedUserDetail(data);
    } catch (e) {
      console.error("Error loading user detail:", e);
    }
  };

  const loadPostDetail = async (postId: string) => {
    try {
      const { data, error: err } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();
      if (err) throw err;
      setSelectedPostDetail(data);
    } catch (e) {
      console.error("Error loading post detail:", e);
    }
  };

  const loadConversationDetail = async (conversationId: string) => {
    try {
      const { data, error: err } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();
      if (err) throw err;
      setSelectedConversationDetail(data);
    } catch (e) {
      console.error("Error loading conversation detail:", e);
    }
  };

  const handleViewDetail = async (
    report: UserReport | ConversationReport | PostReport
  ) => {
    setSelectedReport(report);
    setShowDetailModal(true);

    // Auto-update status to 'reviewed' when opening detail modal if status is 'pending'
    if (report.status === null || report.status === "pending") {
      const table =
        activeTab === "user"
          ? "user_reports"
          : activeTab === "conversation"
          ? "conversation_reports"
          : "post_reports";
      try {
        await updateReportStatus(table, report.id, "reviewed", true);
      } catch (e) {
        console.error("Error updating report status to reviewed:", e);
      }
    }

    if (activeTab === "user" && "reported_user_id" in report) {
      await loadUserDetail(report.reported_user_id);
    } else if (activeTab === "post" && "post_id" in report) {
      await loadPostDetail(report.post_id);
    } else if (activeTab === "conversation" && "conversation_id" in report) {
      await loadConversationDetail(report.conversation_id);
    }
  };

  const deletePost = async (postId: string, reportId: string) => {
    if (!confirm("Bạn có chắc muốn xóa bài đăng này?")) return;
    try {
      // Delete post first
      const { error: err } = await supabase
        .from("posts")
        .update({ is_deleted: true })
        .eq("id", postId);
      if (err) throw err;

      // Then update report status to resolved
      await updateReportStatus("post_reports", reportId, "resolved");
    } catch (e) {
      const err = e as Error;
      alert(err.message || "Xóa bài đăng thất bại");
    }
  };

  const deleteConversation = async (
    conversationId: string,
    reportId: string
  ) => {
    if (!confirm("Bạn có chắc muốn xóa cuộc trò chuyện này?")) return;
    try {
      // Delete conversation first
      const { error: err } = await supabase
        .from("conversations")
        .update({ is_deleted: true })
        .eq("id", conversationId);
      if (err) throw err;

      // Then update report status to resolved
      await updateReportStatus("conversation_reports", reportId, "resolved");
    } catch (e) {
      const err = e as Error;
      alert(err.message || "Xóa cuộc trò chuyện thất bại");
    }
  };

  useEffect(() => {
    // Reset page to 1 when switching tabs
    if (activeTab === "user") {
      setUserReportsPage(1);
    } else if (activeTab === "conversation") {
      setConversationReportsPage(1);
    } else {
      setPostReportsPage(1);
    }
    // Close dropdown menu when switching tabs
    setOpenResolveMenu(null);
  }, [activeTab]);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".relative")) {
        setOpenResolveMenu(null);
      }
    };

    if (openResolveMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [openResolveMenu]);

  useEffect(() => {
    // Reset page when filter or search changes
    setUserReportsPage(1);
    setConversationReportsPage(1);
    setPostReportsPage(1);
  }, [statusFilter, searchQuery, activeTab]);

  useEffect(() => {
    if (activeTab === "user") {
      loadUserReports(userReportsPage);
    } else if (activeTab === "conversation") {
      loadConversationReports(conversationReportsPage);
    } else {
      loadPostReports(postReportsPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    userReportsPage,
    conversationReportsPage,
    postReportsPage,
    statusFilter,
    searchQuery,
  ]);

  const renderUserReports = () => {
    const totalPages = Math.ceil(userReportsTotal / ITEMS_PER_PAGE);

    return (
      <div className="space-y-4">
        {loading && userReports.length === 0 ? (
          <div className="text-center py-8">
            <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Đang tải...
            </p>
          </div>
        ) : userReports.length === 0 ? (
          <div className="text-center py-8">
            <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Không có báo cáo nào
            </p>
          </div>
        ) : (
          <>
            {userReports.map((report) => (
              <div
                key={report.id}
                className={`p-4 rounded-lg ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <Shield
                      className={`w-5 h-5 mt-1 ${
                        report.status === "resolved"
                          ? "text-green-500"
                          : report.status === "dismissed"
                          ? "text-gray-500"
                          : report.status === "reviewed"
                          ? "text-blue-500"
                          : "text-red-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {REASON_LABELS[report.reason] || report.reason}
                        </p>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            report.status === "resolved"
                              ? "bg-green-500/20 text-green-500"
                              : report.status === "dismissed"
                              ? "bg-gray-500/20 text-gray-500"
                              : report.status === "reviewed"
                              ? "bg-blue-500/20 text-blue-500"
                              : "bg-yellow-500/20 text-yellow-500"
                          }`}
                        >
                          {report.status === "resolved"
                            ? "Đã giải quyết"
                            : report.status === "dismissed"
                            ? "Đã bỏ qua"
                            : report.status === "reviewed"
                            ? "Đã xem"
                            : "Chờ xử lý"}
                        </span>
                      </div>
                      {report.description && (
                        <p
                          className={`text-sm mb-2 ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {report.description}
                        </p>
                      )}
                      <div className="space-y-1 text-sm">
                        <p
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          <span className="font-medium">Người bị báo cáo:</span>{" "}
                          {report.reported_user?.display_name || "N/A"} (@
                          {report.reported_user?.username || "N/A"})
                        </p>
                        <p
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          <span className="font-medium">Người báo cáo:</span>{" "}
                          {report.reporter?.display_name || "N/A"} (@
                          {report.reporter?.username || "N/A"})
                        </p>
                        <p
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          <span className="font-medium">Thời gian:</span>{" "}
                          {formatDate(report.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-600">
                  <button
                    onClick={() => handleViewDetail(report)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Xem chi tiết
                  </button>
                  {(report.status === null ||
                    report.status === "pending" ||
                    report.status === "reviewed") && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenResolveMenu(
                            openResolveMenu === report.id ? null : report.id
                          )
                        }
                        className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Giải quyết
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {openResolveMenu === report.id && (
                        <div
                          className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-10 ${
                            isDarkMode ? "bg-gray-800" : "bg-white"
                          } border ${
                            isDarkMode ? "border-gray-700" : "border-gray-200"
                          }`}
                        >
                          <div className="py-1">
                            <button
                              onClick={() => {
                                banUser(report.reported_user_id, report.id);
                                setOpenResolveMenu(null);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                                isDarkMode
                                  ? "hover:bg-gray-700 text-red-400"
                                  : "hover:bg-gray-100 text-red-600"
                              }`}
                            >
                              <Ban className="w-4 h-4" />
                              Khóa người dùng
                            </button>
                            <button
                              onClick={() => {
                                updateReportStatus(
                                  "user_reports",
                                  report.id,
                                  "dismissed"
                                );
                                setOpenResolveMenu(null);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                                isDarkMode
                                  ? "hover:bg-gray-700 text-gray-400"
                                  : "hover:bg-gray-100 text-gray-600"
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                              Bỏ qua
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setUserReportsPage((p) => Math.max(1, p - 1))}
                  disabled={userReportsPage === 1}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    userReportsPage === 1
                      ? "opacity-50 cursor-not-allowed"
                      : isDarkMode
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </button>
                <span
                  className={isDarkMode ? "text-gray-300" : "text-gray-700"}
                >
                  Trang {userReportsPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setUserReportsPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={userReportsPage === totalPages}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    userReportsPage === totalPages
                      ? "opacity-50 cursor-not-allowed"
                      : isDarkMode
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderConversationReports = () => {
    const totalPages = Math.ceil(conversationReportsTotal / ITEMS_PER_PAGE);

    return (
      <div className="space-y-4">
        {loading && conversationReports.length === 0 ? (
          <div className="text-center py-8">
            <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Đang tải...
            </p>
          </div>
        ) : conversationReports.length === 0 ? (
          <div className="text-center py-8">
            <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Không có báo cáo nào
            </p>
          </div>
        ) : (
          <>
            {conversationReports.map((report) => (
              <div
                key={report.id}
                className={`p-4 rounded-lg ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <Shield
                      className={`w-5 h-5 mt-1 ${
                        report.status === "resolved"
                          ? "text-green-500"
                          : report.status === "dismissed"
                          ? "text-gray-500"
                          : report.status === "reviewed"
                          ? "text-blue-500"
                          : "text-red-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {REASON_LABELS[report.reason] || report.reason}
                        </p>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            report.status === "resolved"
                              ? "bg-green-500/20 text-green-500"
                              : report.status === "dismissed"
                              ? "bg-gray-500/20 text-gray-500"
                              : report.status === "reviewed"
                              ? "bg-blue-500/20 text-blue-500"
                              : "bg-yellow-500/20 text-yellow-500"
                          }`}
                        >
                          {report.status === "resolved"
                            ? "Đã giải quyết"
                            : report.status === "dismissed"
                            ? "Đã bỏ qua"
                            : report.status === "reviewed"
                            ? "Đã xem"
                            : "Chờ xử lý"}
                        </span>
                      </div>
                      {report.description && (
                        <p
                          className={`text-sm mb-2 ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {report.description}
                        </p>
                      )}
                      <div className="space-y-1 text-sm">
                        <p
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          <span className="font-medium">Cuộc trò chuyện:</span>{" "}
                          {report.conversation?.title ||
                            report.conversation?.id ||
                            "N/A"}{" "}
                          ({report.conversation?.type || "N/A"})
                        </p>
                        <p
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          <span className="font-medium">Người báo cáo:</span>{" "}
                          {report.reporter?.display_name || "N/A"} (@
                          {report.reporter?.username || "N/A"})
                        </p>
                        <p
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          <span className="font-medium">Thời gian:</span>{" "}
                          {formatDate(report.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-600">
                  <button
                    onClick={() => handleViewDetail(report)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Xem chi tiết
                  </button>
                  {(report.status === null ||
                    report.status === "pending" ||
                    report.status === "reviewed") && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenResolveMenu(
                            openResolveMenu === report.id ? null : report.id
                          )
                        }
                        className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Giải quyết
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {openResolveMenu === report.id && (
                        <div
                          className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-10 ${
                            isDarkMode ? "bg-gray-800" : "bg-white"
                          } border ${
                            isDarkMode ? "border-gray-700" : "border-gray-200"
                          }`}
                        >
                          <div className="py-1">
                            <button
                              onClick={() => {
                                deleteConversation(
                                  report.conversation_id,
                                  report.id
                                );
                                setOpenResolveMenu(null);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                                isDarkMode
                                  ? "hover:bg-gray-700 text-red-400"
                                  : "hover:bg-gray-100 text-red-600"
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                              Xóa cuộc trò chuyện
                            </button>
                            <button
                              onClick={() => {
                                updateReportStatus(
                                  "conversation_reports",
                                  report.id,
                                  "dismissed"
                                );
                                setOpenResolveMenu(null);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                                isDarkMode
                                  ? "hover:bg-gray-700 text-gray-400"
                                  : "hover:bg-gray-100 text-gray-600"
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                              Bỏ qua
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() =>
                    setConversationReportsPage((p) => Math.max(1, p - 1))
                  }
                  disabled={conversationReportsPage === 1}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    conversationReportsPage === 1
                      ? "opacity-50 cursor-not-allowed"
                      : isDarkMode
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </button>
                <span
                  className={isDarkMode ? "text-gray-300" : "text-gray-700"}
                >
                  Trang {conversationReportsPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setConversationReportsPage((p) =>
                      Math.min(totalPages, p + 1)
                    )
                  }
                  disabled={conversationReportsPage === totalPages}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    conversationReportsPage === totalPages
                      ? "opacity-50 cursor-not-allowed"
                      : isDarkMode
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderPostReports = () => {
    const totalPages = Math.ceil(postReportsTotal / ITEMS_PER_PAGE);

    return (
      <div className="space-y-4">
        {loading && postReports.length === 0 ? (
          <div className="text-center py-8">
            <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Đang tải...
            </p>
          </div>
        ) : postReports.length === 0 ? (
          <div className="text-center py-8">
            <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
              Không có báo cáo nào
            </p>
          </div>
        ) : (
          <>
            {postReports.map((report) => (
              <div
                key={report.id}
                className={`p-4 rounded-lg ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <Shield
                      className={`w-5 h-5 mt-1 ${
                        report.status === "resolved"
                          ? "text-green-500"
                          : report.status === "dismissed"
                          ? "text-gray-500"
                          : report.status === "reviewed"
                          ? "text-blue-500"
                          : "text-red-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {REASON_LABELS[report.reason] || report.reason}
                        </p>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            report.status === "resolved"
                              ? "bg-green-500/20 text-green-500"
                              : report.status === "dismissed"
                              ? "bg-gray-500/20 text-gray-500"
                              : report.status === "reviewed"
                              ? "bg-blue-500/20 text-blue-500"
                              : "bg-yellow-500/20 text-yellow-500"
                          }`}
                        >
                          {report.status === "resolved"
                            ? "Đã giải quyết"
                            : report.status === "dismissed"
                            ? "Đã bỏ qua"
                            : report.status === "reviewed"
                            ? "Đã xem"
                            : "Chờ xử lý"}
                        </span>
                      </div>
                      {report.description && (
                        <p
                          className={`text-sm mb-2 ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {report.description}
                        </p>
                      )}
                      {report.post && (
                        <div
                          className={`p-3 rounded mb-2 ${
                            isDarkMode ? "bg-gray-800" : "bg-white"
                          }`}
                        >
                          <p
                            className={`text-sm mb-1 ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {report.post.content.substring(0, 200)}
                            {report.post.content.length > 200 ? "..." : ""}
                          </p>
                          {report.post.image_url && (
                            <p
                              className={`text-xs ${
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              [Có hình ảnh]
                            </p>
                          )}
                          {report.post.video_url && (
                            <p
                              className={`text-xs ${
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              [Có video]
                            </p>
                          )}
                        </div>
                      )}
                      <div className="space-y-1 text-sm">
                        <p
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          <span className="font-medium">Người báo cáo:</span>{" "}
                          {report.reporter?.display_name || "N/A"} (@
                          {report.reporter?.username || "N/A"})
                        </p>
                        <p
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          <span className="font-medium">Thời gian:</span>{" "}
                          {formatDate(report.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-600">
                  <button
                    onClick={() => handleViewDetail(report)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Xem chi tiết
                  </button>
                  {(report.status === null ||
                    report.status === "pending" ||
                    report.status === "reviewed") && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenResolveMenu(
                            openResolveMenu === report.id ? null : report.id
                          )
                        }
                        className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Giải quyết
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {openResolveMenu === report.id && (
                        <div
                          className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-10 ${
                            isDarkMode ? "bg-gray-800" : "bg-white"
                          } border ${
                            isDarkMode ? "border-gray-700" : "border-gray-200"
                          }`}
                        >
                          <div className="py-1">
                            <button
                              onClick={() => {
                                if (report.post) {
                                  deletePost(report.post.id, report.id);
                                }
                                setOpenResolveMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors flex items-center gap-2 text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                              Xóa bài đăng
                            </button>
                            <button
                              onClick={() => {
                                updateReportStatus(
                                  "post_reports",
                                  report.id,
                                  "dismissed"
                                );
                                setOpenResolveMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors flex items-center gap-2 text-gray-400"
                            >
                              <XCircle className="w-4 h-4" />
                              Bỏ qua
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setPostReportsPage((p) => Math.max(1, p - 1))}
                  disabled={postReportsPage === 1}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    postReportsPage === 1
                      ? "opacity-50 cursor-not-allowed"
                      : isDarkMode
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </button>
                <span
                  className={isDarkMode ? "text-gray-300" : "text-gray-700"}
                >
                  Trang {postReportsPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setPostReportsPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={postReportsPage === totalPages}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    postReportsPage === totalPages
                      ? "opacity-50 cursor-not-allowed"
                      : isDarkMode
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2
          className={`text-2xl font-bold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Quản lý báo cáo
        </h2>
      </div>

      {error && (
        <div
          className={`p-4 rounded-lg ${
            isDarkMode
              ? "bg-red-900/20 border-red-500"
              : "bg-red-50 border-red-200"
          } border`}
        >
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <div
        className={`${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } rounded-lg shadow-lg border ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <div className="border-b border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab("user")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "user"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : isDarkMode
                  ? "text-gray-400 hover:text-gray-300"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Báo cáo người dùng
            </button>
            <button
              onClick={() => setActiveTab("conversation")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "conversation"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : isDarkMode
                  ? "text-gray-400 hover:text-gray-300"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Báo cáo cuộc trò chuyện
            </button>
            <button
              onClick={() => setActiveTab("post")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "post"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : isDarkMode
                  ? "text-gray-400 hover:text-gray-300"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Báo cáo bài đăng
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Filters and Search */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              />
              <input
                type="text"
                placeholder="Tìm kiếm báo cáo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === "all"
                    ? "bg-blue-600 text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === "pending"
                    ? "bg-blue-600 text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Chờ xử lý
              </button>
              <button
                onClick={() => setStatusFilter("reviewed")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === "reviewed"
                    ? "bg-blue-600 text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Đã xem
              </button>
              <button
                onClick={() => setStatusFilter("resolved")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === "resolved"
                    ? "bg-blue-600 text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Đã giải quyết
              </button>
              <button
                onClick={() => setStatusFilter("dismissed")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === "dismissed"
                    ? "bg-blue-600 text-white"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Đã bỏ qua
              </button>
            </div>
          </div>

          {activeTab === "user" && renderUserReports()}
          {activeTab === "conversation" && renderConversationReports()}
          {activeTab === "post" && renderPostReports()}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReport && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className={`${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h3
                className={`text-xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Chi tiết báo cáo
              </h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReport(null);
                  setSelectedUserDetail(null);
                  setSelectedPostDetail(null);
                  setSelectedConversationDetail(null);
                }}
                className={`p-2 rounded-lg hover:bg-gray-700 transition-colors ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Report Info */}
                <div>
                  <h4
                    className={`text-lg font-semibold mb-3 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Thông tin báo cáo
                  </h4>
                  <div
                    className={`p-4 rounded-lg ${
                      isDarkMode ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    <div className="space-y-2 text-sm">
                      <p
                        className={
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }
                      >
                        <span className="font-medium">Lý do:</span>{" "}
                        {REASON_LABELS[selectedReport.reason] ||
                          selectedReport.reason}
                      </p>
                      {selectedReport.description && (
                        <p
                          className={
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }
                        >
                          <span className="font-medium">Mô tả:</span>{" "}
                          {selectedReport.description}
                        </p>
                      )}
                      <p
                        className={
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }
                      >
                        <span className="font-medium">Trạng thái:</span>{" "}
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            selectedReport.status === "resolved"
                              ? "bg-green-500/20 text-green-500"
                              : selectedReport.status === "dismissed"
                              ? "bg-gray-500/20 text-gray-500"
                              : selectedReport.status === "reviewed"
                              ? "bg-blue-500/20 text-blue-500"
                              : "bg-yellow-500/20 text-yellow-500"
                          }`}
                        >
                          {selectedReport.status === "resolved"
                            ? "Đã giải quyết"
                            : selectedReport.status === "dismissed"
                            ? "Đã bỏ qua"
                            : selectedReport.status === "reviewed"
                            ? "Đã xem"
                            : "Chờ xử lý"}
                        </span>
                      </p>
                      <p
                        className={
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }
                      >
                        <span className="font-medium">Thời gian tạo:</span>{" "}
                        {formatDate(selectedReport.created_at)}
                      </p>
                      {selectedReport.reviewed_at && (
                        <p
                          className={
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }
                        >
                          <span className="font-medium">Thời gian xử lý:</span>{" "}
                          {formatDate(selectedReport.reviewed_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Report Detail */}
                {activeTab === "user" &&
                  "reported_user_id" in selectedReport && (
                    <>
                      {selectedUserDetail && (
                        <div>
                          <h4
                            className={`text-lg font-semibold mb-3 ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            Thông tin người bị báo cáo
                          </h4>
                          <div
                            className={`p-4 rounded-lg ${
                              isDarkMode ? "bg-gray-700" : "bg-gray-100"
                            }`}
                          >
                            <div className="space-y-2 text-sm">
                              <p
                                className={
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }
                              >
                                <span className="font-medium">
                                  Tên hiển thị:
                                </span>{" "}
                                {selectedUserDetail.display_name || "N/A"}
                              </p>
                              <p
                                className={
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }
                              >
                                <span className="font-medium">Username:</span> @
                                {selectedUserDetail.username || "N/A"}
                              </p>
                              <p
                                className={
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }
                              >
                                <span className="font-medium">Trạng thái:</span>{" "}
                                {selectedUserDetail.status || "N/A"}
                              </p>
                              <p
                                className={
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }
                              >
                                <span className="font-medium">Bị khóa:</span>{" "}
                                {selectedUserDetail.is_disabled
                                  ? "Có"
                                  : "Không"}
                              </p>
                              <p
                                className={
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }
                              >
                                <span className="font-medium">Đã xóa:</span>{" "}
                                {selectedUserDetail.is_deleted ? "Có" : "Không"}
                              </p>
                              <p
                                className={
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }
                              >
                                <span className="font-medium">Ngày tạo:</span>{" "}
                                {formatDate(selectedUserDetail.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedReport.reporter && (
                        <div>
                          <h4
                            className={`text-lg font-semibold mb-3 ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            Người báo cáo
                          </h4>
                          <div
                            className={`p-4 rounded-lg ${
                              isDarkMode ? "bg-gray-700" : "bg-gray-100"
                            }`}
                          >
                            <div className="space-y-2 text-sm">
                              <p
                                className={
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }
                              >
                                <span className="font-medium">
                                  Tên hiển thị:
                                </span>{" "}
                                {selectedReport.reporter.display_name || "N/A"}
                              </p>
                              <p
                                className={
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }
                              >
                                <span className="font-medium">Username:</span> @
                                {selectedReport.reporter.username || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                {/* Post Report Detail */}
                {activeTab === "post" && "post_id" in selectedReport && (
                  <>
                    {selectedPostDetail && (
                      <div>
                        <h4
                          className={`text-lg font-semibold mb-3 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Nội dung bài đăng
                        </h4>
                        <div
                          className={`p-4 rounded-lg ${
                            isDarkMode ? "bg-gray-700" : "bg-gray-100"
                          }`}
                        >
                          <p
                            className={`text-sm mb-2 ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {selectedPostDetail.content}
                          </p>
                          {selectedPostDetail.image_url && (
                            <p
                              className={`text-xs ${
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              [Có hình ảnh]
                            </p>
                          )}
                          {selectedPostDetail.video_url && (
                            <p
                              className={`text-xs ${
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              [Có video]
                            </p>
                          )}
                          <p
                            className={`text-xs mt-2 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Ngày tạo:{" "}
                            {formatDate(selectedPostDetail.created_at)}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedReport.reporter && (
                      <div>
                        <h4
                          className={`text-lg font-semibold mb-3 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Người báo cáo
                        </h4>
                        <div
                          className={`p-4 rounded-lg ${
                            isDarkMode ? "bg-gray-700" : "bg-gray-100"
                          }`}
                        >
                          <div className="space-y-2 text-sm">
                            <p
                              className={
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }
                            >
                              <span className="font-medium">Tên hiển thị:</span>{" "}
                              {selectedReport.reporter.display_name || "N/A"}
                            </p>
                            <p
                              className={
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }
                            >
                              <span className="font-medium">Username:</span> @
                              {selectedReport.reporter.username || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Conversation Report Detail */}
                {activeTab === "conversation" &&
                  "conversation_id" in selectedReport && (
                    <>
                      {selectedConversationDetail && (
                        <div>
                          <h4
                            className={`text-lg font-semibold mb-3 ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            Thông tin cuộc trò chuyện
                          </h4>
                          <div
                            className={`p-4 rounded-lg ${
                              isDarkMode ? "bg-gray-700" : "bg-gray-100"
                            }`}
                          >
                            <div className="space-y-2 text-sm">
                              <p
                                className={
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }
                              >
                                <span className="font-medium">Tiêu đề:</span>{" "}
                                {selectedConversationDetail.title || "N/A"}
                              </p>
                              <p
                                className={
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }
                              >
                                <span className="font-medium">Loại:</span>{" "}
                                {selectedConversationDetail.type || "N/A"}
                              </p>
                              <p
                                className={
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }
                              >
                                <span className="font-medium">Ngày tạo:</span>{" "}
                                {formatDate(
                                  selectedConversationDetail.created_at
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedReport.reporter && (
                        <div>
                          <h4
                            className={`text-lg font-semibold mb-3 ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            Người báo cáo
                          </h4>
                          <div
                            className={`p-4 rounded-lg ${
                              isDarkMode ? "bg-gray-700" : "bg-gray-100"
                            }`}
                          >
                            <div className="space-y-2 text-sm">
                              <p
                                className={
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }
                              >
                                <span className="font-medium">
                                  Tên hiển thị:
                                </span>{" "}
                                {selectedReport.reporter.display_name || "N/A"}
                              </p>
                              <p
                                className={
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }
                              >
                                <span className="font-medium">Username:</span> @
                                {selectedReport.reporter.username || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                {/* Action Buttons */}
                {(selectedReport.status === null ||
                  selectedReport.status === "pending" ||
                  selectedReport.status === "reviewed") && (
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-700">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenResolveMenu(
                            openResolveMenu === selectedReport.id
                              ? null
                              : selectedReport.id
                          )
                        }
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Giải quyết
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {openResolveMenu === selectedReport.id && (
                        <div
                          className={`absolute left-0 mt-2 w-56 rounded-lg shadow-lg z-10 ${
                            isDarkMode ? "bg-gray-800" : "bg-white"
                          } border ${
                            isDarkMode ? "border-gray-700" : "border-gray-200"
                          }`}
                        >
                          <div className="py-1">
                            {activeTab === "user" &&
                              "reported_user_id" in selectedReport && (
                                <button
                                  onClick={() => {
                                    banUser(
                                      selectedReport.reported_user_id,
                                      selectedReport.id
                                    );
                                    setOpenResolveMenu(null);
                                    setShowDetailModal(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                                    isDarkMode
                                      ? "hover:bg-gray-700 text-red-400"
                                      : "hover:bg-gray-100 text-red-600"
                                  }`}
                                >
                                  <Ban className="w-4 h-4" />
                                  Khóa người dùng
                                </button>
                              )}
                            {activeTab === "post" &&
                              "post_id" in selectedReport &&
                              selectedReport.post && (
                                <button
                                  onClick={() => {
                                    deletePost(
                                      selectedReport.post!.id,
                                      selectedReport.id
                                    );
                                    setOpenResolveMenu(null);
                                    setShowDetailModal(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                                    isDarkMode
                                      ? "hover:bg-gray-700 text-red-400"
                                      : "hover:bg-gray-100 text-red-600"
                                  }`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Xóa bài đăng
                                </button>
                              )}
                            {activeTab === "conversation" &&
                              "conversation_id" in selectedReport && (
                                <button
                                  onClick={() => {
                                    deleteConversation(
                                      selectedReport.conversation_id,
                                      selectedReport.id
                                    );
                                    setOpenResolveMenu(null);
                                    setShowDetailModal(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                                    isDarkMode
                                      ? "hover:bg-gray-700 text-red-400"
                                      : "hover:bg-gray-100 text-red-600"
                                  }`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Xóa cuộc trò chuyện
                                </button>
                              )}
                            <button
                              onClick={() => {
                                const table =
                                  activeTab === "user"
                                    ? "user_reports"
                                    : activeTab === "conversation"
                                    ? "conversation_reports"
                                    : "post_reports";
                                updateReportStatus(
                                  table,
                                  selectedReport.id,
                                  "dismissed"
                                );
                                setOpenResolveMenu(null);
                                setShowDetailModal(false);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                                isDarkMode
                                  ? "hover:bg-gray-700 text-gray-400"
                                  : "hover:bg-gray-100 text-gray-600"
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                              Bỏ qua
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
