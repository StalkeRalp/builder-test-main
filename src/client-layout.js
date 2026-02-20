/**
 * Client Layout Component
 * Generates common sidebar and header for all client pages
 */
import AuthService from './auth-service.js';
import ProjectStore from './data-store.js';
import ChatService from './chat-service.js';
import ProfileService from './profile-service.js';

class ClientLayout {
    constructor() {
        this.currentProject = null;
        this.currentPage = '';
    }

    /**
     * Initialize the layout
     */
    async init(currentPage = 'dashboard') {
        this.currentPage = currentPage;

        // Check authentication
        AuthService.requireClient();

        // Get current project from session
        const session = AuthService.getCurrentUser();
        if (session && session.projectId) {
            this.currentProject = await ProjectStore.getById(session.projectId);
            if (this.currentProject) {
                this.render();
                this.setupSyncListener();

                // Listen for storage changes (profile updates)
                window.addEventListener('storage', (e) => {
                    if (e.key && e.key.startsWith('tde_client_profiles')) {
                        this.render(); // Re-render to update profile photo
                    }
                });
            } else {
                // If project not found in store, try to fetch it or logout
                // For now, assuming ProjectStore load is sync or already done
                if (!this.currentProject) {
                    console.warn('Project not found in store, might be loading...');
                }
            }
        }
    }

    /**
     * Render sidebar and header
     */
    render() {
        const sidebarHTML = this.generateSidebar();
        const headerHTML = this.generateHeader();

        // Insert into DOM
        const sidebarContainer = document.getElementById('clientSidebar');
        const headerContainer = document.getElementById('clientHeader');

        if (sidebarContainer) sidebarContainer.innerHTML = sidebarHTML;
        if (headerContainer) headerContainer.innerHTML = headerHTML;

        // Initialize icons
        if (window.lucide) window.lucide.createIcons();
    }

    /**
     * Generate sidebar HTML
     */
    generateSidebar() {
        const navItems = [
            { id: 'dashboard', icon: 'layout-dashboard', label: 'Overview', href: '/client/dashboard.html' },
            { id: 'timeline', icon: 'calendar-clock', label: 'Timeline', href: '/client/timeline.html' },
            { id: 'tickets', icon: 'ticket', label: 'Support', href: '/client/tickets.html' },
            { id: 'documents', icon: 'folder-open', label: 'Documents', href: '/client/documents.html' },
            { id: 'messages', icon: 'message-circle', label: 'Messages', href: '/client/chat.html' },
            { id: 'profile', icon: 'user', label: 'Profile', href: '/client/profile.html' }
        ];

        const navHTML = navItems.map(item => {
            const isActive = this.currentPage === item.id;
            const activeClass = isActive
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900';

            // Get unread count for messages
            let badge = '';
            if (item.id === 'messages' && ChatService && this.currentProject) {
                const unreadCount = ChatService.getUnreadCount(this.currentProject.id, 'client');
                if (unreadCount > 0) {
                    badge = `<span class="ml-auto w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">${unreadCount}</span>`;
                }
            }

            return `
                <a href="${item.href}" 
                   class="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl ${activeClass} transition-colors">
                    <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                    ${item.label}
                    ${badge}
                </a>
            `;
        }).join('');

        return `
            <div class="p-6 border-b border-gray-100 flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                    <img src="/logo.png" class="w-6 h-6 object-contain invert" alt="Logo">
                </div>
                <div>
                    <p class="font-display font-bold text-sm text-slate-900">${this.currentProject.name}</p>
                    <p class="text-xs text-slate-500">${this.currentProject.id}</p>
                </div>
            </div>

            <div class="p-4 flex-1 overflow-y-auto">
                <p class="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
                <nav class="space-y-1">
                    ${navHTML}
                </nav>

                <!-- Project Manager Card -->
                <div class="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div class="flex items-start gap-3 mb-3">
                        <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                            <i data-lucide="user" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-slate-500 uppercase tracking-wide">Project Manager</p>
                            <p class="font-bold text-sm text-black">${this.currentProject.manager || 'N/A'}</p>
                        </div>
                    </div>
                    <button class="w-full py-2 bg-white hover:bg-gray-100 rounded-lg text-xs font-bold text-slate-900 transition-colors border border-gray-200 flex items-center justify-center gap-2">
                        <i data-lucide="mail" class="w-3 h-3"></i> Contact Manager
                    </button>
                </div>

                <!-- Logout Button -->
                <button id="layoutLogoutBtn"
                    class="w-full mt-4 py-3 bg-white hover:bg-red-50 rounded-xl text-sm font-bold text-red-600 transition-colors border border-red-200 flex items-center justify-center gap-2">
                    <i data-lucide="log-out" class="w-4 h-4"></i> Logout
                </button>
            </div>
        `;
    }

    /**
     * Generate header HTML
     */
    generateHeader() {
        const session = AuthService.getCurrentUser();
        const initials = session.clientName ? session.clientName.substring(0, 2).toUpperCase() : 'CL';

        // Get profile photo if available
        let avatarHTML = '';
        if (ProfileService) {
            const profile = ProfileService.getClientProfile(session.projectId);
            if (profile.photo) {
                avatarHTML = `<img src="${profile.photo}" class="w-8 h-8 rounded-full object-cover">`;
            } else {
                avatarHTML = `<span class="text-xs font-bold">${initials}</span>`;
            }
        } else {
            avatarHTML = `<span class="text-xs font-bold">${initials}</span>`;
        }

        return `
            <div class="flex items-center justify-between">
                <div class="lg:hidden flex items-center gap-3">
                    <span class="font-display font-bold text-lg text-slate-900">${this.getPageTitle()}</span>
                </div>
                <div class="hidden lg:block font-bold text-slate-900">${this.getPageTitle()}</div>
                <div class="flex items-center gap-4">
                    <span class="text-sm text-slate-700 hidden md:block">${session.clientName || 'Client'}</span>
                    <a href="client-profile.html" class="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer">
                        ${avatarHTML}
                    </a>
                </div>
            </div>
        `;
    }

    /**
     * Get page title based on current page
     */
    getPageTitle() {
        const titles = {
            dashboard: 'Project Overview',
            timeline: 'Project Timeline',
            tickets: 'Support Tickets',
            documents: 'Documents',
            messages: 'Messages',
            profile: 'My Profile'
        };
        return titles[this.currentPage] || 'My Project';
    }

    /**
     * Setup localStorage sync listener
     */
    setupSyncListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'tde_projects') {
                // Reload project data
                this.currentProject = ProjectStore.getById(this.currentProject.id);
                if (this.currentProject) {
                    // Trigger custom event for page-specific refresh
                    window.dispatchEvent(new CustomEvent('projectUpdated', {
                        detail: this.currentProject
                    }));
                }
            }
        });

        // Attach logout listener deeply
        setTimeout(() => {
            const btn = document.getElementById('layoutLogoutBtn');
            if (btn) {
                btn.addEventListener('click', async () => {
                    await AuthService.logout();
                });
            }
        }, 100);
    }

    /**
     * Get current project
     */
    getCurrentProject() {
        return this.currentProject;
    }
}

// Global instance assigned to window for backward compatibility if needed, 
// but primarily exported as default
const clientLayout = new ClientLayout();
window.ClientLayout = clientLayout;
export default clientLayout;
