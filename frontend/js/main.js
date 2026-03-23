// main.js - Shared UI logic for all pages

document.addEventListener('DOMContentLoaded', () => {
    console.log("ApnaTicket Frontend loaded!");

    // 1. Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('header button.md\\:hidden');
    const header = document.querySelector('header');
    
    let mobileMenu = null;
    
    if (mobileMenuBtn && header) {
        const nav = header.querySelector('nav');
        if (nav) {
            mobileMenu = document.createElement('div');
            mobileMenu.className = 'mobile-menu hidden fixed inset-x-0 top-16 bg-white dark:bg-background-dark border-b border-primary/10 shadow-lg p-4 flex flex-col gap-4 z-40';
            
            const navLinks = nav.cloneNode(true);
            navLinks.className = 'flex flex-col gap-4';
            
            mobileMenu.appendChild(navLinks);
            header.parentElement.insertBefore(mobileMenu, header.nextSibling);

            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
                const icon = mobileMenuBtn.querySelector('.material-symbols-outlined');
                if (icon) {
                    icon.textContent = mobileMenu.classList.contains('hidden') ? 'menu' : 'close';
                }
            });
        }
    }

    // 2. Highlight current page in navigation
    const currentPath = window.location.pathname.split('/').pop();
    if (currentPath) {
        const allLinks = document.querySelectorAll('nav a');
        allLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath) {
                link.classList.add('text-primary');
                link.classList.remove('text-slate-600', 'dark:text-slate-300');
            }
        });
    }

    // 3. Password visibility toggle
    document.querySelectorAll('input[type="password"]').forEach(input => {
        const toggleBtn = input.parentElement?.querySelector('button');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const icon = toggleBtn.querySelector('.material-symbols-outlined');
                if (input.type === 'password') {
                    input.type = 'text';
                    if (icon) icon.textContent = 'visibility_off';
                } else {
                    input.type = 'password';
                    if (icon) icon.textContent = 'visibility';
                }
            });
        }
    });

    // 4. Logout handler - find logout icons/buttons
    document.querySelectorAll('.material-symbols-outlined').forEach(icon => {
        if (icon.textContent.trim() === 'logout') {
            const clickTarget = icon.closest('div[class*="cursor-pointer"], button, a') || icon.parentElement;
            if (clickTarget) {
                clickTarget.style.cursor = 'pointer';
                clickTarget.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof AuthAPI !== 'undefined') {
                        AuthAPI.logout();
                    } else {
                        localStorage.removeItem('apnaticket_token');
                        localStorage.removeItem('apnaticket_user');
                        window.location.href = 'login.html';
                    }
                });
            }
        }
    });
});
