# Hướng dẫn Setup Supabase Auth cho Admin System

## Tổng quan

Hệ thống đã được chuyển sang sử dụng **Supabase Auth** (bảng `auth.users`) thay vì bảng `users` tự tạo. Chỉ có **superadmin** mới có quyền tạo tài khoản admin khác.

## Các thay đổi chính

1. **Sử dụng Supabase Auth**: Tất cả tài khoản được lưu trong `auth.users` của Supabase
2. **Bảng admin_profiles**: Lưu thông tin bổ sung (full_name, role) liên kết với `auth.users`
3. **Quyền superadmin**: Chỉ superadmin mới có thể tạo tài khoản admin khác
4. **Không có tự đăng ký**: Không có endpoint công khai để đăng ký

## Cài đặt

### 1. Chạy SQL Migration

Mở Supabase SQL Editor và chạy file:
```
server/migrations/supabase_auth_setup.sql
```

File này sẽ tạo:
- Bảng `admin_profiles` để lưu thông tin admin
- Các function helper (is_superadmin, is_admin)
- RLS policies

### 2. Tạo tài khoản Superadmin đầu tiên

Chạy script để tạo superadmin:

```bash
cd server
npm run create-superadmin
```

Script sẽ hỏi:
- Email
- Password (tối thiểu 6 ký tự)
- Full Name (mặc định: "Super Admin")

### 3. Cấu hình Environment Variables

Đảm bảo file `.env` có các biến sau:

```env
# Admin Supabase (Supabase thứ 2)
ADMIN_SUPABASE_URL=https://your-project.supabase.co
ADMIN_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secret (cho access tokens)
JWT_SECRET=your-jwt-secret

# Các biến khác
PORT=4000
ADMIN_API_TOKEN=your-admin-api-token
```

## Sử dụng

### Đăng nhập

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "accessToken": "jwt-token",
  "accessTokenExpiresAt": "2024-01-01T00:00:00.000Z",
  "refreshToken": "supabase-refresh-token",
  "refreshTokenExpiresAt": "2024-01-08T00:00:00.000Z",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "fullName": "Admin Name",
    "role": "admin",
    "roles": ["admin"]
  }
}
```

### Tạo tài khoản Admin mới (chỉ superadmin)

```bash
POST /api/auth/register
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "password": "password123",
  "fullName": "New Admin",
  "role": "admin"  // hoặc "superadmin"
}
```

**Lưu ý**: 
- Chỉ superadmin mới có quyền gọi endpoint này
- Role có thể là `"admin"` hoặc `"superadmin"`

### Refresh Token

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "supabase-refresh-token"
}
```

### Đăng xuất

```bash
POST /api/auth/logout
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "refreshToken": "supabase-refresh-token"
}
```

## Cấu trúc Database

### auth.users (Supabase Auth)
- `id` (UUID): Primary key
- `email`: Email đăng nhập
- `encrypted_password`: Mật khẩu đã mã hóa
- `email_confirmed_at`: Thời gian xác nhận email
- `created_at`: Thời gian tạo
- `updated_at`: Thời gian cập nhật

### admin_profiles
- `id` (UUID): Foreign key → `auth.users.id`
- `full_name`: Tên đầy đủ
- `role`: `'admin'` hoặc `'superadmin'`
- `is_active`: Trạng thái hoạt động
- `created_at`: Thời gian tạo
- `updated_at`: Thời gian cập nhật

## Quyền (Roles)

- **superadmin**: 
  - Có tất cả quyền của admin
  - Có thể tạo tài khoản admin/superadmin mới
  - Có thể quản lý tất cả admin khác

- **admin**: 
  - Có thể đăng nhập và sử dụng hệ thống
  - Không thể tạo tài khoản mới

## Middleware

### requireAuth(roles)

Kiểm tra authentication và role:

```javascript
import { requireAuth } from './auth.js';

// Yêu cầu đăng nhập (bất kỳ admin nào)
app.get('/api/protected', requireAuth(), handler);

// Yêu cầu role cụ thể
app.get('/api/admin-only', requireAuth(['admin', 'superadmin']), handler);
```

## Troubleshooting

### Lỗi "User is not an admin"
- Kiểm tra xem đã tạo `admin_profiles` cho user chưa
- Kiểm tra `is_active = true`

### Lỗi "Only superadmin can create accounts"
- Đảm bảo token được gửi kèm trong header `Authorization: Bearer <token>`
- Kiểm tra user có role `superadmin` trong `admin_profiles`

### Lỗi "Invalid credentials"
- Kiểm tra email và password
- Kiểm tra user đã được tạo trong `auth.users`
- Kiểm tra `admin_profiles.is_active = true`

### Lỗi khi tạo superadmin
- Đảm bảo đã chạy SQL migration
- Kiểm tra `ADMIN_SUPABASE_SERVICE_ROLE_KEY` đúng
- Kiểm tra email chưa tồn tại trong `auth.users`

## Migration từ hệ thống cũ

Nếu bạn đang migrate từ hệ thống cũ (MySQL/custom users):

1. Export danh sách users từ hệ thống cũ
2. Tạo từng user trong Supabase Auth bằng script hoặc Admin API
3. Tạo `admin_profiles` tương ứng
4. Xóa bảng `users` cũ (nếu có)

## Bảo mật

1. **Service Role Key**: Chỉ sử dụng trong backend, không expose ra frontend
2. **JWT Secret**: Giữ bí mật, sử dụng biến môi trường
3. **RLS Policies**: Đã được thiết lập để bảo vệ `admin_profiles`
4. **Password**: Supabase tự động hash password, không lưu plain text




