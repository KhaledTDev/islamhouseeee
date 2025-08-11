// Islamic Content Directory - Vanilla JavaScript Version
// Migrated from React to Vanilla JS - No dependencies required

// ==================== GLOBAL STATE MANAGEMENT ====================
const AppState = {
  // Data state
  currentData: [],
  allData: [],
  favorites: JSON.parse(localStorage.getItem('islamicFavorites') || '[]'),
  favoritesData: JSON.parse(localStorage.getItem('islamicFavoritesData') || '{}'),
  searchQuery: '',
  currentCategory: 'showall',
  currentFilter: 'showall', // Agregado
  
  // Pagination state
  totalPages: 0,
  totalItems: 0,
  currentPage: 1,
  searchResults: [],
  searchTotalPages: 0,
  searchTotalItems: 0,
  searchCurrentPage: 1,
  
  // UI state
  isLoading: false,
  activeNav: 'home',
  searchFilters: {
    type: 'showall',
    sortBy: 'date',
    sortOrder: 'desc'
  },
  mobileMenuOpen: false,
  
  // Audio Player State
  audioQueue: [],
  currentAudioIndex: -1,
  isPlaying: false,
  isShuffled: false,
  isRepeating: false,
  audioPlayerVisible: false,
  queueVisible: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  
  // Video Player State
  videoPlayerVisible: false,
  currentVideo: { url: '', title: '' }
};

// ==================== API CONFIGURATION ====================
const ISLAMIC_HOUSE_API_BASE = './api.php';
const CORS_PROXY = ''; // Can be added if CORS becomes an issue
const itemsPerPage = 25;

// ==================== UTILITY FUNCTIONS ====================

// Build API URL
function buildApiUrl(contentType, page = 1, limit = 25, lang = 'ar', locale = 'ar') {
  // Mapear tipos de contenido para el nuevo sistema PHP
  const categoryMap = {
    'showall': 'search',
    'books': 'books',
    'articles': 'articles', 
    'fatwa': 'fatwa',
    'audios': 'audios',
    'videos': 'videos'
  };
  
  const action = contentType === 'showall' ? 'search' : 'items';
  const category = categoryMap[contentType] || contentType;
  
  if (action === 'search') {
    return `${ISLAMIC_HOUSE_API_BASE}?action=search&page=${page}`;
  } else {
    return `${ISLAMIC_HOUSE_API_BASE}?action=items&category=${category}&page=${page}`;
  }
}

// Enhanced fetch with retry logic
async function safeFetch(url, options = {}, retries = 3) {
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    mode: 'cors',
    cache: 'no-cache',
    ...options
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

// Local storage utilities
function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Could not save to localStorage:', error);
  }
}

function loadFromLocalStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Could not load from localStorage:', error);
    return defaultValue;
  }
}

// Get Arabic type name
function getArabicType(type) {
  const types = {
    'books': 'كتاب',
    'articles': 'مقالة', 
    'audios': 'صوتية',
    'videos': 'مرئية',
    'fatwa': 'فتوى',
    'quran': 'قرآن',
    'poster': 'ملصق',
    'cards': 'بطاقة'
  };
  return types[type] || type;
}

// Get file icon
function getFileIcon(extension) {
  const icons = {
    'PDF': '📄',
    'MP3': '🎵',
    'MP4': '🎬',
    'DOCX': '📝',
    'DOC': '📝'
  };
  return icons[extension.toUpperCase()] || '📎';
}

// Check if media file
function isMediaFile(extension) {
  const audioFormats = ['MP3', 'M4A', 'WAV', 'AAC'];
  const videoFormats = ['MP4', 'AVI', 'MOV', 'WMV'];
  const ext = extension.toUpperCase();
  return audioFormats.includes(ext) || videoFormats.includes(ext);
}

// Format date
function formatDate(dateString) {
    try {
        let date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            date = new Date();
        }
        
        const islamicDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric'
        }).format(date);
        
        return `تاريخ الإضافة: ${islamicDate.replace(/\s/g, '‏/')}`;
    } catch {
        const today = new Date();
        const islamicToday = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric'
        }).format(today);
        
        return `تاريخ الإضافة: ${islamicToday.replace(/\s/g, '‏/')}`;
    }
}

// Show error message
function showError(message) {
  console.error('Error:', message);
  alert(message);
}

