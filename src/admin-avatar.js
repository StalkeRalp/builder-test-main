import AuthService from './auth-service.js';
import ProfileService from './profile-service.js';

export async function initAdminAvatar() {
    const avatarEl = document.getElementById('userInitials');
    if (!avatarEl) return;

    await AuthService.authReady;
    if (!AuthService.currentUser) return;

    const profile = await ProfileService.getAdminProfile();
    if (profile && profile.photo_url) {
        avatarEl.innerHTML = `<img src="${profile.photo_url}" alt="Admin" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        return;
    }

    const initials = AuthService.currentUser.email.substring(0, 2).toUpperCase();
    avatarEl.textContent = initials;
}
