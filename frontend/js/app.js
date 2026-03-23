// app.js - Frontend Routing, API Integration, and Page Logic
// Depends on api.js being loaded first

document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop() || 'index.html';

  // Add toast animation styles
  if (!document.getElementById('apna-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'apna-toast-styles';
    style.textContent = `
      @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; transform: translateY(-10px); } }
      .animate-spin { animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }

  // Update auth UI on every page
  updateAuthUI();

  // ─── Page-specific logic ──────────────────────────────────────
  switch (page) {
    case 'login.html':
      handleLoginPage();
      break;
    case 'admin-login.html':
      handleAdminLoginPage();
      break;
    case 'register.html':
      handleRegisterPage();
      break;
    case 'forgot-password.html':
      handleForgotPasswordPage();
      break;
    case 'events.html':
      handleEventsPage();
      break;
    case 'user-dashboard.html':
      handleUserDashboard();
      break;
    case 'my-bookings.html':
      handleMyBookings();
      break;
    case 'user-profile.html':
      handleUserProfile();
      break;
    case 'payment.html':
      handlePaymentPage();
      break;
    case 'admin-dashboard.html':
      handleAdminDashboard();
      break;
    case 'admin-events.html':
      handleAdminEvents();
      break;
    case 'admin-create-event.html':
      handleAdminCreateEvent();
      break;
    case 'admin-users.html':
      handleAdminUsers();
      break;
    case 'admin-bookings.html':
      handleAdminBookings();
      break;
    case 'admin-analytics.html':
      handleAdminAnalytics();
      break;
    case 'book-ticket.html':
      handleBookTicketPage();
      break;
    default:
      handleGenericForms();
      break;
  }
});

// ─── LOGIN PAGE ─────────────────────────────────────────────────
function handleLoginPage() {
  // Redirect if already logged in
  if (isLoggedIn()) {
    window.location.href = 'user-dashboard.html';
    return;
  }

  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const stopLoading = showLoading(submitBtn);

    const email = form.querySelector('input[type="email"]')?.value;
    const password = form.querySelector('input[type="password"]')?.value;

    try {
      const data = await AuthAPI.login({ email, password });
      showToast(`Welcome back, ${data.user.name}!`);
      setTimeout(() => {
        window.location.href = 'user-dashboard.html';
      }, 800);
    } catch (err) {
      showToast(err.message, 'error');
      stopLoading();
    }
  });
}

// ─── ADMIN LOGIN PAGE ───────────────────────────────────────────
function handleAdminLoginPage() {
  if (isLoggedIn() && isAdmin()) {
    window.location.href = 'admin-dashboard.html';
    return;
  }

  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const stopLoading = showLoading(submitBtn);

    const email = form.querySelector('input[type="email"]')?.value;
    const password = form.querySelector('input[type="password"]')?.value;

    try {
      const data = await AuthAPI.login({ email, password });
      if (data.user.role !== 'admin') {
        showToast('Access denied. Admin credentials required.', 'error');
        AuthAPI.logout();
        stopLoading();
        return;
      }
      showToast(`Welcome, Admin ${data.user.name}!`);
      setTimeout(() => {
        window.location.href = 'admin-dashboard.html';
      }, 800);
    } catch (err) {
      showToast(err.message, 'error');
      stopLoading();
    }
  });
}

// ─── REGISTER PAGE ──────────────────────────────────────────────
function handleRegisterPage() {
  if (isLoggedIn()) {
    window.location.href = 'user-dashboard.html';
    return;
  }

  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const stopLoading = showLoading(submitBtn);

    const name = form.querySelector('input[type="text"]')?.value;
    const email = form.querySelector('input[type="email"]')?.value;
    const phone = form.querySelector('input[type="tel"]')?.value;
    const password = form.querySelector('input[type="password"]')?.value;

    try {
      const data = await AuthAPI.register({ name, email, phone, password });
      showToast(`Account created! Welcome, ${data.user.name}!`);
      setTimeout(() => {
        window.location.href = 'user-dashboard.html';
      }, 800);
    } catch (err) {
      showToast(err.message, 'error');
      stopLoading();
    }
  });
}

// ─── FORGOT PASSWORD PAGE ───────────────────────────────────────
function handleForgotPasswordPage() {
  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const stopLoading = showLoading(submitBtn);

    const email = form.querySelector('input[type="email"]')?.value;

    try {
      await AuthAPI.forgotPassword(email);
      showToast('Password reset link sent to your email!');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } catch (err) {
      showToast(err.message, 'error');
      stopLoading();
    }
  });
}

// ─── EVENTS PAGE ────────────────────────────────────────────────
async function handleEventsPage() {
  try {
    const data = await EventsAPI.list();
    console.log('Events loaded:', data.total, 'events');
    const container = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3');
    if (!container) return;
    
    container.innerHTML = '';
    if (data.events.length === 0) {
      container.innerHTML = '<p class="col-span-full py-10 text-center text-slate-500">No events found.</p>';
      return;
    }

    data.events.forEach(event => {
      // Create a function to handle booking
      const bookBtnId = `btn-book-${event.id}`;
      const imageUrl = event.thumbnailUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpqxbo1Lw9XyaDw-a62RxlAZ7nunBE8Wm0T9mnJhWDFE_U3qHfxJC4s_hTLODdYuMjjclcrfzG4QYvD7BWXSCFUayTJzPB2jp2bteqkoc7Bgf2fNIf5WdKB0zNCOySBuEIa6HWGWmafnBzj8qtfN_ucdz4R_2Spe3mKo33uD12zVbSUIMwD41dOt-qtK4TaQR1jghKWYu0LXjTWwvRuet8Plq6QNlc2R7IJjsl_jzu8Mia6j7tK9FSgStGE8TSmY13oFspssnFitU';

      const card = document.createElement('div');
      card.className = 'group flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-200 dark:border-slate-700';
      card.innerHTML = `
        <div class="relative aspect-video overflow-hidden">
          <div class="absolute top-3 left-3 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-primary shadow-sm uppercase tracking-wider">${event.category || 'Event'}</div>
          <img alt="${event.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${imageUrl}"/>
        </div>
        <div class="p-5 flex flex-col gap-3 flex-1">
          <div class="flex justify-between items-start">
            <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">${event.title}</h3>
            <p class="text-primary font-black text-lg">₹${event.price}</p>
          </div>
          <div class="flex flex-col gap-1 flex-1">
            <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
              <span class="material-symbols-outlined text-base">calendar_today</span>
              <span>${new Date(event.date || event.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
              <span class="material-symbols-outlined text-base">confirmation_number</span>
              <span>${event.availableSeats} seats left</span>
            </div>
          </div>
          <button id="${bookBtnId}" class="mt-2 w-full py-2.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary font-bold hover:bg-primary hover:text-white transition-all">
              Get Tickets
          </button>
        </div>
      `;
      container.appendChild(card);

      document.getElementById(bookBtnId).addEventListener('click', () => {
        sessionStorage.setItem('apna_booking_event', JSON.stringify(event));
        window.location.href = 'book-ticket.html';
      });
    });

  } catch (err) {
    console.log('Events API not available:', err.message);
  }
}

// ─── USER DASHBOARD ─────────────────────────────────────────────
async function handleUserDashboard() {
  if (!requireAuth()) return;

  try {
    const profileData = await AuthAPI.getProfile();
    const user = profileData.user;

    // Update name in dashboard
    const welcomeEl = document.querySelector('h3.text-2xl');
    if (welcomeEl) {
      welcomeEl.textContent = `Welcome back, ${user.name?.split(' ')[0] || 'User'}!`;
    }

    // Update sidebar user info
    const sidebarName = document.querySelector('aside .text-sm.font-medium');
    if (sidebarName) sidebarName.textContent = user.name || 'User';

    // Load bookings count
    const bookingsData = await BookingsAPI.list();
    const upcoming = bookingsData.bookings.filter(b => b.status === 'confirmed').length;
    const past = bookingsData.bookings.filter(b => b.status === 'cancelled').length;

    const walletData = await WalletAPI.getBalance().catch(() => ({ balance: 0 }));

    const cards = document.querySelectorAll('h4.text-3xl');
    if (cards[0]) cards[0].textContent = String(upcoming).padStart(2, '0');
    if (cards[1]) cards[1].textContent = String(past).padStart(2, '0');
    
    // The wallet balance card uses an attribute
    const walletCard = document.querySelector('[data-wallet-balance]');
    if (walletCard) {
      walletCard.textContent = `₹${walletData.balance?.toLocaleString() || '0'} e-INR`;
    }

    console.log('Dashboard loaded with real data');
  } catch (err) {
    console.log('Dashboard using static data:', err.message);
  }
}

// ─── MY BOOKINGS ────────────────────────────────────────────────
async function handleMyBookings() {
  if (!requireAuth()) return;

  try {
    const data = await BookingsAPI.list();
    console.log('Bookings loaded:', data.total, 'bookings');
    
    // Find the table body or container and clear it
    const tbody = document.querySelector('tbody');
    if (tbody && data.bookings) {
      tbody.innerHTML = '';
      if (data.bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-slate-500">No bookings found.</td></tr>';
        return;
      }

      data.bookings.forEach(booking => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors';
        const isCancelled = booking.status === 'cancelled';
        const statusBadge = isCancelled 
            ? '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><span class="h-1.5 w-1.5 rounded-full bg-red-600"></span>Cancelled</span>'
            : '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><span class="h-1.5 w-1.5 rounded-full bg-green-600"></span>Confirmed</span>';

        tr.innerHTML = `
          <td class="px-6 py-4 text-sm font-mono text-slate-500">#${booking.id.split('_')[1] || booking.id.substring(0, 8)}</td>
          <td class="px-6 py-4">
            <span class="text-sm font-medium">${booking.eventTitle}</span><br>
            <span class="text-xs text-slate-500">${booking.seats.join(', ')}</span>
          </td>
          <td class="px-6 py-4 text-sm text-slate-500">${new Date(booking.createdAt).toLocaleDateString()}</td>
          <td class="px-6 py-4 text-sm font-bold">₹${booking.totalAmount} e-INR</td>
          <td class="px-6 py-4">${statusBadge}</td>
          <td class="px-6 py-4 text-right">
            ${!isCancelled ? `<button class="text-sm text-red-500 hover:text-red-700 font-semibold" onclick="AuthAPI.cancel('${booking.id}')">Cancel</button>` : ''}
            <button class="ml-3 text-sm text-primary font-semibold" onclick="window.location.href='ticket-details.html?id=${booking.id}'">View QR</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

  } catch (err) {
    console.log('Bookings API not available:', err.message);
  }
}

// ─── USER PROFILE ───────────────────────────────────────────────
async function handleUserProfile() {
  if (!requireAuth()) return;

  try {
    const profileData = await AuthAPI.getProfile();
    const user = profileData.user;

    // Update profile name/email in the page
    const nameEls = document.querySelectorAll('h2.text-2xl, h3.text-2xl');
    nameEls.forEach(el => {
      if (el.textContent.includes('John') || el.textContent.includes('User')) {
        el.textContent = user.name;
      }
    });

    // Update wallet balance if visible
    try {
      const walletData = await WalletAPI.getBalance();
      const balanceEls = document.querySelectorAll('[data-wallet-balance]');
      balanceEls.forEach(el => {
        el.textContent = `₹${walletData.balance} e-INR`;
      });
      console.log('Wallet balance:', walletData.balance, 'e-INR');
    } catch (wErr) {
      console.log('Wallet not available:', wErr.message);
    }
  } catch (err) {
    console.log('Profile using static data:', err.message);
  }
}

// ─── BOOK TICKET PAGE ───────────────────────────────────────────
function handleBookTicketPage() {
  if (!requireAuth()) return;

  const eventData = JSON.parse(sessionStorage.getItem('apna_booking_event'));
  if (!eventData) {
    showToast('No event selected. Redirecting...', 'error');
    setTimeout(() => window.location.href = 'events.html', 1500);
    return;
  }

  // Populate UI
  const titleEls = document.querySelectorAll('h1, h3', '.font-bold');
  if (titleEls[1]) titleEls[1].textContent = eventData.title; // Quick hack to set title in summary card
  
  // Set prices
  const priceEls = document.querySelectorAll('.font-medium.text-slate-900.dark\\:text-white, .font-black.text-primary');
  priceEls.forEach(el => {
    if(el.textContent.includes('$')) {
        if(el.classList.contains('text-xl')) el.textContent = `₹${eventData.price}`;
        else el.textContent = `₹${eventData.price}`;
    }
  });

  const btn = document.querySelector('button[onclick*="payment.html"]');
  if (btn) {
    btn.onclick = (e) => {
      e.preventDefault();
      // Store minimal state
      sessionStorage.setItem('apna_booking', JSON.stringify({
        eventId: eventData.id,
        eventTitle: eventData.title,
        price: eventData.price,
        seats: ['A1'], // MOCK: frontend seat selection not fully wired
        passengers: [{ name: getUser()?.name, idType: 'PAN', idHash: 'ABCD1234E' }]
      }));
      window.location.href = 'payment.html';
    };
  }
}

// ─── PAYMENT PAGE ───────────────────────────────────────────────
function handlePaymentPage() {
  if (!requireAuth()) return;

  const bookingState = JSON.parse(sessionStorage.getItem('apna_booking'));
  if (bookingState) {
    const total = bookingState.price * bookingState.seats.length;
    const amountEls = document.querySelectorAll('.font-bold.text-slate-900, .text-xl.font-black, .text-3xl.font-black');
    amountEls.forEach(el => {
      if(el.textContent.includes('$') || el.textContent.includes('Amount')) {
        el.textContent = `₹${total} e-INR`;
      }
    });
  }

  const form = document.querySelector('form');
  if (!form) {
    // Some payment pages might use the "Pay" button directly
    const payBtn = document.querySelector('button.w-full.bg-primary');
    if (payBtn) {
      payBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const stopLoading = showLoading(payBtn);
        
        try {
          if (!bookingState) throw new Error("No booking data found");
          const data = await BookingsAPI.create(bookingState);
          showToast('Booking confirmed! 🎉');
          sessionStorage.setItem('apna_last_booking', JSON.stringify(data.booking));
          sessionStorage.removeItem('apna_booking');
          setTimeout(() => { window.location.href = 'booking-confirmation.html'; }, 1000);
        } catch(err) {
          showToast(err.message, 'error');
          stopLoading();
        }
      });
    }
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const stopLoading = showLoading(submitBtn);

    try {
      if (!bookingState || !bookingState.eventId) throw new Error("No booking found in session.");
      const data = await BookingsAPI.create(bookingState);
      showToast('Booking confirmed! 🎉');
      sessionStorage.setItem('apna_last_booking', JSON.stringify(data.booking));
      sessionStorage.removeItem('apna_booking');
      setTimeout(() => {
        window.location.href = 'booking-confirmation.html';
      }, 1000);
    } catch (err) {
      showToast(err.message, 'error');
      stopLoading();
    }
  });
}

