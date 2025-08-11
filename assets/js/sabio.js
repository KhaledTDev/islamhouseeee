// sabio.js - JavaScript específico para la página sabio.html
// PRIORIDAD ABSOLUTA - Este script controla sabio.html

// Flag para indicar que sabio.js está en control
window.SABIO_PAGE_ACTIVE = true;

// Estado global para la página del sabio
const SabioPageState = {
  selectedSabio: null,
  sabioInfo: null,
  activeCategory: 'all', // Categoría "Todo" activa por defecto
  currentContent: [],
  appJsInitialized: false
};

// Función para prevenir que app.js interfiera con sabio.html
// SOLO PERMITIR: search y audio manager de app.js
function preventAppJsInterference() {
  console.log('Setting up sabio.js priority - blocking app.js category/content functions');
  
  // BLOQUEAR: Funciones de contenido y categorías de app.js
  if (window.loadHomePage) {
    const originalLoadHomePage = window.loadHomePage;
    window.loadHomePage = function() {
      if (window.SABIO_PAGE_ACTIVE) {
        console.log('BLOCKED: app.js loadHomePage on sabio.html');
        return;
      }
      return originalLoadHomePage.apply(this, arguments);
    };
  }
  
  if (window.renderHomeContent) {
    const originalRenderHomeContent = window.renderHomeContent;
    window.renderHomeContent = function() {
      if (window.SABIO_PAGE_ACTIVE) {
        console.log('BLOCKED: app.js renderHomeContent on sabio.html');
        return;
      }
      return originalRenderHomeContent.apply(this, arguments);
    };
  }
  
  if (window.renderContent) {
    const originalRenderContent = window.renderContent;
    window.renderContent = function() {
      if (window.SABIO_PAGE_ACTIVE) {
        console.log('BLOCKED: app.js renderContent on sabio.html');
        return;
      }
      return originalRenderContent.apply(this, arguments);
    };
  }
  
  // BLOQUEAR: Funciones de categorías de app.js
  if (window.loadCategoryContent) {
    const originalLoadCategoryContent = window.loadCategoryContent;
    window.loadCategoryContent = function() {
      if (window.SABIO_PAGE_ACTIVE) {
        console.log('BLOCKED: app.js loadCategoryContent on sabio.html - using sabio.js version');
        return;
      }
      return originalLoadCategoryContent.apply(this, arguments);
    };
  }
  
  if (window.filterByType) {
    const originalFilterByType = window.filterByType;
    window.filterByType = function() {
      if (window.SABIO_PAGE_ACTIVE) {
        console.log('BLOCKED: app.js filterByType on sabio.html');
        return;
      }
      return originalFilterByType.apply(this, arguments);
    };
  }
  
  if (window.renderContentCard) {
    const originalRenderContentCard = window.renderContentCard;
    window.renderContentCard = function() {
      if (window.SABIO_PAGE_ACTIVE) {
        console.log('BLOCKED: app.js renderContentCard on sabio.html - using sabio.js version');
        return;
      }
      return originalRenderContentCard.apply(this, arguments);
    };
  }
  
  // PERMITIR: Solo search y audio manager
  console.log('ALLOWED: search and audio manager functions from app.js');
}