// Format time for audio player
function formatTime(time) {
  if (!time || isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Fetch data from API
async function fetchData(contentType, page = 1, limit = 25, options = {}) {
  try {
    let url;
    
    // Manejar diferentes tipos de solicitudes
    if (options.search !== undefined) {
      // Búsqueda global (incluyendo búsqueda vacía para 'showall')
      url = `${ISLAMIC_HOUSE_API_BASE}?action=search&search=${encodeURIComponent(options.search)}&page=${page}`;
    } else if (contentType === 'showall') {
      // Obtener estadísticas para mostrar todas las categorías
      url = `${ISLAMIC_HOUSE_API_BASE}?action=stats`;
    } else {
      // Obtener items de una categoría específica
      url = `${ISLAMIC_HOUSE_API_BASE}?action=items&category=${contentType}&page=${page}`;
    }
    
    console.log('Fetching from URL:', url);
    const data = await safeFetch(url);
    console.log('API Response:', data);
    
    if (contentType === 'showall' && options.search === undefined) {
      // Para estadísticas, devolver en formato especial
      return {
        data: [],
        links: { current_page: 1, pages_number: 1, total_items: data.data.total_items },
        stats: data.data.categories
      };
    } else {
      // Para categorías específicas o búsquedas
      return {
        data: data.data || [],
        pagination: {
          current_page: data.pagination?.current_page || page,
          total_pages: data.pagination?.total_pages || 1,
          total_items: data.pagination?.total_items || 0
        }
      };
    }
  } catch (error) {
    console.error('Error in fetchData:', error);
    throw error;
  }
}

// ==================== DATA LOADING FUNCTIONS ====================

// Load home page data
async function loadHomePage() {
  try {
    setLoading(true);
    
    // Cargar estadísticas y categorías disponibles
    const [statsData, categoriesData] = await Promise.all([
      fetchData('showall', 1, 25), // Esto ahora devuelve estadísticas
      loadAvailableCategories()
    ]);
    
    if (statsData && statsData.stats) {
      // Actualizar estado con estadísticas
      AppState.totalItems = statsData.links?.total_items || 0;
      AppState.currentData = [];
      AppState.totalPages = 1;
      AppState.currentPage = 1;
      AppState.stats = statsData.stats;
      AppState.availableCategories = categoriesData;
      
      console.log(`Loaded stats: ${AppState.totalItems} total items`);
      console.log('Available categories:', AppState.availableCategories);
      
      updateStatsDisplay();
      renderContent(); // Cambiar de renderHomeContent a renderContent
      
      // Cargar contenido por defecto (showall)
      await filterByType('showall');
    } else {
      throw new Error('Failed to load statistics from database');
    }
  } catch (error) {
    console.error('Error loading home page:', error);
    showError('خطأ في تحميل البيانات من قاعدة البيانات');
  }
  setLoading(false);
}

// Cargar categorías disponibles desde la base de datos
async function loadAvailableCategories() {
  try {
    const response = await safeFetch(`${ISLAMIC_HOUSE_API_BASE}?action=categories`);
    
    if (response && response.success) {
      return response.data;
    } else {
      throw new Error('Failed to load categories');
    }
  } catch (error) {
    console.error('Error loading categories:', error);
    // Devolver categorías por defecto si falla
    return [
      { name: 'books', display_name: 'الكتب', count: 0 },
      { name: 'articles', display_name: 'المقالات', count: 0 },
      { name: 'fatwa', display_name: 'الفتاوى', count: 0 },
      { name: 'audios', display_name: 'الصوتيات', count: 0 },
      { name: 'videos', display_name: 'المرئيات', count: 0 }
    ];
  }
}

// Renderizar contenido de inicio con estadísticas
function renderHomeContent() {
  const contentContainer = document.getElementById('content-grid');
  if (!contentContainer) return;
  
  const stats = AppState.stats || {};
  const categories = AppState.availableCategories || [];
  
  // Crear HTML para mostrar estadísticas por categoría
  const categoryCards = categories.map(category => {
    const count = stats[category.name] || 0;
    const arabicNames = {
      'books': 'الكتب',
      'articles': 'المقالات', 
      'fatwa': 'الفتاوى',
      'audios': 'الصوتيات',
      'videos': 'المرئيات'
    };
    
    return `
      <div class="category-card" onclick="loadCategoryContent('${category.name}')">
        <div class="category-icon">
          <i class="fas fa-${getCategoryIcon(category.name)}"></i>
        </div>
        <div class="category-info">
          <h3>${arabicNames[category.name] || category.display_name}</h3>
          <p class="category-count">${count.toLocaleString()} عنصر</p>
        </div>
        <div class="category-arrow">
          <i class="fas fa-chevron-left"></i>
        </div>
      </div>
    `;
  }).join('');
  
  contentContainer.innerHTML = `
    <div class="home-content">
      <div class="welcome-section">
        <h2>مرحباً بك في مكتبة الإسلام</h2>
        <p>اكتشف مجموعة واسعة من المحتوى الإسلامي من الكتب والمقالات والفتاوى والصوتيات والمرئيات</p>
        <div class="total-stats">
          <div class="stat-item">
            <span class="stat-number">${AppState.totalItems.toLocaleString()}</span>
            <span class="stat-label">إجمالي العناصر</span>
          </div>
        </div>
      </div>
      
      <div class="categories-grid">
        ${categoryCards}
      </div>
    </div>
  `;
}

// Obtener icono para cada categoría
function getCategoryIcon(category) {
  const icons = {
    'books': 'book',
    'articles': 'newspaper',
    'fatwa': 'balance-scale',
    'audios': 'volume-up',
    'videos': 'play-circle'
  };
  return icons[category] || 'file-alt';
}

// Cargar contenido de una categoría específica
async function loadCategoryContent(category) {
  try {
    setLoading(true);
    AppState.currentCategory = category;
    AppState.currentPage = 1;
    
    // Caso especial para 'showall' - cargar contenido de todas las categorías
    if (category === 'showall') {
      const data = await fetchData('showall', 1, 25, { search: '' });
      
      if (data && data.data) {
        AppState.currentData = data.data;
        AppState.totalPages = data.pagination?.total_pages || 1;
        AppState.totalItems = data.pagination?.total_items || 0;
        
        console.log(`Loaded ${data.data.length} items from all categories`);
        updateStatsDisplay();
        renderContent();
        
        // Actualizar navegación
        updateActiveNavigation(category);
      } else {
        throw new Error('Failed to load all categories data');
      }
    } else {
      // Categoría específica
      const data = await fetchData(category, 1, 25);
      
      if (data && data.data) {
        AppState.currentData = data.data;
        AppState.totalPages = data.pagination?.total_pages || 1;
        AppState.totalItems = data.pagination?.total_items || 0;
        
        console.log(`Loaded ${data.data.length} items from category: ${category}`);
        updateStatsDisplay();
        renderContent();
        
        // Actualizar navegación
        updateActiveNavigation(category);
      } else {
        throw new Error(`Failed to load ${category} data`);
      }
    }
  } catch (error) {
    console.error(`Error loading ${category}:`, error);
    showError(`خطأ في تحميل ${category}`);
  }
  setLoading(false);
}

// Cache content for search
async function cacheContentForSearch() {
  try {
    console.log('Caching content for search...');
    const types = ['books', 'articles', 'fatwa', 'audios', 'videos'];
    let cachedData = [];
    
    // Check if we have recent cached data
    const existingCache = loadFromLocalStorage('search_cache');
    const cacheAge = existingCache ? Date.now() - existingCache.timestamp : Infinity;
    const cacheValid = cacheAge < 30 * 60 * 1000; // 30 minutes
    
    if (cacheValid && existingCache.data.length > 0) {
      console.log('Using existing search cache');
      AppState.allData = existingCache.data;
      return;
    }
    
    // Obtener datos de cada categoría individualmente
    for (const type of types) {
      try {
        console.log(`Caching ${type}...`);
        const data = await fetchData(type, 1, 50); // Obtener más elementos por categoría
        if (data && data.data && Array.isArray(data.data)) {
          cachedData = [...cachedData, ...data.data];
          console.log(`Cached ${data.data.length} items from ${type}`);
        }
      } catch (error) {
        console.warn(`Failed to cache ${type}:`, error);
        // Continue with other types
      }
    }
    
    // Remove duplicates based on ID
    const uniqueData = cachedData.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );
    
    AppState.allData = uniqueData;
    
    // Save to local cache
    saveToLocalStorage('search_cache', {
      data: uniqueData,
      timestamp: Date.now()
    });
    
    console.log(`Cached ${uniqueData.length} items for search`);
  } catch (error) {
    console.warn('Could not cache content for search:', error);
    
    // Try to use old cache as fallback
    const fallbackCache = loadFromLocalStorage('search_cache');
    if (fallbackCache && fallbackCache.data.length > 0) {
      console.log('Using fallback search cache');
      AppState.allData = fallbackCache.data;
    }
  }
}

// ==================== UI STATE MANAGEMENT ====================

// Set loading state
function setLoading(loading) {
  AppState.isLoading = loading;
  renderContent();
}

// Update stats display
function updateStatsDisplay() {
  const elements = document.querySelectorAll('.stats-number');
  if (elements.length >= 3) {
    // Calcular total combinado de base de datos + API
    let totalCombined = AppState.totalItems;
    
    // Si tenemos información de fuentes separadas, sumarlas
    if (window.lastSourcesInfo) {
      const dbTotal = window.lastSourcesInfo.databaseTotal || 0;
      const apiTotal = window.lastSourcesInfo.apiTotal || 0;
      totalCombined = dbTotal + apiTotal;
    }
    
    elements[0].textContent = totalCombined.toLocaleString('ar');
    elements[1].textContent = AppState.totalPages.toLocaleString('ar');
    elements[2].textContent = AppState.favorites.length.toLocaleString('ar');
  }
}

// Toggle mobile menu
function toggleMobileMenu() {
  AppState.mobileMenuOpen = !AppState.mobileMenuOpen;
  const overlay = document.querySelector('.mobile-menu-overlay');
  const menu = document.querySelector('.mobile-menu');
  const hamburgerLines = document.querySelectorAll('.hamburger-line');
  
  if (AppState.mobileMenuOpen) {
    overlay.style.display = 'block';
    menu.style.display = 'block';
    hamburgerLines.forEach(line => line.classList.add('open'));
    document.body.style.overflow = 'hidden';
  } else {
    overlay.style.display = 'none';
    menu.style.display = 'none';
    hamburgerLines.forEach(line => line.classList.remove('open'));
    document.body.style.overflow = '';
  }
}

// Close mobile menu
function closeMobileMenu() {
  if (AppState.mobileMenuOpen) {
    toggleMobileMenu();
  }
}

// Navigate to page
function navigateToPage(page) {
  AppState.activeNav = page;
  closeMobileMenu();
  
  // Update navigation active states
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === AppState.activeNav) {
      link.classList.add('active');
    }
  });
  
  renderContent();
}

// Update active navigation for category
function updateActiveNavigation(category) {
  // Para 'showall' y filtros de categoría, mantener en 'home'
  if (category === 'showall' || ['books', 'articles', 'fatwa', 'audios', 'videos'].includes(category)) {
    AppState.activeNav = 'home';
  } else {
    AppState.activeNav = category;
  }
  
  // Update navigation active states
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === AppState.activeNav) {
      link.classList.add('active');
    }
  });
}

// ==================== FAVORITES MANAGEMENT ====================

// Toggle favorite
function toggleFavorite(id, item) {
  const idStr = id.toString();
  const index = AppState.favorites.indexOf(idStr);
  
  let newFavorites, newFavoritesData;
  
  if (index === -1) {
    // Agregar a favoritos
    newFavorites = [...AppState.favorites, idStr];
    newFavoritesData = { ...AppState.favoritesData, [idStr]: item };
  } else {
    // Quitar de favoritos
    newFavorites = AppState.favorites.filter((_, i) => i !== index);
    const { [idStr]: removed, ...rest } = AppState.favoritesData;
    newFavoritesData = rest;
  }
  
  AppState.favorites = newFavorites;
  AppState.favoritesData = newFavoritesData;
  
  localStorage.setItem('islamicFavorites', JSON.stringify(newFavorites));
  localStorage.setItem('islamicFavoritesData', JSON.stringify(newFavoritesData));
  
  // Re-render if we're on favorites page
  if (AppState.activeNav === 'favorites') {
    renderContent();
  }
  
  // Update stats
  updateStatsDisplay();
  
  // Actualizar visualmente el botón que se acaba de hacer clic
  const button = event.target.closest('.favorite-btn');
  if (button) {
    const svg = button.querySelector('svg');
    const isFavorited = newFavorites.includes(idStr);
    
    if (isFavorited) {
      button.classList.add('favorited');
      if (svg) {
        svg.setAttribute('fill', 'currentColor');
      }
      button.title = 'إزالة من المفضلة';
    } else {
      button.classList.remove('favorited');
      if (svg) {
        svg.setAttribute('fill', 'none');
      }
      button.title = 'إضافة للمفضلة';
    }
  }
}

// ==================== MEDIA PLAYER FUNCTIONS ====================

// Handle media click
function handleMediaClick(url, title, type) {
  if (type.toLowerCase().includes('mp3') || type.toLowerCase().includes('audio')) {
    addToAudioQueue({ url, title, type });
  } else if (type.toLowerCase().includes('mp4') || type.toLowerCase().includes('video')) {
    AppState.currentVideo = { url, title };
    AppState.videoPlayerVisible = true;
    showVideoPlayer();
  }
}

