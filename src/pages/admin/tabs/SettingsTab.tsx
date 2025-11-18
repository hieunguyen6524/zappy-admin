import React from 'react';
import { AdminManagementSection } from '../components/AdminManagementSection';
import type { AuthUser } from '@/services/auth';

interface SettingsTabProps {
  isDarkMode: boolean;
  user: AuthUser | null;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  isDarkMode,
  user,
}) => (
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

    {user?.roles?.includes('superadmin') && (
      <AdminManagementSection isDarkMode={isDarkMode} />
    )}
  </div>
);

