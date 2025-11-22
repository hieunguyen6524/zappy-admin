import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  User,
  Shield,
  ShieldCheck,
} from "lucide-react";

import type { AuthUser } from "@/services/auth";
import { NotificationBell } from "./NotificationBell";

interface HeaderProps {
  isDarkMode: boolean;
  user: AuthUser | null;
  onToggleDarkMode: () => void;
  onLogout: () => Promise<void>;
  onNotificationClick?: (notification: {
    type: string;
    table: string;
    recordId: string;
  }) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  user,
  onToggleDarkMode,
  onLogout,
  onNotificationClick,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getInitials = (
    name: string | undefined,
    email: string | undefined
  ): string => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 1).toUpperCase();
    }
    if (email) {
      return email.substring(0, 1).toUpperCase();
    }
    return "A";
  };

  const getRoleBadge = (roles: string[] | undefined) => {
    if (!roles || roles.length === 0) return null;
    const isSuperadmin = roles.includes("superadmin");
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          isSuperadmin
            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
        }`}
      >
        {isSuperadmin ? (
          <ShieldCheck className="w-3 h-3" />
        ) : (
          <Shield className="w-3 h-3" />
        )}
        {isSuperadmin ? "Superadmin" : "Admin"}
      </span>
    );
  };
  return (
    <div
      className={`${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      } border-b sticky top-0 z-10`}
    >
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <NotificationBell
            isDarkMode={isDarkMode}
            onNotificationClick={onNotificationClick}
          />

          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-lg ${
              isDarkMode
                ? "bg-gray-700 text-yellow-500"
                : "bg-gray-100 text-gray-700"
            } hover:opacity-80 transition-opacity`}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* User Account Section */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
              } ${
                showUserMenu ? (isDarkMode ? "bg-gray-700" : "bg-gray-100") : ""
              }`}
            >
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg ${
                    isDarkMode ? "ring-2 ring-gray-700" : "ring-2 ring-gray-200"
                  }`}
                >
                  <span className="text-sm font-bold text-white">
                    {getInitials(user?.fullName, user?.email)}
                  </span>
                </div>
                {user?.roles?.includes("superadmin") && (
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border-2 flex items-center justify-center ${
                      isDarkMode ? "border-gray-800" : "border-white"
                    }`}
                  >
                    <ShieldCheck className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <div className="hidden md:block text-left">
                <p
                  className={`text-sm font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {user?.fullName || user?.email}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {getRoleBadge(user?.roles)}
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showUserMenu ? "rotate-180" : ""
                } ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div
                className={`absolute right-0 mt-2 w-64 rounded-lg shadow-xl border z-50 ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <div
                  className={`p-4 border-b ${
                    isDarkMode ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                        <span className="text-base font-bold text-white">
                          {getInitials(user?.fullName, user?.email)}
                        </span>
                      </div>
                      {user?.roles?.includes("superadmin") && (
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border-2 flex items-center justify-center ${
                            isDarkMode ? "border-gray-800" : "border-white"
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {user?.fullName || "Admin"}
                      </p>
                      <p
                        className={`text-xs truncate mt-0.5 ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {user?.email}
                      </p>
                      <div className="mt-1.5">{getRoleBadge(user?.roles)}</div>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isDarkMode
                        ? "hover:bg-red-900/20 text-red-400"
                        : "hover:bg-red-50 text-red-600"
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
