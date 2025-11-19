/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  FileText,
  Ban,
  CheckCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/services/supabase";
import { formatDate } from "../utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface PostsTabProps {
  isDarkMode: boolean;
}

const ITEMS_PER_PAGE = 20;

export const PostsTab: React.FC<PostsTabProps> = ({ isDarkMode }) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "deleted">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Modal states for confirmations and alerts
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
    variant?: "default" | "danger";
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    variant: "default",
    confirmText: "Xác nhận",
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: "default" | "danger";
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "default",
  });
  const [postComments, setPostComments] = useState<any[]>([]);
  const [postReactions, setPostReactions] = useState<any[]>([]);
  const [postReports, setPostReports] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [postDetail, setPostDetail] = useState<{
    id: string;
    content: string;
    image_url: string | null;
    image_urls: string[] | null;
    video_url: string | null;
    author_name: string;
    author_username: string;
    created_at: string;
  } | null>(null);
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
      created_at: string;
      is_deleted: boolean | null;
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

  const loadPosts = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Only select essential fields to reduce data transfer
      let query = supabase
        .from("posts")
        .select("id, author_id, content, created_at, is_deleted", {
          count: "exact",
        })
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("content", `%${search}%`);
      }

      if (filter === "active") {
        query = query.or("is_deleted.is.null,is_deleted.eq.false");
      } else if (filter === "deleted") {
        query = query.eq("is_deleted", true);
      }

      // Get total count
      const { count } = await query;
      setTotalCount(count || 0);

      // Get paginated data
      const { data: postsData, error: err } = await query.range(from, to);

      if (err) {
        console.error("Error loading posts:", err);
        throw err;
      }

      const rows = (postsData || []) as Array<any>;

      if (rows.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Load author information
      const authorIds = [...new Set(rows.map((r) => r.author_id))];

      const { data: authorsData } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", authorIds);

      const authorsMap = new Map(
        (authorsData || []).map((a: any) => [a.id, a])
      );

      // Map posts with author info only (no counts, no media)
      const postsWithAuthors = rows.map((r) => {
        const author = authorsMap.get(r.author_id);
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
          created_at: r.created_at,
          is_deleted: r.is_deleted || false,
        };
      });

      setItems(postsWithAuthors);
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
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  useEffect(() => {
    loadPosts(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, filter]);

  const handleSoftDelete = async (postId: string, isDeleted: boolean) => {
    const action = isDeleted ? "khôi phục" : "xóa";
    setConfirmModal({
      isOpen: true,
      title: `Xác nhận ${action} bài đăng`,
      message: `${
        action.charAt(0).toUpperCase() + action.slice(1)
      } bài đăng này?`,
      variant: "danger",
      confirmText: action === "xóa" ? "Xóa" : "Khôi phục",
      onConfirm: async () => {
        try {
          const { error: err } = await supabase
            .from("posts")
            .update({ is_deleted: !isDeleted })
            .eq("id", postId);
          if (err) throw err;
          await loadPosts(currentPage);
        } catch (e) {
          const err = e as Error;
          setAlertModal({
            isOpen: true,
            title: "Lỗi",
            message:
              err.message ||
              `${action.charAt(0).toUpperCase() + action.slice(1)} thất bại`,
            variant: "danger",
          });
        }
      },
    });
  };

  const handleHardDelete = async (postId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận xóa vĩnh viễn",
      message: "Xóa vĩnh viễn bài đăng này? Hành động này không thể hoàn tác!",
      variant: "danger",
      confirmText: "Xóa vĩnh viễn",
      onConfirm: async () => {
        try {
          await supabase.from("post_comments").delete().eq("post_id", postId);
          await supabase.from("post_reactions").delete().eq("post_id", postId);
          await supabase.from("post_reports").delete().eq("post_id", postId);
          const { error: err } = await supabase
            .from("posts")
            .delete()
            .eq("id", postId);
          if (err) throw err;
          await loadPosts(currentPage);
          if (selectedPost === postId) {
            setShowDetailModal(false);
            setSelectedPost(null);
          }
        } catch (e) {
          const err = e as Error;
          setAlertModal({
            isOpen: true,
            title: "Lỗi",
            message: err.message || "Xóa thất bại",
            variant: "danger",
          });
        }
      },
    });
  };

  const loadPostDetails = async (postId: string) => {
    setLoadingDetails(true);
    try {
      // Load post details including images and video
      const { data: postData, error: postErr } = await supabase
        .from("posts")
        .select(
          "id, content, image_url, image_urls, video_url, author_id, created_at"
        )
        .eq("id", postId)
        .single();

      if (postErr) throw postErr;

      // Load author info
      let authorName = "Unknown";
      let authorUsername = "";
      if (postData?.author_id) {
        const { data: authorData } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("id", postData.author_id)
          .single();

        if (authorData) {
          authorName =
            authorData.display_name || authorData.username || "Unknown";
          authorUsername = authorData.username || "";
        }
      }

      // Parse image_urls if it's a string
      let imageUrls: string[] | null = null;
      if (postData?.image_urls) {
        try {
          if (typeof postData.image_urls === "string") {
            imageUrls = JSON.parse(postData.image_urls);
          } else if (Array.isArray(postData.image_urls)) {
            imageUrls = postData.image_urls.filter(
              (url): url is string => typeof url === "string" && url !== null
            );
          }
        } catch (e) {
          console.error("Error parsing image_urls:", e);
        }
      }

      setPostDetail({
        id: postData.id,
        content: postData.content || "",
        image_url: postData.image_url || null,
        image_urls: imageUrls,
        video_url: postData.video_url || null,
        author_name: authorName,
        author_username: authorUsername,
        created_at: postData.created_at,
      });

      const { data: commentsData, error: commentsErr } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (commentsErr) throw commentsErr;

      const commentUserIds = [
        ...new Set((commentsData || []).map((c: any) => c.user_id)),
      ];
      const { data: commentUsers } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", commentUserIds);

      const commentUsersMap = new Map(
        (commentUsers || []).map((u: any) => [u.id, u])
      );

      const commentsWithUsers = (commentsData || []).map((c: any) => ({
        ...c,
        profiles: commentUsersMap.get(c.user_id),
      }));

      const { data: reactionsData, error: reactionsErr } = await supabase
        .from("post_reactions")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (reactionsErr) throw reactionsErr;

      const reactionUserIds = [
        ...new Set((reactionsData || []).map((r: any) => r.user_id)),
      ];
      const { data: reactionUsers } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", reactionUserIds);

      const reactionUsersMap = new Map(
        (reactionUsers || []).map((u: any) => [u.id, u])
      );

      const reactionsWithUsers = (reactionsData || []).map((r: any) => ({
        ...r,
        profiles: reactionUsersMap.get(r.user_id),
      }));

      const { data: reportsData, error: reportsErr } = await supabase
        .from("post_reports")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (reportsErr) throw reportsErr;

      const reportUserIds = [
        ...new Set((reportsData || []).map((r: any) => r.reported_by)),
      ];
      const { data: reportUsers } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", reportUserIds);

      const reportUsersMap = new Map(
        (reportUsers || []).map((u: any) => [u.id, u])
      );

      const reportsWithUsers = (reportsData || []).map((r: any) => ({
        ...r,
        reporter: reportUsersMap.get(r.reported_by),
      }));

      setPostComments(commentsWithUsers);
      setPostReactions(reactionsWithUsers);
      setPostReports(reportsWithUsers);
    } catch (e) {
      console.error("Error loading post details:", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = async (postId: string) => {
    setSelectedPost(postId);
    setShowDetailModal(true);
    await loadPostDetails(postId);
  };

  const handleDeleteComment = async (commentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận xóa bình luận",
      message: "Xóa bình luận này?",
      variant: "danger",
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          const { error: err } = await supabase
            .from("post_comments")
            .delete()
            .eq("id", commentId);
          if (err) throw err;
          if (selectedPost) await loadPostDetails(selectedPost);
        } catch (e) {
          const err = e as Error;
          setAlertModal({
            isOpen: true,
            title: "Lỗi",
            message: err.message || "Xóa bình luận thất bại",
            variant: "danger",
          });
        }
      },
    });
  };

  const [newContent, setNewContent] = useState("");
  const [newAuthorId, setNewAuthorId] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newAuthorId || !newContent.trim()) {
      setAlertModal({
        isOpen: true,
        title: "Thông báo",
        message: "Nhập author_id và nội dung",
        variant: "default",
      });
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
      await loadPosts(currentPage);
    } catch (e) {
      const err = e as Error;
      setAlertModal({
        isOpen: true,
        title: "Lỗi",
        message: err.message || "Tạo bài đăng thất bại",
        variant: "danger",
      });
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
          onClick={() => loadPosts(currentPage)}
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
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : isDarkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === "active"
                  ? "bg-blue-600 text-white"
                  : isDarkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Đang hoạt động
            </button>
            <button
              onClick={() => setFilter("deleted")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === "deleted"
                  ? "bg-blue-600 text-white"
                  : isDarkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Đã xóa
            </button>
          </div>
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
          <>
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
                      ID
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Tác giả
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Nội dung
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Ngày tạo
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
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((post) => (
                    <tr
                      key={post.id}
                      className={`border-b hover:bg-opacity-50 transition-colors ${
                        isDarkMode
                          ? "border-gray-700 hover:bg-gray-700"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <td
                        className={`px-4 py-3 text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        } font-mono`}
                      >
                        {post.id.substring(0, 8)}...
                      </td>
                      <td
                        className={`px-4 py-3 text-sm ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <div>
                          <div className="font-medium">{post.author_name}</div>
                          {post.author_username && (
                            <div
                              className={`text-xs ${
                                isDarkMode ? "text-gray-500" : "text-gray-500"
                              }`}
                            >
                              @{post.author_username}
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 text-sm ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        } max-w-md`}
                      >
                        <div className="truncate" title={post.content}>
                          {post.content || "(Không có nội dung)"}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {formatDate(post.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {post.is_deleted ? (
                          <span className="px-2 py-1 text-xs bg-red-500/20 text-red-500 rounded">
                            Đã xóa
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-green-500/20 text-green-500 rounded">
                            Hoạt động
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(post.id)}
                            className="p-1.5 rounded hover:bg-blue-500/20 transition-colors text-blue-500"
                            title="Xem chi tiết"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleSoftDelete(
                                post.id,
                                post.is_deleted || false
                              )
                            }
                            className={`p-1.5 rounded transition-colors ${
                              post.is_deleted
                                ? "hover:bg-green-500/20 text-green-500"
                                : "hover:bg-red-500/20 text-red-500"
                            }`}
                            title={post.is_deleted ? "Khôi phục" : "Xóa"}
                          >
                            {post.is_deleted ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleHardDelete(post.id)}
                            className="p-1.5 rounded hover:bg-red-600/20 transition-colors text-red-600"
                            title="Xóa vĩnh viễn"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {Math.ceil(totalCount / ITEMS_PER_PAGE) > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-700">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    currentPage === 1
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
                  Trang {currentPage} / {Math.ceil(totalCount / ITEMS_PER_PAGE)}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), p + 1)
                    )
                  }
                  disabled={
                    currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)
                  }
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)
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

      {showDetailModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col`}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h3
                className={`text-xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Chi tiết bài đăng
              </h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPost(null);
                  setPostComments([]);
                  setPostReactions([]);
                  setPostReports([]);
                  setPostDetail(null);
                }}
                className={`p-2 rounded-lg hover:bg-gray-700 transition-colors ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetails ? (
                <div className="text-center py-8">
                  <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                    Đang tải...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Post Content */}
                  {postDetail && (
                    <div>
                      <h4
                        className={`text-lg font-semibold mb-4 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Nội dung bài đăng
                      </h4>
                      <div
                        className={`p-4 rounded-lg border ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`font-medium ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {postDetail.author_name}
                            </span>
                            {postDetail.author_username && (
                              <span
                                className={`text-sm ${
                                  isDarkMode ? "text-gray-400" : "text-gray-500"
                                }`}
                              >
                                @{postDetail.author_username}
                              </span>
                            )}
                            <span
                              className={`text-xs ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {formatDate(postDetail.created_at)}
                            </span>
                          </div>
                        </div>
                        <p
                          className={`mb-4 ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {postDetail.content || "(Không có nội dung)"}
                        </p>

                        {/* Images */}
                        {(postDetail.image_url || postDetail.image_urls) && (
                          <div className="mb-4">
                            {postDetail.image_urls &&
                            postDetail.image_urls.length > 0 ? (
                              <div
                                className={`grid gap-2 ${
                                  postDetail.image_urls.length === 1
                                    ? "grid-cols-1"
                                    : postDetail.image_urls.length === 2
                                    ? "grid-cols-2"
                                    : postDetail.image_urls.length === 3
                                    ? "grid-cols-3"
                                    : "grid-cols-2"
                                }`}
                              >
                                {postDetail.image_urls.map((url, idx) => {
                                  const imageCount =
                                    postDetail.image_urls?.length || 0;
                                  const isLast = idx === 3 && imageCount > 4;
                                  return (
                                    <div
                                      key={idx}
                                      className={`relative group cursor-pointer ${
                                        imageCount === 3 && idx === 0
                                          ? "row-span-2"
                                          : ""
                                      } ${
                                        imageCount === 1
                                          ? "aspect-auto"
                                          : "aspect-square"
                                      } rounded-lg overflow-hidden ${
                                        isDarkMode
                                          ? "bg-gray-800"
                                          : "bg-gray-100"
                                      }`}
                                    >
                                      {isLast ? (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div
                                            className={`absolute inset-0 ${
                                              isDarkMode
                                                ? "bg-gray-900/80"
                                                : "bg-gray-900/70"
                                            }`}
                                          />
                                          <span
                                            className={`relative text-lg font-semibold ${
                                              isDarkMode
                                                ? "text-gray-100"
                                                : "text-white"
                                            }`}
                                          >
                                            +{imageCount - 4}
                                          </span>
                                        </div>
                                      ) : (
                                        <img
                                          src={
                                            url.startsWith("http")
                                              ? url
                                              : `https://mpfrdrchsngwmfeelwua.supabase.co/storage/v1/object/public/chat-attachments/${url}`
                                          }
                                          alt={`Post image ${idx + 1}`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (
                                              e.target as HTMLImageElement
                                            ).style.display = "none";
                                          }}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : postDetail.image_url ? (
                              <div className="rounded-lg overflow-hidden">
                                <img
                                  src={
                                    postDetail.image_url.startsWith("http")
                                      ? postDetail.image_url
                                      : `https://mpfrdrchsngwmfeelwua.supabase.co/storage/v1/object/public/chat-attachments/${postDetail.image_url}`
                                  }
                                  alt="Post image"
                                  className="w-full max-h-[500px] object-contain mx-auto"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Video */}
                        {postDetail.video_url && (
                          <div className="mb-4">
                            <div className="rounded-lg overflow-hidden">
                              <video
                                src={
                                  postDetail.video_url.startsWith("http")
                                    ? postDetail.video_url
                                    : `https://mpfrdrchsngwmfeelwua.supabase.co/storage/v1/object/public/chat-attachments/${postDetail.video_url}`
                                }
                                controls
                                className="w-full max-h-[500px] rounded-lg"
                              >
                                Trình duyệt của bạn không hỗ trợ video.
                              </video>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4
                      className={`text-lg font-semibold mb-4 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Bình luận ({postComments.length})
                    </h4>
                    <div className="space-y-3">
                      {postComments.length === 0 ? (
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Chưa có bình luận
                        </p>
                      ) : (
                        postComments.map((comment: any) => (
                          <div
                            key={comment.id}
                            className={`p-4 rounded-lg border ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className={`font-medium ${
                                      isDarkMode
                                        ? "text-white"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {comment.profiles?.display_name ||
                                      comment.profiles?.username ||
                                      "Unknown"}
                                  </span>
                                  <span
                                    className={`text-xs ${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {formatDate(comment.created_at)}
                                  </span>
                                </div>
                                <p
                                  className={`${
                                    isDarkMode
                                      ? "text-gray-300"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {comment.content}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1.5 rounded hover:bg-red-500/20 text-red-500 transition-colors"
                                title="Xóa bình luận"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <h4
                      className={`text-lg font-semibold mb-4 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Reactions ({postReactions.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {postReactions.length === 0 ? (
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Chưa có reaction
                        </p>
                      ) : (
                        postReactions.map((reaction: any) => (
                          <div
                            key={reaction.id}
                            className={`px-3 py-2 rounded-lg border ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <span className="mr-2">
                              {reaction.reaction_type}
                            </span>
                            <span
                              className={`text-sm ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              {reaction.profiles?.display_name ||
                                reaction.profiles?.username ||
                                "Unknown"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <h4
                      className={`text-lg font-semibold mb-4 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Báo cáo ({postReports.length})
                    </h4>
                    <div className="space-y-3">
                      {postReports.length === 0 ? (
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Chưa có báo cáo
                        </p>
                      ) : (
                        postReports.map((report: any) => (
                          <div
                            key={report.id}
                            className={`p-4 rounded-lg border ${
                              isDarkMode
                                ? "bg-red-900/20 border-red-700"
                                : "bg-red-50 border-red-200"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span
                                  className={`font-medium ${
                                    isDarkMode ? "text-red-300" : "text-red-800"
                                  }`}
                                >
                                  {report.reporter?.display_name ||
                                    report.reporter?.username ||
                                    "Unknown"}
                                </span>
                                <span
                                  className={`text-xs ml-2 ${
                                    isDarkMode ? "text-red-400" : "text-red-600"
                                  }`}
                                >
                                  {formatDate(report.created_at)}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  isDarkMode
                                    ? "bg-red-800 text-red-200"
                                    : "bg-red-200 text-red-800"
                                }`}
                              >
                                {report.reason}
                              </span>
                            </div>
                            {report.description && (
                              <p
                                className={`text-sm ${
                                  isDarkMode ? "text-red-200" : "text-red-700"
                                }`}
                              >
                                {report.description}
                              </p>
                            )}
                            {report.status && (
                              <p
                                className={`text-xs mt-2 ${
                                  isDarkMode ? "text-red-400" : "text-red-600"
                                }`}
                              >
                                Trạng thái: {report.status}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          })
        }
        onConfirm={() => {
          if (confirmModal.onConfirm) {
            confirmModal.onConfirm();
          }
          setConfirmModal({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          });
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText || "Xác nhận"}
        variant={confirmModal.variant || "default"}
        isDarkMode={isDarkMode}
      />

      {/* Alert Modal */}
      <ConfirmModal
        isOpen={alertModal.isOpen}
        onClose={() =>
          setAlertModal({
            isOpen: false,
            title: "",
            message: "",
          })
        }
        onConfirm={() =>
          setAlertModal({
            isOpen: false,
            title: "",
            message: "",
          })
        }
        title={alertModal.title}
        message={alertModal.message}
        confirmText="Đóng"
        variant={alertModal.variant || "default"}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