// Audio player functions
function addToAudioQueue(audioItem) {
  const existingIndex = AppState.audioQueue.findIndex(item => item.url === audioItem.url);
  let newQueue = AppState.audioQueue;
  let shouldPlayNew = false;
  
  if (existingIndex === -1) {
    // Agregar nuevo audio a la cola
    newQueue = [...AppState.audioQueue, audioItem];
    AppState.audioQueue = newQueue;
    shouldPlayNew = true;
  } else {
    // Si ya existe, reproducirlo
    shouldPlayNew = true;
  }
  
  // Pausar el audio actual si está reproduciéndose
  const audioElement = document.getElementById('audioElement');
  if (audioElement && AppState.isPlaying) {
    audioElement.pause();
  }
  
  // Establecer el índice del nuevo audio a reproducir
  const newIndex = existingIndex === -1 ? newQueue.length - 1 : existingIndex;
  AppState.currentAudioIndex = newIndex;
  
  // Reproducir el nuevo audio
  if (shouldPlayNew) {
    loadCurrentTrack();
  }
  
  AppState.audioPlayerVisible = true;
  showAudioPlayer();
  updateQueueDisplay();
}

function togglePlayPause() {
  const audioElement = document.getElementById('audioElement');
  if (audioElement && AppState.currentAudioIndex !== -1) {
    if (AppState.isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play().catch(e => console.error('Error playing audio:', e));
    }
  }
}

function playPrevious() {
  if (AppState.audioQueue.length === 0) return;
  
  let prevIndex;
  if (AppState.isShuffled) {
    prevIndex = Math.floor(Math.random() * AppState.audioQueue.length);
  } else {
    prevIndex = AppState.currentAudioIndex > 0 ? AppState.currentAudioIndex - 1 : AppState.audioQueue.length - 1;
  }
  
  AppState.currentAudioIndex = prevIndex;
  AppState.currentTime = 0;
  loadCurrentTrack();
}

function playNext() {
  if (AppState.audioQueue.length === 0) return;
  
  let nextIndex;
  if (AppState.isShuffled) {
    nextIndex = Math.floor(Math.random() * AppState.audioQueue.length);
  } else {
    nextIndex = AppState.currentAudioIndex < AppState.audioQueue.length - 1 ? AppState.currentAudioIndex + 1 : 0;
  }
  
  AppState.currentAudioIndex = nextIndex;
  AppState.currentTime = 0;
  loadCurrentTrack();
}

function loadCurrentTrack() {
  const audioElement = document.getElementById('audioElement');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const currentTrack = AppState.audioQueue[AppState.currentAudioIndex];
  
  if (audioElement && currentTrack) {
    // Mostrar animación de carga en el botón de play
    if (playPauseBtn) {
      playPauseBtn.innerHTML = `
        <div class="audio-loader-dots">
          <div></div>
          <div></div>
          <div></div>
        </div>
      `;
      playPauseBtn.title = 'جاري التحميل...';
    }
    
    audioElement.src = currentTrack.url;
    document.getElementById('audioTitle').textContent = currentTrack.title;
    
    // Cargar y reproducir automáticamente
    audioElement.load();
    
    // Reproducir cuando esté listo
    const playWhenReady = () => {
      audioElement.play()
        .then(() => {
          console.log('Audio reproducido automáticamente');
        })
        .catch(error => {
          console.error('Error al reproducir audio automáticamente:', error);
          // Si falla la reproducción automática, restaurar el botón de play
          if (playPauseBtn) {
            playPauseBtn.innerHTML = `
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
              </svg>
            `;
            playPauseBtn.title = 'تشغيل';
          }
        });
    };
    
    // Escuchar cuando los metadatos estén cargados para reproducir
    audioElement.addEventListener('loadedmetadata', playWhenReady, { once: true });
    
    // Fallback: si ya tiene metadatos cargados, reproducir inmediatamente
    if (audioElement.readyState >= 1) {
      playWhenReady();
    }
    
    updateQueueDisplay();
  }
}

function toggleShuffle() {
  AppState.isShuffled = !AppState.isShuffled;
  const shuffleBtn = document.getElementById('shuffleBtn');
  shuffleBtn.classList.toggle('active', AppState.isShuffled);
}

function toggleRepeat() {
  AppState.isRepeating = !AppState.isRepeating;
  const repeatBtn = document.getElementById('repeatBtn');
  repeatBtn.classList.toggle('active', AppState.isRepeating);
}

function toggleQueue() {
  AppState.queueVisible = !AppState.queueVisible;
  const queueModal = document.getElementById('audioQueueModal');
  const queueBtn = document.getElementById('queueBtn');
  
  queueModal.style.display = AppState.queueVisible ? 'block' : 'none';
  queueBtn.classList.toggle('active', AppState.queueVisible);
  
  if (AppState.queueVisible) {
    updateQueueDisplay();
  }
}

function clearQueue() {
  AppState.audioQueue = [];
  AppState.currentAudioIndex = -1;
  AppState.audioPlayerVisible = false;
  AppState.queueVisible = false;
  closeAudioPlayer();
}

function closeAudioPlayer() {
  AppState.audioPlayerVisible = false;
  AppState.queueVisible = false;
  const audioElement = document.getElementById('audioElement');
  if (audioElement) {
    audioElement.pause();
  }
  document.getElementById('audioPlayerContainer').style.display = 'none';
  document.getElementById('audioQueueModal').style.display = 'none';
  document.body.classList.remove('audio-player-active');
}

function showAudioPlayer() {
  document.getElementById('audioPlayerContainer').style.display = 'block';
  document.body.classList.add('audio-player-active');
  loadCurrentTrack();
}

function updateQueueDisplay() {
  const queueList = document.getElementById('queueList');
  const queueCounter = document.getElementById('queueCounter');
  const queueItemCount = document.getElementById('queueItemCount');
  
  queueCounter.textContent = AppState.audioQueue.length;
  queueItemCount.textContent = AppState.audioQueue.length;
  
  queueList.innerHTML = '';
  
  AppState.audioQueue.forEach((item, index) => {
    const queueItem = document.createElement('div');
    queueItem.className = `queue-item ${index === AppState.currentAudioIndex ? 'active' : ''}`;
    queueItem.onclick = () => playFromQueue(index);
    
    queueItem.innerHTML = `
      <div class="queue-item-icon">
        ${index === AppState.currentAudioIndex && AppState.isPlaying ? 
          '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 4a1 1 0 00-1 1v10a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1H6zM12 4a1 1 0 00-1 1v10a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1h-2z" clip-rule="evenodd"/></svg>' :
          '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>'
        }
      </div>
      <div class="queue-item-content">
        <div class="queue-item-title">${item.title}</div>
        <div class="queue-item-type">ملف صوتي</div>
      </div>
      <button onclick="event.stopPropagation(); removeFromQueue(${index})" class="queue-item-remove" title="إزالة من القائمة">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </button>
    `;
    
    queueList.appendChild(queueItem);
  });
}

function playFromQueue(index) {
  AppState.currentAudioIndex = index;
  AppState.currentTime = 0;
  AppState.queueVisible = false;
  document.getElementById('audioQueueModal').style.display = 'none';
  loadCurrentTrack();
  
  const audioElement = document.getElementById('audioElement');
  if (audioElement) {
    audioElement.play().catch(e => console.error('Error playing audio:', e));
  }
}

function removeFromQueue(index) {
  const newQueue = AppState.audioQueue.filter((_, i) => i !== index);
  AppState.audioQueue = newQueue;
  
  if (index === AppState.currentAudioIndex) {
    if (newQueue.length === 0) {
      AppState.currentAudioIndex = -1;
      AppState.audioPlayerVisible = false;
      closeAudioPlayer();
    } else {
      const newIndex = Math.min(AppState.currentAudioIndex, newQueue.length - 1);
      AppState.currentAudioIndex = newIndex;
      loadCurrentTrack();
    }
  } else if (index < AppState.currentAudioIndex) {
    AppState.currentAudioIndex = AppState.currentAudioIndex - 1;
  }
  
  updateQueueDisplay();
}

// Video player functions
function showVideoPlayer() {
  const modal = document.getElementById('videoPlayerModal');
  const videoElement = document.getElementById('videoElement');
  const titleElement = document.getElementById('videoTitle');
  
  modal.style.display = 'flex';
  videoElement.src = AppState.currentVideo.url;
  titleElement.textContent = AppState.currentVideo.title;
  document.body.style.overflow = 'hidden';
}

function closeVideoPlayer() {
  AppState.videoPlayerVisible = false;
  const modal = document.getElementById('videoPlayerModal');
  const videoElement = document.getElementById('videoElement');
  
  modal.style.display = 'none';
  videoElement.pause();
  videoElement.src = '';
  document.body.style.overflow = '';
}

// ==================== FILTERING AND SEARCH ====================

