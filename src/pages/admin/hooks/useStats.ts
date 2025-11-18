import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import type { SystemStats } from '../types';

export const useStats = (activeTab: string) => {
  const [stats, setStats] = useState<SystemStats>({
    total_users: 0,
    active_users: 0,
    total_conversations: 0,
    total_messages: 0,
    total_calls: 0,
    storage_used: '0 GB'
  });

  const loadStats = async () => {
    try {
      // Count users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Count active users (online)
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online');

      // Count conversations
      const { count: totalConvs } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      // Count messages
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      // Count calls
      const { count: totalCalls } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true });

      setStats({
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        total_conversations: totalConvs || 0,
        total_messages: totalMessages || 0,
        total_calls: totalCalls || 0,
        storage_used: 'N/A' // Would need storage calculation
      });
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      loadStats();
    }
  }, [activeTab]);

  return { stats, loadStats };
};