// Función para obtener información del sabio
async function loadSabioInfo(sabioName) {
  console.log(`🔍 Loading sabio info for: "${sabioName}"`);
  
  try {
    const url = `assets/php/sabio_loader.php?action=get_sabio_info&sabio=${encodeURIComponent(sabioName)}`;
    console.log(`📡 Fetching sabio info URL: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📦 Raw sabio info response:', data);
    
    if (data.success) {
      console.log('✅ Sabio info loaded successfully:');
      console.log('👤 Sabio name:', data.data.name);
      console.log('🖼️ Image:', data.data.image);
      console.log('📊 Stats:', data.data.stats);
      console.log('📁 Categories count:', data.data.stats.categories);
      
      // Verificar si las categorías tienen archivos
      Object.entries(data.data.stats.categories).forEach(([category, count]) => {
        if (count > 0) {
          console.log(`✅ Category "${category}" has ${count} files`);
        } else {
          console.warn(`⚠️ Category "${category}" has NO files (count: ${count})`);
        }
      });
      
      return data.data;
    } else {
      console.error('❌ PHP returned error:', data.message);
      throw new Error(data.message || 'Failed to load sabio info');
    }
  } catch (error) {
    console.error('💥 Error loading sabio info:', error);
    return null;
  }
}

// Función para obtener contenido del sabio por categoría
async function loadSabioContent(sabioName, category) {
  console.log(`🔍 Loading content for sabio: "${sabioName}", category: "${category}"`);
  
  try {
    const url = `assets/php/sabio_loader.php?action=get_sabio_content&sabio=${encodeURIComponent(sabioName)}&category=${encodeURIComponent(category)}`;
    console.log(`📡 Fetching URL: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📦 Raw response from PHP:', data);
    
    if (data.success) {
      console.log(`✅ Successfully loaded ${data.data.total} files for category "${category}"`);
      console.log('📁 Files data:', data.data.files);
      return data.data;
    } else {
      console.error('❌ PHP returned error:', data.message);
      throw new Error(data.message || 'Failed to load sabio content');
    }
  } catch (error) {
    console.error('💥 Error loading sabio content:', error);
    console.error('🔧 Debug info:', {
      sabioName,
      category,
      encodedSabio: encodeURIComponent(sabioName),
      encodedCategory: encodeURIComponent(category)
    });
    return null;
  }
}

// Renderizar la información principal del sabio
function renderSabioHero(sabioInfo) {
  if (!sabioInfo) return '';
  
  const totalFiles = sabioInfo.stats.total_audio + sabioInfo.stats.total_pdf;
  
  return `
    <div class="hero islamic-pattern">
      <div class="container mx-auto px-4 text-center">
        ${sabioInfo.image ? `
          <div class="mb-6">
            <img src="${sabioInfo.image}" alt="${sabioInfo.name}" 
                 class="sabio-image w-32 h-32 md:w-48 md:h-48 rounded-full mx-auto border-4 border-white shadow-lg object-cover">
          </div>
        ` : ''}
        
        <h2 class="text-3xl md:text-4xl lg:text-6xl font-bold mb-6 calligraphy text-white">
          ${sabioInfo.name}
        </h2>
        
        <div class="stats-container">
          <div class="stats-card bg-white/10 backdrop-blur-sm border-white/20">
            <div class="stats-number text-white">${sabioInfo.stats.total_audio}</div>
            <div class="stats-label text-white/80">ملف صوتي</div>
          </div>
          <div class="stats-card bg-white/10 backdrop-blur-sm border-white/20">
            <div class="stats-number text-white">${sabioInfo.stats.total_pdf}</div>
            <div class="stats-label text-white/80">ملف PDF</div>
          </div>
          <div class="stats-card bg-white/10 backdrop-blur-sm border-white/20">
            <div class="stats-number text-white">${totalFiles}</div>
            <div class="stats-label text-white/80">إجمالي الملفات</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Renderizar أزرار التصنيفات
function renderCategoryButtons(sabioInfo) {
  if (!sabioInfo) return '';
  
  const totalFiles = sabioInfo.stats.total_audio + sabioInfo.stats.total_pdf;
  
  const categories = [
    { key: 'all', label: 'الكل', icon: '📂', count: totalFiles }, // Categoría "Todo" por defecto
    { key: 'duruz', label: 'دروس', icon: '📚' },
    { key: 'firak', label: 'فرق', icon: '🎯' },
    { key: 'pdf', label: 'كتاب', icon: '📄' }
  ];
  
  return categories.map(category => {
    // Para la categoría "all", usar el conteo total; para otras, usar el conteo específico
    const count = category.key === 'all' ? category.count : (sabioInfo.stats.categories[category.key] || 0);
    const isActive = SabioPageState.activeCategory === category.key;
    
    return `
      <button 
        data-category="${category.key}"
        class="category-btn btn ${isActive ? 'btn-primary' : 'btn-outline'} text-lg px-6 py-3"
        ${count === 0 ? 'disabled' : ''}
      >
        <span class="ml-2">${category.icon}</span>
        ${category.label}
        <span class="mr-2 text-sm opacity-75">(${count})</span>
      </button>
    `;
  }).join('');
}

// SISTEMA DE PAGINACIÓN PARA SABIO.JS
const SabioPagination = {
  itemsPerPage: 25,
  currentPage: 1,
  totalPages: 1,
  totalItems: 0
};

// Función de paginación (copiada de app.js)
function renderSabioPagination(currentPage, totalPages, totalItems, onPageClick) {
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
        <span>صفحة ${currentPage} من ${totalPages} (${totalItems.toLocaleString('ar')} عنصر)</span>
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

// Función para navegar a página específica
function loadSabioPage(pageNumber) {
  if (pageNumber < 1 || pageNumber > SabioPagination.totalPages) return;
  
  SabioPagination.currentPage = pageNumber;
  
  // Recargar contenido con paginación
  sabioLoadCategoryContent(SabioPageState.activeCategory);
}

// Renderizar tarjetas de contenido con paginación
function renderContentCards(contentData) {
  if (!contentData || !contentData.files || contentData.files.length === 0) {
    return `
      <div class="text-center py-8 text-gray-500">
        <div class="text-6xl mb-4">📂</div>
        <h3 class="text-xl font-semibold mb-2">لا يوجد محتوى متاح</h3>
        <p>لا توجد ملفات في هذا التصنيف</p>
      </div>
    `;
  }
  
  // Implementar paginación
  const totalFiles = contentData.files.length;
  const totalPages = Math.ceil(totalFiles / SabioPagination.itemsPerPage);
  const startIndex = (SabioPagination.currentPage - 1) * SabioPagination.itemsPerPage;
  const endIndex = startIndex + SabioPagination.itemsPerPage;
  const paginatedFiles = contentData.files.slice(startIndex, endIndex);
  
  // Actualizar estado de paginación
  SabioPagination.totalPages = totalPages;
  SabioPagination.totalItems = totalFiles;

  const cardsHTML = paginatedFiles.map(file => {
    const isAudio = file.type === 'audio';
    const isPdf = file.type === 'document';
    
    // Mostrar etiqueta de categoría solo en vista "all"
    const categoryBadge = contentData.category === 'all' && file.categoryLabel ? 
      `<div class="mb-3">
         <p class="text-sm text-emerald-600 font-semibold">${file.categoryLabel}</p>
       </div>` : '';
    
    // Usar la misma estructura que app.js
    const mediaHTML = `
      <div class="attachments-grid mb-4">
        <button
          onclick="handleFileClick('${file.path}', '${file.name}', '${file.extension}', '${file.type}')"
          class="attachment-link ${isAudio ? 'audio-link' : ''}"
        >
          <span>${isAudio ? '🎵' : '📄'}</span>
          <span>${file.extension.toUpperCase()}</span>
          <span class="text-xs opacity-75">(${isAudio ? 'استماع' : 'تحميل'})</span>
        </button>
      </div>
    `;
    
    const contentHTML = `
      <p class="text-gray-600 mb-4 arabic-text leading-relaxed line-clamp-3 text-sm lg:text-base">
        ${file.name}
      </p>
    `;
    
    return `
      <div class="card fade-in">
        <div class="flex justify-between items-start mb-3">
          <span class="content-type-badge ${isAudio ? 'type-audios' : 'type-books'}">
            ${isAudio ? 'صوتي' : 'مستند'}
          </span>
          <button 
            onclick="toggleSabioFavorite('${file.path}', '${file.name}')"
            class="btn-icon favorite-btn"
            title="إضافة للمفضلة"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </button>
        </div>

        <h4 class="text-lg font-bold text-gray-900 mb-2 arabic-text leading-relaxed">
          ${file.name}
        </h4>

        ${contentHTML}
        ${categoryBadge}
        ${mediaHTML}

        <div class="flex justify-between items-center text-xs lg:text-sm text-gray-500 mt-3">
          <span class="inline-flex items-center gap-1">
            <svg class="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
            </svg>
            ${formatFileSize(file.size)}
          </span>
          <span>${file.categoryLabel || ''}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Renderizar paginación si hay más de una página
  const paginationHTML = totalPages > 1 ? renderSabioPagination(SabioPagination.currentPage, totalPages, totalFiles, 'loadSabioPage') : '';
  
  // Grid responsive: 2 en móvil, 3 en tablet y desktop
  return `
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 lg:gap-6 mt-6" style="margin-top:25px">
      ${cardsHTML}
    </div>
    ${paginationHTML}
  `;
}

// Manejar favoritos en sabio.html
function toggleSabioFavorite(filePath, fileName) {
  console.log('Toggle favorite for:', fileName);
  // Por ahora solo mostrar mensaje, se puede integrar con el sistema de favoritos de app.js
  alert(`${fileName} agregado a favoritos`);
}

// Manejar click en archivos
function handleFileClick(filePath, fileName, extension, fileType) {
  if (fileType === 'audio') {
    // Usar el sistema de audio player existente
    if (window.handleMediaClick) {
      window.handleMediaClick(filePath, fileName, extension);
    } else {
      // Fallback: reproducir directamente
      const audio = new Audio(filePath);
      audio.play().catch(e => console.error('Error playing audio:', e));
    }
  } else {
    // Para PDFs, abrir en nueva ventana
    window.open(filePath, '_blank');
  }
}

// Formatear tamaño de archivo
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Cargar contenido de una categoría específica - FUNCIÓN ESPECÍFICA DE SABIO.JS
async function sabioLoadCategoryContent(category) {
  console.log('🔥 SABIO.JS FUNCTION: sabioLoadCategoryContent called');
  return await loadCategoryContentInternal(category);
}

// Función interna para cargar contenido (renombrada para evitar conflictos)
async function loadCategoryContentInternal(category) {
  console.log('🚨 FUNCTION START: loadCategoryContent called with category:', category);
  console.log('🚨 FUNCTION START: typeof category:', typeof category);
  console.log('🚨 FUNCTION START: SabioPageState exists:', !!SabioPageState);
  
  console.log(`📋 Loading category content: "${category}"`);
  console.log('🔍 SabioPageState debug:');
  console.log('  - selectedSabio:', SabioPageState.selectedSabio);
  console.log('  - sabioInfo:', SabioPageState.sabioInfo ? 'exists' : 'null');
  console.log('  - activeCategory:', SabioPageState.activeCategory);
  console.log('  - localStorage sabio:', localStorage.getItem('selectedSabio'));
  
  // Reset pagination cuando cambia la categoría
  SabioPagination.currentPage = 1;
  
  if (!SabioPageState.selectedSabio) {
    console.error('❌ No sabio selected in SabioPageState');
    console.log('🔧 Attempting to recover from localStorage...');
    const sabioFromStorage = localStorage.getItem('selectedSabio');
    if (sabioFromStorage) {
      console.log(`🔄 Recovering sabio from localStorage: "${sabioFromStorage}"`);
      SabioPageState.selectedSabio = sabioFromStorage;
    } else {
      console.error('❌ No sabio found in localStorage either!');
      return;
    }
  }
  
  console.log(`👤 Using sabio: "${SabioPageState.selectedSabio}"`);
  console.log(`📋 Proceeding with category: "${category}"`);
  
  // Verificar que tenemos la información del sabio
  if (!SabioPageState.sabioInfo) {
    console.warn('⚠️ sabioInfo is missing, this might cause issues');
  }
  
  SabioPageState.activeCategory = category;
  console.log(`🏷️ Active category set to: "${category}"`);
  
  // Actualizar botones de categoría visualmente
  const categoryButtons = document.querySelectorAll('.category-btn');
  categoryButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.category === category) {
      btn.classList.add('active');
    }
  });
  
  const contentSection = document.getElementById('contentSection');
  if (contentSection) {
    contentSection.innerHTML = `
      <div class="loading-spinner text-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
        <p class="mt-4 text-emerald-700">جاري التحميل...</p>
      </div>
    `;
  }
  
  try {
    let contentData;
    
    if (category === 'all') {
      console.log('📂 Loading ALL categories content');
      // Para "all", cargar contenido de todas las categorías
      const categories = ['duruz', 'firak', 'pdf'];
      const allFiles = [];
      
      for (const cat of categories) {
        try {
          const catData = await loadSabioContent(SabioPageState.selectedSabio, cat);
          if (catData && catData.files && catData.files.length > 0) {
            // Agregar categoría a cada archivo para identificación
            catData.files.forEach(file => {
              file.category = cat;
              file.categoryLabel = cat === 'duruz' ? 'دروس' : cat === 'firak' ? 'فرق' : 'كتاب';
            });
            allFiles.push(...catData.files);
          }
        } catch (error) {
          console.warn(`Warning: Could not load category "${cat}":`, error);
        }
      }
      
      contentData = {
        sabio: SabioPageState.selectedSabio,
        category: 'all',
        files: allFiles,
        total: allFiles.length
      };
      
      console.log(`✅ Loaded ${allFiles.length} total files from all categories`);
    } else {
      console.log(`📁 Loading specific category: "${category}"`);
      contentData = await loadSabioContent(SabioPageState.selectedSabio, category);
    }
    
    SabioPageState.currentContent = contentData;
    
    // Renderizar contenido
    renderSabioContent();
  } catch (error) {
    console.error('Error loading category content:', error);
    if (contentSection) {
      contentSection.innerHTML = `
        <div class="text-center py-8 text-red-500">
          خطأ في تحميل المحتوى
        </div>
      `;
    }
  }
}