// Filter by type - Using API only
async function filterByType(type) {
  const filterStartTime = Date.now();
  AppState.currentCategory = type;
  AppState.currentFilter = type;
  
  console.log(`Filtering by type: ${type}`);
  
  try {
    setLoading(true);
    AppState.currentPage = 1;
    
    // Load data directly from API
    let data;
    if (type === 'showall') {
      // Para 'showall', usar búsqueda vacía para obtener todo el contenido
      data = await fetchData('showall', 1, AppState.itemsPerPage, { search: '' });
    } else {
      data = await fetchData(type, 1, AppState.itemsPerPage);
    }
    
    console.log('Filter Response:', data);
    
    if (data && data.data) {
      AppState.currentData = data.data;
      
      if (type === 'showall') {
        AppState.totalPages = data.pagination?.total_pages || 1;
        AppState.totalItems = data.pagination?.total_items || 0;
      } else {
        AppState.totalPages = data.pagination?.total_pages || 1;
        AppState.totalItems = data.pagination?.total_items || 0;
      }
      
      AppState.currentPage = 1;
      
      console.log(`Filter ${type} completed in`, Date.now() - filterStartTime, 'ms');
      updateStatsDisplay();
      renderContent();
      
      // Actualizar navegación activa
      updateActiveNavigation(type);
    } else {
      console.error('Filter failed:', data?.error || 'No data received');
      showError('فشل في تحميل البيانات من API');
    }
  } catch (error) {
    console.error('Error loading content:', error);
    
    // Try to load from cache
    const cachedData = loadFromLocalStorage(`category_${type}_cache`);
    if (cachedData && cachedData.data.length > 0) {
      AppState.currentData = cachedData.data;
      AppState.totalPages = cachedData.totalPages;
      AppState.totalItems = cachedData.totalItems;
      renderContent();
      showError('تم تحميل البيانات من الذاكرة المحلية');
    } else {
      showError('خطأ في تحميل البيانات');
    }
  }
  
  setLoading(false);
}

// Perform search
async function performSearch(page = 1) {
  const searchInput = document.getElementById('searchInput');
  const searchQuery = searchInput.value.trim();
  
  if (!searchQuery) {
    // Si la búsqueda está vacía, regresar a la página principal
    navigateToPage('home');
    return;
  }
  
  AppState.searchQuery = searchQuery;
  setLoading(true);
  
  try {
    console.log(`Searching for "${searchQuery}" on page ${page}...`);
    
    // Use API search directly
    const data = await fetchData('showall', page, 25, { search: searchQuery });
    console.log('Search Response:', data);
    
    if (data && data.data) {
      // Update search states
      AppState.searchResults = data.data;
      AppState.searchTotalItems = data.pagination?.total_items || data.data.length;
      AppState.searchTotalPages = data.pagination?.total_pages || 1;
      AppState.searchCurrentPage = page;
      AppState.activeNav = 'search';
      
      console.log(`Found ${data.data.length} results from API`);
      console.log('Search state updated:', {
        totalItems: AppState.searchTotalItems,
        totalPages: AppState.searchTotalPages,
        currentPage: AppState.searchCurrentPage,
        resultsCount: AppState.searchResults.length
      });
      
      // Finalizar loading antes de renderizar
      setLoading(false);
      
      // Update navigation
      navigateToPage('search');
    } else {
      throw new Error('Search failed - no data received');
    }
  } catch (error) {
    console.error('Search error:', error);
    
    // Fallback to local search if backend fails
    console.log('Falling back to local search...');
    const lowerQuery = searchQuery.toLowerCase();
    const searchData = AppState.allData.length > 0 ? AppState.allData : AppState.currentData;
    
    const filteredData = searchData.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(lowerQuery);
      const descMatch = item.description && item.description.toLowerCase().includes(lowerQuery);
      const authorMatch = item.prepared_by && item.prepared_by.some(author => 
        author.title.toLowerCase().includes(lowerQuery)
      );
      
      if (AppState.searchFilters.type !== 'showall' && item.type !== AppState.searchFilters.type) {
        return false;
      }
      
      return titleMatch || descMatch || authorMatch;
    });
    
    // Calculate pagination for local search
    const itemsPerPage = 25;
    const totalResults = filteredData.length;
    const totalSearchPages = Math.ceil(totalResults / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResults = filteredData.slice(startIndex, endIndex);
    
    // Update search states
    AppState.searchResults = paginatedResults;
    AppState.searchTotalItems = totalResults;
    AppState.searchTotalPages = totalSearchPages;
    AppState.searchCurrentPage = page;
    AppState.activeNav = 'search';
    
    console.log('Local search state updated:', {
      totalItems: AppState.searchTotalItems,
      totalPages: AppState.searchTotalPages,
      currentPage: AppState.searchCurrentPage,
      resultsCount: AppState.searchResults.length
    });
    
    // Finalizar loading antes de renderizar
    setLoading(false);
    
    // Update navigation
    navigateToPage('search');
    
    showError('البحث من الخادم فشل، تم استخدام البحث المحلي');
  }
}
  
async function loadPage(pageNumber) {
  if (pageNumber < 1 || pageNumber > AppState.totalPages) return;
  
  try {
    setLoading(true);
    
    let data;
    
    if (AppState.searchQuery) {
      // Search mode
      data = await performSearch(AppState.searchQuery, pageNumber);
      
      if (data && data.data) {
        AppState.currentData = data.data;
        AppState.currentPage = pageNumber;
        AppState.totalPages = data.links?.pages_number || 1;
        AppState.totalItems = data.links?.total_items || 0;
        
        console.log(`Loaded page ${pageNumber} with ${data.data.length} items from search`);
        updateStatsDisplay();
        renderContent();
      } else {
        throw new Error('Failed to load search results');
      }
    } else {
      const currentType = AppState.currentFilter || 'showall';
      
      if (currentType === 'showall') {
        // Para "الكل" (Todo), mostrar contenido de inicio
        console.log('Loading home content for "الكل" section');
        AppState.currentData = [];
        AppState.currentPage = 1;
        AppState.totalPages = 1;
        
        // Renderizar contenido de inicio
        renderHomeContent();
        updateStatsDisplay();
      } else {
        // Load specific category from API
        data = await fetchData(currentType, pageNumber, AppState.itemsPerPage);
        
        if (data && data.data) {
          AppState.currentData = data.data;
          AppState.currentPage = pageNumber;
          AppState.totalPages = data.pagination?.total_pages || 1;
          AppState.totalItems = data.pagination?.total_items || 0;
          
          console.log(`Loaded page ${pageNumber} with ${data.data.length} items from ${currentType}`);
          updateStatsDisplay();
          renderContent();
        } else {
          throw new Error(`Failed to load ${currentType} data`);
        }
      }
    }
  } catch (error) {
    console.error('Error loading page:', error);
    showError('خطأ في تحميل الصفحة من API');
  }
  setLoading(false);
}

// Navigation functions
function goToNextPage() {
  if (AppState.currentPage < AppState.totalPages) {
    loadPage(AppState.currentPage + 1);
  }
}

function goToPrevPage() {
  if (AppState.currentPage > 1) {
    loadPage(AppState.currentPage - 1);
  }
}

function goToFirstPage() {
  loadPage(1);
}

function goToLastPage() {
  loadPage(AppState.totalPages);
}

// Search pagination functions
function loadSearchPage(pageNumber) {
  if (pageNumber < 1 || pageNumber > AppState.searchTotalPages || pageNumber === AppState.searchCurrentPage) return;
  performSearch(pageNumber);
}

function goToNextSearchPage() {
  if (AppState.searchCurrentPage < AppState.searchTotalPages) {
    loadSearchPage(AppState.searchCurrentPage + 1);
  }
}

function goToPrevSearchPage() {
  if (AppState.searchCurrentPage > 1) {
    loadSearchPage(AppState.searchCurrentPage - 1);
  }
}

function goToFirstSearchPage() {
  loadSearchPage(1);
}

function goToLastSearchPage() {
  loadSearchPage(AppState.searchTotalPages);
}

// ==================== CONTENT RENDERING ====================

