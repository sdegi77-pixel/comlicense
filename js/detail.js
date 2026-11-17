(async function () {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id') || '1';

  let product = window.HobakData.getCachedProductById
    ? window.HobakData.getCachedProductById(productId)
    : null;
  let images = [];
  let currentIndex = 0;

  function syncImages() {
    if (!product) return;
    images =
      product.images && product.images.length
        ? product.images
        : [window.HobakData.makeSvgThumb('#e9ecef', '#dee2e6', '📦', product.title)];
    if (currentIndex >= images.length) currentIndex = 0;
  }

  const carouselImg = document.getElementById('carouselImg');
  const prevImgBtn = document.getElementById('prevImgBtn');
  const nextImgBtn = document.getElementById('nextImgBtn');
  const carouselDots = document.getElementById('carouselDots');

  const sellerName = document.getElementById('sellerName');
  const sellerRegion = document.getElementById('sellerRegion');
  const mannerTemp = document.getElementById('mannerTemp');
  const mannerEmoji = document.getElementById('mannerEmoji');
  const detailTitle = document.getElementById('detailTitle');
  const detailCategory = document.getElementById('detailCategory');
  const detailTime = document.getElementById('detailTime');
  const detailPrice = document.getElementById('detailPrice');
  const detailDesc = document.getElementById('detailDesc');
  const detailStats = document.getElementById('detailStats');
  const detailStatusBadge = document.getElementById('detailStatusBadge');
  const ownerControls = document.getElementById('ownerControls');
  const btnOwnerEdit = document.getElementById('btnOwnerEdit');
  const btnOwnerDelete = document.getElementById('btnOwnerDelete');
  const ownerStatusGroup = document.getElementById('ownerStatusGroup');
  const likeBtn = document.getElementById('likeBtn');
  const chatBtn = document.getElementById('chatBtn');
  const relatedGrid = document.getElementById('relatedGrid');
  const toastEl = document.getElementById('toast');

  syncImages();

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function renderCarousel() {
    carouselImg.src = images[currentIndex];
    carouselImg.alt = product.title;

    const multi = images.length > 1;
    prevImgBtn.style.display = multi ? 'inline-flex' : 'none';
    nextImgBtn.style.display = multi ? 'inline-flex' : 'none';

    carouselDots.innerHTML = '';
    if (multi) {
      images.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot' + (idx === currentIndex ? ' active' : '');
        dot.setAttribute('aria-label', `이미지 ${idx + 1}`);
        dot.addEventListener('click', () => {
          currentIndex = idx;
          renderCarousel();
        });
        carouselDots.appendChild(dot);
      });
    }
  }

  function renderStatusBadge() {
    if (!detailStatusBadge) return;
    const map = {
      available: ['판매중', 'available'],
      reserved: ['예약중', 'reserved'],
      sold: ['거래완료', 'sold']
    };
    const [label, cls] = map[product.status] || map.available;
    detailStatusBadge.textContent = label;
    detailStatusBadge.className = `status-badge ${cls}`;
    detailStatusBadge.style.position = 'static';
    detailStatusBadge.style.display = 'inline-block';
  }

  function renderOwnerControls() {
    const user = window.HobakAuth && window.HobakAuth.getCurrentUser();
    const isOwner =
      user &&
      ((product.sellerId && product.sellerId === user.id) ||
        (product.sellerName && product.sellerName === user.nickname));

    if (!ownerControls) return;
    ownerControls.style.display = isOwner ? 'flex' : 'none';
    if (!isOwner) return;

    ownerStatusGroup.querySelectorAll('.owner-status-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.status === (product.status || 'available'));
    });
  }

  function renderDetail() {
    document.title = `${product.title} - 호박마켓`;
    sellerName.textContent = product.sellerName || '호박이웃';
    sellerRegion.textContent = product.region || '방이동';
    const temp = Number(product.mannerTemp || 36.5);
    mannerTemp.textContent = `${temp.toFixed(1)}°C`;
    if (mannerEmoji) {
      mannerEmoji.textContent = temp >= 39 ? '😄' : temp >= 37 ? '😊' : '🙂';
    }

    detailTitle.textContent = product.title;
    detailCategory.textContent = product.category;
    detailCategory.href = `index.html?cat=${encodeURIComponent(product.category)}`;
    detailTime.textContent = product.timeAgo || '방금 전';
    detailPrice.textContent = window.HobakData.formatPrice(product.price, product.isFree);
    detailDesc.textContent = product.description;

    renderStatusBadge();
    renderOwnerControls();
    renderStats();
    renderLikeState();
  }

  if (btnOwnerEdit) {
    btnOwnerEdit.addEventListener('click', () => {
      window.location.href = `write.html?edit=${encodeURIComponent(product.id)}`;
    });
  }

  if (btnOwnerDelete) {
    btnOwnerDelete.addEventListener('click', async () => {
      if (!confirm('정말 이 게시글을 삭제할까요?')) return;
      await window.HobakData.deleteProduct(product.id);
      showToast('게시글이 삭제되었습니다.');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 350);
    });
  }

  if (ownerStatusGroup) {
    ownerStatusGroup.addEventListener('click', async (e) => {
      const btn = e.target.closest('.owner-status-btn');
      if (!btn) return;
      const nextStatus = btn.dataset.status;
      if (!nextStatus || nextStatus === product.status) return;
      product.status = nextStatus;
      renderStatusBadge();
      renderOwnerControls();
      await window.HobakData.updateProductStatus(product.id, nextStatus);
      showToast(`거래 상태를 '${btn.textContent}'(으)로 변경했어요.`);
    });
  }

  window.addEventListener('hobak-auth-change', renderOwnerControls);

  function renderStats() {
    detailStats.textContent = `채팅 ${product.chats || 0} · 관심 ${product.likes || 0} · 조회 ${product.views || 0}`;
  }

  function renderLikeState() {
    const likedIds = window.HobakData.getLikedIds();
    const isLiked = likedIds.includes(String(product.id));
    likeBtn.classList.toggle('liked', isLiked);
    likeBtn.textContent = isLiked ? '♥' : '♡';
    likeBtn.setAttribute('aria-pressed', String(isLiked));
  }

  async function renderRelated() {
    let all = window.HobakData.getCachedProducts ? window.HobakData.getCachedProducts() : [];
    if (!all.length) {
      all = await window.HobakData.fetchProducts();
    }
    const others = all.filter((p) => String(p.id) !== String(product.id));
    const sameCat = others.filter((p) => p.category === product.category);
    const diffCat = others.filter((p) => p.category !== product.category);
    const picks = [...sameCat, ...diffCat].slice(0, 4);

    relatedGrid.innerHTML = picks
      .map((item) => {
        const thumb =
          (item.images && item.images[0]) ||
          window.HobakData.makeSvgThumb('#e9ecef', '#dee2e6', '📦', item.title);
        return `
          <a href="detail.html?id=${encodeURIComponent(item.id)}" class="product-card">
            <div class="product-thumb">
              <img src="${thumb}" alt="${escapeHtml(item.title)}" loading="lazy" />
            </div>
            <div class="product-title">${escapeHtml(item.title)}</div>
            <div class="product-price">${window.HobakData.formatPrice(item.price, item.isFree)}</div>
            <div class="product-meta">${escapeHtml(item.region)}</div>
          </a>
        `;
      })
      .join('');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  prevImgBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    renderCarousel();
  });

  nextImgBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % images.length;
    renderCarousel();
  });

  likeBtn.addEventListener('click', async () => {
    const res = await window.HobakData.toggleLike(product.id, product.likes);
    product.likes = res.likes;
    renderLikeState();
    renderStats();
    showToast(res.isLiked ? '관심 목록에 추가했어요.' : '관심 목록에서 해제했어요.');
  });

  const chatPanel = document.getElementById('chatPanel');
  const chatPanelTitle = document.getElementById('chatPanelTitle');
  const closeChatBtn = document.getElementById('closeChatBtn');
  const chatMessagesEl = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  let activeRoom = null;
  let activeBuyer = null;

  function renderChatMessages(messages) {
    if (!messages.length) {
      chatMessagesEl.innerHTML =
        '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px;">첫 메시지를 보내 거래를 시작해보세요!</div>';
      return;
    }
    chatMessagesEl.innerHTML = messages
      .map(
        (m) => `
        <div style="align-self:flex-end; max-width:80%; background:var(--primary); color:#fff; padding:8px 12px; border-radius:12px; font-size:13px;">
          ${escapeHtml(m.content)}
        </div>
      `
      )
      .join('');
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  chatBtn.addEventListener('click', async () => {
    chatPanel.style.display = 'block';
    chatPanelTitle.textContent = `${product.sellerName || '호박이웃'}님과의 채팅`;
    const session = await window.HobakData.getOrCreateChatRoom(product);
    if (session) {
      activeRoom = session.room;
      activeBuyer = session.buyerProfile;
      if (session.isNew && typeof session.nextChats === 'number') {
        product.chats = session.nextChats;
        renderStats();
      }
      const msgs = await window.HobakData.fetchChatMessages(activeRoom.id);
      renderChatMessages(msgs);
    } else {
      showToast('채팅방 연결에 실패했어요.');
    }
    chatInput.focus();
  });

  closeChatBtn.addEventListener('click', () => {
    chatPanel.style.display = 'none';
  });

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = chatInput.value.trim();
    if (!content || !activeRoom) return;
    chatInput.value = '';
    await window.HobakData.sendChatMessage(activeRoom.id, activeBuyer && activeBuyer.id, content);
    const msgs = await window.HobakData.fetchChatMessages(activeRoom.id);
    renderChatMessages(msgs);
  });

  // 1. Render immediately from cache if available (0ms)
  if (product) {
    renderCarousel();
    renderDetail();
    renderRelated();
  }

  // 2. Fetch fresh product & liked state in parallel, then increment view in background
  const [freshProduct] = await Promise.all([
    window.HobakData.fetchProductById(productId),
    window.HobakData.fetchLikedIds()
  ]);

  if (freshProduct) {
    product = freshProduct;
    syncImages();
    renderCarousel();
    renderDetail();
    if (!window.HobakData.getCachedProducts || !window.HobakData.getCachedProducts().length) {
      renderRelated();
    }
    window.HobakData.incrementView(product.id, product.views).then((nextViews) => {
      product.views = nextViews;
      renderStats();
    });
  }
})();
