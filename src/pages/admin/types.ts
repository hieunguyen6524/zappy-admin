export type TabType =
  | 'overview'
  | 'users'
  | 'conversations'
  | 'posts'
  | 'backup'
  | 'reports'
  | 'statistics'
  | 'settings';

export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  status: 'online' | 'offline';
  created_at: string;
  is_disabled: boolean;
  is_deleted: boolean | null;
  last_seen_at: string | null;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  photo_url: string;
  created_at: string;
  participants_count: number;
  messages_count: number;
  last_message_at: string;
}

export interface SystemStats {
  total_users: number;
  active_users: number;
  total_conversations: number;
  total_messages: number;
  total_calls: number;
  storage_used: string;
}

export type StatTagType =
  | 'posts'
  | 'groups'
  | 'messages'
  | 'users'
  | 'user_reports'
  | 'group_reports'
  | 'message_reports';
