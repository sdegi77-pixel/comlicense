# 🎃 호박마켓 (Hobak Market)

중고 거래 웹 서비스 **호박마켓**의 프론트엔드 및 Supabase 연동 프로젝트입니다.

## 주요 페이지
- `index.html` — 상품 목록 (카테고리 필터, 검색, 거래 완료 보기, 인기매물 정렬, 인기 검색어, 페이지네이션)
- `detail.html` — 상품 상세 (이미지 캐러셀, 판매자 매너온도, 찜하기, 인라인 채팅, 작성자 수정/삭제/상태 변경)
- `write.html` — 글쓰기 및 게시글 수정 (최대 5장 이미지 자동 압축 업로드, 나눔 체크, Supabase 저장)
- `mypage.html` — 마이페이지 (내가 쓴 글 목록, 좋아요한 상품 목록)

## 기술 스택
- **Frontend**: Vanilla HTML5 / CSS3 (Glassmorphism + Spatial 3D Motion) / JavaScript
- **Backend / Auth / DB**: Supabase REST API & Supabase Auth (`profiles`, `products`, `product_likes`, `chat_rooms`, `chat_messages`, `search_keywords`)

## 로컬 실행 및 배포 전 확인 사항
1. 정적 웹 프로젝트이므로 별도 빌드 없이 `index.html`을 열거나 정적 호스팅(GitHub Pages, Vercel, Netlify 등)에 그대로 배포할 수 있습니다.
2. `.env` 파일에는 `SUPABASE_SERVICE_ROLE_KEY` 등 민감한 키가 포함되어 있으므로 `.gitignore`로 제외되어 있습니다.
3. 배포 후 Supabase 대시보드(**Authentication > URL Configuration**)의 **Site URL** 및 **Redirect URLs**에 배포 도메인(예: `https://<username>.github.io/hobak/`)을 추가하세요.