// Inicializar la página del sabio
async function initializeSabioPage() {
  console.log('🚀 Initializing Sabio Page...');
  
  // Obtener el sabio seleccionado de localStorage
  const selectedSabio = localStorage.getItem('selectedSabio');
  console.log('📋 Selected sabio from localStorage:', selectedSabio);
  
  if (!selectedSabio) {
    console.error('❌ No sabio selected in localStorage, redirecting to index.html');
    // Para debugging, vamos a establecer un sabio por defecto en lugar de redirigir
    const defaultSabio = 'sheik ibn baz';
    console.log(`🔧 Setting default sabio: "${defaultSabio}" for testing`);
    localStorage.setItem('selectedSabio', defaultSabio);
    // window.location.href = 'index.html';
    // return;
  }
  
  SabioPageState.selectedSabio = selectedSabio;
  
  // Cargar información del sabio
  const sabioInfo = await loadSabioInfo(selectedSabio);
  
  if (!sabioInfo) {
    // Mostrar error si no se puede cargar la información
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="container mx-auto px-4 py-12 text-center">
          <h2 class="text-2xl font-bold text-red-600 mb-4">خطأ في التحميل</h2>
          <p class="text-gray-600 mb-8">لا يمكن تحميل معلومات "${selectedSabio}"</p>
          <button onclick="window.location.href='index.html'" class="btn btn-primary">
            العودة للرئيسية
          </button>
        </div>
      `;
    }
    return;
  }
  
  SabioPageState.sabioInfo = sabioInfo;
  
  // Renderizar الصفحة
  renderSabioContent();
  
  // Actualizar título de la página
  document.title = `${selectedSabio} - بيت الإسلام`;
  
  // Configurar protección del DOM
  setupDOMProtection();
  
  // IMPORTANTE: Configurar event listeners DESPUÉS de renderizar
  setupCategoryEventListeners();
  
  // Cargar automáticamente la categoría "all" por defecto
  console.log('🚀 Auto-loading default category: "all"');
  sabioLoadCategoryContent('all');
}

function renderSabioContent() {
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) {
    console.error('Main content container not found');
    return;
  }

  // FORZAR limpieza del contenido previo de app.js
  mainContent.innerHTML = '';
  
  // Asegurar que el estado de sabio tenga prioridad
  window.SABIO_PAGE_ACTIVE = true;

  if (!SabioPageState.sabioInfo) {
    mainContent.innerHTML = `
      <div class="error-container">
        <div class="error-message">
          <h2>خطأ في تحميل البيانات</h2>
          <p>لم يتم العثور على معلومات الشيخ المطلوب</p>
          <button onclick="window.location.reload()" class="retry-btn">إعادة المحاولة</button>
        </div>
      </div>
    `;
    return;
  }

  const heroSection = renderSabioHero(SabioPageState.sabioInfo);
  const categoryButtons = renderCategoryButtons(SabioPageState.sabioInfo);
  const contentCards = renderContentCards(SabioPageState.currentContent);

  // RENDERIZADO FORZADO - sobrescribir cualquier contenido previo
  mainContent.innerHTML = `
    ${heroSection}
    <div class="container mx-auto px-4 py-8">
      ${categoryButtons}
      <div id="contentSection" class="mt-8">
        ${contentCards}
      </div>
    </div>
  `;

  // Actualizar navegación activa
  if (SabioPageState.activeCategory) {
    const activeBtn = document.querySelector(`[data-category="${SabioPageState.activeCategory}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }
  
  console.log('Sabio content rendered with absolute priority');
}

// ...

// Event listeners - PRIORIDAD ABSOLUTA
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing Sabio Page with PRIORITY...');
  
  // Establecer prioridad inmediatamente
  window.SABIO_PAGE_ACTIVE = true;
  
  // Prevenir interferencias de app.js
  preventAppJsInterference();
  
  // Inicializar la página del sabio
  initializeSabioPage();
  
  // Los event listeners para categorías se configuran DESPUÉS del renderizado
  // Ver setupCategoryEventListeners()
  
  // Retrasar la inicialización de app.js para mantener compatibilidad
  // pero asegurar que sabio.js tenga control total
  setTimeout(() => {
    if (!SabioPageState.appJsInitialized) {
      console.log('Allowing selective app.js functionality...');
      // Permitir solo funcionalidades específicas de app.js que no interfieran
      initializeCompatibleAppJsFeatures();
      SabioPageState.appJsInitialized = true;
    }
  }, 100);
});

