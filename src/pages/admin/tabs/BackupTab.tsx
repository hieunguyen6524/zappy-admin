import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  Shield, 
  Download, 
  Upload,
  AlertCircle,
  Clock,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { SystemStats } from '../types';

interface BackupTabProps {
  isDarkMode: boolean;
  stats: SystemStats;
}

export const BackupTab: React.FC<BackupTabProps> = ({ isDarkMode, stats }) => {
  const [backups, setBackups] = useState<
    Array<{ filename: string; size: number; createdAt: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    filename: string | null;
  }>({ isOpen: false, filename: null });
  const adminToken = (import.meta as any).env.VITE_ADMIN_API_TOKEN as
    | string
    | undefined;

  const loadBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/backups', {
        headers: {
          Authorization: `Bearer ${adminToken || ''}`,
        },
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || 'Không tải được danh sách backup');
      setBackups(data.backups || []);
    } catch (e: any) {
      toast.error(e.message || 'Lỗi tải danh sách backup');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken || ''}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Sao lưu thất bại');
      toast.success(`Đã tạo bản sao lưu thành công: ${data.filename}`);
      await loadBackups();
    } catch (e: any) {
      toast.error(e.message || 'Sao lưu thất bại');
    } finally {
      setBackupLoading(false);
    }
  };

  const openRestoreConfirm = (filename: string) => {
    setConfirmModal({ isOpen: true, filename });
  };

  const handleRestore = async () => {
    const filename = confirmModal.filename;
    if (!filename) return;

    try {
      setRestoreLoading(filename);
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken || ''}`,
        },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Khôi phục thất bại');
      toast.success(`Khôi phục thành công từ ${data.restoredFrom || filename}`);
    } catch (e: any) {
      toast.error(e.message || 'Khôi phục thất bại');
    } finally {
      setRestoreLoading(null);
      setConfirmModal({ isOpen: false, filename: null });
    }
  };

  useEffect(() => {
    loadBackups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
        {/* Backup Section */}
        <div
          className={`${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className={`p-2 rounded-lg ${
              isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
            }`}>
              <Database className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3
                className={`text-xl font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Tạo bản sao lưu
              </h3>
              <p
                className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Sao lưu toàn bộ dữ liệu database
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700/50 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p
                  className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Dung lượng lưu trữ hiện tại
                </p>
              </div>
              <p
                className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                {stats.storage_used || 'N/A'}
              </p>
            </div>

            <div
              className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-700/50' : 'bg-blue-50'
              } border ${
                isDarkMode ? 'border-gray-600' : 'border-blue-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <Shield className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-900'
                    }`}
                  >
                    Thông tin sao lưu
                  </p>
                  <p
                    className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    Bản sao lưu sẽ bao gồm toàn bộ dữ liệu trong database (public và auth schemas). 
                    Quá trình này có thể mất vài phút tùy thuộc vào dung lượng dữ liệu.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleBackup}
              disabled={backupLoading || loading}
              className={`w-full mt-4 px-4 py-3 ${
                backupLoading || loading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white rounded-lg transition-colors flex items-center justify-center space-x-2`}
            >
              {backupLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Đang tạo sao lưu...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Tạo bản sao lưu ngay</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Restore Section */}
        <div
          className={`${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg p-6 shadow-lg border ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className={`p-2 rounded-lg ${
              isDarkMode ? 'bg-green-900/30' : 'bg-green-100'
            }`}>
              <Upload className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3
                className={`text-xl font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Lịch sử sao lưu
              </h3>
              <p
                className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {backups.length} bản sao lưu có sẵn
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {loading && backups.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className={`w-6 h-6 animate-spin ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`} />
                <span className={`ml-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Đang tải...
                </span>
              </div>
            )}
            {backups.map((b, index) => (
              <div
                key={b.filename + index}
                className={`${
                  isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                } p-4 rounded-lg border ${
                  isDarkMode ? 'border-gray-600' : 'border-gray-200'
                } hover:border-blue-500 transition-colors`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className={`p-2 rounded ${
                      isDarkMode ? 'bg-gray-600' : 'bg-white'
                    }`}>
                      <FileText className={`w-4 h-4 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium text-sm mb-1 truncate ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                        title={b.filename}
                      >
                        {b.filename}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <div className={`flex items-center gap-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(b.createdAt)}</span>
                        </div>
                        <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                          •
                        </span>
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {formatFileSize(b.size)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => openRestoreConfirm(b.filename)}
                    disabled={restoreLoading === b.filename || loading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0 ${
                      restoreLoading === b.filename || loading
                        ? isDarkMode
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : isDarkMode
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {restoreLoading === b.filename ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang khôi phục...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Khôi phục</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
            {!loading && backups.length === 0 && (
              <div className={`text-center py-8 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có bản sao lưu nào</p>
                <p className="text-xs mt-1">
                  Tạo bản sao lưu đầu tiên để bắt đầu
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div
        className={`p-4 rounded-lg border ${
          isDarkMode 
            ? 'bg-amber-900/20 border-amber-700' 
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
            isDarkMode ? 'text-amber-400' : 'text-amber-600'
          }`} />
          <div className="flex-1">
            <p className={`font-medium mb-2 ${
              isDarkMode ? 'text-amber-300' : 'text-amber-900'
            }`}>
              Lưu ý quan trọng
            </p>
            <ul className={`text-sm space-y-1 ${
              isDarkMode ? 'text-amber-200' : 'text-amber-800'
            }`}>
              <li>• Bản sao lưu chỉ bao gồm <strong>dữ liệu</strong> (data), không bao gồm schema, triggers, hoặc functions</li>
              <li>• Quá trình sao lưu có thể mất vài phút tùy thuộc vào dung lượng dữ liệu</li>
              <li>• <strong>Khôi phục sẽ XÓA TẤT CẢ dữ liệu hiện tại</strong> và thay thế bằng dữ liệu từ bản backup</li>
              <li>• Hành động khôi phục <strong>KHÔNG THỂ HOÀN TÁC</strong> - vui lòng thận trọng!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirm Restore Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, filename: null })}
        onConfirm={handleRestore}
        title="⚠️ Xác nhận khôi phục"
        message={
          confirmModal.filename ? (
            <>
              <p className="mb-3 font-medium">
                Bạn có chắc muốn khôi phục từ <strong>"{confirmModal.filename}"</strong>?
              </p>
              <p className="mb-2">Hành động này sẽ:</p>
              <ul className="list-disc list-inside space-y-1 mb-3">
                <li>XÓA TẤT CẢ dữ liệu hiện tại trong database</li>
                <li>Khôi phục dữ liệu từ bản backup</li>
              </ul>
              <p className="font-semibold text-red-500">
                ⚠️ Hành động này KHÔNG THỂ HOÀN TÁC!
              </p>
            </>
          ) : (
            ''
          )
        }
        confirmText="Khôi phục"
        cancelText="Hủy"
        variant="danger"
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

