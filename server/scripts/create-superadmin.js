import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const supabaseUrl = process.env.ADMIN_SUPABASE_URL;
const supabaseKey = process.env.ADMIN_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Missing ADMIN_SUPABASE_URL or ADMIN_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createSuperadmin() {
  try {
    console.log("=== Tạo tài khoản Superadmin ===\n");

    // Check if superadmin already exists
    const { data: existingProfiles } = await db
      .from("admin_profiles")
      .select("id, full_name")
      .eq("role", "superadmin")
      .eq("is_active", true);

    if (existingProfiles && existingProfiles.length > 0) {
      console.log("⚠️  Đã có superadmin tồn tại:");
      for (const p of existingProfiles) {
        const { data: authUser } = await db.auth.admin.getUserById(p.id);
        const email = authUser?.user?.email || "N/A";
        console.log(`   - ${p.full_name} (${email})`);
      }
      
      const overwrite = await question("\nBạn có muốn tạo thêm superadmin khác? (y/n): ");
      if (overwrite.toLowerCase() !== "y") {
        console.log("Đã hủy.");
        rl.close();
        return;
      }
    }

    const email = await question("Email: ");
    if (!email) {
      console.error("Email là bắt buộc!");
      rl.close();
      return;
    }

    const password = await question("Password: ");
    if (!password || password.length < 6) {
      console.error("Password phải có ít nhất 6 ký tự!");
      rl.close();
      return;
    }

    const fullName = await question("Full Name (mặc định: Super Admin): ") || "Super Admin";

    console.log("\nĐang tạo tài khoản...");

    // Check if email already exists
    const { data: allUsers } = await db.auth.admin.listUsers();
    const emailExists = allUsers?.users?.some((u) => u.email === email);

    if (emailExists) {
      console.error(`❌ Email ${email} đã tồn tại!`);
      rl.close();
      return;
    }

    // Create user via Supabase Auth Admin API
    const { data: newUser, error: createError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError || !newUser?.user) {
      console.error("❌ Lỗi khi tạo user:", createError?.message || "Unknown error");
      rl.close();
      return;
    }

    const userId = newUser.user.id;
    console.log(`✓ Đã tạo user trong auth.users: ${userId}`);

    // Create admin profile
    const { error: profileError } = await db.from("admin_profiles").insert({
      id: userId,
      full_name: fullName,
      role: "superadmin",
      is_active: true,
    });

    if (profileError) {
      console.error("❌ Lỗi khi tạo admin profile:", profileError.message);
      // Try to cleanup
      await db.auth.admin.deleteUser(userId);
      rl.close();
      return;
    }

    console.log("✓ Đã tạo admin profile");
    console.log("\n✅ Tạo tài khoản superadmin thành công!");
    console.log(`\nThông tin tài khoản:`);
    console.log(`   Email: ${email}`);
    console.log(`   Full Name: ${fullName}`);
    console.log(`   Role: superadmin`);
    console.log(`   User ID: ${userId}`);
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  } finally {
    rl.close();
  }
}

createSuperadmin();