// Función para inicializar SOLO las características compatibles de app.js
// PERMITIDO: search y audio manager ÚNICAMENTE
function initializeCompatibleAppJsFeatures() {
  console.log('Initializing ONLY allowed app.js features: search + audio manager');
  
  // PERMITIR: Funcionalidades del reproductor de audio
  if (window.AppState && window.AppState.audioQueue !== undefined) {
    console.log('✓ ALLOWED: Audio player functionality from app.js');
    
    // Asegurar que las funciones de audio estén disponibles
    if (window.handleMediaClick) {
      console.log('✓ ALLOWED: handleMediaClick for audio playback');
    }
    if (window.addToAudioQueue) {
      console.log('✓ ALLOWED: addToAudioQueue functionality');
    }
    if (window.togglePlayPause) {
      console.log('✓ ALLOWED: togglePlayPause functionality');
    }
  }
  
  // PERMITIR: Funcionalidades de búsqueda
  if (window.performSearch) {
    console.log('✓ ALLOWED: Search functionality from app.js');
  }
  
  // BLOQUEAR: Todas las demás funcionalidades
  console.log('✗ BLOCKED: All other app.js functionalities (categories, content rendering, etc.)');
  
  // NO permitir favoritos en sabio.html (debe usar su propio sistema)
  if (window.toggleFavorite) {
    console.log('✗ BLOCKED: Favorites functionality - sabio.html should use its own system');
  }
  
  // NO permitir menú móvil de app.js
  if (window.toggleMobileMenu) {
    console.log('✗ BLOCKED: Mobile menu from app.js - sabio.html has its own navigation');
  }
}

