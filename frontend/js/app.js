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
    case 'index.html':
    case '':
      handleHomePage();
      break;
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
    case 'booking-confirmation.html':
      handleBookingConfirmationPage();
      break;
    case 'ticket-details.html':
      handleTicketDetailsPage();
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
    
    // Identity fields
    const dateOfBirth = document.getElementById('reg-dob')?.value;
    const panNumber = document.getElementById('reg-pan')?.value;
    const aadhaarNumber = document.getElementById('reg-aadhaar')?.value;
    const guardianPanNumber = document.getElementById('reg-gpan')?.value;

    const payload = { name, email, phone, password, dateOfBirth };
    if (panNumber) payload.panNumber = panNumber;
    if (aadhaarNumber) payload.aadhaarNumber = aadhaarNumber;
    if (guardianPanNumber) payload.guardianPanNumber = guardianPanNumber;

    try {
      const data = await AuthAPI.register(payload);
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
            ${!isCancelled ? `<button class="text-sm text-red-500 hover:text-red-700 font-semibold" onclick="window.cancelBooking('${booking.id}')">Cancel</button>` : ''}
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

    // Update profile top area
    const nameEls = document.querySelectorAll('h2.text-2xl, h3.text-2xl');
    nameEls.forEach(el => {
      if (el.textContent.includes('John') || el.textContent.includes('User')) {
        el.textContent = user.name;
      }
    });

    // Populate standard Personal Info form
    const inputs = document.querySelectorAll('#personal-info input');
    if (inputs.length >= 4) {
        const names = user.name.split(' ');
        inputs[0].value = names[0] || '';
        inputs[1].value = names.slice(1).join(' ') || '';
        inputs[2].value = user.email || '';
        inputs[3].value = user.phone || '';
    }

    // --- KYC / Identity Verification Handling ---
    const badge = document.getElementById('kyc-status-badge');
    const uploadFormContainer = document.getElementById('kyc-upload-container');
    const verifiedContainer = document.getElementById('kyc-verified-container');
    const pendingContainer = document.getElementById('kyc-pending-container');
    
    if (badge) {
        let status = user.idVerificationStatus || 'unverified';
        
        // Hide all initially
        if(uploadFormContainer) uploadFormContainer.classList.add('hidden');
        if(verifiedContainer) verifiedContainer.classList.add('hidden');
        if(pendingContainer) pendingContainer.classList.add('hidden');

        if (status === 'verified') {
            badge.textContent = 'Verified';
            badge.className = 'px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider';
            if(verifiedContainer) verifiedContainer.classList.remove('hidden');
        } else if (status === 'pending') {
            badge.textContent = 'Pending Review';
            badge.className = 'px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider';
            if(pendingContainer) pendingContainer.classList.remove('hidden');
        } else {
            badge.textContent = 'Unverified (Action Required)';
            badge.className = 'px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider';
            if(uploadFormContainer) uploadFormContainer.classList.remove('hidden');
        }
        
        // Handle Upload Form Submit
        const kycForm = document.getElementById('kyc-upload-form');
        if (kycForm) {
            kycForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fileInput = document.getElementById('kyc-file-input');
                if (!fileInput.files.length) return;
                
                const file = fileInput.files[0];
                if (file.size > 2 * 1024 * 1024) {
                    showToast('File size must be under 2MB', 'error');
                    return;
                }

                const submitBtn = kycForm.querySelector('button');
                const stopLoading = showLoading(submitBtn);

                // Convert file to base64
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = async () => {
                   try {
                       const selectedDocType = document.getElementById('kyc-doc-type')?.value || 'PAN_CARD';
                       await AuthAPI.uploadId({
                           idDocumentType: selectedDocType,
                           idDocumentBase64: reader.result
                       });
                       showToast('ID Document uploaded successfully! Pending review.');
                       setTimeout(() => window.location.reload(), 1500);
                   } catch (err) {
                       showToast(err.message, 'error');
                       stopLoading();
                   }
                };
            });
        }
    }

    // Update wallet balance if visible
    try {
      const walletData = await WalletAPI.getBalance();
      const balanceEls = document.querySelectorAll('[data-wallet-balance]');
      balanceEls.forEach(el => {
        el.textContent = `₹${walletData.balance} e-INR`;
      });
    } catch (wErr) {
      console.log('Wallet not available:', wErr.message);
    }
  } catch (err) {
    console.log('Profile processing error:', err.message);
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

  const MAX_SEATS = 2; // Hard cap per booking rules
  let selectedSeats = [];

  // --- Populate event info in the summary panel ---
  const titleEl = document.getElementById('booking-event-title');
  const catEl = document.getElementById('booking-event-category');
  if (titleEl) titleEl.textContent = eventData.title;
  if (catEl) catEl.textContent = eventData.category || 'Event';

  // Breadcrumb update
  const breadcrumb = document.querySelector('nav .text-primary');
  if (breadcrumb) breadcrumb.textContent = eventData.title;

  // --- Generate Interactive Seat Grid ---
  const gridContainer = document.getElementById('seat-grid-container');
  if (gridContainer) {
    const totalSeats = eventData.totalSeats || eventData.availableSeats || 32;
    const availableCount = eventData.availableSeats || totalSeats;
    const seatsPerRow = 8;
    const rows = Math.ceil(totalSeats / seatsPerRow);
    const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Randomly mark some seats as occupied for visual realism
    const occupiedCount = totalSeats - availableCount;
    const occupiedSet = new Set();
    while (occupiedSet.size < occupiedCount) {
      occupiedSet.add(Math.floor(Math.random() * totalSeats));
    }

    let gridHTML = '<div class="flex flex-col gap-3 min-w-[600px] items-center">';
    for (let r = 0; r < rows; r++) {
      const rowLabel = rowLabels[r] || String(r + 1);
      gridHTML += `<div class="flex items-center gap-2">
        <span class="w-6 text-xs font-bold text-slate-400">${rowLabel}</span>
        <div class="flex gap-2">`;

      for (let c = 1; c <= seatsPerRow; c++) {
        const seatIndex = r * seatsPerRow + (c - 1);
        if (seatIndex >= totalSeats) break;

        // Add an aisle gap after seat 2 and before seat 7
        if (c === 3 || c === 7) {
          gridHTML += '<div class="w-4"></div>';
        }

        const seatId = `${rowLabel}${c}`;
        const isOccupied = occupiedSet.has(seatIndex);

        if (isOccupied) {
          gridHTML += `<button disabled class="seat-btn w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed flex items-center justify-center text-xs font-bold" data-seat="${seatId}" data-status="occupied" title="Occupied">${c}</button>`;
        } else {
          gridHTML += `<button class="seat-btn w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-bold hover:border-primary hover:text-primary transition-all hover:scale-110" data-seat="${seatId}" data-status="available" title="${seatId}">${c}</button>`;
        }
      }

      gridHTML += '</div></div>';
    }
    gridHTML += '</div>';
    gridContainer.innerHTML = gridHTML;

    // --- Click handler for seat buttons ---
    gridContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.seat-btn');
      if (!btn || btn.disabled) return;

      const seatId = btn.dataset.seat;
      const status = btn.dataset.status;

      if (status === 'selected') {
        // Deselect
        selectedSeats = selectedSeats.filter(s => s !== seatId);
        btn.dataset.status = 'available';
        btn.className = 'seat-btn w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-bold hover:border-primary hover:text-primary transition-all hover:scale-110';
      } else if (status === 'available') {
        if (selectedSeats.length >= MAX_SEATS) {
          showToast(`Maximum ${MAX_SEATS} seats per booking allowed.`, 'error');
          return;
        }
        // Select
        selectedSeats.push(seatId);
        btn.dataset.status = 'selected';
        btn.className = 'seat-btn w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-bold transition-all scale-110 ring-2 ring-primary/30 shadow-lg shadow-primary/20';
      }

      updateBookingSummary();
      renderPassengerForms();
    });
  }

  // --- Update Booking Summary Panel ---
  function updateBookingSummary() {
    const count = selectedSeats.length;
    const price = eventData.price || 0;
    const total = count * price;

    const countEl = document.getElementById('seat-count-display');
    const seatsListEl = document.getElementById('selected-seats-list');
    const priceLineEl = document.getElementById('booking-price-line');
    const subtotalEl = document.getElementById('booking-price-subtotal');
    const totalEl = document.getElementById('booking-total-amount');

    if (countEl) countEl.textContent = count;
    if (seatsListEl) {
      seatsListEl.innerHTML = count === 0
        ? '<span class="text-xs text-slate-400 italic">Click seats on the map to select</span>'
        : selectedSeats.map(s => `<span class="bg-primary/10 text-primary px-2.5 py-1 rounded-lg text-xs font-bold">${s}</span>`).join('');
    }
    if (priceLineEl) priceLineEl.textContent = `Price (${count} × ₹${price})`;
    if (subtotalEl) subtotalEl.textContent = `₹${total}`;
    if (totalEl) totalEl.textContent = `₹${total}`;
  }

  // --- Render Passenger Forms ---
  const container = document.getElementById('passenger-forms-container');
  function renderPassengerForms() {
    if (!container) return;
    if (selectedSeats.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-500 italic">Please select seats first.</p>';
      return;
    }
    container.innerHTML = '';
    selectedSeats.forEach((seat, idx) => {
      const div = document.createElement('div');
      div.className = 'p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3';
      div.innerHTML = `
        <p class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span class="material-symbols-outlined text-primary text-sm">event_seat</span> Seat ${seat}
        </p>
        <input type="text" id="pass-name-${idx}" placeholder="Full Name" class="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 py-2 px-3 focus:ring-primary focus:border-primary" required>
        <div class="flex gap-2">
            <select id="pass-idType-${idx}" class="w-1/3 text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 py-2 focus:ring-primary focus:border-primary">
                <option value="PAN">PAN</option>
                <option value="Aadhaar">Aadhaar</option>
            </select>
            <input type="text" id="pass-idHash-${idx}" placeholder="ID Number" class="w-2/3 text-xs rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 py-2 px-3 focus:ring-primary focus:border-primary uppercase" required>
        </div>
      `;
      container.appendChild(div);
    });
  }

  // --- Proceed to Payment ---
  const btn = document.getElementById('proceed-to-pay-btn');
  if (btn) {
    btn.onclick = async (e) => {
      e.preventDefault();

      if (selectedSeats.length === 0) {
        showToast('Please select at least one seat.', 'error');
        return;
      }

      // Collect and validate passengers
      const passengers = [];
      for (let i = 0; i < selectedSeats.length; i++) {
        const name = document.getElementById(`pass-name-${i}`)?.value.trim();
        const idType = document.getElementById(`pass-idType-${i}`)?.value;
        const rawId = document.getElementById(`pass-idHash-${i}`)?.value.trim().toUpperCase();

        if (!name || !rawId) {
          showToast(`Please fill all details for Seat ${selectedSeats[i]}`, 'error');
          return;
        }

        // Validate format on the client side
        if (idType === 'PAN' && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(rawId)) {
          showToast(`Invalid PAN format for ${name}. Expected: ABCDE1234F`, 'error');
          return;
        }
        if (idType === 'Aadhaar' && !/^\d{12}$/.test(rawId)) {
          showToast(`Invalid Aadhaar format for ${name}. Must be 12 digits.`, 'error');
          return;
        }

        passengers.push({ name, idType, idHash: rawId });
      }

      sessionStorage.setItem('apna_booking', JSON.stringify({
        eventId: eventData.id,
        eventTitle: eventData.title,
        price: eventData.price,
        seats: selectedSeats,
        passengers: passengers
      }));
      window.location.href = 'payment.html';
    };
  }
}

