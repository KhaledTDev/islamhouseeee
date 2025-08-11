// ==================== AUDIO MANAGER MODULE ====================
// Manejo completo del reproductor de audio y cola de reproducción

export class AudioManager {
  constructor() {
    this.audioElement = null;
    this.queue = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.isShuffled = false;
    this.isRepeating = false;
    this.volume = 1;
    this.currentTime = 0;
    this.duration = 0;
    
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.audioElement = document.getElementById('audioElement');
    this.playerContainer = document.getElementById('audioPlayerContainer');
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.audioProgress = document.getElementById('audioProgress');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.audioTitle = document.getElementById('audioTitle');
    this.audioSubtitle = document.getElementById('audioSubtitle');
    this.queueCounter = document.getElementById('queueCounter');
    this.shuffleBtn = document.getElementById('shuffleBtn');
    this.repeatBtn = document.getElementById('repeatBtn');
  }

  bindEvents() {
    if (!this.audioElement) return;

    this.audioElement.addEventListener('loadedmetadata', () => {
      this.duration = this.audioElement.duration;
      this.audioProgress.max = this.duration;
      this.updateTimeDisplay();
    });

    this.audioElement.addEventListener('timeupdate', () => {
      this.currentTime = this.audioElement.currentTime;
      this.audioProgress.value = this.currentTime;
      this.updateTimeDisplay();
    });

    this.audioElement.addEventListener('ended', () => {
      this.playNext();
    });

    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayButton();
      document.body.classList.add('audio-player-active');
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayButton();
    });

    this.audioProgress?.addEventListener('input', () => {
      const newTime = this.audioProgress.value;
      this.audioElement.currentTime = newTime;
      this.currentTime = newTime;
    });

    this.volumeSlider?.addEventListener('input', () => {
      this.volume = this.volumeSlider.value;
      this.audioElement.volume = this.volume;
    });
  }

  addToQueue(item, autoPlay = true) {
    if (!this.queue.find(q => q.url === item.url)) {
      this.queue.push(item);
      this.updateQueueDisplay();
      this.showNotification(`تم إضافة "${item.title}" إلى قائمة التشغيل`);
      
      // Si autoPlay es true, pausar el audio actual y reproducir el nuevo
      if (autoPlay) {
        this.playAudio(item, true);
      }
    } else {
      // Si el audio ya está en la cola y autoPlay es true, reproducirlo
      if (autoPlay) {
        const existingIndex = this.queue.findIndex(q => q.url === item.url);
        this.currentIndex = existingIndex;
        this.playAudio(item, true);
      }
    }
  }

  removeFromQueue(index) {
    if (index >= 0 && index < this.queue.length) {
      const removed = this.queue.splice(index, 1)[0];
      if (this.currentIndex > index) {
        this.currentIndex--;
      } else if (this.currentIndex === index) {
        this.stop();
      }
      this.updateQueueDisplay();
      this.showNotification(`تم إزالة "${removed.title}" من قائمة التشغيل`);
    }
  }

  playAudio(item, autoPlay = true) {
    if (!this.audioElement) return;

    // Pausar el audio actual si está reproduciéndose
    if (this.isPlaying) {
      this.audioElement.pause();
    }

    this.audioElement.src = item.url;
    this.audioTitle.textContent = item.title || 'بدون عنوان';
    this.audioSubtitle.textContent = '0:00 / 0:00';
    
    this.playerContainer.style.display = 'block';
    document.body.classList.add('audio-player-active');

    if (autoPlay) {
      this.audioElement.play().catch(error => {
        console.error('خطأ في تشغيل الصوت:', error);
        this.showNotification('خطأ في تشغيل الملف الصوتي');
      });
    }

    // إضافة إلى القائمة إذا لم تكن موجودة (sin autoPlay para evitar recursión)
    if (!this.queue.find(q => q.url === item.url)) {
      this.addToQueue(item, false);
    }
    
    this.currentIndex = this.queue.findIndex(q => q.url === item.url);
    this.updateQueueDisplay();
  }

  togglePlayPause() {
    if (!this.audioElement || !this.audioElement.src) return;

    if (this.isPlaying) {
      this.audioElement.pause();
    } else {
      this.audioElement.play().catch(error => {
        console.error('خطأ في تشغيل الصوت:', error);
      });
    }
  }

  playNext() {
    if (this.queue.length === 0) return;

    let nextIndex;
    if (this.isRepeating && this.currentIndex >= 0) {
      nextIndex = this.currentIndex;
    } else if (this.isShuffled) {
      nextIndex = Math.floor(Math.random() * this.queue.length);
    } else {
      nextIndex = (this.currentIndex + 1) % this.queue.length;
    }

    this.currentIndex = nextIndex;
    this.playAudio(this.queue[nextIndex]);
  }

  playPrevious() {
    if (this.queue.length === 0) return;

    let prevIndex;
    if (this.isShuffled) {
      prevIndex = Math.floor(Math.random() * this.queue.length);
    } else {
      prevIndex = this.currentIndex <= 0 ? this.queue.length - 1 : this.currentIndex - 1;
    }

    this.currentIndex = prevIndex;
    this.playAudio(this.queue[prevIndex]);
  }

  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    this.shuffleBtn?.classList.toggle('active', this.isShuffled);
    this.showNotification(this.isShuffled ? 'تم تفعيل التشغيل العشوائي' : 'تم إلغاء التشغيل العشوائي');
  }

  toggleRepeat() {
    this.isRepeating = !this.isRepeating;
    this.repeatBtn?.classList.toggle('active', this.isRepeating);
    this.showNotification(this.isRepeating ? 'تم تفعيل التكرار' : 'تم إلغاء التكرار');
  }

  clearQueue() {
    this.queue = [];
    this.currentIndex = -1;
    this.updateQueueDisplay();
    this.showNotification('تم مسح قائمة التشغيل');
  }

  stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.isPlaying = false;
    this.updatePlayButton();
  }

  close() {
    this.stop();
    this.playerContainer.style.display = 'none';
    document.body.classList.remove('audio-player-active');
  }

  updatePlayButton() {
    if (!this.playPauseBtn) return;
    
    const icon = this.playPauseBtn.querySelector('svg');
    if (this.isPlaying) {
      icon.innerHTML = '<path fill-rule="evenodd" d="M6 4a1 1 0 00-1 1v10a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1H6zM12 4a1 1 0 00-1 1v10a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1h-2z" clip-rule="evenodd"/>';
      this.playPauseBtn.title = 'إيقاف مؤقت';
    } else {
      icon.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>';
      this.playPauseBtn.title = 'تشغيل';
    }
  }

  updateTimeDisplay() {
    if (!this.audioSubtitle) return;
    
    const current = this.formatTime(this.currentTime);
    const total = this.formatTime(this.duration);
    this.audioSubtitle.textContent = `${current} / ${total}`;
  }

  updateQueueDisplay() {
    if (this.queueCounter) {
      this.queueCounter.textContent = this.queue.length;
    }

    const queueList = document.getElementById('queueList');
    const queueItemCount = document.getElementById('queueItemCount');
    
    if (queueList) {
      queueList.innerHTML = this.queue.map((item, index) => `
        <div class="queue-item ${index === this.currentIndex ? 'active' : ''}" onclick="audioManager.playQueueItem(${index})">
          <div class="queue-item-icon">
            ${index === this.currentIndex && this.isPlaying ? 
              '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 4a1 1 0 00-1 1v10a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1H6zM12 4a1 1 0 00-1 1v10a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1h-2z" clip-rule="evenodd"/></svg>' :
              '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>'
            }
          </div>
          <div class="queue-item-content">
            <div class="queue-item-title">${item.title}</div>
            <div class="queue-item-type">ملف صوتي</div>
          </div>
          <button onclick="event.stopPropagation(); audioManager.removeFromQueue(${index})" class="queue-item-remove" title="إزالة من القائمة">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      `).join('');
    }

    if (queueItemCount) {
      queueItemCount.textContent = this.queue.length;
    }
  }

  playQueueItem(index) {
    if (index >= 0 && index < this.queue.length) {
      this.currentIndex = index;
      this.playAudio(this.queue[index]);
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  showNotification(message) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = 'audio-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--primary-color);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: var(--shadow-medium);
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Mostrar notificación
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}