// Hacer funciones disponibles globalmente para compatibilidad
window.loadCategoryContent = sabioLoadCategoryContent; // Usar la función específica de sabio.js
window.sabioLoadCategoryContent = sabioLoadCategoryContent; // También disponible con nombre específico
window.handleFileClick = handleFileClick;
window.loadSabioPage = loadSabioPage; // Función de paginación
window.SabioPageState = SabioPageState;

// Función adicional para limpiar interferencias de app.js
function cleanupAppJsInterference() {
  // Limpiar cualquier contenido residual de app.js
  const mainContent = document.getElementById('mainContent');
  if (mainContent && mainContent.innerHTML.includes('home-stats')) {
    console.log('Cleaning up app.js interference...');
    mainContent.innerHTML = '';
  }
}

// Observador para detectar cambios no deseados en el DOM
function setupDOMProtection() {
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) return;
  
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (window.SABIO_PAGE_ACTIVE && mutation.type === 'childList') {
        // Si detectamos contenido de app.js, lo limpiamos
        const addedNodes = Array.from(mutation.addedNodes);
        addedNodes.forEach(node => {
          if (node.nodeType === 1 && (node.classList?.contains('home-stats') || node.querySelector?.('.home-stats'))) {
            console.log('Preventing app.js content injection');
            node.remove();
          }
        });
      }
    });
  });
  
  observer.observe(mainContent, {
    childList: true,
    subtree: true
  });
}

