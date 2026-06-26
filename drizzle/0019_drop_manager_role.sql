-- Bỏ role "manager"; người dùng manager cũ chuyển sang "admin" (hiển thị là "Manager").
UPDATE "profiles" SET "role" = 'admin' WHERE "role" = 'manager';