// Render content card
function renderContentCard(item, highlightQuery = null) {
    const isFavorited = AppState.favorites.includes(item.id.toString());
    const typeClass = `type-${item.type}`;
    const arabicType = getArabicType(item.type);
    const isBook = item.type === 'books';
    const isFatwa = item.type === 'fatwa';

    // Función para escapar HTML y preservar saltos de línea
    const escapeHtml = (text) => {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\n/g, "<br>");
    };

    // Función para formatear la fecha
    const formatDateSafe = (dateString) => {
        try {
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? '' : date.toLocaleDateString('ar-EG');
        } catch {
            return '';
        }
    };

    // Mostrar contenido según el tipo
    let mediaHTML = '';
    let contentHTML = '';
    let detailsHTML = '';

    if (isBook) {
        // Código para libros
        const downloadButtons = [];
        
        if (item.download_link) {
            const extension = item.download_link.split('.').pop().toUpperCase();
            downloadButtons.push(`
                <button onclick="window.open('${escapeHtml(item.download_link)}', '_blank')" class="attachment-link">
                    <span>${getFileIcon(extension)}</span>
                    <span>${extension}</span>
                    <span class="text-xs opacity-75">(تحميل)</span>
                </button>
            `);
        }
        
        if (item.alternative_link) {
            const altExtension = item.alternative_link.split('.').pop().toUpperCase();
            downloadButtons.push(`
                <button onclick="window.open('${escapeHtml(item.alternative_link)}', '_blank')" class="attachment-link">
                    <span>${getFileIcon(altExtension)}</span>
                    <span>${altExtension}</span>
                    <span class="text-xs opacity-75">(رابط بديل)</span>
                </button>
            `);
        }
        
        mediaHTML = downloadButtons.length > 0 
            ? `<div class="attachments-grid mb-3">${downloadButtons.join('')}</div>`
            : '';

        const details = [];
        
        if (item.author) details.push(`<div><strong>المؤلف:</strong> ${escapeHtml(item.author)}</div>`);
        if (item.researcher_supervisor) details.push(`<div><strong>المشرف البحثي:</strong> ${escapeHtml(item.researcher_supervisor)}</div>`);
        if (item.publisher) details.push(`<div><strong>الناشر:</strong> ${escapeHtml(item.publisher)}</div>`);
        if (item.publication_country) details.push(`<div><strong>البلد:</strong> ${escapeHtml(item.publication_country)}${item.city ? ` - ${escapeHtml(item.city)}` : ''}</div>`);
        if (item.main_category) details.push(`<div><strong>التصنيف الرئيسي:</strong> ${escapeHtml(item.main_category)}</div>`);
        if (item.sub_category) details.push(`<div><strong>التصنيف الفرعي:</strong> ${escapeHtml(item.sub_category)}</div>`);
        if (item.parts) details.push(`<div><strong>الأجزاء:</strong> ${escapeHtml(item.parts)}</div>`);
        if (item.parts_count) details.push(`<div><strong>عدد الأجزاء:</strong> ${escapeHtml(item.parts_count)}</div>`);
        if (item.section_books_count) details.push(`<div><strong>عدد الكتب في القسم:</strong> ${escapeHtml(item.section_books_count)}</div>`);
        if (item.pages) details.push(`<div><strong>الصفحات:</strong> ${escapeHtml(item.pages)}</div>`);
        if (item.format) details.push(`<div><strong>الصيغة:</strong> ${escapeHtml(item.format)}</div>`);
        if (item.size_bytes) {
            const sizeMB = (item.size_bytes / (1024 * 1024)).toFixed(2);
            details.push(`<div><strong>الحجم:</strong> ${sizeMB} ميجابايت</div>`);
        }

        detailsHTML = details.length > 0 ? `
            <div class="book-details mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                <h5 class="font-bold mb-2 text-emerald-700">تفاصيل الكتاب</h5>
                ${details.join('')}
                ${item.topics ? `<div class="mt-2"><strong>المواضيع:</strong> ${escapeHtml(item.topics)}</div>` : ''}
            </div>
        ` : '';

        contentHTML = `
            <p class="text-gray-600 mb-4 arabic-text leading-relaxed line-clamp-3 text-sm lg:text-base">
                ${escapeHtml(item.topics || 'لا يوجد وصف متاح')}
            </p>
        `;
    } else if (isFatwa) {
        // Código específico para fatwas
        if (item.audio) {
            const audioExtension = item.audio.split('.').pop().toUpperCase();
            mediaHTML = `
                <div class="attachments-grid mb-4">
                    <button
                        onclick="handleMediaClick('${escapeHtml(item.audio)}', '${escapeHtml(item.title)}', '${audioExtension}')"
                        class="attachment-link audio-link"
                    >
                        <span>🎵</span>
                        <span>${audioExtension}</span>
                        <span class="text-xs opacity-75">(استماع)</span>
                    </button>
                </div>
            `;
        }

        const fullQuestion = item.question || 'لا يوجد نص للسؤال';
        const fullAnswer = item.answer || 'لا يوجد نص للإجابة';
        const showReadMore = fullQuestion.length > 150 || fullAnswer.length > 300;

        contentHTML = `
            <div class="fatwa-content mb-4">
                <div class="question-text text-emerald-800 font-semibold mb-3">
                    ${escapeHtml(fullQuestion.length > 150 ? fullQuestion.substring(0, 150) : fullQuestion)}
                    ${fullQuestion.length > 150 ? `
                        <button onclick="this.parentElement.innerHTML = decodeURI('${encodeURI(escapeHtml(fullQuestion))}')" 
                                class="read-more-btn mr-2">
                            ...المزيد
                        </button>
                    ` : ''}
                </div>
                <div class="answer-text text-gray-700">
                    ${escapeHtml(fullAnswer.length > 300 ? fullAnswer.substring(0, 300) : fullAnswer)}
                    ${fullAnswer.length > 300 ? `
                        <button onclick="this.parentElement.innerHTML = decodeURI('${encodeURI(escapeHtml(fullAnswer))}')" 
                                class="read-more-btn mr-2">
                            ...المزيد
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    } else {
        // Código para otros tipos de contenido (articles, audios, videos)
        mediaHTML = item.attachments && item.attachments.length > 0 
            ? item.attachments.map((attachment, idx) => `
                <button
                    onclick="handleMediaClick('${escapeHtml(attachment.url)}', '${escapeHtml(item.title)}', '${escapeHtml(attachment.extension_type)}')"
                    class="attachment-link"
                >
                    <span>${getFileIcon(attachment.extension_type)}</span>
                    <span>${attachment.extension_type}</span>
                    <span class="text-xs opacity-75">(${attachment.size})</span>
                </button>
            `).join('')
            : '';
        
        mediaHTML = mediaHTML ? `<div class="attachments-grid mb-4">${mediaHTML}</div>` : '';
        
        contentHTML = `
            <p class="text-gray-600 mb-4 arabic-text leading-relaxed line-clamp-3 text-sm lg:text-base">
                ${escapeHtml(item.description || 'لا يوجد وصف متاح')}
            </p>
        `;
    }
    
    // Mostrar autores/preparadores para no-libros y no-fatwas
    const authorsHTML = item.prepared_by && !isBook && !isFatwa
        ? `<div class="mb-3">
             <p class="text-sm text-emerald-600 font-semibold">
               ${item.prepared_by.map(author => escapeHtml(author.title)).join(' • ')}
             </p>
           </div>`
        : '';

    return `
        <div class="card fade-in">
            <div class="flex justify-between items-start mb-3">
                <span class="content-type-badge ${typeClass}">${arabicType}</span>
                <button 
                    onclick="toggleFavorite(${item.id}, ${JSON.stringify(item).replace(/"/g, '&quot;')})"
                    class="btn-icon favorite-btn ${isFavorited ? 'favorited' : ''}"
                    title="${isFavorited ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}"
                >
                    <svg class="w-5 h-5" fill="${isFavorited ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                </button>
            </div>

            <h4 class="text-lg font-bold text-gray-900 mb-2 arabic-text leading-relaxed">
                ${escapeHtml(isBook ? (item.name || 'لا يوجد عنوان') : (item.title || 'لا يوجد عنوان'))}
            </h4>

            ${contentHTML}
            ${authorsHTML}
            ${mediaHTML}
            ${detailsHTML}

            <div class="flex justify-between items-center text-xs lg:text-sm text-gray-500 mt-3">
                ${!isBook && !isFatwa && item.num_attachments ? `
                    <span class="inline-flex items-center gap-1">
                        <svg class="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                        </svg>
                        ${item.num_attachments} مرفق
                    </span>
                ` : ''}
                
                <span>${formatDateSafe(item.add_date || item.pub_date || '')}</span>
            </div>
        </div>
    `;
}

// Render pagination
function renderPagination(currentPage, totalPages, totalItems, onPageClick) {
  if (totalPages <= 1) return '';
  
  let pagesHTML = '';
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    pagesHTML += `
      <button
        onclick="${onPageClick}(${i})"
        class="pagination-number ${currentPage === i ? 'active' : ''}"
      >
        ${i}
      </button>
    `;
  }
  
  return `
    <div class="pagination-container">
      <div class="pagination-info">
        <span>صفحة ${currentPage} من ${totalPages} (${totalItems.toLocaleString('ar')} ${totalItems === AppState.searchTotalItems ? 'نتيجة' : 'عنصر'})</span>
      </div>
      
      <div class="pagination-controls">
        <button 
          onclick="${onPageClick}(1)"
          ${currentPage === 1 ? 'disabled' : ''}
          class="pagination-btn"
        >
          الأولى
        </button>
        
        <button 
          onclick="${onPageClick}(${currentPage - 1})"
          ${currentPage === 1 ? 'disabled' : ''}
          class="pagination-btn"
        >
          السابقة
        </button>
        
        <div class="pagination-pages">
          ${pagesHTML}
        </div>

        <button 
          onclick="${onPageClick}(${currentPage + 1})"
          ${currentPage === totalPages ? 'disabled' : ''}
          class="pagination-btn"
        >
          التالية
        </button>
        
        <button 
          onclick="${onPageClick}(${totalPages})"
          ${currentPage === totalPages ? 'disabled' : ''}
          class="pagination-btn"
        >
          الأخيرة
        </button>
      </div>
    </div>
  `;
}