// ─── PAYMENT PAGE ───────────────────────────────────────────────
async function handlePaymentPage() {
  if (!requireAuth()) return;

  const bookingState = JSON.parse(sessionStorage.getItem('apna_booking'));
  if (!bookingState) {
      showToast('No booking found in session.', 'error');
      setTimeout(() => window.location.href = 'events.html', 1500);
      return;
  }

  const total = bookingState.price * bookingState.seats.length;
  
  // Update order summary amounts (fallback for template classes)
  const amountEls = document.querySelectorAll('.font-bold.text-slate-900, .text-xl.font-black, .text-3xl.font-black');
  amountEls.forEach(el => {
    if(el.textContent.includes('$') || el.textContent.includes('Amount')) {
      el.textContent = `₹${total} e-INR`;
    }
  });

  // Set the big pay button amount
  const payBtnAmount = document.getElementById('pay-btn-amount');
  if (payBtnAmount) payBtnAmount.textContent = total.toFixed(2);

  const balanceDisplay = document.getElementById('wallet-balance-display');
  const alertInsufficient = document.getElementById('insufficient-funds-alert');
  const topupContainer = document.getElementById('topup-container');
  const payBtn = document.getElementById('btn-pay-now');
  const topupInput = document.getElementById('topup-amount');
  const topupBtn = document.getElementById('btn-topup');

  let currentBalance = 0;

  async function checkBalance() {
      try {
          const data = await WalletAPI.getBalance();
          currentBalance = data.balance || 0;
          
          if (balanceDisplay) {
              balanceDisplay.innerHTML = `₹${currentBalance.toLocaleString()} <span class="text-sm font-bold text-slate-500">e-INR</span>`;
          }

          if (currentBalance < total) {
              if (alertInsufficient) alertInsufficient.classList.remove('hidden');
              if (topupContainer) topupContainer.classList.remove('hidden');
              if (payBtn) payBtn.disabled = true;
          } else {
              if (alertInsufficient) alertInsufficient.classList.add('hidden');
              if (topupContainer) topupContainer.classList.add('hidden');
              if (payBtn) payBtn.disabled = false;
          }
      } catch (err) {
          console.error("Failed to fetch wallet balance:", err);
      }
  }

  // Initial balance check
  await checkBalance();

  // Handle Top-up
  if (topupBtn) {
      topupBtn.addEventListener('click', async () => {
          const amount = parseFloat(topupInput.value);
          if (!amount || amount <= 0) {
              showToast('Enter a valid top-up amount', 'warning');
              return;
          }
          
          const stopLoading = showLoading(topupBtn);
          try {
              await WalletAPI.topup(amount);
              showToast(`Successfully added ₹${amount} to your E-Rupee wallet!`);
              topupInput.value = '';
              await checkBalance(); // Re-evaluates Pay button state
          } catch (err) {
              showToast(err.message, 'error');
          } finally {
              stopLoading();
          }
      });
  }

  // Handle Checkout
  const form = document.getElementById('payment-form');
  if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (currentBalance < total) {
            showToast('Insufficient funds. Please top up your wallet first.', 'error');
            return;
        }

        const stopLoading = showLoading(payBtn);
        try {
          // Hash passenger IDs before sending to the API
          const hashedPassengers = await Promise.all(
            bookingState.passengers.map(async (p) => ({
              ...p,
              idHash: await sha256Hash(p.idHash)
            }))
          );
          const secureBooking = { ...bookingState, passengers: hashedPassengers };

          const data = await BookingsAPI.create(secureBooking);
          showToast('Payment successful! Booking confirmed! 🎉');
          sessionStorage.setItem('apna_last_booking', JSON.stringify(data.booking));
          sessionStorage.removeItem('apna_booking');
          setTimeout(() => {
            window.location.href = 'booking-confirmation.html';
          }, 1500);
        } catch (err) {
          showToast(err.message, 'error');
          stopLoading();
        }
      });
  }
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
    console.log('Admin dashboard stats fetch failed:', err.message);
  }

  // Fetch Pending Verifications
  try {
      const pendingData = await AdminAPI.getPendingVerifications();
      const listContainer = document.getElementById('pending-verifications-list');
      const countBudge = document.getElementById('pending-kyc-count');
      
      if(listContainer && pendingData.users) {
          countBudge.textContent = pendingData.users.length;
          listContainer.innerHTML = '';
          if(pendingData.users.length === 0) {
              listContainer.innerHTML = '<div class="p-6 text-center text-sm text-slate-500 italic">No pending verifications.</div>';
          } else {
              pendingData.users.forEach(u => {
                 listContainer.innerHTML += `
                    <div class="p-4 flex flex-col gap-3">
                        <div class="flex justify-between items-start">
                            <div class="flex items-center gap-3">
                                <div class="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold uppercase">${u.name.charAt(0)}</div>
                                <div>
                                    <p class="font-bold text-sm text-slate-900 dark:text-white">${u.name}</p>
                                    <p class="text-[10px] text-slate-500">${u.email} | ID: ${u.idDocumentType}</p>
                                </div>
                            </div>
                            <span class="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">${u.panMasked || u.aadhaarMasked || '***'}</span>
                        </div>
                        ${u.idDocumentUrl ? `
                        <div class="w-full h-32 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative group">
                            <img src="${u.idDocumentUrl}" class="w-full h-full object-cover" alt="ID Document"/>
                            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                               <a href="${u.idDocumentUrl}" target="_blank" class="text-white hover:text-primary"><span class="material-symbols-outlined">zoom_in</span></a>
                            </div>
                        </div>` : '<div class="text-xs text-red-500 italic">No document image provided</div>'}
                        <div class="grid grid-cols-2 gap-2 mt-2">
                            <button onclick="window.verifyUser('${u.id}', 'approve')" class="py-1.5 rounded bg-success/10 text-success text-xs font-bold hover:bg-success hover:text-white transition-colors">Approve</button>
                            <button onclick="window.verifyUser('${u.id}', 'reject')" class="py-1.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold hover:bg-red-500 hover:text-white transition-colors">Reject</button>
                        </div>
                    </div>
                 `; 
              });
          }
      }
  } catch (err) {
      console.log('Pending verifications fetch failed', err.message);
  }

  // Fetch Anomalies
  try {
      const anomaliesData = await AdminAPI.getAnomalies();
      const anomaliesList = document.getElementById('anomalies-list');
      
      if(anomaliesList && anomaliesData.anomalies) {
          anomaliesList.innerHTML = '';
          if(anomaliesData.anomalies.length === 0) {
              anomaliesList.innerHTML = '<div class="p-6 text-center text-sm text-success font-semibold flex items-center justify-center gap-2"><span class="material-symbols-outlined">shield</span> No anomalies detected.</div>';
          } else {
              anomaliesData.anomalies.forEach(anomaly => {
                  let icon = 'warning';
                  switch(anomaly.type) {
                      case 'EXCESSIVE_BOOKINGS': icon = 'local_activity'; break;
                      case 'DUPLICATE_PANS': icon = 'admin_panel_settings'; break;
                      case 'UNVERIFIED_BOOKER': icon = 'gpp_bad'; break;
                  }

                  anomaliesList.innerHTML += `
                     <div class="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg flex items-start gap-3">
                         <span class="material-symbols-outlined text-red-500 mt-0.5">${icon}</span>
                         <div>
                             <p class="text-sm font-bold text-slate-900 dark:text-red-100">${anomaly.type.replace(/_/g, ' ')}</p>
                             <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">${anomaly.details || 'No details'}</p>
                             <p class="text-[10px] text-slate-500 mt-1 font-mono">${new Date(anomaly.detectedAt).toLocaleString()}</p>
                         </div>
                     </div>
                  `;
              });
          }
      }
  } catch (err) {
      console.log('Anomalies fetch failed', err.message);
  }
}

