/**
 * Report Service - Supabase Edition
 * Generates reports and exports data
 */

import { supabase } from './supabase-client.js';

class ReportService {
    constructor() {
        this.reports = [];
    }

    /**
     * Get project statistics
     * @returns {Promise<Object>}
     */
    async getProjectStats() {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('status, progress');

            if (error) throw error;

            const projects = data || [];
            const stats = {
                total: projects.length,
                planning: projects.filter(p => p.status === 'planning').length,
                inProgress: projects.filter(p => p.status === 'in_progress').length,
                paused: projects.filter(p => p.status === 'paused').length,
                completed: projects.filter(p => p.status === 'completed').length,
                averageProgress: projects.length > 0 
                    ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
                    : 0
            };

            return stats;
        } catch (error) {
            console.error('Error getting stats:', error);
            return null;
        }
    }

    /**
     * Get projects in date range
     * @param {string} startDate 
     * @param {string} endDate 
     * @returns {Promise<Array>}
     */
    async getProjectsInRange(startDate, endDate) {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error fetching projects in range:', error);
            return [];
        }
    }

    /**
     * Get budget summary
     * @returns {Promise<Object>}
     */
    async getBudgetSummary() {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('budget, status');

            if (error) throw error;

            const projects = data || [];
            const summary = {
                totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
                projectCount: projects.length,
                averageBudget: projects.length > 0 
                    ? Math.round(projects.reduce((sum, p) => sum + (p.budget || 0), 0) / projects.length)
                    : 0,
                byStatus: {
                    planning: projects
                        .filter(p => p.status === 'planning')
                        .reduce((sum, p) => sum + (p.budget || 0), 0),
                    inProgress: projects
                        .filter(p => p.status === 'in_progress')
                        .reduce((sum, p) => sum + (p.budget || 0), 0),
                    completed: projects
                        .filter(p => p.status === 'completed')
                        .reduce((sum, p) => sum + (p.budget || 0), 0)
                }
            };

            return summary;
        } catch (error) {
            console.error('Error getting budget summary:', error);
            return null;
        }
    }

    /**
     * Export projects to CSV
     * @param {Array} projects 
     * @returns {string} CSV content
     */
    exportToCSV(projects) {
        if (!projects || projects.length === 0) {
            return '';
        }

        const headers = ['ID', 'Name', 'Type', 'Client', 'Email', 'Status', 'Progress', 'Budget (FCFA)', 'Start Date', 'End Date'];
        const rows = projects.map(p => [
            p.id,
            p.name,
            p.project_type,
            p.client_name,
            p.client_email,
            p.status,
            `${p.progress}%`,
            `FCFA ${p.budget}`,
            new Date(p.start_date).toLocaleDateString('fr-FR'),
            new Date(p.end_date).toLocaleDateString('fr-FR')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    }

    /**
     * Generate and download CSV
     * @param {Array} projects 
     * @param {string} filename 
     */
    downloadCSV(projects, filename = 'rapport_projets.csv') {
        const csv = this.exportToCSV(projects);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Get activity log for dashboard
     * @param {number} limit 
     * @returns {Promise<Array>}
     */
    async getActivityLog(limit = 50) {
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error fetching activity log:', error);
            return [];
        }
    }

    /**
     * Get status distribution for chart
     * @returns {Promise<Object>}
     */
    async getStatusDistribution() {
        try {
            const stats = await this.getProjectStats();
            return {
                planning: stats.planning,
                inProgress: stats.inProgress,
                paused: stats.paused,
                completed: stats.completed
            };
        } catch (error) {
            console.error('Error getting status distribution:', error);
            return null;
        }
    }
}

export default new ReportService();
