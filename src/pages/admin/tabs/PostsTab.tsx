/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { RefreshCw, FileText, Ban, CheckCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/services/supabase';
import { formatDate } from '../utils';

interface PostsTabProps {
  isDarkMode: boolean;
}

export const PostsTab: React.FC<PostsTabProps> = ({ isDarkMode }) => {
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

      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (search) {
        query = query.ilike('content', `%${search}%`);
      }

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

      const rows = (postsData || []) as Array<any>;

      if (rows.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const authorIds = [...new Set(rows.map((r) => r.author_id))];

      const { data: authorsData } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .in('id', authorIds);

      const authorsMap = new Map(
        (authorsData || []).map((a: any) => [a.id, a])
      );

      const withCounts = await Promise.all(
        rows.map(async (r) => {
          const author = authorsMap.get(r.author_id);

          const [
            { count: commentsCount },
            { count: reactionsCount },
            { count: reportsCount },
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
              .eq('post_id', r.id),
          ]);

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
            reports_count: reportsCount || 0,
          };
        })
      );

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
      await supabase.from('post_comments').delete().eq('post_id', postId);
      await supabase.from('post_reactions').delete().eq('post_id', postId);
      await supabase.from('post_reports').delete().eq('post_id', postId);
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
      const err = e as Error;
      alert(err.message || 'Xóa thất bại');
    }
  };

  const loadPostDetails = async (postId: string) => {
    setLoadingDetails(true);
    try {
      const { data: commentsData, error: commentsErr } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (commentsErr) throw commentsErr;

      const commentUserIds = [
        ...new Set((commentsData || []).map((c: any) => c.user_id)),
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
        profiles: commentUsersMap.get(c.user_id),
      }));

      const { data: reactionsData, error: reactionsErr } = await supabase
        .from('post_reactions')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (reactionsErr) throw reactionsErr;

      const reactionUserIds = [
        ...new Set((reactionsData || []).map((r: any) => r.user_id)),
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
        profiles: reactionUsersMap.get(r.user_id),
      }));

      const { data: reportsData, error: reportsErr } = await supabase
        .from('post_reports')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (reportsErr) throw reportsErr;

      const reportUserIds = [
        ...new Set((reportsData || []).map((r: any) => r.reported_by)),
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
        reporter: reportUsersMap.get(r.reported_by),
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
            <AlertDescription className="text-red-500">{error}</AlertDescription>
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

                {(post.image_url || post.image_urls) && (
                  <div className="mb-4 -mx-2">
                    {post.image_urls && post.image_urls.length > 0 ? (
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
                                imageCount === 3 && idx === 0 ? 'row-span-2' : ''
                              } ${
                                imageCount === 1 ? 'aspect-auto' : 'aspect-square'
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
                                      isDarkMode ? 'text-gray-100' : 'text-white'
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
                                      (e.target as HTMLImageElement).style.display =
                                        'none';
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
                      <span className="font-medium">{post.reactions_count}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-blue-500">💬</span>
                      <span className="font-medium">{post.comments_count}</span>
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
                                      isDarkMode ? 'text-white' : 'text-gray-900'
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
                            <span className="mr-2">{reaction.reaction_type}</span>
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
                                    isDarkMode ? 'text-red-400' : 'text-red-600'
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
