import ProjectStore from './data-store.js';
import AuthService from './auth-service.js';

// DOM Elements
const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const toast = document.getElementById('toast');
const ticketModal = document.getElementById('ticketModal');

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Check if simulate logged in (optional persistence)
    // For demo, we start at login always
});

// Load Project Data (Real)
async function loadProjectData(projectId) {
    console.log('Loading project data for:', projectId);

    try {
        const project = await ProjectStore.getById(projectId);

        if (!project) {
            console.error('Project not found in store:', projectId);
            showToast('Error: Project data could not be loaded.');
            return;
        }

        // 1. Sidebar Manager
        const managerEl = document.getElementById('sidebar-manager-name');
        if (managerEl) managerEl.textContent = project.manager || 'Unassigned';

        // 2. Overview Tab Data
        document.getElementById('overview-project-id').textContent = `Project #${project.id.substring(0, 8)}`;
        document.getElementById('overview-project-name').textContent = project.name;

        // Status
        const statusEl = document.getElementById('overview-project-status');
        if (statusEl) {
            statusEl.innerHTML = `
                <span class="w-2 h-2 rounded-full ${project.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'} animate-pulse"></span>
                ${project.status ? project.status.replace('-', ' ').toUpperCase() : 'UNKNOWN'}
             `;
        }

        // Progress
        const progressVal = project.progress || 0;
        document.getElementById('overview-progress-text').textContent = `${progressVal}%`;
        document.getElementById('overview-progress-bar').style.width = `${progressVal}%`;

        // Delivery Date
        const dateEl = document.getElementById('overview-delivery-date');
        if (dateEl) dateEl.textContent = project.end_date ? new Date(project.end_date).toLocaleDateString() : 'TBD';

        // 3. Site Updates / Images
        const gallery = document.getElementById('siteUpdatesGallery');
        if (gallery) {
            // Fetch images via store
            const images = await ProjectStore.getImages(projectId);

            if (images.length > 0) {
                gallery.innerHTML = images.slice(0, 2).map(img => `
                    <div class="relative group rounded-xl overflow-hidden h-40 cursor-pointer" onclick="window.open('${img.url}', '_blank')">
                        <img src="${img.url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <i data-lucide="zoom-in" class="text-white w-6 h-6"></i>
                        </div>
                    </div>
                 `).join('');
            } else {
                gallery.innerHTML = `<p class="col-span-2 text-sm text-gray-400 italic">No updates uploaded yet.</p>`;
            }
        }

        // Initialize icons
        lucide.createIcons();

    } catch (error) {
        console.error('Error loading project data:', error);
        showToast('Error loading project data');
    }
}

// Expose to window immediately
window.loadProjectData = loadProjectData;


