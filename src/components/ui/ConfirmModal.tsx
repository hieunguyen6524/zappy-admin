import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  isDarkMode?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'default',
  isDarkMode = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${
          isDarkMode ? 'bg-black/70' : 'bg-black/50'
        } backdrop-blur-sm`}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md mx-4 rounded-lg shadow-xl ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {variant === 'danger' && (
              <div className={`p-2 rounded-full ${
                isDarkMode ? 'bg-red-900/30' : 'bg-red-100'
              }`}>
                <AlertCircle className={`w-5 h-5 ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`} />
              </div>
            )}
            <h3
              className={`text-lg font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDarkMode
                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div
            className={`text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            } whitespace-pre-line`}
          >
            {message}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end gap-3 p-6 border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};


