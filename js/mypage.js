(function () {
  const myNicknameEl = document.getElementById('myNickname');
  const myMetaEl = document.getElementById('myMeta');
  const myPostsCountEl = document.getElementById('myPostsCount');
  const myLikesCountEl = document.getElementById('myLikesCount');
  const mypageTabs = document.getElementById('mypageTabs');
  const mypageGrid = document.getElementById('mypageGrid');

  let activeTab = 'posts';
  let myPosts = [];
  let myLikes = [];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderGrid() {
    const items = activeTab === 'posts' ? myPosts : myLikes;
    if (!items.length) {
      mypageGrid.innerHTML = `
        <div class="empty-state">
          <p style="font-size:16px;font-weight:700;color:#212124;margin-bottom:6px;">
            ${activeTab === 'posts' ? '작성한 게시글이 아직 없어요' : '좋아요한 상품이 아직 없어요'}
          </p>
          <p style="font-size:13px;">
            ${activeTab === 'posts' ? '+ 글쓰기 버튼을 눌러 첫 상품을 등록해보세요!' : '마음에 드는 상품 상세 페이지에서 ♥를 눌러보세요.'}
          </p>
        </div>
      `;
      return;
    }

    mypageGrid.innerHTML = items
      .map((item) => {
        const thumb =
          (item.images && item.images[0]) ||
          window.HobakData.makeSvgThumb('#e9ecef', '#dee2e6', '📦', item.title);
        const statusLabel =
          item.status === 'reserved'
            ? '예약중'
            : item.status === 'sold'
              ? '거래완료'
              : '판매중';
        const statusClass =
          item.status === 'reserved'
            ? 'reserved'
            : item.status === 'sold'
              ? 'sold'
              : 'available';
        const soldClass = item.status === 'sold' ? ' is-sold' : '';

        return `
          <a href="detail.html?id=${encodeURIComponent(item.id)}" class="product-card${soldClass}">
            <div class="product-thumb">
              <img src="${thumb}" alt="${escapeHtml(item.title)}" loading="lazy" />
              <span class="status-badge ${statusClass}">${statusLabel}</span>
            </div>
            <div class="product-title">${escapeHtml(item.title)}</div>
            <div class="product-price">${window.HobakData.formatPrice(item.price, item.isFree)}</div>
            <div class="product-meta">${escapeHtml(item.region)} · ${escapeHtml(item.timeAgo)}</div>
            <div class="product-counts">
              <span class="like-dot">♥ ${item.likes || 0}</span>
              <span>채팅 ${item.chats || 0}</span>
              <span>· ${escapeHtml(item.sellerName || '호박이웃')}</span>
            </div>
          </a>
        `;
      })
      .join('');
  }

  async function loadMyPage() {
    const user = window.HobakAuth && window.HobakAuth.getCurrentUser();
    if (!user) {
      myNicknameEl.textContent = '로그인이 필요합니다';
      myMetaEl.textContent = '로그인 후 내가 쓴 글과 좋아요한 상품을 확인할 수 있어요.';
      myPosts = [];
      myLikes = [];
      myPostsCountEl.textContent = '0';
      myLikesCountEl.textContent = '0';
      renderGrid();
      return;
    }

    myNicknameEl.textContent = user.nickname;
    myMetaEl.textContent = `${user.region || '방이동'} · ${user.email || ''}`;

    const [allProducts, likedIds] = await Promise.all([
      window.HobakData.fetchProducts(),
      window.HobakData.fetchLikedIds()
    ]);

    myPosts = allProducts.filter(
      (item) =>
        (item.sellerId && item.sellerId === user.id) ||
        (item.sellerName && item.sellerName === user.nickname)
    );
    myLikes = allProducts.filter((item) => likedIds.includes(String(item.id)));

    myPostsCountEl.textContent = String(myPosts.length);
    myLikesCountEl.textContent = String(myLikes.length);
    renderGrid();
  }

  mypageTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.mypage-tab');
    if (!tab) return;
    activeTab = tab.dataset.tab;
    mypageTabs.querySelectorAll('.mypage-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.tab === activeTab);
    });
    renderGrid();
  });

  window.addEventListener('hobak-auth-change', loadMyPage);

  document.addEventListener('DOMContentLoaded', () => {
    loadMyPage();
    if (window.HobakAuth && !window.HobakAuth.getCurrentUser()) {
      window.HobakAuth.openModal({
        mode: 'login',
        onSuccess: loadMyPage
      });
    }
  });
})();
