-- =============================================
-- MeetingHub - Supabase DB 설정
-- Supabase > SQL Editor 에 붙여넣고 Run 클릭!
-- =============================================

-- 1. 지점 테이블
create table if not exists branches (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  emoji text default '🏢',
  created_at timestamptz default now()
);

-- 2. 회의실 테이블
create table if not exists rooms (
  id uuid default gen_random_uuid() primary key,
  branch_id uuid references branches(id) on delete cascade,
  name text not null,
  capacity int default 8,
  color text default '#DBEAFE',
  created_at timestamptz default now()
);

-- 3. 멤버 테이블
create table if not exists members (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  team text,
  email text,
  role text default 'member',
  status text default 'pending',
  created_at timestamptz default now()
);

-- 4. 예약 테이블
create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade,
  member_id uuid,
  date date not null,
  start_hour int not null,
  end_hour int not null,
  description text,
  booker_name text,
  booker_team text,
  created_at timestamptz default now()
);

-- 5. 누구나 읽고 쓸 수 있도록 권한 설정 (사내 앱용)
alter table branches enable row level security;
alter table rooms enable row level security;
alter table members enable row level security;
alter table bookings enable row level security;

create policy "누구나 조회 가능" on branches for select using (true);
create policy "누구나 추가 가능" on branches for insert with check (true);
create policy "누구나 삭제 가능" on branches for delete using (true);

create policy "누구나 조회 가능" on rooms for select using (true);
create policy "누구나 추가 가능" on rooms for insert with check (true);
create policy "누구나 삭제 가능" on rooms for delete using (true);

create policy "누구나 조회 가능" on members for select using (true);
create policy "누구나 추가 가능" on members for insert with check (true);
create policy "누구나 수정 가능" on members for update using (true);
create policy "누구나 삭제 가능" on members for delete using (true);

create policy "누구나 조회 가능" on bookings for select using (true);
create policy "누구나 추가 가능" on bookings for insert with check (true);
create policy "누구나 삭제 가능" on bookings for delete using (true);

-- 6. 샘플 데이터 (선택사항 - 원하면 실행)
insert into branches (name, emoji) values
  ('라미라다 지점', '🏭'),
  ('노워크 지점', '🏢');
