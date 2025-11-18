# Hướng dẫn Migration từ MySQL sang Supabase cho Admin Database

## Tổng quan

Dự án đã được chuyển đổi từ MySQL sang Supabase thứ 2 để lưu trữ tài khoản admin.

## Các thay đổi

1. **server/src/db.js**: Đã thay thế Knex/MySQL bằng Supabase client
2. **server/src/auth.js**: Tất cả queries đã được chuyển sang Supabase syntax
3. **server/package.json**: Đã thêm `@supabase/supabase-js` và loại bỏ `knex`, `mysql2`

## Cài đặt

### 1. Cài đặt dependencies

```bash
cd server
npm install
```

### 2. Tạo Supabase Project thứ 2

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
2. Tạo một project mới (hoặc sử dụng project hiện có)
3. Lấy các thông tin sau:
   - **Project URL** (ADMIN_SUPABASE_URL)
   - **Service Role Key** (ADMIN_SUPABASE_SERVICE_ROLE_KEY) - Lấy từ Settings > API

### 3. Chạy SQL Migration

1. Mở Supabase SQL Editor
2. Chạy file `server/migrations/supabase_init_auth.sql`
3. Kiểm tra các bảng đã được tạo:
   - `users`
   - `roles`
   - `user_roles`
   - `tokens`
   - `token_blacklist`

### 4. Cấu hình Environment Variables

Thêm các biến môi trường sau vào file `.env` của server:

```env
# Admin Supabase (Supabase thứ 2)
ADMIN_SUPABASE_URL=https://your-project.supabase.co
ADMIN_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secret (giữ nguyên)
JWT_SECRET=your-jwt-secret

# Các biến khác (giữ nguyên)
PORT=4000
ADMIN_API_TOKEN=your-admin-api-token
```

### 5. Migrate dữ liệu từ MySQL (nếu có)

Nếu bạn đã có dữ liệu trong MySQL, bạn cần migrate dữ liệu sang Supabase:

1. Export dữ liệu từ MySQL
2. Import vào Supabase bằng cách:
   - Sử dụng Supabase Dashboard > Table Editor
   - Hoặc viết script migration tùy chỉnh

## Lưu ý quan trọng

1. **Service Role Key**: Phải sử dụng Service Role Key (không phải anon key) để bypass Row Level Security (RLS)
2. **RLS Policies**: Nếu bạn muốn bật RLS, cần tạo policies phù hợp. Hiện tại code sử dụng service role key nên không cần RLS
3. **Foreign Keys**: Supabase tự động tạo foreign key constraints, đảm bảo tính toàn vẹn dữ liệu
4. **Timestamps**: Supabase sử dụng `TIMESTAMP WITH TIME ZONE`, khác với MySQL

## Kiểm tra

Sau khi cấu hình xong, khởi động server:

```bash
cd server
npm run dev
```

Test các endpoints:
- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/refresh` - Làm mới token
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/admin/ping` - Kiểm tra authentication (cần token)

## Troubleshooting

### Lỗi "Missing ADMIN_SUPABASE_URL or ADMIN_SUPABASE_SERVICE_ROLE_KEY"
- Kiểm tra file `.env` đã có đầy đủ các biến môi trường

### Lỗi "relation does not exist"
- Chạy lại SQL migration file `supabase_init_auth.sql`

### Lỗi "permission denied"
- Đảm bảo đang sử dụng Service Role Key, không phải anon key

### Lỗi khi join tables
- Kiểm tra foreign key relationships đã được tạo đúng trong Supabase




