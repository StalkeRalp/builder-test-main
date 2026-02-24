
        import AuthService from '../src/auth-service.js';
        import ProjectStore from '../src/data-store.js';
        import TicketService from '../src/ticket-service.js';
        import ChatService from '../src/chat-service.js';
        import { initAdminAvatar } from '../src/admin-avatar.js';
        import adminEventsService from '../src/admin-events-service.js';

        let allProjects = [];
        let filteredProjects = [];
        let statusChart = null;
        let currentPage = 1;
        let unsubscribeAdminEvents = null;
        let lastDeadlineReminderKey = '';
        let hasAppliedUrlFilters = false;
        let uxSuite = null;
        const itemsPerPage = 5;

        async function initialize() {
            try {
                await AuthService.authReady;
                if (!AuthService.isAdmin || !AuthService.isAdmin()) {
                    window.location.href = 'login.html';
                    return;
                }
                document.body.classList.remove('auth-pending');
                document.body.classList.add('auth-ready');

                uxSuite = window.UXProductivitySuite?.init({
                    scope: 'admin-dashboard',
                    headerRightSelector: '.header-right',
                    searchInputSelector: '#searchInput',
                    onSearch: (query) => navigateFromQuery(query),
                    commands: [
                        { label: 'Nouveau projet', help: 'Créer un nouveau projet', keywords: ['create', 'project'], action: () => { window.location.href = 'create-project.html'; } },
                        { label: 'Tickets ouverts', help: 'Voir les tickets ouverts', keywords: ['tickets', 'support', 'open'], action: () => { window.location.href = 'tickets.html?status=open'; } },
                        { label: 'Messages non lus', help: 'Ouvrir la messagerie filtrée', keywords: ['messages', 'chat', 'unread'], action: () => { window.location.href = 'messages.html?unread=1'; } },
                        { label: 'Calendrier', help: 'Voir le planning', keywords: ['calendar', 'planning'], action: () => { window.location.href = 'calendar.html'; } },
                        { label: 'Clients', help: 'Ouvrir le CRM client', keywords: ['clients', 'crm'], action: () => { window.location.href = 'clients.html'; } }
                    ]
                });

                await initAdminAvatar();
                updateHeroDate();
                await loadProjects();
                unsubscribeAdminEvents = adminEventsService.subscribe(async () => {
                    await renderDeadlines(allProjects);
                });
                
                // Auto-refresh toutes les 30 secondes
                setInterval(async () => {
                    await loadProjects();
                }, 30000);

            } catch (error) {
                console.error('Error initializing:', error);
                window.location.href = 'login.html';
            }
        }

        async function loadProjects() {
            try {
                allProjects = await ProjectStore.getAll();
                filteredProjects = [...allProjects];
                updateOverview(allProjects);
                renderStatusChart(allProjects);
                populateClientFilter(allProjects);
                if (!hasAppliedUrlFilters) {
                    applyDashboardUrlFilters();
                    hasAppliedUrlFilters = true;
                }
                applyFilters();
                renderAlerts(allProjects);
                await renderDeadlines(allProjects);
                renderTimeline(allProjects);
                await loadMessages();
                await loadTickets();
                updateProjectsCount();
            } catch (error) {
                console.error('Error loading projects:', error);
            }
        }

        function applyDashboardUrlFilters() {
            const params = new URLSearchParams(window.location.search);
            const status = (params.get('status') || '').trim();
            const type = (params.get('type') || '').trim();
            const client = (params.get('client') || '').trim();
            const query = (params.get('q') || '').trim();
            const deadline = (params.get('deadline') || '').trim().toLowerCase();
            const unread = (params.get('unread') || '').trim();

            const statusFilter = document.getElementById('statusFilter');
            const typeFilter = document.getElementById('typeFilter');
            const clientFilter = document.getElementById('clientFilter');
            const search = document.getElementById('projectSearch');

            if (status && statusFilter && Array.from(statusFilter.options).some((o) => o.value === status)) statusFilter.value = status;
            if (type && typeFilter && Array.from(typeFilter.options).some((o) => o.value === type)) typeFilter.value = type;
            if (client && clientFilter && Array.from(clientFilter.options).some((o) => o.value === client)) clientFilter.value = client;
            if (query && search) search.value = query;

            if (deadline === 'soon') {
                document.getElementById('deadlinesList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            if (unread === '1') {
                document.getElementById('messagesList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        function renderProjects(projects) {
            const container = document.getElementById('projectsList');
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const paginatedProjects = projects.slice(start, end);
            
            if (projects.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 48px; color: var(--gray);">
                        <span class="material-icons" style="font-size: 48px; margin-bottom: 16px;">folder_open</span>
                        <p>Aucun projet trouvé</p>
                        <a href="create-project.html" class="action-tile" style="display: inline-flex; margin-top: 16px;">
                            <span class="material-icons">add</span>
                            Créer un projet
                        </a>
                    </div>
                `;
                return;
            }

            container.innerHTML = paginatedProjects.map(project => `
                <div class="project-row clickable-row" onclick="editProject('${project.id}')" role="link" tabindex="0" onkeydown="if(event.key==='Enter'){editProject('${project.id}')}">
                    <div>
                        <div class="project-name">${project.name || 'Projet sans nom'}</div>
                        <div class="project-meta">
                            <span class="material-icons" style="font-size: 14px;">person</span>
                            ${project.client_name || 'Client'}
                            <span class="material-icons" style="font-size: 14px; margin-left: 8px;">payments</span>
                            FCFA ${Number(project.budget || 0).toLocaleString('fr-FR')}
                            <span class="material-icons" style="font-size: 14px; margin-left: 8px;">event</span>
                            ${formatDate(project.start_date)}
                        </div>
                        <div class="mini-progress">
                            <span style="width:${Math.min(100, Math.max(0, project.progress || 0))}%"></span>
                        </div>
                        <span class="project-status ${project.status || 'active'}">
                            <span class="material-icons" style="font-size: 12px;">fiber_manual_record</span>
                            ${formatStatus(project.status)}
                        </span>
                    </div>
                    <div class="project-row-actions">
                        <button class="action-btn edit" onclick="event.stopPropagation(); editProject('${project.id}')" title="Éditer">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="action-btn delete" onclick="event.stopPropagation(); deleteProject('${project.id}')" title="Supprimer">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        function renderStatusChart(projects) {
            const statusMeta = [
                { key: 'active', label: 'Actif', color: '#10b981' },
                { key: 'in_progress', label: 'En cours', color: '#3b82f6' },
                { key: 'planning', label: 'Planning', color: '#60a5fa' },
                { key: 'paused', label: 'En pause', color: '#f59e0b' },
                { key: 'completed', label: 'Complété', color: '#22c55e' },
                { key: 'cancelled', label: 'Annulé', color: '#ef4444' }
            ];
            
            const counts = Object.fromEntries(statusMeta.map(s => [s.key, 0]));
            let other = 0;

            projects.forEach(project => {
                const status = (project.status || '').toLowerCase();
                if (counts.hasOwnProperty(status)) {
                    counts[status] += 1;
                } else {
                    other += 1;
                }
            });

            const labels = statusMeta.map(s => s.label);
            const data = statusMeta.map(s => counts[s.key]);
            const colors = statusMeta.map(s => s.color);

            if (other > 0) {
                labels.push('Autres');
                data.push(other);
                colors.push('#9ca3af');
            }

            const ctx = document.getElementById('statusChart');
            if (!ctx) return;

            if (statusChart) statusChart.destroy();
            
            statusChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data,
                        backgroundColor: colors,
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    cutout: '70%',
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            labels: {
                                boxWidth: 8,
                                boxHeight: 8,
                                padding: 16,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.raw / total) * 100).toFixed(1);
                                    return `${context.label}: ${context.raw} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    maintainAspectRatio: false,
                    onClick: (_, elements) => {
                        if (!elements || !elements.length) return;
                        const index = elements[0].index;
                        const keyByIndex = ['active', 'in_progress', 'planning', 'paused', 'completed', 'cancelled'];
                        const status = keyByIndex[index];
                        if (status) openProjectStatus(status);
                    }
                }
            });
        }

        window.applyFilters = function() {
            const status = document.getElementById('statusFilter').value;
            const type = document.getElementById('typeFilter').value;
            const client = document.getElementById('clientFilter').value;
            const query = (document.getElementById('projectSearch').value || '').toLowerCase();

            filteredProjects = allProjects.filter(project => {
                let matches = true;
                
                if (status) {
                    matches = matches && project.status === status;
                }
                
                if (type) {
                    matches = matches && project.project_type === type;
                }

                if (client) {
                    matches = matches && (project.client_name || '') === client;
                }

                if (query) {
                    const name = (project.name || '').toLowerCase();
                    const client = (project.client_name || '').toLowerCase();
                    const description = (project.description || '').toLowerCase();
                    matches = matches && (name.includes(query) || client.includes(query) || description.includes(query));
                }
                
                return matches;
            });

            currentPage = 1;
            renderProjects(filteredProjects);
            updateProjectsCount();
            document.getElementById('currentPage').textContent = currentPage;
        };

        window.nextPage = function() {
            const maxPage = Math.ceil(filteredProjects.length / itemsPerPage);
            if (currentPage < maxPage) {
                currentPage++;
                renderProjects(filteredProjects);
                document.getElementById('currentPage').textContent = currentPage;
            }
        };

        window.previousPage = function() {
            if (currentPage > 1) {
                currentPage--;
                renderProjects(filteredProjects);
                document.getElementById('currentPage').textContent = currentPage;
            }
        };

        function updateProjectsCount() {
            const count = filteredProjects.length;
            document.getElementById('projectsCount').textContent = `${count} projet(s) affiché(s)`;
        }

        function populateClientFilter(projects) {
            const select = document.getElementById('clientFilter');
            if (!select) return;
            const current = select.value;
            const clients = Array.from(new Set(projects.map(p => p.client_name).filter(Boolean))).sort();
            select.innerHTML = '<option value="">Tous les clients</option>' + clients.map(name => `<option value="${name}">${name}</option>`).join('');
            if (current) select.value = current;
        }

        window.editProject = function(id) {
            window.location.href = `project-details.html?id=${id}`;
        };

        window.scrollToProjectsPanel = function() {
            const panel = document.getElementById('projectsPanel');
            if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        window.openProjectStatus = function(status) {
            const statusFilter = document.getElementById('statusFilter');
            if (!statusFilter) return;
            statusFilter.value = status || '';
            applyFilters();
            scrollToProjectsPanel();
        };

        window.focusAlerts = function() {
            const alerts = document.getElementById('alertsList');
            if (alerts) alerts.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        function navigateFromQuery(rawQuery) {
            const query = String(rawQuery || '').trim();
            if (!query) return;
            const q = query.toLowerCase();

            if (q.includes('ticket') || q.includes('support')) {
                window.location.href = `tickets.html?status=open&q=${encodeURIComponent(query)}`;
                return;
            }
            if (q.includes('message') || q.includes('chat')) {
                window.location.href = `messages.html?unread=1&q=${encodeURIComponent(query)}`;
                return;
            }
            if (q.includes('client') || q.includes('crm')) {
                window.location.href = `clients.html?q=${encodeURIComponent(query)}`;
                return;
            }
            if (q.includes('calendrier') || q.includes('calendar')) {
                window.location.href = 'calendar.html';
                return;
            }
            if (q.includes('rapport') || q.includes('report')) {
                window.location.href = 'reports.html';
                return;
            }

            const projectSearch = document.getElementById('projectSearch');
            if (projectSearch) {
                projectSearch.value = query;
                applyFilters();
                scrollToProjectsPanel();
            }
        }

        window.deleteProject = async function(id) {
            const ok = await confirmAction('Supprimer ce projet ? Cette action est définitive.');
            if (!ok) return;
            const result = await ProjectStore.delete(id);
            if (result.success) {
                await loadProjects();
                showToast('success', 'Projet supprimé avec succès');
            } else {
                showToast('error', result.error || 'Erreur de suppression');
            }
        };

        function showToast(type, message) {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<span class="material-icons">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info'}</span><span>${message}</span>`;
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 3200);
        }

        function confirmAction(message) {
            return new Promise((resolve) => {
                const modal = document.getElementById('confirmModal');
                const text = document.getElementById('confirmText');
                text.textContent = message;
                modal.classList.add('open');
                const onYes = () => { cleanup(); resolve(true); };
                const onNo = () => { cleanup(); resolve(false); };
                function cleanup() {
                    modal.classList.remove('open');
                    document.getElementById('confirmYes').removeEventListener('click', onYes);
                    document.getElementById('confirmNo').removeEventListener('click', onNo);
                }
                document.getElementById('confirmYes').addEventListener('click', onYes);
                document.getElementById('confirmNo').addEventListener('click', onNo);
            });
        }

        function updateHeroDate() {
            const today = new Date();
            document.getElementById('todayDate').textContent = today.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }

        function updateOverview(projects) {
            const total = projects.length;
            const inProgress = projects.filter(p => p.status === 'in_progress').length;
            const paused = projects.filter(p => p.status === 'paused').length;
            const active = projects.filter(p => p.status === 'active').length;
            const overdue = countOverdue(projects);
            const totalBudget = projects.reduce((sum, p) => sum + Number(p.budget || 0), 0);
            const avgProgress = Math.round(projects.reduce((sum, p) => sum + Number(p.progress || 0), 0) / (projects.length || 1));
            const completed = projects.filter(p => (p.status || '').toLowerCase() === 'completed').length;
            const recentCount = countRecentProjects(projects, 30);
            const successRate = total ? Math.round((completed / total) * 100) : 0;
            const deliveryRate = total ? Math.round(((total - overdue) / total) * 100) : 0;

            document.getElementById('projectSummary').textContent = `${total} projets • ${inProgress || active} en cours • ${paused} en pause`;
            document.getElementById('heroAlert').innerHTML = `<span class="material-icons" style="font-size: 14px;">${overdue > 0 ? 'warning' : 'check_circle'}</span> ${overdue > 0 ? `${overdue} projet(s) en retard` : 'Aucune alerte critique'}`;
            document.getElementById('heroBudget').textContent = 'FCFA ' + totalBudget.toLocaleString('fr-FR');
            document.getElementById('heroAvgProgress').textContent = `${avgProgress}%`;

            document.getElementById('kpiTotal').textContent = total;
            document.getElementById('kpiInProgress').textContent = inProgress || active;
            document.getElementById('kpiPaused').textContent = paused;
            document.getElementById('kpiOverdue').textContent = overdue;
            document.getElementById('kpiBudget').textContent = 'FCFA ' + totalBudget.toLocaleString('fr-FR');
            document.getElementById('kpiAvgProgress').textContent = `${avgProgress}%`;
            document.getElementById('kpiTotalSub').textContent = `${recentCount} ce mois`;
            document.getElementById('kpiInProgressSub').textContent = `${inProgress || active} en cours`;
            document.getElementById('kpiPausedSub').textContent = paused > 0 ? `${paused} à relancer` : 'Aucun en pause';

            const successRateEl = document.getElementById('successRate');
            const successRateBar = document.getElementById('successRateBar');
            if (successRateEl && successRateBar) {
                successRateEl.textContent = `${successRate}%`;
                successRateBar.style.width = `${successRate}%`;
            }

            const deliveryRateEl = document.getElementById('deliveryRate');
            const deliveryRateBar = document.getElementById('deliveryRateBar');
            if (deliveryRateEl && deliveryRateBar) {
                deliveryRateEl.textContent = `${deliveryRate}%`;
                deliveryRateBar.style.width = `${deliveryRate}%`;
            }
        }

        function renderAlerts(projects) {
            const container = document.getElementById('alertsList');
            const today = new Date();
            const overdue = projects.filter(p => isOverdue(p, today)).slice(0, 5);
            
            document.getElementById('alertCount').textContent = overdue.length;

            if (overdue.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 24px; color: var(--gray);">
                        <span class="material-icons" style="font-size: 32px;">check_circle</span>
                        <p style="margin-top: 8px;">Aucune échéance critique</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = overdue.map(project => `
                <a class="alert-item" href="project-details.html?id=${project.id}">
                    <div class="alert-icon"><span class="material-icons">warning</span></div>
                    <div style="flex: 1;">
                        <p class="item-title">${project.name || 'Projet sans nom'}</p>
                        <p class="item-meta">
                            <span class="material-icons" style="font-size: 12px;">event</span>
                            Échéance: ${formatDate(project.end_date)} • 
                            <span class="material-icons" style="font-size: 12px;">person</span>
                            ${project.client_name || 'Client'}
                        </p>
                    </div>
                </a>
            `).join('');
        }

        async function loadMessages() {
            const container = document.getElementById('messagesList');
            try {
                const conversations = await ChatService.getAllConversations();
                if (!conversations || conversations.length === 0) {
                    const badge = document.getElementById('badgeMessages');
                    if (badge) {
                        badge.textContent = 0;
                        badge.style.display = 'none';
                    }
                    const unreadCountEl = document.getElementById('unreadCount');
                    const unreadListEl = document.getElementById('unreadList');
                    if (unreadCountEl) unreadCountEl.textContent = 0;
                    if (unreadListEl) unreadListEl.innerHTML = '<div style="color: var(--gray); font-size: 12px;">Aucun message non lu</div>';
                    container.innerHTML = `
                        <div style="text-align: center; padding: 24px; color: var(--gray);">
                            <span class="material-icons" style="font-size: 32px;">mail</span>
                            <p style="margin-top: 8px;">Aucun message</p>
                        </div>
                    `;
                    return;
                }

                const unreadConversations = conversations.filter(c => (c.unreadCount || 0) > 0);
                const unread = unreadConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
                const badge = document.getElementById('badgeMessages');
                if (badge) {
                    badge.textContent = unread;
                    badge.style.display = unread > 0 ? 'inline-block' : 'none';
                }

                const unreadCountEl = document.getElementById('unreadCount');
                const unreadListEl = document.getElementById('unreadList');
                if (unreadCountEl) unreadCountEl.textContent = unread;
                if (unreadListEl) {
                    if (unreadConversations.length === 0) {
                        unreadListEl.innerHTML = '<div style="color: var(--gray); font-size: 12px;">Aucun message non lu</div>';
                    } else {
                        unreadListEl.innerHTML = unreadConversations.slice(0, 4).map(conv => `
                            <a class="inbox-item" href="messages.html?project=${encodeURIComponent(conv.projectId)}&unread=1">
                                <strong>${conv.projectName || 'Projet'}</strong>
                                <span>${conv.clientName || 'Client'} • ${conv.unreadCount} non lu(s)</span>
                            </a>
                        `).join('');
                    }
                }

                container.innerHTML = conversations.slice(0, 5).map(conv => `
                    <a class="message-item clickable-row" href="messages.html?project=${encodeURIComponent(conv.projectId)}">
                        <div class="message-icon"><span class="material-icons">mail</span></div>
                        <div style="flex: 1;">
                            <p class="item-title">${conv.projectName || 'Projet'}</p>
                            <p class="item-meta">
                                <span class="material-icons" style="font-size: 12px;">person</span>
                                ${conv.clientName || 'Client'} •
                                <span class="material-icons" style="font-size: 12px;">schedule</span>
                                ${formatDateTime(conv.lastMessage?.created_at)}
                            </p>
                        </div>
                    </a>
                `).join('');
            } catch (error) {
                console.error('Messages load error:', error);
                const unreadCountEl = document.getElementById('unreadCount');
                const unreadListEl = document.getElementById('unreadList');
                if (unreadCountEl) unreadCountEl.textContent = 0;
                if (unreadListEl) unreadListEl.innerHTML = '<div style="color: var(--gray); font-size: 12px;">Impossible de charger</div>';
                container.innerHTML = `
                    <div style="text-align: center; padding: 24px; color: var(--gray);">
                        <span class="material-icons" style="font-size: 32px;">error</span>
                        <p style="margin-top: 8px;">Impossible de charger les messages</p>
                    </div>
                `;
            }
        }

        async function loadTickets() {
            const container = document.getElementById('ticketsList');
            try {
                const tickets = await TicketService.getAll();
                if (!tickets || tickets.length === 0) {
                    const badge = document.getElementById('badgeTickets');
                    if (badge) {
                        badge.textContent = 0;
                        badge.style.display = 'none';
                    }
                    container.innerHTML = `
                        <div style="text-align: center; padding: 24px; color: var(--gray);">
                            <span class="material-icons" style="font-size: 32px;">support_agent</span>
                            <p style="margin-top: 8px;">Aucun ticket</p>
                        </div>
                    `;
                    return;
                }

                const openTickets = tickets.filter(t => (t.status || '').toLowerCase() === 'open');
                const badge = document.getElementById('badgeTickets');
                if (badge) {
                    badge.textContent = openTickets.length;
                    badge.style.display = openTickets.length > 0 ? 'inline-block' : 'none';
                }

                const projectMap = new Map(allProjects.map(p => [p.id, p.name]));
                const urgent = tickets
                    .filter(t => ['high', 'urgent'].includes((t.priority || '').toLowerCase()) || (t.status || '').toLowerCase() === 'open')
                    .slice(0, 5);

                container.innerHTML = urgent.map(ticket => `
                    <a class="ticket-item" href="project-details.html?id=${ticket.project_id}">
                        <div class="ticket-icon"><span class="material-icons">support_agent</span></div>
                        <div style="flex: 1;">
                            <p class="item-title">${ticket.title || 'Ticket'}</p>
                            <p class="item-meta">
                                <span class="material-icons" style="font-size: 12px;">folder</span>
                                ${projectMap.get(ticket.project_id) || 'Projet'} •
                                <span class="material-icons" style="font-size: 12px;">flag</span>
                                ${ticket.priority || 'medium'}
                            </p>
                        </div>
                    </a>
                `).join('');
            } catch (error) {
                console.error('Tickets load error:', error);
                container.innerHTML = `
                    <div style="text-align: center; padding: 24px; color: var(--gray);">
                        <span class="material-icons" style="font-size: 32px;">error</span>
                        <p style="margin-top: 8px;">Impossible de charger les tickets</p>
                    </div>
                `;
            }
        }

        async function renderDeadlines(projects) {
            const container = document.getElementById('deadlinesList');
            const today = new Date();
            const limit = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
            const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const daysUntil = (dateValue) => {
                const d = new Date(dateValue);
                const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                return Math.floor((start - startOfToday) / (24 * 60 * 60 * 1000));
            };
            const reminderText = (daysLeft) => {
                if (daysLeft < 0) return `Délai dépassé (${Math.abs(daysLeft)}j)`;
                if (daysLeft === 0) return 'Deadline aujourd\'hui';
                if (daysLeft <= 3) return `Rappel auto J-${daysLeft}`;
                return '';
            };

            const projectDeadlines = (projects || [])
                .filter((p) => p.end_date && new Date(p.end_date) >= today && new Date(p.end_date) <= limit)
                .map((p) => ({
                    id: `project-${p.id}`,
                    kind: 'project',
                    projectId: p.id,
                    title: p.name || 'Projet sans nom',
                    date: new Date(p.end_date),
                    subtitle: `Échéance: ${formatDate(p.end_date)}`,
                    reminder: reminderText(daysUntil(p.end_date))
                }));

            const customEvents = (await adminEventsService
                .getUpcoming(20, today))
                .map((event) => {
                    const eventDate = new Date(`${event.date}T${event.time || '00:00'}:00`);
                    const shouldRemind = String(event.type || '').toLowerCase() === 'deadline';
                    return {
                        id: `event-${event.id}`,
                        kind: 'event',
                        projectId: event.projectId || null,
                        title: event.title || 'Événement',
                        date: eventDate,
                        subtitle: `${event.time || '--:--'} • Priorité ${(event.priority || 'medium').toUpperCase()}`,
                        reminder: shouldRemind ? reminderText(daysUntil(eventDate)) : ''
                    };
                })
                .filter((item) => item.date >= today && item.date <= limit);

            const upcoming = [...projectDeadlines, ...customEvents]
                .sort((a, b) => a.date - b.date)
                .slice(0, 6);
            const reminders = upcoming.filter((item) => item.reminder);
            const reminderKey = reminders.map((item) => `${item.id}:${item.reminder}`).join('|');

            if (upcoming.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 24px; color: var(--gray);">
                        <span class="material-icons" style="font-size: 32px;">event_busy</span>
                        <p style="margin-top: 8px;">Aucune échéance ce mois</p>
                    </div>
                `;
                return;
            }

            if (reminders.length > 0 && reminderKey && reminderKey !== lastDeadlineReminderKey) {
                lastDeadlineReminderKey = reminderKey;
                showToast('warning', `${reminders.length} rappel(s) d'échéance actif(s) (J-3).`);
            }

            container.innerHTML = upcoming.map((item) => `
                <a class="deadline-item clickable-row ${item.reminder ? 'deadline-reminder-row' : ''}" href="${item.kind === 'event' ? `calendar.html?date=${encodeURIComponent(item.date.toISOString().slice(0, 10))}` : `project-details.html?id=${item.projectId}`}">
                    <div class="deadline-icon"><span class="material-icons">event</span></div>
                    <div style="flex: 1;">
                        <p class="item-title">${item.title}</p>
                        <p class="item-meta">
                            <span class="material-icons" style="font-size: 12px;">event</span>
                            ${item.subtitle}
                        </p>
                        ${item.reminder ? `<p class="deadline-reminder-note"><span class="material-icons" style="font-size:14px;">notifications_active</span>${item.reminder}</p>` : ''}
                    </div>
                </a>
            `).join('');
        }

        function renderTimeline(projects) {
            const container = document.getElementById('timelineList');
            const today = new Date();
            const limit = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
            const items = projects
                .filter(p => (p.start_date || p.end_date))
                .map(p => ({
                    id: p.id,
                    name: p.name || 'Projet',
                    client: p.client_name || 'Client',
                    start: p.start_date ? new Date(p.start_date) : null,
                    end: p.end_date ? new Date(p.end_date) : null
                }))
                .filter(p => (p.start && p.start <= limit) || (p.end && p.end <= limit))
                .sort((a, b) => {
                    const aDate = a.start || a.end;
                    const bDate = b.start || b.end;
                    return aDate - bDate;
                })
                .slice(0, 6);

            if (items.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 24px; color: var(--gray);">
                        <span class="material-icons" style="font-size: 32px;">timeline</span>
                        <p style="margin-top: 8px;">Aucune timeline à afficher</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = items.map(item => `
                <a class="timeline-item clickable-row" href="project-details.html?id=${item.id}">
                    <div class="timeline-dot"></div>
                    <div style="flex: 1;">
                        <p class="item-title">${item.name}</p>
                        <p class="timeline-meta">${item.client}</p>
                        <p class="timeline-meta">
                            ${item.start ? `Début: ${formatDate(item.start)}` : ''}${item.start && item.end ? ' • ' : ''}${item.end ? `Fin: ${formatDate(item.end)}` : ''}
                        </p>
                    </div>
                </a>
            `).join('');
        }

        function isOverdue(project, today = new Date()) {
            if (!project.end_date) return false;
            const end = new Date(project.end_date);
            const status = (project.status || '').toLowerCase();
            return end < today && !['completed', 'cancelled'].includes(status);
        }

        function countOverdue(projects) {
            return projects.filter(p => isOverdue(p)).length;
        }

        function countRecentProjects(projects, days = 30) {
            const now = new Date();
            const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            return projects.filter(p => p.created_at && new Date(p.created_at) >= start).length;
        }

        function formatStatus(status) {
            switch ((status || '').toLowerCase()) {
                case 'in_progress': return 'En cours';
                case 'planning': return 'Planning';
                case 'paused': return 'En pause';
                case 'completed': return 'Complété';
                case 'cancelled': return 'Annulé';
                case 'active': return 'Actif';
                default: return 'Actif';
            }
        }

        function formatDate(value) {
            if (!value) return '—';
            return new Date(value).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }

        function formatDateTime(value) {
            if (!value) return '—';
            return new Date(value).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        window.logout = async function() {
            const ok = await confirmAction('Êtes-vous sûr de vouloir vous déconnecter ?');
            if (!ok) return;
            await AuthService.logout();
            window.location.href = 'login.html';
        };

        window.addEventListener('beforeunload', () => {
            try {
                unsubscribeAdminEvents?.();
            } catch (error) {
                console.error('dashboard unsubscribe error:', error);
            }
        });

        window.addEventListener('load', initialize);
    