-- ============================================================================
-- SunTalent — RLS policies + profile bootstrap
-- Chạy file này trong Supabase SQL Editor SAU khi đã `pnpm db:push` (tạo bảng).
--
-- Mô hình MVP: "kho ứng viên dùng chung" — mọi user đã đăng nhập đọc được
-- toàn bộ dữ liệu nghiệp vụ (đúng giá trị tái sử dụng nguồn ứng viên).
-- Ghi/sửa đi qua tầng server (Drizzle dùng connection có quyền, bỏ qua RLS),
-- nên RLS ở đây chủ yếu chặn truy cập trực tiếp bằng anon/authenticated key
-- (supabase-js client, realtime). Siết chặt hơn theo team ở phase sau.
-- ============================================================================

-- 1) Bật RLS trên tất cả bảng nghiệp vụ
alter table profiles          enable row level security;
alter table clients           enable row level security;
alter table skills            enable row level security;
alter table candidates        enable row level security;
alter table candidate_skills  enable row level security;
alter table work_experiences  enable row level security;
alter table jobs              enable row level security;
alter table applications      enable row level security;
alter table interactions      enable row level security;
alter table match_scores      enable row level security;
alter table audit_log         enable row level security;

-- 2) Cho phép user đã đăng nhập ĐỌC dữ liệu nghiệp vụ dùng chung
do $$
declare t text;
begin
  foreach t in array array[
    'clients','skills','candidates','candidate_skills','work_experiences',
    'jobs','applications','interactions','match_scores'
  ]
  loop
    execute format(
      'create policy %I on %I for select to authenticated using (true);',
      t || '_read_authenticated', t
    );
  end loop;
end $$;

-- 3) profiles: ai cũng đọc được (để hiển thị tên recruiter), chỉ sửa hàng của mình
create policy profiles_read_authenticated on profiles
  for select to authenticated using (true);
create policy profiles_update_self on profiles
  for update to authenticated using (auth.uid() = id);

-- 4) audit_log: chỉ đọc, không cho client ghi (server ghi qua connection riêng)
create policy audit_read_authenticated on audit_log
  for select to authenticated using (true);

-- 5) Tự tạo profiles khi có user mới đăng ký qua Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
