/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Search, Ban, Trash2, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/services/supabase';
import type { User } from '../types';
import { formatDate } from '../utils';

interface UsersTabProps {
  isDarkMode: boolean;
}

export const UsersTab: React.FC<UsersTabProps> = ({ isDarkMode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usersSearchQuery, setUsersSearchQuery] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

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
            : '',
          status: u.status,
          created_at: u.created_at,
          is_disabled: u.is_disabled || false,
          last_seen_at: u.last_seen_at
        }))
      );
    } catch (e) {
      const err = e as Error;
      setError(err.message || 'Không tải được danh sách người dùng');
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
          currentStatus ? 'mở khóa' : 'khóa'
        } người dùng này?`
      )
    )
      return;
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ is_disabled: !currentStatus })
        .eq('id', userId);
      if (err) throw err;
      await loadUsers();
    } catch (e) {
      const err = e as Error;
      alert(err.message || 'Thao tác thất bại');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        'Bạn có chắc muốn xóa người dùng này? Hành động này không thể hoàn tác.'
      )
    )
      return;
    try {
      const { error: err } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      if (err) throw err;
      await loadUsers();
    } catch (e) {
      const err = e as Error;
      alert(err.message || 'Xóa thất bại');
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
            isDarkMode ? 'text-white' : 'text-gray-900'
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
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>

      {error && (
        <Alert>
          <AlertDescription className="text-red-500">{error}</AlertDescription>
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
          <div className="relative mb-4">
            <Search
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            />
            <input
              type="text"
              placeholder="Tìm kiếm người dùng..."
              value={usersSearchQuery}
              onChange={(e) => setUsersSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

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
                    Người dùng
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-sm font-semibold ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Trạng thái
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-sm font-semibold ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Ngày tham gia
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
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <p
                        className={
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                      } hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
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
                                isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
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
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}
                            >
                              {user.display_name}
                            </p>
                            <p
                              className={`text-sm ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
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
                              user.status === 'online'
                                ? 'bg-green-500'
                                : 'bg-gray-500'
                            }`}
                          />
                          <span
                            className={`text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            } capitalize`}
                          >
                            {user.status === 'online'
                              ? 'Trực tuyến'
                              : 'Ngoại tuyến'}
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
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {formatDate(user.created_at)}
                      </td>
                      <td
                        className={`px-4 py-4 text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {user.last_seen_at
                          ? formatDate(user.last_seen_at)
                          : 'Chưa xác định'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end items-center space-x-2">
                          <button
                            onClick={() =>
                              handleDisableUser(user.id, user.is_disabled)
                            }
                            className={`p-2 rounded-lg transition-colors ${
                              user.is_disabled
                                ? 'hover:bg-green-500/20 text-green-500'
                                : 'hover:bg-yellow-500/20 text-yellow-500'
                            }`}
                            title={user.is_disabled ? 'Mở khóa' : 'Khóa'}
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

