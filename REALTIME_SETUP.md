# Hướng dẫn Setup Realtime Notifications

## Tổng quan

Hệ thống thông báo real-time sử dụng Supabase Realtime để lắng nghe các báo cáo mới từ người dùng và hiển thị thông báo ngay lập tức.

## Cài đặt Supabase Realtime

### 1. Enable Realtime cho các bảng Reports

Trong Supabase Dashboard:

1. Vào **Database** > **Replication**
2. Enable Realtime cho các bảng sau:
   - `user_reports`
   - `post_reports`
   - `message_reports`
   - `conversation_reports`

Hoặc chạy SQL sau trong SQL Editor:

```sql
-- Enable Realtime for report tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE post_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_reports;
```

### 2. Kiểm tra RLS Policies

Đảm bảo RLS policies cho phép admin đọc các bảng reports. Nếu cần, tạo policy:

```sql
-- Example policy (adjust based on your needs)
CREATE POLICY "Admins can read reports"
ON user_reports FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  )
);
```

## Cách hoạt động

1. **Realtime Subscriptions**: Component `NotificationBell` đăng ký lắng nghe các sự kiện INSERT trên các bảng reports
2. **Toast Notifications**: Khi có report mới, hiển thị toast notification ở góc trên bên phải
3. **Badge Counter**: Hiển thị số lượng reports chưa đọc trên icon bell
4. **Dropdown**: Click vào bell để xem danh sách tất cả notifications
5. **Navigation**: Click vào notification để chuyển đến Reports tab

## Features

- ✅ Real-time notifications khi có report mới
- ✅ Toast popup với thông tin chi tiết
- ✅ Badge counter hiển thị số lượng chưa đọc
- ✅ Dropdown với danh sách notifications
- ✅ Đánh dấu đã đọc/ chưa đọc
- ✅ Tự động load initial reports khi component mount
- ✅ Click notification để navigate đến Reports tab

## Troubleshooting

### Không nhận được thông báo

1. Kiểm tra Realtime đã được enable cho các bảng reports
2. Kiểm tra RLS policies cho phép đọc
3. Kiểm tra console để xem có lỗi subscription không
4. Đảm bảo Supabase project có Realtime enabled (trong Settings)

### Toast không hiển thị

1. Kiểm tra `react-hot-toast` đã được cài đặt
2. Kiểm tra `<Toaster />` đã được thêm vào App.tsx
3. Kiểm tra console để xem có lỗi không

### Badge không cập nhật

1. Kiểm tra state management trong NotificationBell
2. Kiểm tra logic đếm unread notifications
3. Kiểm tra xem notifications có được thêm vào state không

