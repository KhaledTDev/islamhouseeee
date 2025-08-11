// ==================== SEARCH MANAGER MODULE ====================
// Manejo completo de búsqueda y filtrado de contenido

export class SearchManager {
  constructor(apiManager) {
    this.apiManager = apiManager;
    this.searchCache = new Map();
    this.debounceTimer = null;
    this.currentQuery = '';
    this.currentFilters = {
      type: 'showall',
      sortBy: 'date',
      sortOrder: 'desc'
    };
    
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.searchInput = document.getElementById('searchInput');
    this.searchBtn = document.querySelector('.search-btn');
    this.mainContent = document.getElementById('mainContent');
  }

  bindEvents() {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.handleSearchInput(e.target.value);
      });

      this.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.performSearch();
        }
      });
    }

    if (this.searchBtn) {
      this.searchBtn.addEventListener('click', () => {
        this.performSearch();
      });
    }
  }

  handleSearchInput(query) {
    // Debounce search para evitar demasiadas llamadas
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      if (query.trim().length >= 2) {
        this.performSearch(query.trim());
      } else if (query.trim().length === 0) {
        this.clearSearch();
      }
    }, 300);
  }

  async performSearch(query = null) {
    const searchQuery = query || this.searchInput?.value?.trim() || '';
    
    if (!searchQuery) {
      this.clearSearch();
      return;
    }

    this.currentQuery = searchQuery;
    this.showLoading();

    try {
      // Verificar cache primero
      const cacheKey = this.getCacheKey(searchQuery, this.currentFilters);
      if (this.searchCache.has(cacheKey)) {
        const cachedResults = this.searchCache.get(cacheKey);
        this.displaySearchResults(cachedResults, searchQuery);
        return;
      }

      // Realizar búsqueda
      const results = await this.apiManager.searchContent(searchQuery, this.currentFilters);
      
      // Guardar en cache
      this.searchCache.set(cacheKey, results);
      
      // Mostrar resultados
      this.displaySearchResults(results, searchQuery);
      
    } catch (error) {
      console.error('Error en búsqueda:', error);
      this.showError('حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.');
    }
  }

  displaySearchResults(results, query) {
    if (!this.mainContent) return;

    const { data = [], totalItems = 0, totalPages = 0, currentPage = 1 } = results;

    if (data.length === 0) {
      this.showNoResults(query);
      return;
    }

    const resultsHTML = `
      <div class="search-results-container">
        <div class="container mx-auto px-4 py-8">
          <div class="search-results-header mb-6">
            <h3 class="text-2xl lg:text-3xl font-bold text-emerald-900 mb-2">نتائج البحث</h3>
            <p class="text-emerald-700">تم العثور على ${totalItems} نتيجة للبحث عن "${query}"</p>
            <div class="search-filters mt-4">
              ${this.renderSearchFilters()}
            </div>
          </div>
          
          <div class="content-grid">
            ${data.map(item => this.renderSearchItem(item)).join('')}
          </div>
          
          ${totalPages > 1 ? this.renderPagination(currentPage, totalPages, 'search') : ''}
        </div>
      </div>
    `;

    this.mainContent.innerHTML = resultsHTML;
    this.bindSearchResultEvents();
  }

  renderSearchItem(item) {
    const isFavorited = this.apiManager.favorites.includes(item.id);
    const attachmentsHTML = this.renderAttachments(item.attachments || []);

    return `
      <article class="content-card" data-id="${item.id}">
        <div class="flex justify-between items-start mb-3">
          <span class="content-type-badge ${item.type}">${this.getTypeLabel(item.type)}</span>
          <button class="favorite-btn ${isFavorited ? 'active' : ''}" 
                  onclick="searchManager.toggleFavorite('${item.id}')" 
                  title="${isFavorited ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}"
                  aria-label="${isFavorited ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}">
            <svg class="w-5 h-5" fill="${isFavorited ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </button>
        </div>
        
        <h4 class="text-lg font-bold text-gray-900 mb-2 arabic-text leading-relaxed">
          ${this.highlightSearchTerms(item.title, this.currentQuery)}
        </h4>
        
        <p class="text-gray-600 mb-4 arabic-text leading-relaxed line-clamp-3 text-sm lg:text-base">
          ${this.highlightSearchTerms(item.description || '', this.currentQuery)}
        </p>
        
        ${attachmentsHTML ? `<div class="attachments-grid mb-4">${attachmentsHTML}</div>` : ''}
        
        <div class="flex justify-between items-center text-xs lg:text-sm text-gray-500">
          <div>
            <span class="inline-flex items-center gap-1">
              <svg class="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              ${this.formatDate(item.date)}
            </span>
          </div>
          <div class="content-actions">
            ${this.renderContentActions(item)}
          </div>
        </div>
      </article>
    `;
  }

  renderSearchFilters() {
    return `
      <div class="search-filters-container">
        <div class="filter-group">
          <label for="typeFilter" class="filter-label">نوع المحتوى:</label>
          <select id="typeFilter" class="filter-select">
            <option value="showall" ${this.currentFilters.type === 'showall' ? 'selected' : ''}>جميع الأنواع</option>
            <option value="audio" ${this.currentFilters.type === 'audio' ? 'selected' : ''}>صوتيات</option>
            <option value="video" ${this.currentFilters.type === 'video' ? 'selected' : ''}>مرئيات</option>
            <option value="book" ${this.currentFilters.type === 'book' ? 'selected' : ''}>كتب</option>
            <option value="article" ${this.currentFilters.type === 'article' ? 'selected' : ''}>مقالات</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="sortFilter" class="filter-label">ترتيب حسب:</label>
          <select id="sortFilter" class="filter-select">
            <option value="date" ${this.currentFilters.sortBy === 'date' ? 'selected' : ''}>التاريخ</option>
            <option value="title" ${this.currentFilters.sortBy === 'title' ? 'selected' : ''}>العنوان</option>
            <option value="relevance" ${this.currentFilters.sortBy === 'relevance' ? 'selected' : ''}>الصلة</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="orderFilter" class="filter-label">الترتيب:</label>
          <select id="orderFilter" class="filter-select">
            <option value="desc" ${this.currentFilters.sortOrder === 'desc' ? 'selected' : ''}>تنازلي</option>
            <option value="asc" ${this.currentFilters.sortOrder === 'asc' ? 'selected' : ''}>تصاعدي</option>
          </select>
        </div>
        
        <button class="filter-apply-btn" onclick="searchManager.applyFilters()">تطبيق الفلاتر</button>
        <button class="filter-clear-btn" onclick="searchManager.clearFilters()">مسح الفلاتر</button>
      </div>
    `;
  }

  bindSearchResultEvents() {
    // Bind filter events
    const typeFilter = document.getElementById('typeFilter');
    const sortFilter = document.getElementById('sortFilter');
    const orderFilter = document.getElementById('orderFilter');

    [typeFilter, sortFilter, orderFilter].forEach(filter => {
      if (filter) {
        filter.addEventListener('change', () => {
          this.updateFilters();
        });
      }
    });
  }

  updateFilters() {
    const typeFilter = document.getElementById('typeFilter');
    const sortFilter = document.getElementById('sortFilter');
    const orderFilter = document.getElementById('orderFilter');

    this.currentFilters = {
      type: typeFilter?.value || 'showall',
      sortBy: sortFilter?.value || 'date',
      sortOrder: orderFilter?.value || 'desc'
    };
  }

  applyFilters() {
    this.updateFilters();
    this.performSearch();
  }

  clearFilters() {
    this.currentFilters = {
      type: 'showall',
      sortBy: 'date',
      sortOrder: 'desc'
    };
    
    // Reset filter selects
    const typeFilter = document.getElementById('typeFilter');
    const sortFilter = document.getElementById('sortFilter');
    const orderFilter = document.getElementById('orderFilter');
    
    if (typeFilter) typeFilter.value = 'showall';
    if (sortFilter) sortFilter.value = 'date';
    if (orderFilter) orderFilter.value = 'desc';
    
    this.performSearch();
  }

  highlightSearchTerms(text, query) {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  showNoResults(query) {
    if (!this.mainContent) return;

    this.mainContent.innerHTML = `
      <div class="no-results-container">
        <div class="container mx-auto px-4 py-12 text-center">
          <div class="text-4xl lg:text-6xl mb-6">🔍</div>
          <h2 class="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">لا توجد نتائج</h2>
          <p class="text-gray-600 mb-8 text-sm lg:text-base">
            لم نتمكن من العثور على نتائج للبحث عن "${query}"
          </p>
          <div class="search-suggestions">
            <h3 class="text-lg font-semibold mb-4">اقتراحات للبحث:</h3>
            <ul class="text-gray-600 space-y-2">
              <li>• تأكد من صحة الكلمات المكتوبة</li>
              <li>• جرب استخدام كلمات مفتاحية مختلفة</li>
              <li>• استخدم كلمات أقل أو أكثر عمومية</li>
              <li>• تصفح الأقسام المختلفة للمحتوى</li>
            </ul>
          </div>
          <button onclick="searchManager.clearSearch()" class="mt-6 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors">
            العودة إلى الصفحة الرئيسية
          </button>
        </div>
      </div>
    `;
  }

  clearSearch() {
    this.currentQuery = '';
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    
    // العودة إلى الصفحة الرئيسية
    if (window.navigationManager) {
      window.navigationManager.navigateToPage('home');
    } else {
      // Fallback si navigationManager no está disponible
      location.hash = 'home';
      location.reload();
    }
  }

  showLoading() {
    if (!this.mainContent) return;

    this.mainContent.innerHTML = `
      <div class="loading-container">
        <div class="container mx-auto px-4 py-12 text-center">
          <div class="loading-spinner mb-4"></div>
          <p class="text-gray-600">جاري البحث...</p>
        </div>
      </div>
    `;
  }

  showError(message) {
    if (!this.mainContent) return;

    this.mainContent.innerHTML = `
      <div class="error-container">
        <div class="container mx-auto px-4 py-12 text-center">
          <div class="text-4xl lg:text-6xl mb-6">⚠️</div>
          <h2 class="text-2xl lg:text-3xl font-bold text-red-600 mb-4">خطأ في البحث</h2>
          <p class="text-gray-600 mb-8">${message}</p>
          <button onclick="searchManager.performSearch()" class="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors">
            إعادة المحاولة
          </button>
        </div>
      </div>
    `;
  }

  getCacheKey(query, filters) {
    return `${query}_${filters.type}_${filters.sortBy}_${filters.sortOrder}`;
  }

  getTypeLabel(type) {
    const labels = {
      'audio': 'صوتي',
      'video': 'مرئي', 
      'book': 'كتاب',
      'article': 'مقال',
      'lecture': 'محاضرة',
      'lesson': 'درس'
    };
    return labels[type] || 'محتوى';
  }

  renderAttachments(attachments) {
    if (!attachments || attachments.length === 0) return '';
    
    return attachments.map(attachment => {
      const isAudio = attachment.type === 'audio';
      const isVideo = attachment.type === 'video';
      
      return `
        <div class="attachment-item ${attachment.type}">
          ${isAudio ? `
            <button onclick="audioManager.playAudio({url: '${attachment.url}', title: '${attachment.title}'})" 
                    class="attachment-btn audio-btn" title="تشغيل الصوت">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
              </svg>
              ${attachment.title}
            </button>
          ` : isVideo ? `
            <button onclick="videoManager.playVideo('${attachment.url}', '${attachment.title}')" 
                    class="attachment-btn video-btn" title="تشغيل الفيديو">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
              </svg>
              ${attachment.title}
            </button>
          ` : `
            <a href="${attachment.url}" target="_blank" class="attachment-btn file-btn" title="فتح الملف">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
              </svg>
              ${attachment.title}
            </a>
          `}
          <span class="text-xs opacity-75">(${attachment.size})</span>
        </div>
      `;
    }).join('');
  }

  renderContentActions(item) {
    return `
      <div class="content-actions-group">
        ${item.attachments?.some(a => a.type === 'audio') ? `
          <button onclick="audioManager.addToQueue({url: '${item.attachments.find(a => a.type === 'audio').url}', title: '${item.title}'})" 
                  class="action-btn" title="إضافة إلى قائمة التشغيل">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
            </svg>
          </button>
        ` : ''}
        <button onclick="navigator.share ? navigator.share({title: '${item.title}', url: window.location.href}) : searchManager.copyToClipboard('${item.title}')" 
                class="action-btn" title="مشاركة">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/>
          </svg>
        </button>
      </div>
    `;
  }

  renderPagination(currentPage, totalPages, type = 'search') {
    if (totalPages <= 1) return '';

    const prevPage = currentPage > 1 ? currentPage - 1 : null;
    const nextPage = currentPage < totalPages ? currentPage + 1 : null;

    return `
      <div class="pagination-container">
        <div class="pagination">
          ${prevPage ? `
            <button onclick="searchManager.goToPage(${prevPage})" class="pagination-btn prev-btn">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              السابق
            </button>
          ` : ''}
          
          <span class="pagination-info">
            صفحة ${currentPage} من ${totalPages}
          </span>
          
          ${nextPage ? `
            <button onclick="searchManager.goToPage(${nextPage})" class="pagination-btn next-btn">
              التالي
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
              </svg>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  async goToPage(page) {
    if (this.currentQuery) {
      const results = await this.apiManager.searchContent(this.currentQuery, {
        ...this.currentFilters,
        page
      });
      this.displaySearchResults(results, this.currentQuery);
    }
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showNotification('تم نسخ العنوان');
      });
    }
  }

  showNotification(message) {
    // Usar el mismo sistema de notificaciones del AudioManager
    if (window.audioManager) {
      window.audioManager.showNotification(message);
    }
  }

  toggleFavorite(itemId) {
    if (window.favoritesManager) {
      window.favoritesManager.toggleFavorite(itemId);
    }
  }
}
