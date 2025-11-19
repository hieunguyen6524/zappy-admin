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
    total_posts: 0,
    pending_reports: 0,
    storage_used: "0 GB",
  });

  // Format storage size helper
  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const loadStats = async () => {
    try {
      // Count total users (not deleted)
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .or("is_deleted.is.null,is_deleted.eq.false");

      // Count active users (online and not disabled, not deleted)
      const { count: activeUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "online")
        .eq("is_disabled", false)
        .or("is_deleted.is.null,is_deleted.eq.false");

      // Count conversations (not deleted)
      const { count: totalConvs } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .or("is_deleted.is.null,is_deleted.eq.false");

      // Count messages
      const { count: totalMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true });

      // Count calls
      const { count: totalCalls } = await supabase
        .from("calls")
        .select("*", { count: "exact", head: true });

      // Count posts (not deleted)
      const { count: totalPosts } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .or("is_deleted.is.null,is_deleted.eq.false");

      // Count all pending reports (user, conversation, post, message)
      const [userReports, convReports, postReports, messageReports] = await Promise.all([
        supabase
          .from("user_reports")
          .select("*", { count: "exact", head: true })
          .or("status.is.null,status.eq.pending"),
        supabase
          .from("conversation_reports")
          .select("*", { count: "exact", head: true })
          .or("status.is.null,status.eq.pending"),
        supabase
          .from("post_reports")
          .select("*", { count: "exact", head: true })
          .or("status.is.null,status.eq.pending"),
        supabase
          .from("message_reports")
          .select("*", { count: "exact", head: true })
          .or("status.is.null,status.eq.pending"),
      ]);

      const pendingReports = (userReports.count || 0) + 
                            (convReports.count || 0) + 
                            (postReports.count || 0) + 
                            (messageReports.count || 0);

      // Calculate storage used from attachments
      // Note: This loads all attachments which may be slow for large datasets
      // Consider creating an RPC function for better performance
      let storageUsed = "0 B";
      try {
        const { data: attachments, error } = await supabase
          .from("attachments")
          .select("byte_size");
        
        if (error) {
          console.error("Error fetching attachments:", error);
        } else if (attachments && attachments.length > 0) {
          const totalBytes = attachments.reduce((sum, att) => sum + (att.byte_size || 0), 0);
          storageUsed = formatStorageSize(totalBytes);
        }
      } catch (e) {
        console.error("Error calculating storage:", e);
      }

      setStats({
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        total_conversations: totalConvs || 0,
        total_messages: totalMessages || 0,
        total_calls: totalCalls || 0,
        total_posts: totalPosts || 0,
        pending_reports: pendingReports || 0,
        storage_used: storageUsed,
      });
    } catch (e) {
      console.error("Error loading stats:", e);
    }
  };

  useEffect(() => {
    if (activeTab === "overview" || activeTab === "backup") {
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
        return (
          <OverviewTab
            stats={stats}
            isDarkMode={isDarkMode}
            onRefresh={loadStats}
          />
        );
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
