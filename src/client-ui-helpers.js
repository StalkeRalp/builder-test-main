/**
 * Client UI Helpers
 * Fonctions utilitaires pour l'interface client
 */

const ClientUIHelpers = {
  /**
   * Formater la date
   */
  formatDate(dateString, locale = 'fr-FR') {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  /**
   * Formater la date et l'heure
   */
  formatDateTime(dateString, locale = 'fr-FR') {
    return new Date(dateString).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Formater une taille de fichier
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
  },

  /**
   * Obtenir l'emoji du statut
   */
  getStatusEmoji(status) {
    const statusMap = {
      'completed': '✅',
      'in_progress': '📸',
      'planned': '⏳',
      'open': '🟠',
      'in_work': '🟡',
      'resolved': '🟢',
      'closed': '⚫',
      'en_cours': '🔄'
    };
    return statusMap[status] || '•';
  },

  /**
   * Obtenir le label du statut
   */
  getStatusLabel(status) {
    const statusMap = {
      'completed': 'Complétée',
      'in_progress': 'En cours',
      'planned': 'Prévue',
      'open': 'Ouvert',
      'in_work': 'En Cours',
      'resolved': 'Résolu',
      'closed': 'Fermé',
      'en_cours': 'En cours'
    };
    return statusMap[status] || status;
  },

  /**
   * Obtenir la couleur du statut (Tailwind)
   */
  getStatusColor(status) {
    const colorMap = {
      'completed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'planned': 'bg-gray-100 text-gray-800',
      'open': 'bg-orange-100 text-orange-800',
      'in_work': 'bg-yellow-100 text-yellow-800',
      'resolved': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-100 text-gray-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Obtenir la couleur de priorité
   */
  getPriorityColor(priority) {
    const colorMap = {
      'high': 'bg-red-100 text-red-800 border-red-300',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'low': 'bg-green-100 text-green-800 border-green-300'
    };
    return colorMap[priority] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Obtenir le label de priorité
   */
  getPriorityLabel(priority) {
    const labelMap = {
      'high': 'Haute',
      'medium': 'Moyenne',
      'low': 'Basse'
    };
    return labelMap[priority] || priority;
  },

  /**
   * Obtenir l'icône du type de document
   */
  getDocumentIcon(type) {
    const iconMap = {
      'quote': '📋',
      'plans': '📐',
      'contract': '📜',
      'invoice': '💳',
      'report': '📊',
      'other': '📁'
    };
    return iconMap[type] || '📁';
  },

  /**
   * Calculer les jours restants
   */
  getDaysRemaining(endDate) {
    const end = new Date(endDate);
    const today = new Date();
    const diff = end - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  },

  /**
   * Créer une barre de progression
   */
  createProgressBar(progress, className = '') {
    return `
      <div class="w-full bg-gray-200 rounded-full h-2.5 ${className}">
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 h-2.5 rounded-full" 
             style="width: ${progress}%"></div>
      </div>
    `;
  },

  /**
   * Formater la devise
   */
  formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  /**
   * Afficher une notification
   */
  showNotification(message, type = 'info', duration = 3000) {
    const containerId = 'client-toast-container';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span style="font-weight:700;">●</span>
      <span style="flex:1;">${message}</span>
      <button type="button" style="background:none;border:none;font-size:18px;cursor:pointer;line-height:1;">×</button>
    `;

    toast.querySelector('button').addEventListener('click', () => toast.remove());
    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.remove();
      }, duration);
    }
  },

  /**
   * Afficher un modal de confirmation
   */
  showConfirmDialog(title, message, onConfirm, onCancel) {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal open';
    modal.innerHTML = `
      <div class="confirm-card">
        <div class="confirm-body">
          <h2 class="confirm-title">${title}</h2>
          <p class="confirm-text">${message}</p>
        </div>
        <div class="confirm-actions">
          <button type="button" class="confirm-btn" data-action="cancel">Annuler</button>
          <button type="button" class="confirm-btn primary" data-action="confirm">Confirmer</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      modal.remove();
      onConfirm();
    });

    modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      modal.remove();
      if (onCancel) onCancel();
    });
  },

  /**
   * Vérifier si l'utilisateur est sur mobile
   */
  isMobile() {
    return window.innerWidth < 768;
  },

  /**
   * Animer l'apparition d'un élément
   */
  animateIn(element, animation = 'fade-in') {
    element.classList.add(`animate-${animation}`);
  },

  /**
   * Copier du texte dans le presse-papiers
   */
  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showNotification('Copié dans le presse-papiers!', 'success');
    }).catch(() => {
      this.showNotification('Erreur lors de la copie', 'error');
    });
  },

  /**
   * Télécharger un fichier
   */
  downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || url.split('/').pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

window.ClientUIHelpers = ClientUIHelpers;
