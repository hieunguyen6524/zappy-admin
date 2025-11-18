/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Trash2, MessagesSquare } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/services/supabase';
import type { Conversation } from '../types';
import { formatDate } from '../utils';

interface ConversationsTabProps {
  isDarkMode: boolean;
}

export const ConversationsTab: React.FC<ConversationsTabProps> = ({ isDarkMode }) => {
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

