// Toast Notification System
class ToastNotification {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 400px;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';

        // Type-specific styling
        const styles = {
            success: {
                bg: 'var(--color-emerald-500)',
                icon: '✓'
            },
            error: {
                bg: 'var(--color-error)',
                icon: '✗'
            },
            warning: {
                bg: 'var(--color-warning)',
                icon: '⚠'
            },
            info: {
                bg: 'var(--color-info)',
                icon: 'ℹ'
            }
        };

        const style = styles[type] || styles.info;

        toast.style.cssText = `
            background: ${style.bg};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: var(--font-body);
            font-size: 14px;
            font-weight: 600;
            animation: slideIn 0.3s ease-out;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        toast.innerHTML = `
            <span style="font-size: 20px; font-weight: bold;">${style.icon}</span>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">×</button>
        `;

        // Add hover effect
        toast.onmouseenter = () => {
            toast.style.transform = 'translateX(-4px)';
            toast.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.3)';
        };
        toast.onmouseleave = () => {
            toast.style.transform = 'translateX(0)';
            toast.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
        };

        this.container.appendChild(toast);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// Add animations to global styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export singleton instance
const Toast = new ToastNotification();
export default Toast;
