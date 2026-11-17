(function () {
  const PAGE_SIZE = 9;

  const state = {
    category: '중고거래',
    query: '',
    onlyAvailable: false,
    sortByPopular: false,
    page: 1,
    products: [],
    keywords: []
  };

  const productGrid = document.getElementById('productGrid');
  const paginationEl = document.getElementById('pagination');
  const keywordListEl = document.getElementById('keywordList');
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const navTabs = document.getElementById('navTabs');
  const listHeading = document.getElementById('listHeading');
  const btnResetFilters = document.getElementById('btnResetFilters');
  const btnOnlyAvailable = document.getElementById('btnOnlyAvailable');
  const btnPopularSort = document.getElementById('btnPopularSort');

  function getFilteredProducts() {
    let items = [...state.products];

    if (state.category !== '전체' && state.category !== '중고거래') {
      items = items.filter((item) => item.category === state.category);
    }

    if (state.query.trim()) {
      const q = state.query.trim().toLowerCase();
      items = items.filter(
        (item) =>
          (item.title || '').toLowerCase().includes(q) ||
          (item.region || '').toLowerCase().includes(q) ||
          (item.category || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
      );
    }

    if (state.onlyAvailable) {
      items = items.filter((item) => item.status === 'sold');
    }

    if (state.sortByPopular) {
      items = [...items].sort(
        (a, b) =>
          (b.likes || 0) + (b.views || 0) * 0.1 - ((a.likes || 0) + (a.views || 0) * 0.1)
      );
    }

    return items;
  }

  function renderKeywords() {
    keywordListEl.innerHTML = '';
    const keywords = state.keywords.length ? state.keywords : window.HobakData.POPULAR_KEYWORDS;
    keywords.forEach((kw) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'keyword-tag' + (state.query === kw ? ' active' : '');
      btn.textContent = kw;
      btn.addEventListener('click', () => {
        state.query = state.query === kw ? '' : kw;
        searchInput.value = state.query;
        state.page = 1;
        if (state.query) {
          window.HobakData.recordSearchKeyword(state.query);
        }
        render();
      });
      keywordListEl.appendChild(btn);
    });
  }

  function renderHeading() {
    if (state.query.trim()) {
      listHeading.textContent = `'${state.query.trim()}' 검색 결과`;
    } else if (state.onlyAvailable && state.sortByPopular) {
      listHeading.textContent = '거래 완료 인기매물 보기';
    } else if (state.onlyAvailable) {
      listHeading.textContent = '거래 완료 매물 보기';
    } else if (state.sortByPopular) {
      listHeading.textContent = '인기매물 보기';
    } else if (state.category !== '전체' && state.category !== '중고거래') {
      listHeading.textContent = `${state.category} 매물 보기`;
    } else {
      listHeading.textContent = '방이동 중고거래 매물 보기';
    }
  }

  function renderProducts(items) {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * PAGE_SIZE;
    const paged = items.slice(start, start + PAGE_SIZE);

    if (!paged.length) {
      productGrid.innerHTML = `
        <div class="empty-state">
          <p style="font-size:16px;font-weight:700;color:#212124;margin-bottom:6px;">조건에 맞는 매물이 없어요</p>
          <p style="font-size:13px;">검색어나 필터를 변경하거나 새 글을 작성해보세요.</p>
        </div>
      `;
      renderPagination(1);
      return;
    }

    productGrid.innerHTML = paged
      .map((item) => {
        const thumb =
          (item.images && item.images[0]) ||
          window.HobakData.makeSvgThumb('#f2f3f6', '#eaebee', '🎃', '호박마켓');
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
        const badgeHtml = `<span class="status-badge ${statusClass}">${statusLabel}</span>`;
        const soldClass = item.status === 'sold' ? ' is-sold' : '';

        return `
          <a href="detail.html?id=${encodeURIComponent(item.id)}" class="product-card${soldClass}">
            <div class="product-thumb">
              <img src="${thumb}" alt="${escapeHtml(item.title)}" loading="lazy" />
              ${badgeHtml}
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

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    paginationEl.innerHTML = '';
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '‹';
    prevBtn.setAttribute('aria-label', '이전 페이지');
    prevBtn.disabled = state.page === 1;
    prevBtn.addEventListener('click', () => {
      if (state.page > 1) {
        state.page -= 1;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    paginationEl.appendChild(prevBtn);

    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'page-btn' + (p === state.page ? ' active' : '');
      btn.textContent = String(p);
      if (p === state.page) {
        btn.setAttribute('aria-current', 'page');
      }
      btn.addEventListener('click', () => {
        state.page = p;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      paginationEl.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'page-btn';
    nextBtn.textContent = '›';
    nextBtn.setAttribute('aria-label', '다음 페이지');
    nextBtn.disabled = state.page === totalPages;
    nextBtn.addEventListener('click', () => {
      if (state.page < totalPages) {
        state.page += 1;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    paginationEl.appendChild(nextBtn);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function render() {
    renderHeading();
    renderKeywords();
    const filtered = getFilteredProducts();
    renderProducts(filtered);
  }

  // Event listeners
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.query = searchInput.value;
    state.page = 1;
    if (state.query.trim()) {
      window.HobakData.recordSearchKeyword(state.query.trim());
    }
    render();
  });

  navTabs.addEventListener('click', (e) => {
    const pill = e.target.closest('.nav-pill');
    if (!pill) return;
    navTabs.querySelectorAll('.nav-pill').forEach((el) => el.classList.remove('active'));
    pill.classList.add('active');
    state.category = pill.dataset.cat;
    state.page = 1;
    render();
  });

  btnOnlyAvailable.addEventListener('click', async () => {
    state.onlyAvailable = !state.onlyAvailable;
    btnOnlyAvailable.classList.toggle('active', state.onlyAvailable);
    state.page = 1;
    if (!state.products.length) {
      state.products = await window.HobakData.fetchProducts();
    }
    render();
  });

  btnPopularSort.addEventListener('click', async () => {
    state.sortByPopular = !state.sortByPopular;
    btnPopularSort.classList.toggle('active', state.sortByPopular);
    state.page = 1;
    if (!state.products.length) {
      state.products = await window.HobakData.fetchProducts();
    }
    render();
  });

  btnResetFilters.addEventListener('click', () => {
    state.category = '중고거래';
    state.query = '';
    state.onlyAvailable = false;
    state.sortByPopular = false;
    state.page = 1;
    searchInput.value = '';
    btnOnlyAvailable.classList.remove('active');
    btnPopularSort.classList.remove('active');
    navTabs.querySelectorAll('.nav-pill').forEach((el) => {
      el.classList.toggle('active', el.dataset.cat === '중고거래');
    });
    render();
  });

  // Check URL query param ?cat=...
  const params = new URLSearchParams(window.location.search);
  const catParam = params.get('cat');
  if (catParam) {
    state.category = catParam;
    navTabs.querySelectorAll('.nav-pill').forEach((el) => {
      el.classList.toggle('active', el.dataset.cat === catParam);
    });
  }

  async function init() {
    // 1. Render immediately from local cache (0ms first paint)
    const cached = window.HobakData.getCachedProducts ? window.HobakData.getCachedProducts() : [];
    state.keywords = window.HobakData.POPULAR_KEYWORDS;
    if (cached.length) {
      state.products = cached;
      render();
    } else {
      renderHeading();
      renderKeywords();
      productGrid.innerHTML = Array.from({ length: 6 })
        .map(
          () => `
          <div class="product-card" style="pointer-events:none;">
            <div class="product-thumb" style="background:linear-gradient(90deg,#eef0f6 25%,#f7f8fc 50%,#eef0f6 75%);"></div>
            <div style="height:14px;width:78%;background:#eef0f6;border-radius:6px;margin-bottom:6px;"></div>
            <div style="height:15px;width:45%;background:#eef0f6;border-radius:6px;margin-bottom:6px;"></div>
            <div style="height:12px;width:60%;background:#eef0f6;border-radius:6px;"></div>
          </div>`
        )
        .join('');
    }

    // 2. Refresh products and popular keywords independently in background
    window.HobakData.fetchProducts().then((products) => {
      state.products = products;
      render();
    });

    window.HobakData.fetchPopularKeywords().then((keywords) => {
      state.keywords = keywords;
      renderKeywords();
    });
  }

  init();
})();
