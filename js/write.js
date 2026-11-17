(function () {
  const MAX_IMAGES = 5;

  const form = document.getElementById('writeForm');
  const uploadDropArea = document.getElementById('uploadDropArea');
  const uploadPlaceholder = document.getElementById('uploadPlaceholder');
  const mainPreviewImg = document.getElementById('mainPreviewImg');
  const imageFileInput = document.getElementById('imageFileInput');
  const thumbStrip = document.getElementById('thumbStrip');
  const photoCountText = document.getElementById('photoCountText');

  const sellerNameInput = document.getElementById('sellerNameInput');
  const regionInput = document.getElementById('regionInput');
  const titleInput = document.getElementById('titleInput');
  const categorySelect = document.getElementById('categorySelect');
  const priceInput = document.getElementById('priceInput');
  const isFreeCheck = document.getElementById('isFreeCheck');
  const descInput = document.getElementById('descInput');
  const toastEl = document.getElementById('toast');

  const CATEGORY_THEMES = {
    디지털기기: ['#3d405b', '#5c6082', '📱'],
    생활가전: ['#ff9f68', '#ff6b6b', '🔌'],
    '가구/인테리어': ['#d4a373', '#bc8a5f', '🛋️'],
    여성의류: ['#ced4da', '#adb5bd', '🧶'],
    여성잡화: ['#e0b1cb', '#be95c4', '👜'],
    '남성패션/잡화': ['#4a6fa5', '#325288', '🧥'],
    '취미/게임/음반': ['#2b2f38', '#495057', '🎮'],
    '스포츠/레저': ['#48bfe3', '#5390d9', '⛺'],
    도서: ['#a3b18a', '#588157', '📚'],
    '기타 중고물품': ['#ff6f0f', '#ff9248', '🎃']
  };

  let uploadedImages = [];
  let activeIndex = 0;
  let toastTimer = null;

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2000);
  }

  function escapeSvgText(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function populateCategories() {
    if (!categorySelect || !window.HobakData) return;
    categorySelect.innerHTML = '';
    window.HobakData.CATEGORIES.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  }

  function renderImages() {
    if (photoCountText) {
      photoCountText.textContent = `${uploadedImages.length}/${MAX_IMAGES}`;
    }

    if (uploadedImages.length > 0) {
      if (activeIndex < 0 || activeIndex >= uploadedImages.length) {
        activeIndex = 0;
      }
      uploadDropArea.classList.add('has-image');
      uploadPlaceholder.style.display = 'none';
      mainPreviewImg.src = uploadedImages[activeIndex];
      mainPreviewImg.style.display = 'block';
    } else {
      activeIndex = 0;
      uploadDropArea.classList.remove('has-image');
      uploadPlaceholder.style.display = 'flex';
      mainPreviewImg.src = '';
      mainPreviewImg.style.display = 'none';
    }

    // Remove existing thumbnail items while keeping the add button
    const oldThumbs = thumbStrip.querySelectorAll('.thumb-item');
    oldThumbs.forEach((el) => el.remove());

    uploadedImages.forEach((dataUrl, idx) => {
      const item = document.createElement('div');
      item.className = 'thumb-item' + (idx === activeIndex ? ' active' : '');
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `사진 ${idx + 1} 미리보기`);

      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = `업로드 이미지 ${idx + 1}`;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'thumb-remove';
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', `사진 ${idx + 1} 삭제`);

      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        uploadedImages.splice(idx, 1);
        if (activeIndex >= uploadedImages.length) {
          activeIndex = Math.max(0, uploadedImages.length - 1);
        } else if (idx < activeIndex) {
          activeIndex = Math.max(0, activeIndex - 1);
        }
        renderImages();
      });

      item.addEventListener('click', () => {
        activeIndex = idx;
        renderImages();
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activeIndex = idx;
          renderImages();
        }
      });

      item.appendChild(img);
      item.appendChild(removeBtn);
      thumbStrip.appendChild(item);
    });
  }

  function compressImageDataUrl(dataUrl, maxDim = 900, quality = 0.75) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
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
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function handleFilesSelected(fileList) {
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith('image/')
    );
    if (!files.length) return;

    const remaining = MAX_IMAGES - uploadedImages.length;
    if (remaining <= 0) {
      showToast(`사진은 최대 ${MAX_IMAGES}장까지 올릴 수 있어요.`);
      return;
    }

    if (files.length > remaining) {
      showToast(`최대 ${MAX_IMAGES}장까지만 등록되어 ${remaining}장만 추가됩니다.`);
    }

    const accepted = files.slice(0, remaining);
    accepted.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const result = ev.target && ev.target.result;
        if (typeof result === 'string' && uploadedImages.length < MAX_IMAGES) {
          const compressed = await compressImageDataUrl(result);
          uploadedImages.push(compressed);
          activeIndex = uploadedImages.length - 1;
          renderImages();
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function bindEvents() {
    imageFileInput.addEventListener('change', (e) => {
      handleFilesSelected(e.target.files);
      imageFileInput.value = '';
    });

    isFreeCheck.addEventListener('change', () => {
      if (isFreeCheck.checked) {
        priceInput.value = '0';
        priceInput.disabled = true;
      } else {
        priceInput.disabled = false;
        if (priceInput.value === '0') {
          priceInput.value = '';
        }
        priceInput.focus();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = titleInput.value.trim();
      const category = categorySelect.value || window.HobakData.CATEGORIES[0];
      const isFree = isFreeCheck.checked;
      const rawPrice = priceInput.value.trim();
      const price = isFree ? 0 : Number(rawPrice);
      const description = descInput.value.trim();
      const sellerName = sellerNameInput.value.trim() || '헤엄치는오리';
      const region = regionInput.value.trim() || '방이동';

      if (!title) {
        showToast('글 제목을 입력해주세요.');
        titleInput.focus();
        return;
      }

      if (!isFree && (rawPrice === '' || Number.isNaN(price) || price < 0)) {
        showToast('가격을 올바르게 입력해주세요.');
        priceInput.focus();
        return;
      }

      if (!description) {
        showToast('게시글 내용을 입력해주세요.');
        descInput.focus();
        return;
      }

      let images = [...uploadedImages];
      if (images.length === 0) {
        const theme = CATEGORY_THEMES[category] || ['#ff6f0f', '#ff9248', '🎃'];
        const label = escapeSvgText(title.slice(0, 14));
        images = [
          window.HobakData.makeSvgThumb(theme[0], theme[1], theme[2], label)
        ];
      }

      const editId = new URLSearchParams(window.location.search).get('edit');
      if (editId) {
        await window.HobakData.updateProduct(editId, {
          title,
          category,
          price,
          isFree,
          region,
          description,
          images
        });
        showToast('게시글이 수정되었습니다!');
        setTimeout(() => {
          window.location.href = `detail.html?id=${encodeURIComponent(editId)}`;
        }, 450);
        return;
      }

      const created = await window.HobakData.addProduct({
        title,
        category,
        price,
        isFree,
        region,
        sellerName,
        description,
        images
      });

      showToast('상품이 등록되었습니다!');
      setTimeout(() => {
        window.location.href = `detail.html?id=${encodeURIComponent(created.id)}`;
      }, 450);
    });
  }

  function syncAuthorFields() {
    const user = window.HobakAuth && window.HobakAuth.getCurrentUser();
    if (user) {
      sellerNameInput.value = user.nickname || '호박이웃';
      sellerNameInput.readOnly = true;
      if (user.region) regionInput.value = user.region;
    } else {
      sellerNameInput.readOnly = false;
    }
  }

  async function loadEditProduct() {
    const editId = new URLSearchParams(window.location.search).get('edit');
    if (!editId) return;
    const item = await window.HobakData.fetchProductById(editId);
    if (!item) return;

    document.title = '게시글 수정 - 호박마켓';
    titleInput.value = item.title || '';
    categorySelect.value = item.category || window.HobakData.CATEGORIES[0];
    isFreeCheck.checked = Boolean(item.isFree);
    priceInput.value = item.isFree ? '0' : String(item.price || 0);
    priceInput.disabled = Boolean(item.isFree);
    descInput.value = item.description || '';
    regionInput.value = item.region || '방이동';

    if (Array.isArray(item.images) && item.images.length) {
      uploadedImages = item.images.slice(0, MAX_IMAGES);
      activeIndex = 0;
      renderImages();
    }

    document.querySelectorAll('.media-top-pill, .btn-chat-primary').forEach((btn) => {
      btn.textContent = '수정 완료';
    });
  }

  populateCategories();
  renderImages();
  bindEvents();
  syncAuthorFields();
  loadEditProduct();
  window.addEventListener('hobak-auth-change', syncAuthorFields);

  document.addEventListener('DOMContentLoaded', () => {
    if (window.HobakAuth && !window.HobakAuth.getCurrentUser()) {
      window.HobakAuth.openModal({
        mode: 'login',
        onSuccess: syncAuthorFields
      });
    }
  });
})();