// Main content rendering function
function renderContent() {
  const mainContent = document.getElementById('mainContent');
  
  if (AppState.isLoading) {
    mainContent.innerHTML = `
      <div class="loader">
        <div class="spinner"></div>
      </div>
    `;
    return;
  }

  switch (AppState.activeNav) {
    case 'search':
      if (!AppState.searchQuery.trim()) {
        AppState.activeNav = 'home';
        renderContent();
        return;
      }
      
      const searchCardsHTML = AppState.searchResults && AppState.searchResults.length > 0 
        ? AppState.searchResults.map(item => renderContentCard(item, AppState.searchQuery)).join('')
        : '<div class="col-span-full text-center py-8 text-gray-500">لا توجد نتائج للبحث</div>';
      
      // Solo mostrar paginación si hay más de 25 resultados
      const showPagination = AppState.searchTotalItems > 25;
      const paginationHTML = showPagination 
        ? renderPagination(AppState.searchCurrentPage, AppState.searchTotalPages, AppState.searchTotalItems, 'loadSearchPage')
        : '';
      
      mainContent.innerHTML = `
        <section class="container mx-auto px-4 py-8">
          <div class="mb-8">
            <h3 class="text-2xl lg:text-3xl font-bold text-emerald-900 mb-2">نتائج البحث</h3>
            <p class="text-emerald-700">تم العثور على ${AppState.searchTotalItems || 0} نتيجة للبحث عن "${AppState.searchQuery}"</p>
            ${showPagination ? `<p class="text-sm text-emerald-600 mt-1">الصفحة ${AppState.searchCurrentPage} من ${AppState.searchTotalPages}</p>` : ''}
          </div>
          
          <div class="content-grid">
            ${searchCardsHTML}
          </div>
          
          ${paginationHTML}
        </section>
      `;
      break;

    case 'favorites':
      const favoriteItems = AppState.favorites.map(id => AppState.favoritesData[id]).filter(Boolean);
      
      if (favoriteItems.length === 0) {
        mainContent.innerHTML = `
          <section class="container mx-auto px-4 py-12 text-center">
            <div class="max-w-md mx-auto">
              <div class="text-4xl lg:text-6xl mb-6">💝</div>
              <h2 class="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">لا توجد مفضلة</h2>
              <p class="text-gray-600 mb-8 text-sm lg:text-base">لم تقم بإضافة أي محتوى إلى المفضلة بعد</p>
              <button onclick="navigateToPage('home')" class="btn btn-primary">
                تصفح المحتوى
              </button>
            </div>
          </section>
        `;
      } else {
        const favoriteCardsHTML = favoriteItems.map(item => renderContentCard(item)).join('');
        
        mainContent.innerHTML = `
          <section class="container mx-auto px-4 py-8 lg:py-12">
            <div class="mb-8 text-center">
              <h2 class="text-2xl lg:text-3xl font-bold text-emerald-900 mb-4">مفضلاتي</h2>
              <p class="text-emerald-700 text-sm lg:text-base">لديك ${AppState.favorites.length} عنصر في المفضلة</p>
            </div>

            <div class="content-grid">
              ${favoriteCardsHTML}
            </div>
          </section>
        `;
      }
      break;

    case 'categories':
      const categories = [
        { key: 'books', name: 'الكتب', icon: '📚', color: 'from-yellow-400 to-orange-500' },
        { key: 'articles', name: 'المقالات', icon: '📝', color: 'from-blue-400 to-blue-600' },
        { key: 'fatwa', name: 'الفتاوى', icon: '⚖️', color: 'from-green-400 to-green-600' },
        { key: 'audios', name: 'الصوتيات', icon: '🎵', color: 'from-purple-400 to-purple-600' },
        { key: 'videos', name: 'المرئيات', icon: '🎬', color: 'from-pink-400 to-pink-600' },
        { key: 'quran', name: 'القرآن الكريم', icon: '📖', color: 'from-emerald-400 to-emerald-600' },
        { key: 'poster', name: 'الملصقات', icon: '🖼️', color: 'from-indigo-400 to-indigo-600' },
        { key: 'cards', name: 'البطاقات', icon: '🎴', color: 'from-teal-400 to-teal-600' }
      ];

      const categoriesHTML = categories.map(category => `
        <div 
          class="card text-center cursor-pointer hover:scale-105 transition-transform" 
          onclick="filterByType('${category.key}'); navigateToPage('home');"
        >
          <div class="category-icon bg-gradient-to-br ${category.color} text-white mx-auto mb-4 w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center text-xl lg:text-2xl">
            ${category.icon}
          </div>
          <h3 class="text-sm lg:text-xl font-bold text-gray-900 mb-2">${category.name}</h3>
          <p class="text-gray-600 text-xs lg:text-sm">استكشف محتوى ${category.name}</p>
        </div>
      `).join('');

      mainContent.innerHTML = `
        <section class="container mx-auto px-4 py-8 lg:py-12">
          <div class="mb-8 text-center">
            <h2 class="text-2xl lg:text-3xl font-bold text-emerald-900 mb-4">التصنيفات</h2>
            <p class="text-emerald-700 text-sm lg:text-base">استكشف المحتوى حسب التصنيف</p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            ${categoriesHTML}
          </div>
        </section>
      `;
      break;

    default: // home
      const contentCardsHTML = AppState.currentData.length > 0 
        ? AppState.currentData.map(item => renderContentCard(item)).join('')
        : '<div class="col-span-full text-center py-8 text-gray-500">جار تحميل المحتوى...</div>';
      
      const categoryFiltersHTML = ['showall', 'books', 'articles', 'fatwa', 'audios', 'videos'].map((type) => `
        <button 
          onclick="filterByType('${type}')" 
          class="btn text-sm lg:text-base ${AppState.currentCategory === type ? 'btn-primary' : 'btn-outline'}"
        >
          ${type === 'showall' ? 'الكل' : 
           type === 'books' ? 'الكتب' : 
           type === 'articles' ? 'المقالات' : 
           type === 'fatwa' ? 'الفتاوى' : 
           type === 'audios' ? 'الصوتيات' : 'المرئيات'}
        </button>
      `).join('');

      mainContent.innerHTML = `
        <div class="hero islamic-pattern">
          <div class="container mx-auto px-4 text-center">
            <h2 class="text-3xl md:text-4xl lg:text-6xl font-bold mb-6 calligraphy">بسم الله الرحمن الرحيم</h2>
            <p class="text-lg md:text-xl lg:text-2xl mb-8 opacity-90">مكتبة شاملة للمحتوى الإسلامي الأصيل</p>
            <div class="stats-container">
              <div class="stats-card bg-white/10 backdrop-blur-sm border-white/20">
                <div class="stats-number text-white">${AppState.totalItems.toLocaleString('ar')}</div>
                <div class="stats-label text-white/80">إجمالي المواد</div>
              </div>
              <div class="stats-card bg-white/10 backdrop-blur-sm border-white/20">
                <div class="stats-number text-white">${AppState.totalPages.toLocaleString('ar')}</div>
                <div class="stats-label text-white/80">صفحة</div>
              </div>
              <div class="stats-card bg-white/10 backdrop-blur-sm border-white/20">
                <div class="stats-number text-white">${AppState.favorites.length.toLocaleString('ar')}</div>
                <div class="stats-label text-white/80">المفضلة</div>
              </div>
            </div>
          </div>
        </div>

        <section class="container mx-auto px-4 py-8 lg:py-12">
          <div class="content-header">
            <div class="mb-8">
              <h3 class="text-2xl lg:text-3xl font-bold text-emerald-900 mb-4 calligraphy">أحدث المحتوى</h3>
              <p class="text-emerald-700 text-sm lg:text-base">استكشف أحدث الكتب والمقالات والفتاوى والمحاضرات الإسلامية</p>
            </div>

            <div class="mb-6 flex flex-wrap gap-2 lg:gap-3">
              ${categoryFiltersHTML}
            </div>
          </div>

          <div class="content-grid">
            ${contentCardsHTML}
          </div>

          ${renderPagination(AppState.currentPage, AppState.totalPages, AppState.totalItems, 'loadPage')}
        </section>
      `;
      break;
  }
}

// ==================== HELPER FUNCTIONS ====================

function clearAllFavorites() {
  if (confirm('هل أنت متأكد من حذف جميع المفضلة؟')) {
    AppState.favorites = [];
    AppState.favoritesData = {};
    localStorage.setItem('islamicFavorites', JSON.stringify([]));
    localStorage.setItem('islamicFavoritesData', JSON.stringify({}));
    renderContent();
    updateStatsDisplay();
  }
}