// Global hook for the onclick handlers in generated HTML
window.verifyUser = async function(userId, action) {
    if(!confirm(`Are you sure you want to ${action} this ID?`)) return;
    try {
        await AuthAPI.verifyId(userId, action);
        showToast(`User ${action === 'approve'? 'approved' : 'rejected'} successfully.`);
        setTimeout(() => handleAdminDashboard(), 1000); // Reload sections
    } catch(err) {
        showToast(err.message, 'error');
    }
}

// Global cancel booking handler for My Bookings page
window.cancelBooking = async function(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking? The e-INR amount will be refunded to your wallet.')) return;
    try {
        await BookingsAPI.cancel(bookingId);
        showToast('Booking cancelled. e-INR refunded to your wallet.');
        setTimeout(() => window.location.reload(), 1000);
    } catch(err) {
        showToast(err.message, 'error');
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

// ─── HOMEPAGE (Auth-aware nav) ──────────────────────────────────
function handleHomePage() {
  const authBtn = document.getElementById('header-auth-btn');
  const authContainer = document.getElementById('header-auth-container');
  if (!authBtn || !authContainer) return;

  if (isLoggedIn()) {
    const user = JSON.parse(localStorage.getItem('apnaticket_user') || '{}');
    const name = user.name?.split(' ')[0] || 'User';
    const isAdminUser = user.role === 'admin';

    // Replace Login/Register with user dropdown
    authBtn.outerHTML = `
      <div class="hidden sm:flex items-center gap-3">
        <a href="my-bookings.html" class="text-sm font-medium text-slate-600 hover:text-primary transition-colors flex items-center gap-1">
          <span class="material-symbols-outlined text-lg">confirmation_number</span>My Bookings
        </a>
        <div class="relative" id="user-dropdown-wrapper">
          <button onclick="document.getElementById('user-dropdown').classList.toggle('hidden')" class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary/90">
            <span class="material-symbols-outlined text-lg">person</span>${name}
            <span class="material-symbols-outlined text-sm">expand_more</span>
          </button>
          <div id="user-dropdown" class="hidden absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-50">
            <a href="user-dashboard.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-colors">
              <span class="material-symbols-outlined text-lg">dashboard</span>Dashboard
            </a>
            <a href="user-profile.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-colors">
              <span class="material-symbols-outlined text-lg">person</span>Profile & KYC
            </a>
            <a href="my-bookings.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-colors">
              <span class="material-symbols-outlined text-lg">receipt_long</span>My Bookings
            </a>
            ${isAdminUser ? `<a href="admin-dashboard.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-colors">
              <span class="material-symbols-outlined text-lg">admin_panel_settings</span>Admin Panel
            </a>` : ''}
            <div class="border-t border-slate-100 dark:border-slate-800 my-1"></div>
            <button onclick="AuthAPI.logout(); window.location.reload();" class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <span class="material-symbols-outlined text-lg">logout</span>Logout
            </button>
          </div>
        </div>
      </div>
    `;

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const wrapper = document.getElementById('user-dropdown-wrapper');
      const dropdown = document.getElementById('user-dropdown');
      if (wrapper && dropdown && !wrapper.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  handleGenericForms();
}

// ─── BOOKING CONFIRMATION PAGE ──────────────────────────────────
function handleBookingConfirmationPage() {
  const lastBooking = JSON.parse(sessionStorage.getItem('apna_last_booking') || 'null');
  
  if (lastBooking) {
    // Populate dynamic data into the confirmation page
    const titleEl = document.querySelector('h3.text-xl');
    if (titleEl) titleEl.textContent = lastBooking.eventTitle || 'Event Booking';

    const orderIdEl = document.querySelector('.font-bold.tracking-tight');
    if (orderIdEl) orderIdEl.textContent = `#${lastBooking.id || 'AT-000000'}`;

    const seatsEl = document.querySelectorAll('.font-bold')[3];
    if (seatsEl && lastBooking.seats) seatsEl.textContent = lastBooking.seats.join(', ');

    const amountEl = document.querySelectorAll('.font-bold')[4];
    if (amountEl && lastBooking.totalAmount) amountEl.textContent = `₹${lastBooking.totalAmount} e-INR`;
    
    const paymentEl = document.querySelectorAll('.font-bold')[5];
    if (paymentEl) paymentEl.textContent = 'e-INR Wallet';
  }

  // Wire up "Download Ticket" button
  const downloadBtns = document.querySelectorAll('button');
  downloadBtns.forEach(btn => {
    if (btn.textContent.includes('Download Ticket')) {
      btn.addEventListener('click', () => downloadTicketAsPrintable(lastBooking));
    }
    if (btn.textContent.includes('View All Bookings')) {
      btn.onclick = () => window.location.href = 'my-bookings.html';
    }
  });
}

// ─── TICKET DETAILS PAGE ────────────────────────────────────────
async function handleTicketDetailsPage() {
  if (!requireAuth()) return;

  // Get booking ID from URL or sessionStorage
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('id');
  const lastBooking = JSON.parse(sessionStorage.getItem('apna_last_booking') || 'null');

  if (!bookingId && !lastBooking) {
    showToast('No booking found. Redirecting...', 'error');
    setTimeout(() => window.location.href = 'my-bookings.html', 1500);
    return;
  }

  const targetId = bookingId || lastBooking?.id;

  try {
    // Fetch the ticket (QR code) from the API
    const data = await TicketsAPI.getTicket(targetId);
    const ticket = data.ticket;

    // Update event title
    const titleEl = document.querySelector('h1.text-2xl');
    if (titleEl) titleEl.textContent = ticket.eventTitle || 'Event';

    // Update booking ID
    const idEl = document.querySelector('.font-bold.text-lg');
    if (idEl) idEl.textContent = `#${ticket.bookingId}`;

    // Update seat info
    const seatEls = document.querySelectorAll('.font-bold.text-lg');
    if (seatEls[0]) seatEls[0].textContent = ticket.seats?.join(', ') || 'N/A';

    // Load the real QR code from the API
    if (ticket.qrCode) {
      const qrImg = document.querySelector('img[alt="Ticket Entry QR Code"]');
      if (qrImg) {
        qrImg.src = ticket.qrCode;
        qrImg.alt = 'Scan this QR code for entry — contains full ticket details in JSON';
      }
    }

    // Update status badge
    const statusBadge = document.querySelector('.bg-green-500');
    if (statusBadge) statusBadge.textContent = ticket.status || 'Confirmed';

    // Wire download button
    const downloadBtns = document.querySelectorAll('button');
    downloadBtns.forEach(btn => {
      if (btn.textContent.includes('Download PDF')) {
        btn.addEventListener('click', () => downloadTicketAsPrintable({
          id: ticket.bookingId,
          eventTitle: ticket.eventTitle,
          seats: ticket.seats,
          passengers: ticket.passengers,
          qrCode: ticket.qrCode,
        }));
      }
    });

  } catch (err) {
    console.error('Failed to load ticket:', err);
    // If API fails, try to use sessionStorage data
    if (lastBooking) {
      showToast('Loaded from local data. QR may not reflect latest.', 'warning');
    } else {
      showToast('Failed to load ticket details: ' + err.message, 'error');
    }
  }
}

// ─── DOWNLOAD TICKET UTILITY ────────────────────────────────────
function downloadTicketAsPrintable(booking) {
  if (!booking) {
    showToast('No booking data available to download.', 'error');
    return;
  }

  const ticketHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>APNATICKET - E-Ticket #${booking.id || 'N/A'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; padding: 40px; }
        .ticket { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 24px 32px; }
        .header h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { opacity: 0.8; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px; }
        .body { padding: 32px; }
        .event-title { font-size: 22px; font-weight: 700; color: #1e1b4b; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px dashed #e2e8f0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .info-item label { display: block; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 4px; }
        .info-item value { display: block; font-size: 15px; color: #1e293b; font-weight: 600; }
        .passengers { margin-top: 20px; }
        .passengers h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 700; margin-bottom: 12px; }
        .passenger { background: #f8fafc; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; display: flex; justify-content: space-between; }
        .passenger .name { font-weight: 600; color: #1e293b; }
        .passenger .id-type { font-size: 12px; color: #64748b; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; }
        .qr-section { text-align: center; padding: 24px; background: #f8fafc; border-top: 2px dashed #e2e8f0; }
        .qr-section img { width: 200px; height: 200px; margin: 0 auto 12px; }
        .qr-section p { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; font-weight: 700; }
        .footer { text-align: center; padding: 16px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        @media print { body { padding: 0; background: white; } .ticket { box-shadow: none; } }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="header">
          <h1>🎫 APNATICKET</h1>
          <p>Electronic Ticket</p>
        </div>
        <div class="body">
          <div class="event-title">${booking.eventTitle || 'Event'}</div>
          <div class="info-grid">
            <div class="info-item">
              <label>Booking ID</label>
              <value>${booking.id || 'N/A'}</value>
            </div>
            <div class="info-item">
              <label>Seats</label>
              <value>${booking.seats?.join(', ') || 'N/A'}</value>
            </div>
            <div class="info-item">
              <label>Total Amount</label>
              <value>₹${booking.totalAmount || 'N/A'} e-INR</value>
            </div>
            <div class="info-item">
              <label>Status</label>
              <value>✅ CONFIRMED</value>
            </div>
          </div>
          ${booking.passengers ? `
          <div class="passengers">
            <h3>Passengers</h3>
            ${booking.passengers.map(p => `
              <div class="passenger">
                <span class="name">${p.name}</span>
                <span class="id-type">${p.idType || 'ID'}</span>
              </div>
            `).join('')}
          </div>` : ''}
        </div>
        ${booking.qrCode ? `
        <div class="qr-section">
          <img src="${booking.qrCode}" alt="Entry QR Code"/>
          <p>Scan at venue entrance for entry</p>
        </div>` : ''}
        <div class="footer">
          © 2024 APNATICKET Inc. — This is a computer-generated e-ticket. No signature required.
        </div>
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;

  const blob = new Blob([ticketHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  // Direct download as HTML file
  const a = document.createElement('a');
  a.href = url;
  a.download = `APNATICKET_${booking.id || 'ticket'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Ticket downloaded! Open the file to view or print.');
}
