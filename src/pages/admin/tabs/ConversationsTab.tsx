/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Trash2, MessagesSquare, ChevronLeft, ChevronRight, Ban, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/services/supabase';
import type { Conversation } from '../types';
import { formatDate } from '../utils';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ConversationsTabProps {
  isDarkMode: boolean;
}

const ITEMS_PER_PAGE = 20;

export const ConversationsTab: React.FC<ConversationsTabProps> = ({ isDarkMode }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'active' | 'deleted'>('all');

  // Modal states for confirmations and alerts
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
    variant?: 'default' | 'danger';
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    variant: 'default',
    confirmText: 'Xác nhận',
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'default' | 'danger';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'default',
  });

  const loadConversations = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Lấy danh sách conversations với pagination
      let query = supabase
        .from('conversations')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      // Filter theo trạng thái xóa mềm
      if (filter === 'active') {
        query = query.or('is_deleted.is.null,is_deleted.eq.false');
      } else if (filter === 'deleted') {
        query = query.eq('is_deleted', true);
      }

      const { data: convs, count, error: convErr } = await query.range(from, to);

      if (convErr) throw convErr;

      setTotalCount(count || 0);

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
              lastMessage?.created_at || conv.updated_at || conv.created_at,
            is_deleted: conv.is_deleted || false
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

  const handleSoftDelete = async (conversationId: string, isDeleted: boolean) => {
    const action = isDeleted ? 'khôi phục' : 'xóa mềm';
    setConfirmModal({
      isOpen: true,
      title: `Xác nhận ${action} cuộc trò chuyện`,
      message: `Bạn có chắc muốn ${action} cuộc trò chuyện này?`,
      variant: 'danger',
      confirmText: action === 'xóa mềm' ? 'Xóa' : 'Khôi phục',
      onConfirm: async () => {
        try {
          const { error: err } = await supabase
            .from('conversations')
            .update({ is_deleted: !isDeleted })
            .eq('id', conversationId);
          if (err) throw err;
          await loadConversations(currentPage);
        } catch (e) {
          const err = e as Error;
          setAlertModal({
            isOpen: true,
            title: 'Lỗi',
            message: err.message || `${action.charAt(0).toUpperCase() + action.slice(1)} thất bại`,
            variant: 'danger',
          });
        }
      },
    });
  };

  const handleHardDelete = async (conversationId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận xóa vĩnh viễn',
      message: 'Bạn có chắc muốn xóa vĩnh viễn cuộc trò chuyện này? Tất cả tin nhắn và dữ liệu liên quan sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác!',
      variant: 'danger',
      confirmText: 'Xóa vĩnh viễn',
      onConfirm: async () => {
        try {
          // Xóa conversation sẽ cascade delete participants và messages (nếu có foreign key cascade)
          const { error: err } = await supabase
            .from('conversations')
            .delete()
            .eq('id', conversationId);
          if (err) throw err;
          await loadConversations(currentPage);
        } catch (e) {
          const err = e as Error;
          setAlertModal({
            isOpen: true,
            title: 'Lỗi',
            message: err.message || 'Xóa thất bại',
            variant: 'danger',
          });
        }
      },
    });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    loadConversations(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filter]);

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
          onClick={() => loadConversations(currentPage)}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* Filter buttons */}
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
                    className={`px-4 py-3 text-left text-sm font-semibold ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Trạng thái
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
                    <td colSpan={7} className="px-4 py-8 text-center">
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
                    <td colSpan={7} className="px-4 py-8 text-center">
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
                      <td className="px-4 py-4">
                        {conv.is_deleted ? (
                          <span className="px-2 py-1 text-xs bg-red-500/20 text-red-500 rounded">
                            Đã xóa
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-green-500/20 text-green-500 rounded">
                            Hoạt động
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleSoftDelete(conv.id, conv.is_deleted || false)}
                            className={`p-2 rounded-lg transition-colors ${
                              conv.is_deleted
                                ? 'hover:bg-green-500/20 text-green-500'
                                : 'hover:bg-red-500/20 text-red-500'
                            }`}
                            title={conv.is_deleted ? 'Khôi phục' : 'Xóa mềm'}
                          >
                            {conv.is_deleted ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <Ban className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleHardDelete(conv.id)}
                            className="p-2 rounded-lg hover:bg-red-600/20 transition-colors text-red-600"
                            title="Xóa vĩnh viễn"
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

          {/* Pagination */}
          {Math.ceil(totalCount / ITEMS_PER_PAGE) > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-700">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentPage === 1
                    ? 'opacity-50 cursor-not-allowed'
                    : isDarkMode
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Trước
              </button>
              <span
                className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}
              >
                Trang {currentPage} / {Math.ceil(totalCount / ITEMS_PER_PAGE)}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), p + 1)
                  )
                }
                disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)
                    ? 'opacity-50 cursor-not-allowed'
                    : isDarkMode
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Sau
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({
            isOpen: false,
            title: '',
            message: '',
            onConfirm: null,
          })
        }
        onConfirm={() => {
          if (confirmModal.onConfirm) {
            confirmModal.onConfirm();
          }
          setConfirmModal({
            isOpen: false,
            title: '',
            message: '',
            onConfirm: null,
          });
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText || 'Xác nhận'}
        variant={confirmModal.variant || 'default'}
        isDarkMode={isDarkMode}
      />

      {/* Alert Modal */}
      <ConfirmModal
        isOpen={alertModal.isOpen}
        onClose={() =>
          setAlertModal({
            isOpen: false,
            title: '',
            message: '',
          })
        }
        onConfirm={() =>
          setAlertModal({
            isOpen: false,
            title: '',
            message: '',
          })
        }
        title={alertModal.title}
        message={alertModal.message}
        confirmText="Đóng"
        variant={alertModal.variant || 'default'}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