// Login Simulator
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Add loading state
        const originalContent = loginBtn.innerHTML;
        loginBtn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Authenticating...`;
        lucide.createIcons();
        loginBtn.disabled = true;

        // Simulate API delay
        setTimeout(() => {
            // Fade out login
            loginView.classList.add('opacity-0', 'transition-opacity', 'duration-500');

            setTimeout(() => {
                loginView.classList.add('hidden');
                loginView.classList.remove('opacity-0');

                // Show dashboard
                dashboardView.classList.remove('hidden');
                dashboardView.classList.add('animate-fade-in');

                // Re-render icons for dashboard visibility
                lucide.createIcons();
            }, 500);

        }, 1500);
    });
}

// Tab Switcher
function switchTab(tabId) {
    // 1. Fade OUT current tab
    const currentTab = document.querySelector('.tab-content:not(.hidden)');
    if (currentTab) {
        currentTab.style.opacity = '0';
        currentTab.style.transform = 'translateY(10px)';

        setTimeout(() => {
            currentTab.classList.add('hidden');
            // Reset styles for next time
            currentTab.style.opacity = '';
            currentTab.style.transform = '';

            // 2. Show NEW tab
            const newTab = document.getElementById(`tab-${tabId}`);
            if (newTab) {
                newTab.classList.remove('hidden');
                newTab.classList.add('animate-fade-in');
            }
        }, 200); // Wait for transition
    } else {
        // First load
        const tab = document.getElementById(`tab-${tabId}`);
        if (tab) tab.classList.remove('hidden');
    }

    // Reset nav styles
    document.querySelectorAll('[id^="nav-"]').forEach(btn => {
        btn.classList.remove('bg-slate-100', 'text-slate-900', 'font-bold');
        btn.classList.add('text-slate-600', 'hover:bg-gray-50', 'hover:text-slate-900');
    });

    // Highlight nav
    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-600', 'hover:bg-gray-50');
        activeBtn.classList.add('bg-slate-100', 'text-slate-900', 'font-bold');
    }
}

// Modal Logic
function openTicketModal() {
    if (ticketModal) ticketModal.classList.remove('hidden');
}

function closeTicketModal() {
    if (ticketModal) ticketModal.classList.add('hidden');
}

// New Ticket Submission
const newTicketForm = document.getElementById('newTicketForm');
if (newTicketForm) {
    newTicketForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Simulate submission
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Sending...';

        setTimeout(() => {
            // Add new item to list (Demo)
            const ticketList = document.getElementById('ticketList');
            if (ticketList) {
                const newId = Math.floor(Math.random() * 1000) + 2000;

                const newItem = document.createElement('div');
                // Styled new item
                newItem.className = 'ticket-item grid grid-cols-12 gap-4 p-4 border-b border-gray-100 items-center bg-green-50/50 animate-slide-up transition-colors hover:bg-gray-50';
                newItem.innerHTML = `
                    <div class="col-span-1 font-mono text-sm text-slate-400">#${newId}</div>
                    <div class="col-span-6 md:col-span-1 font-medium text-slate-800">New Request</div>
                    <div class="col-span-2 hidden md:block text-sm text-slate-500">Just now</div>
                    <div class="col-span-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            Pending
                        </span>
                    </div>
                    <div class="col-span-3 md:col-span-2 text-right">
                        <button class="text-slate-400 hover:text-slate-900 transition-colors"><i data-lucide="eye" class="w-5 h-5"></i></button>
                    </div>
                `;

                ticketList.prepend(newItem);
                lucide.createIcons();
            }

            // Reset and close
            closeTicketModal();
            e.target.reset();
            btn.innerHTML = originalText;

            // Show Toast
            showToast('Ticket created successfully');
        }, 1000);
    });
}

// Toast System
function showToast(message) {
    if (!toast) return;
    const textEl = toast.querySelector('p');
    if (message && textEl) textEl.textContent = message;

    toast.classList.remove('translate-y-24');
    setTimeout(() => {
        toast.classList.add('translate-y-24');
    }, 3000);
}

// Logout
function logout() {
    if (dashboardView) dashboardView.classList.add('hidden');
    if (loginView) {
        loginView.classList.remove('hidden');
        loginView.classList.remove('opacity-0');
    }

    // Reset login button
    if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = `
            <span>Sign In</span>
            <i data-lucide="arrow-right" class="w-5 h-5"></i>
        `;
        lucide.createIcons();
    }
}

// BONUS: Toggle Notifications
function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

// BONUS: Filter Tickets (Search)
function filterTickets() {
    const input = document.getElementById('ticketSearch');
    if (!input) return;
    const filter = input.value.toLowerCase();
    const tickets = document.getElementsByClassName('ticket-item');

    for (let i = 0; i < tickets.length; i++) {
        const subject = tickets[i].getElementsByClassName('col-span-5')[0] || tickets[i].getElementsByClassName('col-span-6')[0];
        if (subject) {
            const txtValue = subject.textContent || subject.innerText;
            if (txtValue.toLowerCase().indexOf(filter) > -1) {
                tickets[i].style.display = "";
            } else {
                tickets[i].style.display = "none";
            }
        }
    }
}

// BONUS: Export Report Simulation
function exportReport() {
    showToast('Downloading project report...');
}

// Expose functions to window for HTML onclick events
window.switchTab = switchTab;
window.openTicketModal = openTicketModal;
window.closeTicketModal = closeTicketModal;
window.showToast = showToast;
window.logout = logout;
window.toggleNotifications = toggleNotifications;
window.filterTickets = filterTickets;
window.exportReport = exportReport;
