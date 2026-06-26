-- ============================================
--  청첩장 데이터베이스 설정 (한 번만 실행)
--  Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run
-- ============================================

-- 1) 방명록 테이블 -------------------------------------------
create table if not exists guestbook (
  id            bigint generated always as identity primary key,
  name          text        not null,          -- 작성자 이름
  message       text        not null,          -- 메시지
  password_hash text        not null,          -- 비밀번호(암호화되어 저장됨)
  created_at    timestamptz not null default now(),  -- 작성일시
  deleted       boolean     not null default false   -- 삭제 플래그(soft delete)
);

-- 2) 사진 테이블 ---------------------------------------------
create table if not exists photos (
  id            bigint generated always as identity primary key,
  uploader_name text        not null,          -- 업로더 이름
  contact       text,                          -- 연락처(공개 안 됨, DB에만 저장)
  thumb_url     text        not null,          -- 썸네일(목록용, 가벼움)
  full_url      text        not null,          -- 모달용(크게 볼 때)
  file_path     text,                          -- 파일 경로(정리용)
  created_at    timestamptz not null default now(),  -- 업로드 일시
  deleted       boolean     not null default false   -- 삭제 플래그(soft delete)
);

-- 3) 보안: RLS 켜기 ------------------------------------------
-- 이 테이블들은 "서버 API(비밀 키)"로만 접근합니다.
-- RLS를 켜고 정책을 안 만들면, 일반(공개) 접근은 전부 차단됩니다.
-- 서버의 비밀 키(secret key)는 RLS를 우회하므로 정상 작동합니다.
alter table guestbook enable row level security;
alter table photos    enable row level security;

-- 끝! "Success" 가 뜨면 완료입니다 🎉