// ==================== EVENT LISTENERS ====================

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing Islamic Content App...');
  
  // Search input event listener
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
  
  // Audio player event listeners
  const audioElement = document.getElementById('audioElement');
  const audioProgress = document.getElementById('audioProgress');
  const volumeSlider = document.getElementById('volumeSlider');
  const playPauseBtn = document.getElementById('playPauseBtn');
  
  audioElement.addEventListener('timeupdate', function() {
    AppState.currentTime = audioElement.currentTime;
    audioProgress.value = audioElement.currentTime;
    document.getElementById('audioSubtitle').textContent = 
      `${formatTime(AppState.currentTime)} / ${formatTime(AppState.duration)}`;
  });
  
  audioElement.addEventListener('loadedmetadata', function() {
    AppState.duration = audioElement.duration;
    audioProgress.max = audioElement.duration;
    document.getElementById('audioSubtitle').textContent = 
      `${formatTime(AppState.currentTime)} / ${formatTime(AppState.duration)}`;
  });
  
  audioElement.addEventListener('ended', function() {
    if (AppState.isRepeating) {
      audioElement.currentTime = 0;
      audioElement.play().catch(e => console.error('Error replaying audio:', e));
    } else {
      playNext();
    }
  });
  
  audioElement.addEventListener('play', function() {
    AppState.isPlaying = true;
    playPauseBtn.innerHTML = `
      <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M6 4a1 1 0 00-1 1v10a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1H6zM12 4a1 1 0 00-1 1v10a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1h-2z" clip-rule="evenodd"/>
      </svg>
    `;
    playPauseBtn.title = 'إيقاف';
  });
  
  audioElement.addEventListener('pause', function() {
    AppState.isPlaying = false;
    playPauseBtn.innerHTML = `
      <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
      </svg>
    `;
    playPauseBtn.title = 'تشغيل';
  });
  
  audioProgress.addEventListener('input', function() {
    const newTime = audioProgress.value;
    audioElement.currentTime = newTime;
    AppState.currentTime = newTime;
  });
  
  volumeSlider.addEventListener('input', function() {
    const newVolume = volumeSlider.value;
    AppState.volume = newVolume;
    audioElement.volume = newVolume;
  });
  
  // Close modals when clicking outside
  window.addEventListener('click', function(event) {
    const videoModal = document.getElementById('videoPlayerModal');
    if (event.target === videoModal) {
      closeVideoPlayer();
    }
  });
  
  // Initialize app
  loadHomePage();
  cacheContentForSearch();
  
  // Initialize mega menu
  initializeMegaMenu();
});

// ==================== GLOBAL FUNCTION EXPORTS ====================
// Making functions available globally for onclick handlers
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.navigateToPage = navigateToPage;
window.performSearch = performSearch;
window.toggleFavorite = toggleFavorite;
window.handleMediaClick = handleMediaClick;
window.filterByType = filterByType;
window.loadPage = loadPage;
window.loadSearchPage = loadSearchPage;
window.togglePlayPause = togglePlayPause;
window.playPrevious = playPrevious;
window.playNext = playNext;
window.toggleShuffle = toggleShuffle;
window.toggleRepeat = toggleRepeat;
window.toggleQueue = toggleQueue;
window.clearQueue = clearQueue;
window.closeAudioPlayer = closeAudioPlayer;
window.playFromQueue = playFromQueue;
window.removeFromQueue = removeFromQueue;
window.showVideoPlayer = showVideoPlayer;
window.closeVideoPlayer = closeVideoPlayer;
window.clearAllFavorites = clearAllFavorites;

// ==================== MEGA MENU SABIOS FUNCTIONS ====================

// Global state for mega menu
let sabiosMegaMenuOpen = false;
let allSabiosList = []; // Cache de todos los sabios para búsqueda

// Load sabios list for mega menu
async function loadSabiosList() {
  try {
    const response = await fetch('assets/php/sabio_loader.php?action=get_sabios');
    const data = await response.json();
    
    if (data.success) {
      allSabiosList = data.data; // Guardar en cache
      return data.data;
    } else {
      throw new Error(data.message || 'Failed to load sabios list');
    }
  } catch (error) {
    console.error('Error loading sabios list:', error);
    return [];
  }
}

// Función de búsqueda en el mega menú
function searchSabiosInMegaMenu(query) {
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) {
    return allSabiosList; // Mostrar todos si no hay término de búsqueda
  }
  
  return allSabiosList.filter(sabio => 
    sabio.name.toLowerCase().includes(searchTerm)
  );
}

// Renderizar sabios en el mega menú
function renderSabiosInMegaMenu(sabiosList) {
  const megaMenuGrid = document.getElementById('sabiosGrid');
  if (!megaMenuGrid) return;
  
  megaMenuGrid.innerHTML = '';
  
  if (sabiosList.length === 0) {
    megaMenuGrid.innerHTML = '<div class="text-center text-gray-500 py-4">لا توجد نتائج للبحث</div>';
    return;
  }
  
  sabiosList.forEach(sabio => {
    const firstLetter = sabio.name.charAt(0);
    
    const sabioElement = document.createElement('a');
    sabioElement.href = '#';
    sabioElement.className = 'sabio-item';
    sabioElement.onclick = (e) => {
      e.preventDefault();
      navigateToSabio(sabio.name);
    };
    
    // Verificar si hay imagen disponible (simulación)
    const hasImage = sabio.image && sabio.image !== '';
    
    sabioElement.innerHTML = `
      <div class="sabio-avatar">
        ${hasImage ? 
          `<img src="${sabio.image}" alt="${sabio.name}">
           <span class="initial-letter" style="display: none;">${firstLetter}</span>` :
          `<span class="initial-letter">${firstLetter}</span>`
        }
      </div>
      <div class="sabio-info">
        <div class="sabio-name">${sabio.name}</div>
        <div class="sabio-stats">${sabio.total_files || 0} ملف</div>
      </div>
    `;
    
    megaMenuGrid.appendChild(sabioElement);
  });
}