// ─── ADMIN DASHBOARD ────────────────────────────────────────────
async function handleAdminDashboard() {
  if (!requireAdmin()) return;

  try {
    const data = await AdminAPI.getDashboard();
    console.log('Admin dashboard stats:', data);

    // Update metric cards
    const metricValues = document.querySelectorAll('.text-2xl.font-bold');
    if (metricValues[0]) metricValues[0].textContent = `₹${data.totalSales?.toLocaleString() || '0'}`;
    if (metricValues[1]) metricValues[1].textContent = data.activeTickets?.toLocaleString() || '0';
    if (metricValues[2]) metricValues[2].textContent = data.totalUsers?.toLocaleString() || '0';
  } catch (err) {
    console.log('Admin dashboard using static data:', err.message);
  }
}

// ─── ADMIN EVENTS ───────────────────────────────────────────────
async function handleAdminEvents() {
  if (!requireAdmin()) return;

  try {
    const data = await EventsAPI.list();
    console.log('Admin events loaded:', data.total, 'events');
  } catch (err) {
    console.log('Events API not available:', err.message);
  }
}

// ─── ADMIN CREATE EVENT ─────────────────────────────────────────
function handleAdminCreateEvent() {
  if (!requireAdmin()) return;

  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const stopLoading = showLoading(submitBtn);

    // Gather form data
    const inputs = form.querySelectorAll('input, select, textarea');
    const eventData = {};
    inputs.forEach(input => {
      if (input.name) eventData[input.name] = input.value;
    });

    // Fallback field mapping
    if (!eventData.title) eventData.title = form.querySelector('input[placeholder*="name"], input[placeholder*="title"]')?.value || 'New Event';
    if (!eventData.category) eventData.category = form.querySelector('select')?.value || 'Concert';
    if (!eventData.date) eventData.date = form.querySelector('input[type="date"]')?.value || new Date().toISOString().split('T')[0];
    if (!eventData.price) eventData.price = 1000;
    if (!eventData.totalSeats) eventData.totalSeats = 100;

    try {
      const data = await EventsAPI.create(eventData);
      showToast('Event created successfully! 🎉');
      setTimeout(() => {
        window.location.href = 'admin-events.html';
      }, 1000);
    } catch (err) {
      showToast(err.message, 'error');
      stopLoading();
    }
  });
}

