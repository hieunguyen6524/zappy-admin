import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createAdmin, type CreateAdminRequest } from '@/services/auth';

interface AdminManagementSectionProps {
  isDarkMode: boolean;
}

export const AdminManagementSection: React.FC<AdminManagementSectionProps> = ({
  isDarkMode
}) => {
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

