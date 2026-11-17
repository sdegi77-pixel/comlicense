(function () {
  const SUPABASE_URL = 'https://asxetowpklocvfjviynh.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeGV0b3dwa2xvY3ZmanZpeW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MjgzMTAsImV4cCI6MjExMDQwNDMxMH0.g4HfrFzXmVI5pHP2AkzMyaDAt3LZ6UXKxumEYE3ck1I';

  const STORAGE_KEY = 'hobak_products_v1';
  const LIKES_KEY = 'hobak_likes_v1';
  const ACTOR_KEY_STORAGE = 'hobak_actor_key_v1';

  const CATEGORY_THEME = {
    '취미/게임/음반': ['#2b2f38', '#495057', '🎮'],
    '디지털기기': ['#3d405b', '#5c6082', '🔊'],
    '가구/인테리어': ['#d4a373', '#bc8a5f', '🛋️'],
    '여성잡화': ['#e0b1cb', '#be95c4', '👜'],
    '여성의류': ['#ced4da', '#adb5bd', '🧶'],
    '남성패션/잡화': ['#4a6fa5', '#325288', '🧥'],
    '생활가전': ['#ff9f68', '#ff6b6b', '🔥'],
    '스포츠/레저': ['#48bfe3', '#5390d9', '👟'],
    '도서': ['#8ecae6', '#219ebc', '📚'],
    '기타 중고물품': ['#b5e48c', '#76c893', '📦']
  };

  function getActorKey() {
    let key = localStorage.getItem(ACTOR_KEY_STORAGE);
    if (!key) {
      key =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0').slice(-12);
      localStorage.setItem(ACTOR_KEY_STORAGE, key);
    }
    return key;
  }

  function makeSvgThumb(bg, accent, emoji, label) {
    const safeLabel = String(label || '호박마켓').slice(0, 18);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${bg}"/>
            <stop offset="100%" stop-color="${accent}"/>
          </linearGradient>
        </defs>
        <rect width="480" height="480" fill="url(#g)"/>
        <circle cx="240" cy="215" r="110" fill="rgba(255,255,255,0.22)"/>
        <text x="240" y="242" font-size="108" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
        <rect x="64" y="366" width="352" height="44" rx="22" fill="rgba(255,255,255,0.88)"/>
        <text x="240" y="394" font-family="sans-serif" font-size="20" font-weight="700" fill="#212124" text-anchor="middle">${safeLabel}</text>
      </svg>
    `.trim();
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function formatTimeAgo(isoDate) {
    if (!isoDate) return '방금 전';
    const diffMs = Date.now() - new Date(isoDate).getTime();
    if (Number.isNaN(diffMs) || diffMs < 60000) return '방금 전';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  }

  function normalizeProduct(row) {
    const theme = CATEGORY_THEME[row.category] || ['#ff9f68', '#ff6f0f', '🎃'];
    const rawImages = Array.isArray(row.images) ? row.images : [];
    const images = rawImages.length
      ? rawImages
      : [makeSvgThumb(theme[0], theme[1], theme[2], row.title)];

    const profile = row.profiles && !Array.isArray(row.profiles) ? row.profiles : null;

    return {
      id: String(row.id),
      sellerId: row.seller_id || (profile && profile.id) || null,
      title: row.title || '',
      category: row.category || '기타 중고물품',
      price: Number(row.price || 0),
      isFree: Boolean(row.is_free ?? row.isFree),
      status: row.status || 'available',
      region: (profile && profile.region) || row.region || '방이동',
      timeAgo: row.timeAgo || formatTimeAgo(row.bumped_at || row.created_at),
      sellerName: (profile && profile.nickname) || row.seller_name || row.sellerName || '호박이웃',
      mannerTemp: Number((profile && profile.manner_temp) ?? row.manner_temp ?? row.mannerTemp ?? 36.5),
      chats: Number(row.chats || 0),
      likes: Number(row.likes || 0),
      views: Number(row.views || 0),
      description: row.description || '',
      images
    };
  }

  function supabaseHeaders(extra) {
    const authUser = window.HobakAuth && window.HobakAuth.getCurrentUser();
    const token = (authUser && authUser.accessToken) || SUPABASE_ANON_KEY;
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extra
    };
  }

  async function supabaseRequest(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...options,
        signal: controller.signal,
        headers: supabaseHeaders(options.headers || {})
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Supabase error (${res.status}): ${errText}`);
      }
      if (res.status === 204) return null;
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  const POPULAR_KEYWORDS = [
    '자전거',
    '조종기',
    '아이패드',
    '의자',
    '스피커',
    '책상',
    '캠핑',
    '가디건',
    '히터',
    '런닝화',
    '토트백',
    '나눔'
  ];

  const CATEGORIES = [
    '디지털기기',
    '생활가전',
    '가구/인테리어',
    '여성의류',
    '여성잡화',
    '남성패션/잡화',
    '취미/게임/음반',
    '스포츠/레저',
    '도서',
    '기타 중고물품'
  ];

  function getLocalProducts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(normalizeProduct) : [];
    } catch {
      return [];
    }
  }

  function getCachedProductById(id) {
    const list = getLocalProducts();
    return list.find((item) => String(item.id) === String(id)) || null;
  }

  function shrinkDataUrlForCache(dataUrl) {
    return new Promise((resolve) => {
      if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.startsWith('data:image/svg+xml')) {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async function saveLocalProducts(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Compress large base64 images to lightweight thumbnails so real photos stay in cache
      try {
        const light = await Promise.all(
          list.map(async (item) => {
            const first = item.images && item.images[0];
            if (!first) return item;
            const thumb = first.length > 80000 ? await shrinkDataUrlForCache(first) : first;
            return { ...item, images: [thumb] };
          })
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
      } catch (e2) {
        console.error('Failed to cache products locally', e2);
      }
    }
  }

  async function ensureProfile(nickname, region) {
    const safeNick = (nickname || '호박이웃').trim();
    const safeRegion = (region || '방이동').trim();
    try {
      const existing = await supabaseRequest(
        `profiles?nickname=eq.${encodeURIComponent(safeNick)}&select=id,nickname,region,manner_temp&limit=1`
      );
      if (existing && existing.length) {
        return existing[0];
      }
      const created = await supabaseRequest('profiles', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          nickname: safeNick,
          region: safeRegion,
          manner_temp: 36.5
        })
      });
      return created[0];
    } catch (err) {
      console.warn('Supabase ensureProfile failed:', err);
      return null;
    }
  }

  async function fetchProducts() {
    try {
      const rows = await supabaseRequest(
        'products?select=id,title,category,price,is_free,status,region,seller_name,seller_id,manner_temp,chats,likes,views,images,bumped_at,created_at&order=bumped_at.desc,created_at.desc'
      );
      const normalized = rows.map(normalizeProduct);
      saveLocalProducts(normalized);
      return normalized;
    } catch (err) {
      console.warn('Supabase fetchProducts fallback to local cache:', err);
      return getLocalProducts();
    }
  }

  async function fetchProductById(id) {
    try {
      const rows = await supabaseRequest(
        `products?id=eq.${encodeURIComponent(id)}&select=*`
      );
      if (rows && rows.length) {
        return normalizeProduct(rows[0]);
      }
      const all = await fetchProducts();
      return all[0] || null;
    } catch (err) {
      console.warn('Supabase fetchProductById fallback:', err);
      const list = getLocalProducts();
      return list.find((item) => String(item.id) === String(id)) || list[0] || null;
    }
  }

  async function addProduct(newItem) {
    const authUser = window.HobakAuth && window.HobakAuth.getCurrentUser();
    const sellerName = (authUser && authUser.nickname) || newItem.sellerName || '호박이웃';
    const region = newItem.region || (authUser && authUser.region) || '방이동';
    let sellerId = authUser ? authUser.id : null;

    if (!sellerId) {
      const profile = await ensureProfile(sellerName, region);
      sellerId = profile ? profile.id : null;
    }

    const payload = {
      title: newItem.title,
      category: newItem.category,
      price: Number(newItem.price || 0),
      is_free: Boolean(newItem.isFree),
      status: 'available',
      region,
      seller_name: sellerName,
      seller_id: sellerId,
      manner_temp: 36.5,
      chats: 0,
      likes: 0,
      views: 1,
      description: newItem.description,
      images: Array.isArray(newItem.images) ? newItem.images : []
    };

    try {
      const rows = await supabaseRequest('products', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload)
      });
      const created = normalizeProduct(rows[0]);
      const local = getLocalProducts();
      saveLocalProducts([created, ...local]);
      return created;
    } catch (err) {
      console.warn('Supabase addProduct fallback:', err);
      const created = normalizeProduct({ ...payload, id: String(Date.now()), timeAgo: '방금 전' });
      const local = getLocalProducts();
      saveLocalProducts([created, ...local]);
      return created;
    }
  }

  async function incrementView(id, currentViews) {
    try {
      const nextViews = Number(currentViews || 0) + 1;
      await supabaseRequest(`products?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ views: nextViews })
      });
      return nextViews;
    } catch {
      return Number(currentViews || 0) + 1;
    }
  }

  function getLikedIds() {
    try {
      return JSON.parse(localStorage.getItem(LIKES_KEY) || '[]');
    } catch {
      return [];
    }
  }

  async function fetchLikedIds() {
    const actorKey = getActorKey();
    try {
      const rows = await supabaseRequest(
        `product_likes?actor_key=eq.${encodeURIComponent(actorKey)}&select=product_id`
      );
      const ids = rows.map((r) => String(r.product_id));
      localStorage.setItem(LIKES_KEY, JSON.stringify(ids));
      return ids;
    } catch {
      return getLikedIds();
    }
  }

  async function toggleLike(id, currentLikes) {
    const actorKey = getActorKey();
    const liked = getLikedIds();
    const strId = String(id);
    const exists = liked.includes(strId);
    const nextLiked = exists ? liked.filter((x) => x !== strId) : [...liked, strId];
    const nextLikes = Math.max(0, Number(currentLikes || 0) + (exists ? -1 : 1));

    localStorage.setItem(LIKES_KEY, JSON.stringify(nextLiked));

    try {
      if (exists) {
        await supabaseRequest(
          `product_likes?product_id=eq.${encodeURIComponent(id)}&actor_key=eq.${encodeURIComponent(actorKey)}`,
          { method: 'DELETE' }
        );
      } else {
        await supabaseRequest('product_likes', {
          method: 'POST',
          headers: { Prefer: 'resolution=ignore-duplicates' },
          body: JSON.stringify({ product_id: Number(id), actor_key: actorKey })
        });
      }

      await supabaseRequest(`products?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ likes: nextLikes })
      });
    } catch (err) {
      console.warn('Supabase toggleLike sync failed:', err);
    }

    return { isLiked: !exists, likes: nextLikes };
  }

  async function fetchPopularKeywords() {
    try {
      const rows = await supabaseRequest(
        'search_keywords?select=keyword,search_count&order=search_count.desc&limit=12'
      );
      if (rows && rows.length) {
        return rows.map((r) => r.keyword);
      }
      return [...POPULAR_KEYWORDS];
    } catch {
      return [...POPULAR_KEYWORDS];
    }
  }

  async function recordSearchKeyword(rawKeyword) {
    const keyword = (rawKeyword || '').trim();
    if (!keyword || keyword.length > 30) return;

    try {
      const existing = await supabaseRequest(
        `search_keywords?keyword=eq.${encodeURIComponent(keyword)}&select=keyword,search_count`
      );
      if (existing && existing.length) {
        await supabaseRequest(`search_keywords?keyword=eq.${encodeURIComponent(keyword)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            search_count: Number(existing[0].search_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
        });
      } else {
        await supabaseRequest('search_keywords', {
          method: 'POST',
          body: JSON.stringify({ keyword, search_count: 1 })
        });
      }
    } catch (err) {
      console.warn('Supabase recordSearchKeyword failed:', err);
    }
  }

  async function getOrCreateChatRoom(product) {
    const buyerNickname = '호박손님_' + getActorKey().slice(0, 4);
    const buyerProfile = await ensureProfile(buyerNickname, product.region);
    if (!buyerProfile) return null;

    try {
      const existing = await supabaseRequest(
        `chat_rooms?product_id=eq.${encodeURIComponent(product.id)}&buyer_id=eq.${encodeURIComponent(buyerProfile.id)}&select=*&limit=1`
      );
      if (existing && existing.length) {
        return { room: existing[0], buyerProfile, isNew: false };
      }

      const created = await supabaseRequest('chat_rooms', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          product_id: Number(product.id),
          buyer_id: buyerProfile.id,
          seller_id: product.sellerId || null
        })
      });

      const nextChats = Number(product.chats || 0) + 1;
      await supabaseRequest(`products?id=eq.${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ chats: nextChats })
      });

      return { room: created[0], buyerProfile, isNew: true, nextChats };
    } catch (err) {
      console.warn('Supabase getOrCreateChatRoom failed:', err);
      return null;
    }
  }

  async function fetchChatMessages(roomId) {
    try {
      return await supabaseRequest(
        `chat_messages?room_id=eq.${encodeURIComponent(roomId)}&select=*&order=created_at.asc`
      );
    } catch {
      return [];
    }
  }

  async function sendChatMessage(roomId, senderId, content) {
    const rows = await supabaseRequest('chat_messages', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        room_id: roomId,
        sender_id: senderId || null,
        content
      })
    });
    return rows[0];
  }

  async function updateProduct(id, fields) {
    const payload = {
      ...(fields.title !== undefined ? { title: fields.title } : {}),
      ...(fields.category !== undefined ? { category: fields.category } : {}),
      ...(fields.price !== undefined ? { price: Number(fields.price) } : {}),
      ...(fields.isFree !== undefined ? { is_free: Boolean(fields.isFree) } : {}),
      ...(fields.region !== undefined ? { region: fields.region } : {}),
      ...(fields.description !== undefined ? { description: fields.description } : {}),
      ...(fields.images !== undefined ? { images: fields.images } : {}),
      ...(fields.status !== undefined ? { status: fields.status } : {})
    };

    try {
      const rows = await supabaseRequest(`products?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload)
      });
      const updated = rows && rows[0] ? normalizeProduct(rows[0]) : null;
      if (updated) {
        const local = getLocalProducts().map((item) =>
          String(item.id) === String(id) ? updated : item
        );
        saveLocalProducts(local);
      }
      return updated;
    } catch (err) {
      console.warn('Supabase updateProduct fallback:', err);
      const local = getLocalProducts().map((item) =>
        String(item.id) === String(id) ? { ...item, ...fields } : item
      );
      saveLocalProducts(local);
      return local.find((item) => String(item.id) === String(id)) || null;
    }
  }

  async function updateProductStatus(id, status) {
    return updateProduct(id, { status });
  }

  async function deleteProduct(id) {
    try {
      await supabaseRequest(`products?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Supabase deleteProduct warning:', err);
    }
    const local = getLocalProducts().filter((item) => String(item.id) !== String(id));
    saveLocalProducts(local);
    return true;
  }

  function formatPrice(price, isFree) {
    if (isFree || Number(price) === 0) return '나눔 🧡';
    return Number(price).toLocaleString('ko-KR') + '원';
  }

  window.HobakData = {
    POPULAR_KEYWORDS,
    CATEGORIES,
    makeSvgThumb,
    getCachedProducts: getLocalProducts,
    getCachedProductById,
    fetchProducts,
    fetchProductById,
    addProduct,
    updateProduct,
    updateProductStatus,
    deleteProduct,
    incrementView,
    getLikedIds,
    fetchLikedIds,
    toggleLike,
    fetchPopularKeywords,
    recordSearchKeyword,
    getOrCreateChatRoom,
    fetchChatMessages,
    sendChatMessage,
    formatPrice
  };
})();