// Load sabios for mega menu
async function loadSabiosForMegaMenu() {
  console.log('Loading sabios for mega menu...');
  try {
    // Try to fetch from API first
    let sabiosWithInfo = [];
    
    try {
      console.log('Attempting to fetch sabios from API...');
      const response = await safeFetch('./assets/php/sabio_loader.php?action=get_sabios');
      if (response && response.success) {
        console.log('API response successful, loading sabios:', response.data.length);
        const sabios = response.data;
        
        // Load detailed info for each sabio to get their images
        sabiosWithInfo = await Promise.all(
          sabios.map(async (sabio) => {
            try {
              const infoResponse = await safeFetch(`./assets/php/sabio_loader.php?action=get_sabio_info&sabio=${encodeURIComponent(sabio.name)}`);
              if (infoResponse && infoResponse.success) {
                return {
                  ...sabio,
                  image: infoResponse.data.image,
                  stats: infoResponse.data.stats
                };
              }
              return sabio;
            } catch (error) {
              console.warn(`Failed to load info for ${sabio.name}`);
              return sabio;
            }
          })
        );
      }
    } catch (apiError) {
      console.warn('API failed, using fallback data:', apiError);
      
      // Use fallback mock data if API fails
      sabiosWithInfo = [
        { name: 'الشيخ محمد صالح المنجد', display_name: 'الشيخ محمد صالح المنجد', stats: { total_audio: 150, total_pdf: 45 }, image: null },
        { name: 'الشيخ عبد العزيز بن باز', display_name: 'الشيخ عبد العزيز بن باز', stats: { total_audio: 200, total_pdf: 80 }, image: null },
        { name: 'الشيخ محمد بن عثيمين', display_name: 'الشيخ محمد بن عثيمين', stats: { total_audio: 300, total_pdf: 120 }, image: null },
        { name: 'الشيخ عبد الله بن جبرين', display_name: 'الشيخ عبد الله بن جبرين', stats: { total_audio: 180, total_pdf: 60 }, image: null },
        { name: 'الشيخ صالح الفوزان', display_name: 'الشيخ صالح الفوزان', stats: { total_audio: 250, total_pdf: 90 }, image: null },
        { name: 'الشيخ عبد الرحمن السديس', display_name: 'الشيخ عبد الرحمن السديس', stats: { total_audio: 120, total_pdf: 30 }, image: null },
        { name: 'الشيخ سعد الغامدي', display_name: 'الشيخ سعد الغامدي', stats: { total_audio: 100, total_pdf: 25 }, image: null },
        { name: 'الشيخ مشاري العفاسي', display_name: 'الشيخ مشاري العفاسي', stats: { total_audio: 80, total_pdf: 20 }, image: null },
        { name: 'الشيخ ناصر القطامي', display_name: 'الشيخ ناصر القطامي', stats: { total_audio: 90, total_pdf: 15 }, image: null },
        { name: 'الشيخ أحمد العجمي', display_name: 'الشيخ أحمد العجمي', stats: { total_audio: 110, total_pdf: 35 }, image: null },
        { name: 'الشيخ عبد الباسط عبد الصمد', display_name: 'الشيخ عبد الباسط عبد الصمد', stats: { total_audio: 75, total_pdf: 10 }, image: null },
        { name: 'الشيخ محمود خليل الحصري', display_name: 'الشيخ محمود خليل الحصري', stats: { total_audio: 85, total_pdf: 12 }, image: null },
        { name: 'الشيخ علي الحذيفي', display_name: 'الشيخ علي الحذيفي', stats: { total_audio: 95, total_pdf: 18 }, image: null },
        { name: 'الشيخ سعود الشريم', display_name: 'الشيخ سعود الشريم', stats: { total_audio: 105, total_pdf: 22 }, image: null },
        { name: 'الشيخ ماهر المعيقلي', display_name: 'الشيخ ماهر المعيقلي', stats: { total_audio: 70, total_pdf: 8 }, image: null }
      ];
      console.log('Using fallback data with', sabiosWithInfo.length, 'sabios');
    }
    
    const sabiosGrid = document.getElementById('sabiosGrid');
    const mobileSabiosSubmenu = document.getElementById('mobileSabiosSubmenu');
    
    if (sabiosGrid && sabiosWithInfo.length > 0) {
      sabiosGrid.innerHTML = sabiosWithInfo.map(sabio => {
        const avatarContent = sabio.image 
          ? `<img src="${sabio.image}" alt="${sabio.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`
          : '';
        
        const initialLetter = `<span class="initial-letter" ${sabio.image ? 'style="display:none"' : ''}>${sabio.name.charAt(0)}</span>`;
        
        const totalFiles = sabio.stats ? (sabio.stats.total_audio + sabio.stats.total_pdf) : 0;
        const statsText = totalFiles > 0 ? `${totalFiles} ملف` : 'عالم إسلامي';
        
        return `
          <a href="#" class="sabio-item" onclick="selectSabio('${sabio.name}')">
            <div class="sabio-avatar">
              ${avatarContent}
              ${initialLetter}
            </div>
            <div class="sabio-info">
              <div class="sabio-name">${sabio.name}</div>
              <div class="sabio-stats">${statsText}</div>
            </div>
          </a>
        `;
      }).join('');
    }
    
    if (mobileSabiosSubmenu && sabiosWithInfo.length > 0) {
      mobileSabiosSubmenu.innerHTML = sabiosWithInfo.map(sabio => {
        const avatarContent = sabio.image 
          ? `<img src="${sabio.image}" alt="${sabio.name}" loading="lazy" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`
          : '';
        
        const initialLetter = `<span ${sabio.image ? 'style="display:none"' : ''}>${sabio.name.charAt(0)}</span>`;
        
        return `
          <a href="#" class="mobile-sabio-item" onclick="selectSabio('${sabio.name}')">
            <div class="mobile-sabio-avatar">
              ${avatarContent}
              ${initialLetter}
            </div>
            <span class="mobile-sabio-name">${sabio.name}</span>
          </a>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Error loading sabios:', error);
  }
}

// Initialize mega menu
async function initializeMegaMenu() {
  console.log('Initializing mega menu...');
  
  // Load sabios with images and stats
  await loadSabiosForMegaMenu();
  
  // Setup mega menu toggle
  const sabiosMenuTrigger = document.getElementById('sabiosMenuTrigger');
  const sabiosMegaMenu = document.getElementById('sabiosMegaMenu');
  const searchInput = document.getElementById('sabiosSearchInput');
  
  if (sabiosMenuTrigger && sabiosMegaMenu) {
    let hoverTimeout;
    const megaMenuContainer = sabiosMenuTrigger.closest('.mega-menu-container');
    
    // Position mega menu for full-width layout
    function updateMegaMenuPosition() {
      const triggerRect = sabiosMenuTrigger.getBoundingClientRect();
      const megaMenu = document.getElementById('sabiosMegaMenu');
      
      // Position mega menu full-width below the navigation
      megaMenu.style.top = (triggerRect.bottom + 5) + 'px';
      // No need to set left/right since CSS handles full width
    }
    
    // Function to show mega menu
    function showMegaMenu() {
      updateMegaMenuPosition(); // Position mega menu correctly
      sabiosMegaMenu.classList.add('show');
      sabiosMenuTrigger.classList.add('active');
      document.body.classList.add('mega-menu-open');
    }
    
    // Function to hide mega menu
    function hideMegaMenu() {
      sabiosMegaMenu.classList.remove('show');
      sabiosMenuTrigger.classList.remove('active');
      document.body.classList.remove('mega-menu-open');
    }
    
    // Click functionality (toggle)
    sabiosMenuTrigger.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const isVisible = sabiosMegaMenu.classList.contains('show');
      
      if (isVisible) {
        hideMegaMenu();
      } else {
        showMegaMenu();
        // Focus search input when menu opens via click
        setTimeout(() => {
          if (searchInput) {
            searchInput.focus();
          }
        }, 100);
      }
    });
    
    // Hover functionality
    if (megaMenuContainer) {
      megaMenuContainer.addEventListener('mouseenter', function() {
        clearTimeout(hoverTimeout);
        showMegaMenu();
      });
      
      megaMenuContainer.addEventListener('mouseleave', function() {
        // Minimal delay to prevent flickering when moving between elements
        hoverTimeout = setTimeout(() => {
          hideMegaMenu();
        }, 50);
      });
      
      // Keep menu open when hovering over the mega menu itself
      sabiosMegaMenu.addEventListener('mouseenter', function() {
        clearTimeout(hoverTimeout);
      });
      
      sabiosMegaMenu.addEventListener('mouseleave', function() {
        // Instant close when leaving mega menu area
        hideMegaMenu();
      });
    }
    
    // Close mega menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!sabiosMenuTrigger.contains(e.target) && !sabiosMegaMenu.contains(e.target)) {
        hideMegaMenu();
      }
    });
    
    // Reposition mega menu on window resize
    window.addEventListener('resize', function() {
      if (sabiosMegaMenu.classList.contains('show')) {
        updateMegaMenuPosition();
      }
    });
  }
  
  // Setup search functionality
  if (searchInput) {
    let allSabios = []; // Store original list
    
    // Store original sabios list after loading
    const sabiosGrid = document.getElementById('sabiosGrid');
    if (sabiosGrid) {
      // Get all sabio items after they're loaded
      setTimeout(() => {
        allSabios = Array.from(sabiosGrid.querySelectorAll('.sabio-item')).map(item => ({
          element: item.cloneNode(true),
          name: item.querySelector('.sabio-name').textContent.toLowerCase(),
          stats: item.querySelector('.sabio-stats').textContent.toLowerCase()
        }));
      }, 500);
    }
    
    searchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase().trim();
      
      if (!sabiosGrid || allSabios.length === 0) return;
      
      if (searchTerm === '') {
        // Show all sabios
        sabiosGrid.innerHTML = allSabios.map(sabio => sabio.element.outerHTML).join('');
      } else {
        // Filter sabios based on search term
        const filteredSabios = allSabios.filter(sabio => 
          sabio.name.includes(searchTerm) || sabio.stats.includes(searchTerm)
        );
        
        if (filteredSabios.length > 0) {
          sabiosGrid.innerHTML = filteredSabios.map(sabio => sabio.element.outerHTML).join('');
        } else {
          sabiosGrid.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6b7280;">
              <p>لا توجد نتائج للبحث عن "${searchTerm}"</p>
            </div>
          `;
        }
      }
    });
    
    // Clear search when menu closes
    document.addEventListener('click', function(e) {
      if (!sabiosMenuTrigger.contains(e.target) && !sabiosMegaMenu.contains(e.target)) {
        searchInput.value = '';
        if (sabiosGrid && allSabios.length > 0) {
          sabiosGrid.innerHTML = allSabios.map(sabio => sabio.element.outerHTML).join('');
        }
      }
    });
  }
}

// Toggle mega menu
function toggleMegaMenu() {
  sabiosMegaMenuOpen = !sabiosMegaMenuOpen;
  const megaMenu = document.getElementById('sabiosMegaMenu');
  const trigger = document.getElementById('sabiosMenuTrigger');
  
  if (sabiosMegaMenuOpen) {
    megaMenu.classList.add('show');
    trigger.classList.add('active');
  } else {
    megaMenu.classList.remove('show');
    trigger.classList.remove('active');
  }
}

// Close mega menu
function closeMegaMenu() {
  if (sabiosMegaMenuOpen) {
    sabiosMegaMenuOpen = false;
    const megaMenu = document.getElementById('sabiosMegaMenu');
    const trigger = document.getElementById('sabiosMenuTrigger');
    
    megaMenu.classList.remove('show');
    trigger.classList.remove('active');
  }
}

// Toggle mobile sabios menu
function toggleMobileSabiosMenu() {
  const submenu = document.getElementById('mobileSabiosSubmenu');
  const menuLink = document.getElementById('mobileSabiosMenu');
  
  if (submenu.style.display === 'none' || submenu.style.display === '') {
    submenu.style.display = 'block';
    menuLink.classList.add('expanded');
  } else {
    submenu.style.display = 'none';
    menuLink.classList.remove('expanded');
  }
}

// Navigate to sabio page
function navigateToSabio(sabioName) {
  // Close menus
  closeMegaMenu();
  closeMobileMenu();
  
  // Store selected sabio in localStorage for sabio.html
  localStorage.setItem('selectedSabio', sabioName);
  
  // Navigate to sabio.html
  window.location.href = 'sabio.html';
}

// Remove this duplicate event listener - it's already handled in initializeMegaMenu

// Select sabio function
function selectSabio(sabioName) {
  console.log('Selected sabio:', sabioName);
  localStorage.setItem('selectedSabio', sabioName);
  window.location.href = 'sabio.html';
}

// Make functions globally available
window.toggleMegaMenu = toggleMegaMenu;
window.closeMegaMenu = closeMegaMenu;
window.toggleMobileSabiosMenu = toggleMobileSabiosMenu;
window.navigateToSabio = navigateToSabio;
window.selectSabio = selectSabio;
