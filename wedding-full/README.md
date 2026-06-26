# 💌 동수 ♥ 예지 모바일 청첩장 — 배포 가이드

처음 해보셔도 괜찮아요. **복사 → 붙여넣기 → 클릭** 위주예요.
순서대로만 따라오시면 됩니다. 막히면 그 단계 번호를 알려주세요!

---

## 📁 폴더 구성 (참고용 — 손댈 필요 없어요)

```
wedding/
├─ public/
│  ├─ index.html      ← 청첩장 화면
│  └─ app.js          ← 사진 업로드·방명록 동작
├─ netlify/functions/
│  ├─ upload-url.js   ← 사진 업로드용 임시 URL 발급
│  ├─ photos.js       ← 갤러리 사진 저장/조회
│  └─ guestbook.js    ← 방명록 작성/조회/삭제
├─ supabase-setup.sql ← DB 만드는 SQL
├─ package.json
└─ netlify.toml
```

---

## 1단계 · Supabase DB 만들기

1. Supabase 대시보드 → 왼쪽 **SQL Editor**
2. `supabase-setup.sql` 파일 내용을 **통째로 복사** → 붙여넣기 → **Run**
3. "Success" 뜨면 완료 ✅

## 2단계 · 사진 저장소(Storage) 만들기

1. 왼쪽 **Storage** → **New bucket**
2. 이름: **`gallery`** (정확히 이 이름으로!)
3. **Public bucket** 토글을 **켜기** ✅ (사진을 하객들이 볼 수 있어야 하니까요)
4. (선택) Additional settings에서 파일 크기 제한을 `5 MB` 정도로 둬도 좋아요
5. **Save**

> 업로드는 서버가 발급한 임시 URL로만 가능해서, 아무나 막 올릴 수는 없어요. 읽기만 공개예요.

## 3단계 · 서버에 넣을 비밀 정보 2개 챙기기

Settings(⚙️) → **API Keys** 로 가서 아래 2개를 메모해두세요. **이건 절대 공개하면 안 돼요** (방명록 비번 등을 다루는 키라서요).

- **SUPABASE_URL** : `https://xxxxx.supabase.co`
- **SUPABASE_SECRET_KEY** : `sb_secret_...` 로 시작하는 키
  - 만약 그게 없고 `service_role`(`eyJ...`)만 보이면 그걸 쓰셔도 돼요.

## 4단계 · Netlify에 올리기 (GitHub 연결)

> ⚠️ 예전에 게임 올릴 땐 파일을 그냥 끌어다 놓으면 됐죠? 이번엔 **서버 기능**이 생겨서, Netlify가 자동으로 설치·빌드하도록 **GitHub 연결**로 올리는 게 제일 안전해요.

1. [github.com](https://github.com) 가입/로그인 → **New repository** → 이름 아무거나 → **Create**
2. 그 화면에서 **uploading an existing file** 클릭 → 이 폴더의 **모든 파일**을 끌어다 올리기 → **Commit**
3. [netlify.com](https://app.netlify.com) 로그인 → **Add new site → Import an existing project → GitHub** → 방금 만든 저장소 선택
4. 빌드 설정은 `netlify.toml`에 이미 들어있어서 그대로 **Deploy** 누르면 돼요

## 5단계 · 환경변수(비밀 정보) 넣기

1. Netlify 사이트 화면 → **Site configuration → Environment variables**
2. **Add a variable** 로 2개 추가:
   - `SUPABASE_URL` = (3단계의 URL)
   - `SUPABASE_SECRET_KEY` = (3단계의 secret key)
3. **Deploys** 탭 → **Trigger deploy → Deploy site** (변수 적용을 위해 한 번 다시 배포)

## 6단계 · 확인!

- 사이트 주소로 들어가서 갤러리에 사진을 올려보고, 방명록도 남겨보세요.
- 사진이 보이고 방명록이 저장되면 **성공!** 🎉

---

## 🛠️ 안 될 때 체크리스트

- 사진이 안 올라가요 → 버킷 이름이 정확히 `gallery` 인지, **Public** 인지 확인
- 방명록이 저장이 안 돼요 → Netlify 환경변수 2개가 정확한지, 저장 후 **다시 배포**했는지 확인
- 그래도 안 되면 → Netlify의 **Functions** 탭에서 로그(빨간 글씨)를 복사해서 저(클로드)에게 보여주세요. 같이 고쳐요!

## ✏️ 내용 채우는 곳 (디자인 확정 후)

- 신랑신부/부모님 이름, 날짜, 장소 → `public/index.html`
- 예식 날짜(D-day) → `public/app.js` 안의 `new Date(2025, 11, 31)` 부분
- Q&A 답변 → `public/index.html` 의 Q&A 영역
