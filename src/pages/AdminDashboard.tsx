import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/services/auth";
import { supabase } from "@/services/supabase";
import type { TabType, SystemStats } from "./admin/types";
import {
  OverviewTab,
  UsersTab,
  ConversationsTab,
  PostsTab,
  BackupTab,
  ReportsTab,
  StatisticsTab,
  SettingsTab,
} from "./admin/tabs";
import { Sidebar } from "./admin/components/Sidebar";
import { Header } from "./admin/components/Header";

const AdminDashboard: React.FC = () => {
  const { user, reload } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Remove mock data - now using real data from Supabase

  // Stats state - will be loaded from Supabase
  const [stats, setStats] = useState<SystemStats>({
    total_users: 0,
    active_users: 0,
    total_conversations: 0,
    total_messages: 0,
    total_calls: 0,
    storage_used: "0 GB",
  });

  const loadStats = async () => {
    try {
      // Count users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Count active users (online)
      const { count: activeUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "online");

      // Count conversations
      const { count: totalConvs } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true });

      // Count messages
      const { count: totalMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true });

      // Count calls
      const { count: totalCalls } = await supabase
        .from("calls")
        .select("*", { count: "exact", head: true });

      setStats({
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        total_conversations: totalConvs || 0,
        total_messages: totalMessages || 0,
        total_calls: totalCalls || 0,
        storage_used: "N/A", // Would need storage calculation
      });
    } catch (e) {
      console.error("Error loading stats:", e);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      loadStats();
    }
  }, [activeTab]);

  const handleLogout = async () => {
    await logout();
    await reload();
  };

  const renderContent = (): React.ReactNode => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab stats={stats} isDarkMode={isDarkMode} />;
      case "users":
        return <UsersTab isDarkMode={isDarkMode} />;
      case "conversations":
        return <ConversationsTab isDarkMode={isDarkMode} />;
      case "posts":
        return <PostsTab isDarkMode={isDarkMode} />;
      case "backup":
        return <BackupTab isDarkMode={isDarkMode} stats={stats} />;
      case "reports":
        return <ReportsTab isDarkMode={isDarkMode} />;
      case "statistics":
        return <StatisticsTab isDarkMode={isDarkMode} />;
      case "settings":
        return <SettingsTab isDarkMode={isDarkMode} user={user} />;
      default:
        return <OverviewTab stats={stats} isDarkMode={isDarkMode} />;
    }
  };

  return (
    <div
      className={`min-h-screen ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      <Sidebar
        activeTab={activeTab}
        isDarkMode={isDarkMode}
        onTabChange={setActiveTab}
      />

      <div className="ml-64">
        <Header
          isDarkMode={isDarkMode}
          user={user}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onLogout={handleLogout}
        />

        <div className="p-8">{renderContent()}</div>
      </div>
    </div>
  );
};

export default AdminDashboard;
