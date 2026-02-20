// Reusable Admin Sidebar Component
export default class AdminSidebar {
    static render(activePage = '') {
        return `
            <aside class="text-white border-r sticky top-0 h-screen hidden lg:flex flex-col z-20"
                style="background-color: var(--color-navy-900); border-color: var(--color-navy-800);">
                <div class="p-6 border-b flex items-center gap-3" style="border-color: var(--color-navy-800);">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                        style="background-color: var(--color-emerald-500);">
                        <img src="../logo.png" class="w-6 h-6 object-contain" alt="Logo">
                    </div>
                    <span class="font-display font-bold text-xl tracking-wide">TDE Admin</span>
                </div>
                <div class="p-4 flex-1 overflow-y-auto">
                    <nav class="space-y-1">
                        ${this.navItem('index.html', 'layout-dashboard', 'Dashboard', activePage)}
                        ${this.navItem('create-project.html', 'folder-plus', 'New Project', activePage)}
                        ${this.navItem('calendar.html', 'calendar', 'Calendar', activePage)}

                        <!-- CRM & Support -->
                        <div class="pt-4 mt-4 border-t space-y-1" style="border-color: var(--color-navy-800);">
                            ${this.navItem('clients.html', 'users', 'Clients (CRM)', activePage)}
                            ${this.navItem('tickets.html', 'message-square', 'Support Inbox', activePage)}
                            ${this.navItem('messages.html', 'mail', 'Messages', activePage)}
                        </div>

                        <button id="sidebarLogoutBtn"
                            class="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors mt-8 border-t pt-4"
                            style="border-color: var(--color-navy-800);">
                            <i data-lucide="log-out" class="w-5 h-5"></i>
                            Logout
                        </button>
                    </nav>
                </div>
            </aside>
        `;
    }

    static navItem(href, icon, label, activePage) {
        const isActive = activePage === href;
        const activeStyle = isActive
            ? 'style="background-color: var(--color-emerald-600);" class="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-white transition-colors"'
            : 'class="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors" style="color: var(--color-navy-400);" onmouseover="this.style.backgroundColor=\'var(--color-navy-800)\'; this.style.color=\'white\'" onmouseout="this.style.backgroundColor=\'transparent\'; this.style.color=\'var(--color-navy-400)\'"';

        return `
            <a href="${href}" ${activeStyle}>
                <i data-lucide="${icon}" class="w-5 h-5"></i>
                ${label}
            </a>
        `;
    }

    static attachLogoutHandler(authService) {
        const logoutBtn = document.getElementById('sidebarLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await authService.logout();
            });
        }
    }
}