// ─── ADMIN USERS ────────────────────────────────────────────────
async function handleAdminUsers() {
  if (!requireAdmin()) return;

  try {
    const data = await AdminAPI.getUsers();
    console.log('Admin users loaded:', data.total, 'users');
  } catch (err) {
    console.log('Users API not available:', err.message);
  }
}

// ─── ADMIN BOOKINGS ────────────────────────────────────────────
async function handleAdminBookings() {
  if (!requireAdmin()) return;

  try {
    const data = await AdminAPI.getBookings();
    console.log('Admin bookings loaded:', data.total, 'bookings');
  } catch (err) {
    console.log('Admin bookings API not available:', err.message);
  }
}

// ─── ADMIN ANALYTICS ───────────────────────────────────────────
async function handleAdminAnalytics() {
  if (!requireAdmin()) return;

  try {
    const data = await AdminAPI.getAnalytics();
    console.log('Analytics loaded:', data);
  } catch (err) {
    console.log('Analytics API not available:', err.message);
  }
}

// ─── GENERIC FORM HANDLER ──────────────────────────────────────
function handleGenericForms() {
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const btnText = submitBtn ? submitBtn.textContent.trim().toLowerCase() : '';

      // Route based on context
      if (btnText.includes('subscribe')) {
        showToast('Subscribed to newsletter! 📧');
        return;
      }

      const action = form.getAttribute('action');
      if (action && action.endsWith('.html')) {
        window.location.href = action;
      } else {
        showToast('Action completed!');
      }
    });
  });
}
