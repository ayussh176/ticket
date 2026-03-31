// api.js - APNATICKET API Service Layer
// Handles all communication between the frontend and the backend REST API.

const API_BASE = 'http://localhost:5000/api';

// ─── Token Management ──────────────────────────────────────────
function getToken() {
  return localStorage.getItem('apnaticket_token');
}

function setToken(token) {
  localStorage.setItem('apnaticket_token', token);
}

function removeToken() {
  localStorage.removeItem('apnaticket_token');
  localStorage.removeItem('apnaticket_user');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('apnaticket_user'));
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem('apnaticket_user', JSON.stringify(user));
}

function isLoggedIn() {
  return !!getToken();
}

function isAdmin() {
  const user = getUser();
  return user && user.role === 'admin';
}

// ─── HTTP Helper ────────────────────────────────────────────────
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Make sure the backend is running on port 5000.');
    }
    throw error;
  }
}

// ─── Auth API ───────────────────────────────────────────────────
const AuthAPI = {
  async register(payload) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  async login({ email, password }) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  async forgotPassword(email) {
    return await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async uploadId(data) {
    return await apiRequest('/auth/upload-id', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async verifyId(userId, action) {
    return await apiRequest('/auth/verify-id', {
      method: 'POST',
      body: JSON.stringify({ userId, action }),
    });
  },

  async getProfile() {
    return await apiRequest('/auth/me');
  },

  logout() {
    removeToken();
    window.location.href = 'login.html';
  },
};

// ─── Events API ─────────────────────────────────────────────────
const EventsAPI = {
  async list(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);
    if (filters.date) params.set('date', filters.date);
    const qs = params.toString();
    return await apiRequest(`/events${qs ? '?' + qs : ''}`);
  },

  async get(id) {
    return await apiRequest(`/events/${id}`);
  },

  async create(eventData) {
    return await apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  async update(id, eventData) {
    return await apiRequest(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  },

  async delete(id) {
    return await apiRequest(`/events/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── Bookings API ───────────────────────────────────────────────
const BookingsAPI = {
  async create({ eventId, seats, passengers }) {
    return await apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify({ eventId, seats, passengers }),
    });
  },

  async list() {
    return await apiRequest('/bookings');
  },

  async get(id) {
    return await apiRequest(`/bookings/${id}`);
  },

  async cancel(id) {
    return await apiRequest(`/bookings/${id}/cancel`, {
      method: 'PUT',
    });
  },
};

// ─── Wallet API ─────────────────────────────────────────────────
const WalletAPI = {
  async getBalance() {
    return await apiRequest('/wallet');
  },

  async topup(amount) {
    return await apiRequest('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },
};

// ─── Tickets API ────────────────────────────────────────────────
const TicketsAPI = {
  async getTicket(bookingId) {
    return await apiRequest(`/tickets/${bookingId}`);
  },

  async validate(qrPayload) {
    return await apiRequest('/tickets/validate', {
      method: 'POST',
      body: JSON.stringify({ qrPayload }),
    });
  },
};

// ─── Admin API ──────────────────────────────────────────────────
const AdminAPI = {
  async getDashboard() {
    return await apiRequest('/admin/dashboard');
  },

  async getUsers() {
    return await apiRequest('/admin/users');
  },

  async getBookings(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    const qs = params.toString();
    return await apiRequest(`/admin/bookings${qs ? '?' + qs : ''}`);
  },

  async getAnalytics() {
    return await apiRequest('/admin/analytics');
  },

  async getAuditLog() {
    return await apiRequest('/admin/audit-log');
  },

  async getAnomalies() {
    return await apiRequest('/admin/anomalies');
  },

  async getPendingVerifications() {
    return await apiRequest('/admin/pending-verifications');
  },
};

// ─── UI Helpers ─────────────────────────────────────────────────
function showToast(message, type = 'success') {
  // Remove existing toasts
  document.querySelectorAll('.apna-toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'apna-toast';
  const bgColor = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#f59e0b';
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'warning';
  toast.innerHTML = `
    <span class="material-symbols-outlined" style="font-size:20px">${icon}</span>
    <span>${message}</span>
  `;
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 9999;
    display: flex; align-items: center; gap: 8px;
    background: ${bgColor}; color: white;
    padding: 12px 20px; border-radius: 10px;
    font-size: 14px; font-weight: 600; font-family: Inter, sans-serif;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease-out;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showLoading(button) {
  const originalText = button.innerHTML;
  button.disabled = true;
  button.dataset.originalText = originalText;
  button.innerHTML = `<span class="material-symbols-outlined animate-spin" style="font-size:20px">progress_activity</span> Processing...`;
  return () => {
    button.disabled = false;
    button.innerHTML = originalText;
  };
}

// ─── Auth Guards ────────────────────────────────────────────────
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!isLoggedIn() || !isAdmin()) {
    window.location.href = 'admin-login.html';
    return false;
  }
  return true;
}

// --- Trains API (IRCTC Integration) ---
const TrainsAPI = {
  // Search trains between stations
  async searchTrainsBetweenStations(source, destination, date) {
    try {
      const resp = await fetch(`/api/trains/betweenStations?fromStationCode=${source}&toStationCode=${destination}&dateOfJourney=${date}`);
      if (!resp.ok) throw new Error('Failed to fetch trains');
      return await resp.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // Get live tracking
  async getLiveStation(stationCode, hours = 2) {
    try {
      const resp = await fetch(`/api/trains/liveStation?stationCode=${stationCode}&hours=${hours}`);
      if (!resp.ok) throw new Error('Failed to fetch live trains');
      return await resp.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // Get PNR status
  async getPNRStatus(pnr) {
    try {
      const resp = await fetch(`/api/trains/pnr?pnrNumber=${pnr}`);
      if (!resp.ok) throw new Error('Failed to fetch PNR');
      return await resp.json();
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
};

// Update UI based on login state (nav buttons, user name, etc.)
function updateAuthUI() {
  const user = getUser();
  const loginBtns = document.querySelectorAll('[onclick*="login.html"]');
  
  if (user) {
    loginBtns.forEach(btn => {
      btn.textContent = user.name?.split(' ')[0] || 'Profile';
      btn.setAttribute('onclick', "window.location.href='user-dashboard.html'");
    });

    // Update logout buttons
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        AuthAPI.logout();
      });
    });
  }
}
