# 🏡 가정 운영 에이전트

맞벌이 부부를 위한 가정 운영 웹앱 MVP입니다.

## 주요 기능

- **집안일 관리**: 집안일 CRUD, 이번 주 자동 분배 (AI / fallback)
- **경조사 관리**: 행사 등록, D-30/14/7/3/1 준비 체크리스트 자동 생성
- **선물 이력**: 선물 기록 및 반응 추적
- **대시보드**: 오늘 할 일, 이번 주 집안일, 담당자별 업무량, 다가오는 행사

## 기술 스택

- **Frontend**: Next.js 15 + TypeScript
- **Styling**: Tailwind CSS
- **DB**: Supabase (PostgreSQL)
- **AI**: OpenAI API (gpt-4o-mini) — 없으면 fallback 동작

## 시작하기

### 1. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local`에 Supabase URL, Anon Key, OpenAI API Key를 입력합니다.

### 2. Supabase 테이블 생성

Supabase Dashboard → SQL Editor에서 다음 파일을 순서대로 실행합니다.

```
supabase/migrations/001_initial.sql
supabase/seed.sql
```

### 3. 패키지 설치 및 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 으로 접속합니다.

## 디렉토리 구조

```
app/
  page.tsx              # 대시보드
  members/page.tsx      # 가족 구성원 관리
  tasks/page.tsx        # 집안일 관리
  events/page.tsx       # 경조사 목록
  events/[id]/page.tsx  # 경조사 상세 + 체크리스트
  gifts/page.tsx        # 선물 이력
  api/
    assign-tasks/       # 주간 집안일 자동 분배 API
    generate-checklist/ # 경조사 체크리스트 생성 API
lib/
  types.ts      # 공통 타입
  supabase.ts   # Supabase 클라이언트
  openai.ts     # OpenAI 클라이언트 + 안전한 JSON 파서
  utils.ts      # 유틸 함수 + fallback 로직
components/
  Navigation.tsx  # 네비게이션 (상단 헤더 + 모바일 하단 탭)
supabase/
  migrations/001_initial.sql  # 테이블 생성 SQL
  seed.sql                    # 초기 데이터
```

## OpenAI 없이 사용하기

`OPENAI_API_KEY`를 설정하지 않아도 앱이 정상 동작합니다.
- 집안일 자동 분배: 난이도 합계가 적은 사람에게 순차 배정
- 경조사 체크리스트: D-30/14/7/3/1 기본 템플릿 생성

---

_원본 Next.js README_: This is a Next.js project.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
