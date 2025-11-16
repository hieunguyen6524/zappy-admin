/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  Database,
  Settings,
  Shield,
  Search,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  BarChart3,
  Trash2,
  Ban,
  CheckCircle,
  RefreshCw,
  Download,
  Clock,
  UserCheck,
  MessagesSquare
} from 'lucide-react';
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
  ResponsiveContainer
} from 'recharts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { logout, createAdmin, type CreateAdminRequest } from '@/services/auth';
import { supabase } from '@/services/supabase';
import type { TabType, SystemStats, Conversation } from './admin/types';
import { OverviewTab, UsersTab } from './admin/tabs';
import { formatDate } from './admin/utils';

const AdminDashboard: React.FC = () => {
  const { user, reload } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Remove mock data - now using real data from Supabase

  // Stats state - will be loaded from Supabase
  const [stats, setStats] = useState<SystemStats>({
    total_users: 0,
    active_users: 0,
    total_conversations: 0,
    total_messages: 0,
    total_calls: 0,
    storage_used: '0 GB'
  });

  const loadStats = async () => {
    try {
      // Count users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Count active users (online)
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online');

      // Count conversations
      const { count: totalConvs } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      // Count messages
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      // Count calls
      const { count: totalCalls } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true });

      setStats({
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        total_conversations: totalConvs || 0,
        total_messages: totalMessages || 0,
        total_calls: totalCalls || 0,
        storage_used: 'N/A' // Would need storage calculation
      });
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      loadStats();
    }
  }, [activeTab]);

  // Các tab components đã được tách ra file riêng
  // Các tab còn lại (ConversationsTab, PostsTab, etc.) vẫn giữ nguyên trong file này
  // và sẽ được tách tiếp theo

  // UsersTab đã được tách ra file riêng

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
          .from('conversations')
          .select('*')
          .order('updated_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(100);

        if (convErr) throw convErr;

        // Lấy thông tin participants và messages cho từng conversation
        const conversationsWithCounts = await Promise.all(
          (convs || []).map(async (conv: any) => {
            // Đếm participants (chưa rời - left_at is null)
            const { count: participantsCount } = await supabase
              .from('conversation_participants')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .is('left_at', null);

            // Đếm messages
            const { count: messagesCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id);

            // Lấy last message để có last_message_at
            const { data: lastMessage } = await supabase
              .from('messages')
              .select('created_at')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              id: conv.id,
              type: conv.type,
              title: conv.title,
              photo_url: conv.photo_url
                ? `https://mpfrdrchsngwmfeelwua.supabase.co/storage/v1/object/public/chat-attachments/${conv.photo_url}`
                : '',
              created_at: conv.created_at,
              participants_count: participantsCount || 0,
              messages_count: messagesCount || 0,
              last_message_at:
                lastMessage?.created_at || conv.updated_at || conv.created_at
            };
          })
        );

        setConversations(conversationsWithCounts);
      } catch (e) {
        const err = e as Error;
        setError(err.message || 'Không tải được danh sách cuộc trò chuyện');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    const handleDeleteConversation = async (conversationId: string) => {
      if (
        !confirm(
          'Bạn có chắc muốn xóa cuộc trò chuyện này? Tất cả tin nhắn và dữ liệu liên quan sẽ bị xóa vĩnh viễn.'
        )
      )
        return;
      try {
        // Xóa conversation sẽ cascade delete participants và messages (nếu có foreign key cascade)
        const { error: err } = await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId);
        if (err) throw err;
        await loadConversations();
      } catch (e) {
        const err = e as Error;
        alert(err.message || 'Xóa thất bại');
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
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            Quản lý cuộc trò chuyện
          </h2>
          <button
            onClick={loadConversations}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
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
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg shadow-lg border ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className={`border-b ${
                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}
                  >
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Cuộc trò chuyện
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Loại
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Thành viên
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Tin nhắn
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-sm font-semibold ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Hoạt động cuối
                    </th>
                    <th
                      className={`px-4 py-3 text-right text-sm font-semibold ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
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
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
                          isDarkMode ? 'border-gray-700' : 'border-gray-200'
                        } hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-3">
                            {conv.photo_url ? (
                              <img
                                src={conv.photo_url}
                                alt={conv.title || 'Conversation'}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div
                                className={`w-10 h-10 rounded-full ${
                                  isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                                } flex items-center justify-center`}
                              >
                                <MessagesSquare className="w-5 h-5 text-blue-500" />
                              </div>
                            )}
                            <div>
                              <p
                                className={`font-medium ${
                                  isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}
                              >
                                {conv.title || 'Direct Message'}
                              </p>
                              <p
                                className={`text-sm ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
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
                              conv.type === 'group'
                                ? 'bg-purple-500/20 text-purple-500'
                                : 'bg-blue-500/20 text-blue-500'
                            }`}
                          >
                            {conv.type === 'group' ? 'Nhóm' : 'Riêng tư'}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-4 text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}
                        >
                          {conv.participants_count} người
                        </td>
                        <td
                          className={`px-4 py-4 text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}
                        >
                          {conv.messages_count.toLocaleString()}
                        </td>
                        <td
                          className={`px-4 py-4 text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
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
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'deleted'>('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPost, setSelectedPost] = useState<string | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [postComments, setPostComments] = useState<any[]>([]);
    const [postReactions, setPostReactions] = useState<any[]>([]);
    const [postReports, setPostReports] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
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
        image_urls: string[] | null;
        video_url: string | null;
        created_at: string;
        updated_at: string | null;
        comments_count: number;
        reactions_count: number;
        is_deleted: boolean | null;
        reports_count: number;
      }>
    >([]);

    const loadUsers = async () => {
      try {
        const { data, error: err } = await supabase
          .from('profiles')
          .select('id, display_name, username')
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
        console.error('Error loading users:', e);
      }
    };

    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Query posts với filter
        let query = supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (search) {
          query = query.ilike('content', `%${search}%`);
        }

        // Filter theo trạng thái
        if (filter === 'active') {
          query = query.or('is_deleted.is.null,is_deleted.eq.false');
        } else if (filter === 'deleted') {
          query = query.eq('is_deleted', true);
        }

        const { data: postsData, error: err } = await query;

        if (err) {
          console.error('Error loading posts:', err);
          throw err;
        }

        console.log('Posts data:', postsData);

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
          .from('profiles')
          .select('id, display_name, username')
          .in('id', authorIds);

        const authorsMap = new Map(
          (authorsData || []).map((a: any) => [a.id, a])
        );

        // Load counts cho từng post
        const withCounts = await Promise.all(
          rows.map(async (r) => {
            const author = authorsMap.get(r.author_id);

            const [
              { count: commentsCount },
              { count: reactionsCount },
              { count: reportsCount }
            ] = await Promise.all([
              supabase
                .from('post_comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', r.id),
              supabase
                .from('post_reactions')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', r.id),
              supabase
                .from('post_reports')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', r.id)
            ]);

            // Xử lý image_urls - có thể là Json (array hoặc string)
            let imageUrls: string[] | null = null;
            if (r.image_urls) {
              try {
                if (typeof r.image_urls === 'string') {
                  imageUrls = JSON.parse(r.image_urls);
                } else if (Array.isArray(r.image_urls)) {
                  imageUrls = r.image_urls;
                }
              } catch (e) {
                console.error('Error parsing image_urls:', e);
              }
            }

            return {
              id: r.id,
              author_id: r.author_id,
              author_name:
                author?.display_name ||
                author?.username ||
                r.author_id ||
                'Unknown',
              author_username: author?.username || '',
              content: r.content || '',
              image_url: r.image_url || null,
              image_urls: imageUrls,
              video_url: r.video_url || null,
              created_at: r.created_at,
              updated_at: r.updated_at,
              comments_count: commentsCount || 0,
              reactions_count: reactionsCount || 0,
              is_deleted: r.is_deleted || false,
              reports_count: reportsCount || 0
            };
          })
        );

        console.log('Processed posts:', withCounts);
        setItems(withCounts);
      } catch (e) {
        const err = e as Error;
        const errorMsg = err.message || 'Không tải được bài đăng';
        setError(errorMsg);
        console.error('Load posts error:', e);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadUsers();
      loadPosts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, filter]);

    const handleSoftDelete = async (postId: string, isDeleted: boolean) => {
      const action = isDeleted ? 'khôi phục' : 'xóa';

      console.log(postId, !isDeleted);
      if (
        !confirm(
          `${action.charAt(0).toUpperCase() + action.slice(1)} bài đăng này?`
        )
      )
        return;
      try {
        const { error: err } = await supabase
          .from('posts')
          .update({ is_deleted: !isDeleted })
          .eq('id', postId);
        if (err) throw err;
        await loadPosts();
      } catch (e) {
        const err = e as Error;
        alert(
          err.message ||
            `${action.charAt(0).toUpperCase() + action.slice(1)} thất bại`
        );
      }
    };

    const handleHardDelete = async (postId: string) => {
      if (
        !confirm(
          'Xóa vĩnh viễn bài đăng này? Hành động này không thể hoàn tác!'
        )
      )
        return;
      try {
        // Xóa comments trước
        await supabase.from('post_comments').delete().eq('post_id', postId);
        // Xóa reactions
        await supabase.from('post_reactions').delete().eq('post_id', postId);
        // Xóa reports
        await supabase.from('post_reports').delete().eq('post_id', postId);
        // Xóa post
        const { error: err } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId);
        if (err) throw err;
        await loadPosts();
        if (selectedPost === postId) {
          setShowDetailModal(false);
          setSelectedPost(null);
        }
      } catch (e) {
        console.log(e);
        const err = e as Error;
        alert(err.message || 'Xóa thất bại');
      }
    };

    const loadPostDetails = async (postId: string) => {
      setLoadingDetails(true);
      try {
        // Load comments
        const { data: commentsData, error: commentsErr } = await supabase
          .from('post_comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: false });

        if (commentsErr) throw commentsErr;

        // Load user profiles for comments
        const commentUserIds = [
          ...new Set((commentsData || []).map((c: any) => c.user_id))
        ];
        const { data: commentUsers } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', commentUserIds);

        const commentUsersMap = new Map(
          (commentUsers || []).map((u: any) => [u.id, u])
        );

        const commentsWithUsers = (commentsData || []).map((c: any) => ({
          ...c,
          profiles: commentUsersMap.get(c.user_id)
        }));

        // Load reactions
        const { data: reactionsData, error: reactionsErr } = await supabase
          .from('post_reactions')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: false });

        if (reactionsErr) throw reactionsErr;

        // Load user profiles for reactions
        const reactionUserIds = [
          ...new Set((reactionsData || []).map((r: any) => r.user_id))
        ];
        const { data: reactionUsers } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', reactionUserIds);

        const reactionUsersMap = new Map(
          (reactionUsers || []).map((u: any) => [u.id, u])
        );

        const reactionsWithUsers = (reactionsData || []).map((r: any) => ({
          ...r,
          profiles: reactionUsersMap.get(r.user_id)
        }));

        // Load reports
        const { data: reportsData, error: reportsErr } = await supabase
          .from('post_reports')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: false });

        if (reportsErr) throw reportsErr;

        // Load user profiles for reports
        const reportUserIds = [
          ...new Set((reportsData || []).map((r: any) => r.reported_by))
        ];
        const { data: reportUsers } = await supabase
          .from('profiles')
          .select('id, display_name, username')
          .in('id', reportUserIds);

        const reportUsersMap = new Map(
          (reportUsers || []).map((u: any) => [u.id, u])
        );

        const reportsWithUsers = (reportsData || []).map((r: any) => ({
          ...r,
          reporter: reportUsersMap.get(r.reported_by)
        }));

        setPostComments(commentsWithUsers);
        setPostReactions(reactionsWithUsers);
        setPostReports(reportsWithUsers);
      } catch (e) {
        console.error('Error loading post details:', e);
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
      if (!confirm('Xóa bình luận này?')) return;
      try {
        const { error: err } = await supabase
          .from('post_comments')
          .delete()
          .eq('id', commentId);
        if (err) throw err;
        if (selectedPost) await loadPostDetails(selectedPost);
      } catch (e) {
        const err = e as Error;
        alert(err.message || 'Xóa bình luận thất bại');
      }
    };

    const [newContent, setNewContent] = useState('');
    const [newAuthorId, setNewAuthorId] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
      if (!newAuthorId || !newContent.trim()) {
        alert('Nhập author_id và nội dung');
        return;
      }
      try {
        setCreating(true);
        const { error: err } = await supabase
          .from('posts')
          .insert({ author_id: newAuthorId, content: newContent.trim() });
        if (err) throw err;
        setNewAuthorId('');
        setNewContent('');
        await loadPosts();
      } catch (e) {
        const err = e as Error;
        alert(err.message || 'Tạo bài đăng thất bại');
      } finally {
        setCreating(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            Quản lý bài đăng
          </h2>
          <button
            onClick={loadPosts}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>

        <div
          className={`${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <input
              placeholder="Tìm theo nội dung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'active'
                    ? 'bg-blue-600 text-white'
                    : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Đang hoạt động
              </button>
              <button
                onClick={() => setFilter('deleted')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'deleted'
                    ? 'bg-blue-600 text-white'
                    : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
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
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div className="mb-4">
            <button
              onClick={handleCreate}
              disabled={creating || !newAuthorId || !newContent.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Đang tạo...' : 'Tạo bài đăng'}
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
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Đang tải...
            </p>
          ) : items.length === 0 ? (
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Chưa có bài đăng
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {items.map((post) => (
                <div
                  key={post.id}
                  className={`${
                    isDarkMode ? 'bg-gray-800' : 'bg-white'
                  } rounded-xl p-6 shadow-md hover:shadow-xl border transition-all duration-300 ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-12 h-12 rounded-full ${
                          isDarkMode
                            ? 'bg-gradient-to-br from-blue-600 to-blue-700'
                            : 'bg-gradient-to-br from-blue-400 to-blue-500'
                        } flex items-center justify-center shadow-md`}
                      >
                        <span className="text-lg font-semibold text-white">
                          {(post.author_name || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-semibold ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            {post.author_name}
                          </p>
                          {post.is_deleted && (
                            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-500 rounded">
                              Đã xóa
                            </span>
                          )}
                          {post.reports_count > 0 && (
                            <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-500 rounded">
                              {post.reports_count} báo cáo
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          {formatDate(post.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p
                    className={`mb-4 leading-relaxed ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    {post.content}
                  </p>

                  {/* Hiển thị ảnh */}
                  {(post.image_url || post.image_urls) && (
                    <div className="mb-4 -mx-2">
                      {post.image_urls && post.image_urls.length > 0 ? (
                        // Hiển thị nhiều ảnh với layout đẹp hơn
                        <div
                          className={`grid gap-2 p-2 ${
                            post.image_urls.length === 1
                              ? 'grid-cols-1'
                              : post.image_urls.length === 2
                              ? 'grid-cols-2'
                              : post.image_urls.length === 3
                              ? 'grid-cols-3'
                              : 'grid-cols-2'
                          }`}
                        >
                          {post.image_urls.slice(0, 4).map((url, idx) => {
                            const imageCount = post.image_urls?.length || 0;
                            const isLast = idx === 3 && imageCount > 4;
                            return (
                              <div
                                key={idx}
                                className={`relative group cursor-pointer ${
                                  imageCount === 3 && idx === 0
                                    ? 'row-span-2'
                                    : ''
                                } ${
                                  imageCount === 1
                                    ? 'aspect-auto'
                                    : 'aspect-square'
                                } rounded-xl overflow-hidden ${
                                  isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                                } shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
                              >
                                {isLast ? (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div
                                      className={`absolute inset-0 ${
                                        isDarkMode
                                          ? 'bg-gray-900/80'
                                          : 'bg-gray-900/70'
                                      }`}
                                    />
                                    <span
                                      className={`relative text-lg font-semibold ${
                                        isDarkMode
                                          ? 'text-gray-100'
                                          : 'text-white'
                                      }`}
                                    >
                                      +{imageCount - 4}
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <img
                                      src={
                                        url.startsWith('http')
                                          ? url
                                          : `https://mpfrdrchsngwmfeelwua.supabase.co/storage/v1/object/public/chat-attachments/${url}`
                                      }
                                      alt={`Post image ${idx + 1}`}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                      onError={(e) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : post.image_url ? (
                        // Hiển thị ảnh đơn với style đẹp hơn
                        <div className="relative group rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                          <div
                            className={`${
                              isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                            }`}
                          >
                            <img
                              src={
                                post.image_url.startsWith('http')
                                  ? post.image_url
                                  : `https://mpfrdrchsngwmfeelwua.supabase.co/storage/v1/object/public/chat-attachments/${post.image_url}`
                              }
                              alt="Post image"
                              className="w-full max-h-[500px] object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.02]"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  'none';
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Hiển thị video */}
                  {post.video_url && (
                    <div className="mb-4 -mx-2">
                      <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                        <video
                          src={
                            post.video_url.startsWith('http')
                              ? post.video_url
                              : `https://mpfrdrchsngwmfeelwua.supabase.co/storage/v1/object/public/chat-attachments/${post.video_url}`
                          }
                          controls
                          className="w-full max-h-[500px] rounded-xl"
                        >
                          Trình duyệt của bạn không hỗ trợ video.
                        </video>
                      </div>
                    </div>
                  )}

                  <div
                    className={`flex items-center justify-between pt-4 border-t ${
                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    } mt-6`}
                  >
                    <div
                      className={`flex items-center gap-4 text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-red-500">❤️</span>
                        <span className="font-medium">
                          {post.reactions_count}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-blue-500">💬</span>
                        <span className="font-medium">
                          {post.comments_count}
                        </span>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(post.id)}
                        className="p-2 rounded-lg hover:bg-blue-500/20 transition-all duration-200 text-blue-500 hover:scale-110"
                        title="Xem chi tiết"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          handleSoftDelete(post.id, post.is_deleted || false)
                        }
                        className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${
                          post.is_deleted
                            ? 'hover:bg-green-500/20 text-green-500'
                            : 'hover:bg-red-500/20 text-red-500'
                        }`}
                        title={post.is_deleted ? 'Khôi phục' : 'Xóa'}
                      >
                        {post.is_deleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Ban className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleHardDelete(post.id)}
                        className="p-2 rounded-lg hover:bg-red-600/20 transition-all duration-200 text-red-600 hover:scale-110"
                        title="Xóa vĩnh viễn"
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

        {/* Detail Modal */}
        {showDetailModal && selectedPost && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
              className={`${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              } rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col`}
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-700">
                <h3
                  className={`text-xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
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
                  }}
                  className={`p-2 rounded-lg hover:bg-gray-700 transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingDetails ? (
                  <div className="text-center py-8">
                    <p
                      className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}
                    >
                      Đang tải...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Comments Section */}
                    <div>
                      <h4
                        className={`text-lg font-semibold mb-4 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        Bình luận ({postComments.length})
                      </h4>
                      <div className="space-y-3">
                        {postComments.length === 0 ? (
                          <p
                            className={`text-sm ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
                                  ? 'bg-gray-700 border-gray-600'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span
                                      className={`font-medium ${
                                        isDarkMode
                                          ? 'text-white'
                                          : 'text-gray-900'
                                      }`}
                                    >
                                      {comment.profiles?.display_name ||
                                        comment.profiles?.username ||
                                        'Unknown'}
                                    </span>
                                    <span
                                      className={`text-xs ${
                                        isDarkMode
                                          ? 'text-gray-400'
                                          : 'text-gray-500'
                                      }`}
                                    >
                                      {formatDate(comment.created_at)}
                                    </span>
                                  </div>
                                  <p
                                    className={`${
                                      isDarkMode
                                        ? 'text-gray-300'
                                        : 'text-gray-700'
                                    }`}
                                  >
                                    {comment.content}
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    handleDeleteComment(comment.id)
                                  }
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

                    {/* Reactions Section */}
                    <div>
                      <h4
                        className={`text-lg font-semibold mb-4 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        Reactions ({postReactions.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {postReactions.length === 0 ? (
                          <p
                            className={`text-sm ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
                                  ? 'bg-gray-700 border-gray-600'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <span className="mr-2">
                                {reaction.reaction_type}
                              </span>
                              <span
                                className={`text-sm ${
                                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}
                              >
                                {reaction.profiles?.display_name ||
                                  reaction.profiles?.username ||
                                  'Unknown'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Reports Section */}
                    <div>
                      <h4
                        className={`text-lg font-semibold mb-4 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        Báo cáo ({postReports.length})
                      </h4>
                      <div className="space-y-3">
                        {postReports.length === 0 ? (
                          <p
                            className={`text-sm ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
                                  ? 'bg-red-900/20 border-red-700'
                                  : 'bg-red-50 border-red-200'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span
                                    className={`font-medium ${
                                      isDarkMode
                                        ? 'text-red-300'
                                        : 'text-red-800'
                                    }`}
                                  >
                                    {report.reporter?.display_name ||
                                      report.reporter?.username ||
                                      'Unknown'}
                                  </span>
                                  <span
                                    className={`text-xs ml-2 ${
                                      isDarkMode
                                        ? 'text-red-400'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {formatDate(report.created_at)}
                                  </span>
                                </div>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    isDarkMode
                                      ? 'bg-red-800 text-red-200'
                                      : 'bg-red-200 text-red-800'
                                  }`}
                                >
                                  {report.reason}
                                </span>
                              </div>
                              {report.description && (
                                <p
                                  className={`text-sm ${
                                    isDarkMode ? 'text-red-200' : 'text-red-700'
                                  }`}
                                >
                                  {report.description}
                                </p>
                              )}
                              {report.status && (
                                <p
                                  className={`text-xs mt-2 ${
                                    isDarkMode ? 'text-red-400' : 'text-red-600'
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
        const res = await fetch('/api/backups', {
          headers: {
            Authorization: `Bearer ${adminToken || ''}`
          }
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error || 'Không tải được danh sách backup');
        setBackups(data.backups || []);
      } catch (e: any) {
        setMessage(e.message || 'Lỗi tải danh sách backup');
      } finally {
        setLoading(false);
      }
    };

    const handleBackup = async () => {
      try {
        setLoading(true);
        setMessage(null);
        const res = await fetch('/api/backup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken || ''}`
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Sao lưu thất bại');
        setMessage(`Đã tạo bản sao lưu: ${data.filename}`);
        await loadBackups();
      } catch (e: any) {
        setMessage(e.message || 'Sao lưu thất bại');
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
        const res = await fetch('/api/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken || ''}`
          },
          body: JSON.stringify({ filename })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Khôi phục thất bại');
        setMessage(`Khôi phục thành công từ ${data.restoredFrom}`);
      } catch (e: any) {
        setMessage(e.message || 'Khôi phục thất bại');
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
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            Sao lưu & Khôi phục
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            className={`${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } rounded-lg p-6 shadow-lg border ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <Database className="w-8 h-8 text-blue-500" />
              <h3
                className={`text-xl font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Tạo bản sao lưu
              </h3>
            </div>

            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}
              >
                <p
                  className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  } mb-2`}
                >
                  Dung lượng lưu trữ hiện tại
                </p>
                <p
                  className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
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
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Người dùng
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span
                    className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Cuộc trò chuyện
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span
                    className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Tin nhắn
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span
                    className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
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
                  loading ? 'bg-blue-400' : 'bg-blue-600'
                } text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2`}
              >
                <Database className="w-5 h-5" />
                <span>Tạo bản sao lưu ngay</span>
              </button>
              {message && (
                <p
                  className={`text-sm mt-3 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  {message}
                </p>
              )}
            </div>
          </div>

          <div
            className={`${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } rounded-lg p-6 shadow-lg border ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <RefreshCw className="w-8 h-8 text-green-500" />
              <h3
                className={`text-xl font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Lịch sử sao lưu
              </h3>
            </div>

            <div className="space-y-3">
              {loading && backups.length === 0 && (
                <p
                  className={`${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Đang tải...
                </p>
              )}
              {backups.map((b, index) => (
                <div
                  key={b.filename + index}
                  className={`${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                  } p-4 rounded-lg flex items-center justify-between`}
                >
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p
                        className={`font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {b.filename}
                      </p>
                      <p
                        className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {new Date(b.createdAt).toLocaleString()} •{' '}
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
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-200 text-gray-900'
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
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
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

  const StatisticsTab: React.FC = () => {
    type StatTagType =
      | 'posts'
      | 'groups'
      | 'messages'
      | 'users'
      | 'user_reports'
      | 'group_reports'
      | 'message_reports';

    const [activeTag, setActiveTag] = useState<StatTagType>('posts');
    const [loading, setLoading] = useState(false);
    const [statsData, setStatsData] = useState<{
      [key: string]: { name: string; value: number }[];
    }>({});

    // Màu sắc cho biểu đồ
    const COLORS = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4' // cyan
    ];

    // Chọn loại biểu đồ dựa trên tag
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

    // Render biểu đồ với recharts
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

      // Format data cho recharts
      const chartData = data.map((item) => ({
        name: item.name,
        value: item.value,
        'Số lượng': item.value
      }));

      const textColor = isDarkMode ? '#e5e7eb' : '#374151';
      const gridColor = isDarkMode ? '#374151' : '#e5e7eb';

      // Custom tooltip style
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

        switch (tag) {
          case 'posts':
            // Thống kê bài post theo tháng trong 6 tháng gần nhất
            {
              const months = [];
              const now = new Date();
              for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push({
                  label: date.toLocaleDateString('vi-VN', {
                    month: 'short',
                    year: 'numeric'
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
                        ).toISOString()
                });
              }

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
            }
            break;

          case 'groups':
            // Thống kê nhóm theo tháng trong 6 tháng gần nhất
            {
              const months = [];
              const now = new Date();
              for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push({
                  label: date.toLocaleDateString('vi-VN', {
                    month: 'short',
                    year: 'numeric'
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
                        ).toISOString()
                });
              }

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
            }
            break;

          case 'messages':
            // Thống kê message theo tháng trong 6 tháng gần nhất
            {
              const months = [];
              const now = new Date();
              for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push({
                  label: date.toLocaleDateString('vi-VN', {
                    month: 'short',
                    year: 'numeric'
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
                        ).toISOString()
                });
              }

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
            }
            break;

          case 'users':
            // Thống kê user theo tháng trong 6 tháng gần nhất
            {
              const months = [];
              const now = new Date();
              for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push({
                  label: date.toLocaleDateString('vi-VN', {
                    month: 'short',
                    year: 'numeric'
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
                        ).toISOString()
                });
              }

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
            }
            break;

          case 'user_reports':
            // Thống kê user reports theo tháng trong 6 tháng gần nhất
            {
              const months = [];
              const now = new Date();
              for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push({
                  label: date.toLocaleDateString('vi-VN', {
                    month: 'short',
                    year: 'numeric'
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
                        ).toISOString()
                });
              }

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
            }
            break;

          case 'group_reports':
            // Thống kê group reports (report về conversations type group)
            // Có thể cần tạo bảng group_reports hoặc dùng message_reports với conversation type group
            // Tạm thời dùng message_reports cho groups
            {
              const months = [];
              const now = new Date();
              for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push({
                  label: date.toLocaleDateString('vi-VN', {
                    month: 'short',
                    year: 'numeric'
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
                        ).toISOString()
                });
              }

              // Lấy message_reports có conversation type là group
              const counts = await Promise.all(
                months.map(async (month) => {
                  // Lấy các message_reports
                  const { data: reports } = await supabase
                    .from('message_reports')
                    .select('message_id')
                    .gte('created_at', month.start)
                    .lte('created_at', month.end);

                  if (!reports || reports.length === 0) {
                    return { name: month.label, value: 0 };
                  }

                  // Lấy các messages từ reports
                  const messageIds = [
                    ...new Set(reports.map((r) => r.message_id))
                  ];
                  const { data: messages } = await supabase
                    .from('messages')
                    .select('conversation_id')
                    .in('id', messageIds);

                  if (!messages || messages.length === 0) {
                    return { name: month.label, value: 0 };
                  }

                  // Lấy các conversations và filter type group
                  const conversationIds = [
                    ...new Set(messages.map((m) => m.conversation_id))
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
            }
            break;

          case 'message_reports':
            // Thống kê message reports theo tháng trong 6 tháng gần nhất
            {
              const months = [];
              const now = new Date();
              for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push({
                  label: date.toLocaleDateString('vi-VN', {
                    month: 'short',
                    year: 'numeric'
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
                        ).toISOString()
                });
              }

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
            }
            break;
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
      message_reports: 'Report Message'
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

        {/* Tags */}
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

        {/* Chart */}
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

  const ReportsTab: React.FC = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2
          className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
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
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Nội dung bị báo cáo
            </h3>
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <p
            className={`text-3xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            127
          </p>
          <p className="text-sm text-red-500 mt-2">+12 trong 24h qua</p>
        </div>

        <div
          className={`${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Tài khoản bị khóa
            </h3>
            <Ban className="w-5 h-5 text-yellow-500" />
          </div>
          <p
            className={`text-3xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            45
          </p>
          <p className="text-sm text-yellow-500 mt-2">+3 trong 7 ngày qua</p>
        </div>

        <div
          className={`${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Thời gian phản hồi TB
            </h3>
            <Clock className="w-5 h-5 text-green-500" />
          </div>
          <p
            className={`text-3xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            2.4h
          </p>
          <p className="text-sm text-green-500 mt-2">-0.8h so với tuần trước</p>
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
          className={`text-lg font-semibold mb-6 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          Báo cáo gần đây
        </h3>
        <div className="space-y-4">
          {[
            {
              type: 'Nội dung không phù hợp',
              reporter: 'user123',
              target: 'post456',
              time: '5 phút trước',
              status: 'pending'
            },
            {
              type: 'Spam',
              reporter: 'user789',
              target: 'message321',
              time: '15 phút trước',
              status: 'resolved'
            },
            {
              type: 'Quấy rối',
              reporter: 'user456',
              target: 'user654',
              time: '1 giờ trước',
              status: 'investigating'
            }
          ].map((report, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-red-500" />
                  <div>
                    <p
                      className={`font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {report.type}
                    </p>
                    <p
                      className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      Báo cáo bởi {report.reporter} • Mục tiêu: {report.target}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    report.status === 'pending'
                      ? 'bg-yellow-500/20 text-yellow-500'
                      : report.status === 'resolved'
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-blue-500/20 text-blue-500'
                  }`}
                >
                  {report.status === 'pending'
                    ? 'Chờ xử lý'
                    : report.status === 'resolved'
                    ? 'Đã giải quyết'
                    : 'Đang điều tra'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600">
                <span
                  className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
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

  // Admin Management Component - Only for superadmin
  const AdminManagementSection: React.FC = () => {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateAdminRequest>({
      email: '',
      password: '',
      fullName: '',
      role: 'admin'
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      setLoading(true);

      try {
        if (!formData.email || !formData.password || !formData.fullName) {
          throw new Error('Vui lòng điền đầy đủ thông tin');
        }

        if (formData.password.length < 6) {
          throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
        }

        await createAdmin(formData);
        setSuccess('Tạo tài khoản admin thành công!');
        setFormData({
          email: '',
          password: '',
          fullName: '',
          role: 'admin'
        });
        setShowCreateForm(false);
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'Tạo tài khoản thất bại');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div
        className={`${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-lg p-6 shadow-lg border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3
              className={`text-lg font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              Quản lý Admin
            </h3>
            <p
              className={`text-sm mt-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Tạo và quản lý tài khoản admin (chỉ Superadmin)
            </p>
          </div>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              Tạo Admin mới
            </button>
          )}
        </div>

        {showCreateForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert
                className={`${
                  isDarkMode
                    ? 'bg-red-900/20 border-red-700'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <AlertDescription
                  className={isDarkMode ? 'text-red-300' : 'text-red-800'}
                >
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert
                className={`${
                  isDarkMode
                    ? 'bg-green-900/20 border-green-700'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <AlertDescription
                  className={isDarkMode ? 'text-green-300' : 'text-green-800'}
                >
                  {success}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Tối thiểu 6 ký tự"
                  minLength={6}
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Vai trò
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as 'admin' | 'superadmin'
                    })
                  }
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setError(null);
                  setSuccess(null);
                  setFormData({
                    email: '',
                    password: '',
                    fullName: '',
                    role: 'admin'
                  });
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Hủy
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

  const SettingsTab: React.FC = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2
          className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          Cài đặt hệ thống
        </h2>
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
            className={`text-lg font-semibold mb-6 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            Cài đặt chung
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Cho phép đăng ký mới
                </p>
                <p
                  className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Xác minh email
                </p>
                <p
                  className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Chế độ bảo trì
                </p>
                <p
                  className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <h3
            className={`text-lg font-semibold mb-6 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            Cài đặt tin nhắn
          </h3>
          <div className="space-y-4">
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Kích thước tệp tối đa (MB)
              </label>
              <input
                type="number"
                defaultValue={50}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Số tin nhắn lưu trữ mỗi cuộc trò chuyện
              </label>
              <input
                type="number"
                defaultValue={10000}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div className="pt-4 border-t border-gray-700">
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Loại tệp được phép
              </label>
              <div className="space-y-2">
                {['Hình ảnh', 'Video', 'Tài liệu', 'Âm thanh'].map((type) => (
                  <label key={type} className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span
                      className={`text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
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
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-lg p-6 shadow-lg border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <h3
          className={`text-lg font-semibold mb-6 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          Cài đặt bảo mật
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Thời gian phiên làm việc (phút)
            </label>
            <input
              type="number"
              defaultValue={60}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Số lần đăng nhập sai tối đa
            </label>
            <input
              type="number"
              defaultValue={5}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
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

      {/* Admin Management Section - Only visible to superadmin */}
      {user?.roles?.includes('superadmin') && <AdminManagementSection />}
    </div>
  );

  const renderContent = (): React.ReactNode => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab stats={stats} isDarkMode={isDarkMode} />;
      case 'users':
        return <UsersTab isDarkMode={isDarkMode} />;
      case 'conversations':
        return <ConversationsTab />;
      case 'posts':
        return <PostsTab />;
      case 'backup':
        return <BackupTab />;
      case 'reports':
        return <ReportsTab />;
      case 'statistics':
        return <StatisticsTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div
      className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
    >
      {/* Sidebar */}
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
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Tổng quan' },
            { id: 'users', icon: Users, label: 'Người dùng' },
            {
              id: 'conversations',
              icon: MessageSquare,
              label: 'Cuộc trò chuyện'
            },
            { id: 'posts', icon: FileText, label: 'Bài đăng' },
            { id: 'reports', icon: Shield, label: 'Báo cáo' },
            { id: 'statistics', icon: BarChart3, label: 'Thống kê' },
            { id: 'backup', icon: Database, label: 'Sao lưu' },
            { id: 'settings', icon: Settings, label: 'Cài đặt' }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
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

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Bar */}
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
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 text-yellow-500'
                    : 'bg-gray-100 text-gray-700'
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
                onClick={async () => {
                  await logout();
                  await reload();
                }}
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

        {/* Content Area */}
        <div className="p-8">{renderContent()}</div>
      </div>
    </div>
  );
};

export default AdminDashboard;