// Configurar event listeners para botones de categoría DESPUÉS del renderizado
function setupCategoryEventListeners() {
  console.log('🔧 Setting up category event listeners...');
  
  // Buscar todos los botones de categoría
  const categoryButtons = document.querySelectorAll('.category-btn');
  console.log(`🔍 Found ${categoryButtons.length} category buttons`);
  
  categoryButtons.forEach((button, index) => {
    const category = button.dataset.category;
    console.log(`🔘 Setting up listener for button ${index + 1}: "${category}"`);
    
    // Remover listeners previos para evitar duplicados
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Agregar nuevo listener
    newButton.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation(); // IMPORTANTE: Prevenir otros event listeners
      
      console.log(`💆 Category button clicked: "${category}"`);
      console.log('🚫 Preventing app.js event listeners from firing');
      
      // Actualizar botones visualmente inmediatamente
      document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
      });
      newButton.classList.remove('btn-outline');
      newButton.classList.add('btn-primary');
      
      try {
        console.log(`🚀 About to call SABIO loadCategoryContent("${category}")`);
        // Llamar EXPLÍCITAMENTE a la función de sabio.js (NO la de app.js)
        await sabioLoadCategoryContent(category);
        console.log(`✅ SABIO loadCategoryContent("${category}") called successfully`);
      } catch (error) {
        console.error(`💥 Error calling SABIO loadCategoryContent("${category}"):`, error);
        console.error('Stack trace:', error.stack);
      }
      
      return false; // Prevenir cualquier propagación adicional
    }, true); // Usar capture phase para ejecutar ANTES que app.js
  });
  
  if (categoryButtons.length === 0) {
    console.warn('⚠️ No category buttons found! Buttons may not be rendered yet.');
    // Intentar nuevamente después de un breve retraso
    setTimeout(setupCategoryEventListeners, 500);
  } else {
    console.log(`✅ Successfully set up ${categoryButtons.length} category event listeners`);
  }
}