import React, { useState, useEffect } from 'react';
import { Phone, Video } from 'lucide-react';
import { supabase } from '@/services/supabase';

interface CallStatsSectionProps {
  isDarkMode: boolean;
}

export const CallStatsSection: React.FC<CallStatsSectionProps> = ({
  isDarkMode
}) => {
  const [callStats, setCallStats] = useState<{
    audio: number;
    video: number;
    total: number;
  }>({ audio: 0, video: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCallStats = async () => {
      try {
        setLoading(true);
        const [audioResult, videoResult, totalResult] = await Promise.all([
          supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'audio'),
          supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'video'),
          supabase.from('calls').select('*', { count: 'exact', head: true })
        ]);

        setCallStats({
          audio: audioResult.count || 0,
          video: videoResult.count || 0,
          total: totalResult.count || 0
        });
      } catch (e) {
        console.error('Error loading call stats:', e);
      } finally {
        setLoading(false);
      }
    };
    loadCallStats();
  }, []);

  if (loading) {
    return (
      <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
        Đang tải...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Phone className="w-5 h-5 text-green-500" />
          <span
            className={`text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            Cuộc gọi thoại
          </span>
        </div>
        <span
          className={`font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          {callStats.audio.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Video className="w-5 h-5 text-blue-500" />
          <span
            className={`text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            Cuộc gọi video
          </span>
        </div>
        <span
          className={`font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          {callStats.video.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between items-center pt-4 border-t border-gray-700">
        <span
          className={`text-sm font-medium ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          Tổng cộng
        </span>
        <span
          className={`font-bold text-lg ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          {callStats.total.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

