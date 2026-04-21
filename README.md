# 🏢 MeetingHub - 회의실 예약 시스템

식품 공장 지점별 회의실을 온라인으로 예약하는 사내 앱입니다.

---

## 🚀 배포 방법 (처음 한 번만!)

### STEP 1. Supabase DB 설정
1. [supabase.com](https://supabase.com) 로그인
2. 프로젝트 선택 → 왼쪽 메뉴 **SQL Editor** 클릭
3. `supabase_setup.sql` 파일 내용을 전체 복사
4. SQL Editor에 붙여넣기 → **Run** 클릭
5. 왼쪽 메뉴 **Project Settings** → **API** 클릭
6. `Project URL` 과 `anon public` 키 복사해두기

### STEP 2. Vercel 환경 변수 설정
1. [vercel.com](https://vercel.com) 로그인
2. 이 프로젝트 선택 → **Settings** → **Environment Variables**
3. 아래 두 개 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon public 키
4. **Save** 클릭

### STEP 3. 재배포
- Vercel 프로젝트 → **Deployments** → 최신 배포 오른쪽 **...** → **Redeploy**

---

## 📱 주요 기능

- 📅 **캘린더 뷰** - 월별 예약 현황 한눈에 확인
- ⏱ **타임라인** - 오늘 시간대별 회의실 현황
- 📋 **내 예약** - 내가 한 예약 목록 및 취소
- ⚙️ **관리자** - 지점/회의실/멤버 추가·삭제

---

## 💰 비용

- Supabase 무료 플랜: 월 0원 (사내 앱 규모로 충분)
- Vercel 무료 플랜: 월 0원
- **총 비용: 0원**
