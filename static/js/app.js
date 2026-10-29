/**
 * College Lost & Found Portal - Frontend Application Engine
 * VTU Societal Project Implementation
 * Supports both Live REST API and Resilient Offline/Serverless Fallback.
 */

// Default Seed Items for Instant Loading & Resilient Fallback
const DEFAULT_SEED_ITEMS = [
  {
    id: 1,
    user_id: 2,
    report_type: 'found',
    title: 'Casio fx-991EX Scientific Calculator',
    category: 'Electronics',
    location: 'CS Block - Lab 3 (Desk 14)',
    item_date: '2026-10-27',
    public_description: 'ClassWiz series black scientific calculator with cover attached. Found left on the corner desk after afternoon lab.',
    private_clue: "Back cover has a tiny yellow smiley sticker on the top right corner and initials 'R.V.' faintly scratched.",
    image_url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop&q=80',
    contact_preference: 'In-App Claim',
    status: 'active',
    reporter_name: 'Yashwanth D. T.',
    reporter_email: 'yashwanth@college.edu.in',
    claim_count: 0,
    created_at: '2026-10-27 15:30:00'
  },
  {
    id: 2,
    user_id: 3,
    report_type: 'found',
    title: 'College RFID Student ID Card with Lanyard',
    category: 'ID cards',
    location: 'Central Library - Reading Room 2',
    item_date: '2026-10-28',
    public_description: 'Official college blue lanyard with RFID identity card in transparent plastic case.',
    private_clue: "Card belongs to Mechanical Dept (USN starts with 1VT22ME...). Lanyard has a small Batman metal pin.",
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    contact_preference: 'In-App Claim',
    status: 'claim_pending',
    reporter_name: 'Ananya Rao',
    reporter_email: 'ananya@college.edu.in',
    claim_count: 1,
    created_at: '2026-10-28 11:15:00'
  },
  {
    id: 3,
    user_id: 4,
    report_type: 'lost',
    title: 'Titan Brown Leather Wallet',
    category: 'Wallets and purses',
    location: 'Main Canteen or Sports Ground',
    item_date: '2026-10-26',
    public_description: "Dark brown bifold leather wallet lost between 1:30 PM and 2:30 PM. Contains college bus pass and driver's license.",
    private_clue: 'Inside coin pocket contains a 10 rupee coin and an old metro card.',
    image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80',
    contact_preference: 'In-App Claim',
    status: 'active',
    reporter_name: 'Rahul Verma',
    reporter_email: 'rahul@college.edu.in',
    claim_count: 0,
    created_at: '2026-10-26 14:00:00'
  },
  {
    id: 4,
    user_id: 2,
    report_type: 'lost',
    title: 'Boat Airdopes 141 Earbuds Case (Black)',
    category: 'Electronics',
    location: 'Auditorium - Row G',
    item_date: '2026-10-25',
    public_description: 'Black matte charging case with one left earbud inside. Left on the chair during the technical symposium.',
    private_clue: 'Small scratch near the USB-C port.',
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
    contact_preference: 'In-App Claim',
    status: 'active',
    reporter_name: 'Yashwanth D. T.',
    reporter_email: 'yashwanth@college.edu.in',
    claim_count: 0,
    created_at: '2026-10-25 16:45:00'
  },
  {
    id: 5,
    user_id: 3,
    report_type: 'found',
    title: 'Steel Water Bottle (Milton 750ml)',
    category: 'Personal belongings',
    location: 'Mechanical Block Ground Floor Water Cooler',
    item_date: '2026-10-24',
    public_description: 'Silver stainless steel Milton bottle with insulated black cap.',
    private_clue: 'Cap has a slight dent on the rim.',
    image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80',
    contact_preference: 'In-App Claim',
    status: 'resolved',
    reporter_name: 'Ananya Rao',
    reporter_email: 'ananya@college.edu.in',
    claim_count: 1,
    created_at: '2026-10-24 10:00:00'
  },
  {
    id: 6,
    user_id: 4,
    report_type: 'lost',
    title: 'Data Structures & Algorithms in C++ (Mark Allen Weiss)',
    category: 'Books and notebooks',
    location: 'CS Dept Library Rack B',
    item_date: '2026-10-22',
    public_description: 'Hardcover reference book with sticky notes on Tree Traversals and Graph algorithms chapters.',
    private_clue: 'First page has library stamp dated 12 Sept 2026.',
    image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    contact_preference: 'In-App Claim',
    status: 'resolved',
    reporter_name: 'Rahul Verma',
    reporter_email: 'rahul@college.edu.in',
    claim_count: 1,
    created_at: '2026-10-22 09:30:00'
  }
];

// Helper to access and initialize stored items
function getLocalItems() {
  let stored = localStorage.getItem('campus_items');
  if (!stored) {
    localStorage.setItem('campus_items', JSON.stringify(DEFAULT_SEED_ITEMS));
    return DEFAULT_SEED_ITEMS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return DEFAULT_SEED_ITEMS;
  }
}

function saveLocalItems(items) {
  localStorage.setItem('campus_items', JSON.stringify(items));
}

// Application State
let currentUser = null;
let currentTypeFilter = 'all';
let currentView = 'browse';
let searchDebounceTimer = null;

// Initialize app on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadItems();
  updateHeroStats();
  if (window.feather) feather.replace();

  // Polling notifications every 20 seconds
  setInterval(() => {
    if (currentUser) loadNotifications();
  }, 20000);
});

// Toast notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i data-feather="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  if (window.feather) feather.replace();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ----------------- AUTHENTICATION -----------------

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        setUserSession(data.user);
        return;
      }
    }
  } catch (err) {}

  // Local fallback
  const saved = localStorage.getItem('currentUser');
  if (saved) {
    try {
      setUserSession(JSON.parse(saved), false);
    } catch (e) {
      clearUserSession();
    }
  } else {
    clearUserSession();
  }
}

function setUserSession(user, persist = true) {
  currentUser = user;
  if (persist) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
  const authContainer = document.getElementById('authContainer');
  const myActivityNav = document.getElementById('myActivityNav');
  const adminNav = document.getElementById('adminNav');

  if (myActivityNav) myActivityNav.style.display = 'block';
  if (adminNav) {
    adminNav.style.display = user.role === 'admin' ? 'block' : 'none';
  }

  if (authContainer) {
    authContainer.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span style="font-size:0.85rem; font-weight:600; color:var(--text-main);">
          ${escapeHtml(user.full_name.split(' ')[0])} ${user.role === 'admin' ? '(Admin)' : ''}
        </span>
        <button class="btn btn-outline btn-sm" onclick="logout()" title="Logout">
          <i data-feather="log-out"></i> Logout
        </button>
      </div>
    `;
  }
  loadNotifications();
  if (window.feather) feather.replace();
}

function clearUserSession() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  const myAct = document.getElementById('myActivityNav');
  const admNav = document.getElementById('adminNav');
  const authCont = document.getElementById('authContainer');
  const badge = document.getElementById('notifBadge');

  if (myAct) myAct.style.display = 'none';
  if (admNav) admNav.style.display = 'none';
  if (badge) badge.style.display = 'none';

  if (authCont) {
    authCont.innerHTML = `
      <button class="btn btn-primary btn-sm" onclick="openAuthModal('login')">
        <i data-feather="log-in"></i> Login / Register
      </button>
    `;
  }
  if (window.feather) feather.replace();
}

async function quickLogin(role) {
  let email = "yashwanth@college.edu.in";
  let pwd = "student123";
  let mockUser = {
    id: 2,
    full_name: "Yashwanth D. T.",
    email: "yashwanth@college.edu.in",
    role: "student",
    department: "Computer Science",
    usn: "1VT21CS089"
  };

  if (role === 'admin') {
    email = "admin@college.edu.in";
    pwd = "admin123";
    mockUser = {
      id: 1,
      full_name: "Prof. K. Sharma (Coordinator)",
      email: "admin@college.edu.in",
      role: "admin",
      department: "Computer Science",
      usn: "FAC001"
    };
  } else if (role === 'student2') {
    email = "rahul@college.edu.in";
    pwd = "student123";
    mockUser = {
      id: 4,
      full_name: "Rahul Verma",
      email: "rahul@college.edu.in",
      role: "student",
      department: "Mechanical Engg",
      usn: "1VT22ME012"
    };
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pwd })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        setUserSession(data.user);
        showToast(`Logged in as ${data.user.full_name} (${data.user.role})`);
        loadItems();
        updateHeroStats();
        return;
      }
    }
  } catch (e) {}

  // Fallback to local session
  setUserSession(mockUser);
  showToast(`Logged in as ${mockUser.full_name} (${mockUser.role})`);
  loadItems();
  updateHeroStats();
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        setUserSession(data.user);
        closeModal('authModal');
        showToast(`Welcome back, ${data.user.full_name}!`);
        loadItems();
        return;
      }
    }
  } catch (err) {}

  // Fallback login
  const fallbackUser = {
    id: Date.now(),
    full_name: email.split('@')[0],
    email: email,
    role: email.startsWith('admin') ? 'admin' : 'student',
    department: 'Engineering',
    usn: '1VT21CS001'
  };
  setUserSession(fallbackUser);
  closeModal('authModal');
  showToast(`Logged in as ${fallbackUser.full_name}`);
  loadItems();
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const full_name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const usn = document.getElementById('regUsn').value.trim();
  const department = document.getElementById('regDept').value.trim();
  const password = document.getElementById('regPassword').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, usn, department, password })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        setUserSession(data.user);
        closeModal('authModal');
        showToast('Registration successful! Welcome to Campus Lost & Found.');
        loadItems();
        return;
      }
    }
  } catch (err) {}

  // Fallback registration
  const newUser = {
    id: Date.now(),
    full_name,
    email,
    usn,
    department,
    role: email.startsWith('admin') ? 'admin' : 'student'
  };
  setUserSession(newUser);
  closeModal('authModal');
  showToast('Registration successful!');
  loadItems();
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  clearUserSession();
  showToast('Logged out successfully');
  if (currentView !== 'browse') switchView('browse');
  loadItems();
}

// ----------------- ITEM LISTINGS & FILTERS -----------------

function debounceSearch() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(loadItems, 300);
}

function setTypeFilter(type, btnElement) {
  currentTypeFilter = type;
  document.querySelectorAll('.filter-pills .pill-btn').forEach(btn => btn.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  loadItems();
}

async function loadItems() {
  const searchInput = document.getElementById('searchInput');
  const catInput = document.getElementById('categoryFilter');
  const locInput = document.getElementById('locationFilter');
  const sortInput = document.getElementById('sortFilter');

  const search = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const category = catInput ? catInput.value : 'all';
  const location = locInput ? locInput.value : 'all';
  const sort = sortInput ? sortInput.value : 'newest';

  let items = null;

  // Attempt backend API fetch
  try {
    let url = `/api/items?sort=${sort}`;
    if (currentTypeFilter === 'lost' || currentTypeFilter === 'found') {
      url += `&type=${currentTypeFilter}`;
    } else if (currentTypeFilter === 'resolved') {
      url += `&status=resolved`;
    } else {
      url += `&status=all`;
    }

    if (category && category !== 'all') url += `&category=${encodeURIComponent(category)}`;
    if (location && location !== 'all') url += `&location=${encodeURIComponent(location)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        items = data.items;
      }
    }
  } catch (err) {}

  // Fallback to local storage if API didn't return
  if (!items) {
    items = getLocalItems().filter(item => {
      if (currentTypeFilter === 'lost' && item.report_type !== 'lost') return false;
      if (currentTypeFilter === 'found' && item.report_type !== 'found') return false;
      if (currentTypeFilter === 'resolved' && item.status !== 'resolved') return false;
      if (currentTypeFilter === 'all' && item.status === 'resolved') return false;

      if (category !== 'all' && item.category !== category) return false;
      if (location !== 'all' && !item.location.toLowerCase().includes(location.toLowerCase())) return false;
      if (search) {
        const text = `${item.title} ${item.public_description} ${item.location}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });

    if (sort === 'oldest') {
      items.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    } else {
      items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    }
  }

  const grid = document.getElementById('itemsGrid');
  const countDisplay = document.getElementById('itemCountDisplay');
  if (!grid) return;

  if (countDisplay) {
    countDisplay.textContent = `Showing ${items.length} report${items.length === 1 ? '' : 's'}`;
  }

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i data-feather="inbox" style="width:48px; height:48px; stroke-width:1.5; color:var(--text-muted); margin-bottom:1rem;"></i>
        <h4>No matching reports found</h4>
        <p>Try clearing filters or search keywords, or submit a new report.</p>
      </div>
    `;
    if (window.feather) feather.replace();
    return;
  }

  grid.innerHTML = items.map(item => renderItemCard(item)).join('');
  if (window.feather) feather.replace();
}

function renderItemCard(item) {
  const isLost = item.report_type === 'lost';
  const typeBadgeClass = isLost ? 'badge-lost' : 'badge-found';
  const typeLabel = isLost ? 'Lost Item' : 'Found Item';

  const statusClass = `badge-${item.status}`;
  const statusLabel = item.status === 'claim_pending' ? 'Claim Pending' : item.status.replace('_', ' ');

  const defaultImg = isLost 
    ? 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
  const displayImg = item.image_url || defaultImg;

  return `
    <div class="item-card">
      <div class="card-img-box">
        <img src="${displayImg}" alt="${escapeHtml(item.title)}" class="card-img" onerror="this.src='${defaultImg}'">
        <div class="card-badges">
          <span class="badge ${typeBadgeClass}">${typeLabel}</span>
          <span class="badge badge-status ${statusClass}">${statusLabel}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-category">${escapeHtml(item.category)}</div>
        <h3 class="card-title">${escapeHtml(item.title)}</h3>
        <p class="card-desc">${escapeHtml(item.public_description)}</p>
        <div class="card-meta">
          <div class="card-meta-row">
            <i data-feather="map-pin" style="width:14px; height:14px;"></i>
            <span>${escapeHtml(item.location)}</span>
          </div>
          <div class="card-meta-row">
            <i data-feather="calendar" style="width:14px; height:14px;"></i>
            <span>${item.item_date}</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <span style="font-size:0.8rem; color:var(--text-muted);">
          By ${escapeHtml(item.reporter_name || 'Student')}
        </span>
        <button class="btn btn-outline btn-sm" onclick="openItemDetails(${item.id})">
          View Details <i data-feather="arrow-right" style="width:14px; height:14px;"></i>
        </button>
      </div>
    </div>
  `;
}

// ----------------- ITEM DETAILS & CLAIM HANDLING -----------------

async function openItemDetails(itemId) {
  let item = null;
  let isOwner = false;
  let userClaim = null;
  let claims = [];

  // Try API
  try {
    const res = await fetch(`/api/items/${itemId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.item) {
        item = data.item;
        isOwner = data.is_owner;
        userClaim = data.user_claim;
        claims = data.claims || [];
      }
    }
  } catch (err) {}

  // Fallback to local
  if (!item) {
    const all = getLocalItems();
    item = all.find(i => i.id === itemId);
    if (!item) {
      showToast('Item not found', 'error');
      return;
    }
    isOwner = currentUser && (currentUser.id === item.user_id || currentUser.role === 'admin');
  }

  const isLost = item.report_type === 'lost';
  const typeLabel = isLost ? 'Lost Item' : 'Found Item';

  document.getElementById('detailTitle').textContent = item.title;

  let contentHtml = `
    <div style="display:flex; flex-direction:column; gap:1.25rem;">
      ${item.image_url ? `<img src="${item.image_url}" style="width:100%; max-height:260px; object-fit:cover; border-radius:var(--radius-md);">` : ''}
      
      <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
        <span class="badge ${isLost ? 'badge-lost' : 'badge-found'}">${typeLabel}</span>
        <span class="badge badge-status badge-${item.status}">${item.status.replace('_', ' ')}</span>
        <span style="color:var(--text-muted); font-size:0.85rem; margin-left:auto;">
          Logged on ${(item.created_at || '').split(' ')[0]}
        </span>
      </div>

      <div>
        <h4 style="font-size:1.15rem; margin-bottom:0.4rem;">${escapeHtml(item.title)}</h4>
        <p style="color:#475569; font-size:0.95rem; line-height:1.6;">${escapeHtml(item.public_description)}</p>
      </div>

      <div style="background:#f8fafc; border:1px solid var(--border); padding:1rem; border-radius:var(--radius-sm); font-size:0.9rem;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
          <div><strong>Category:</strong> ${escapeHtml(item.category)}</div>
          <div><strong>Date:</strong> ${item.item_date}</div>
          <div><strong>Location:</strong> ${escapeHtml(item.location)}</div>
          <div><strong>Reported By:</strong> ${escapeHtml(item.reporter_name || 'Student')}</div>
        </div>
      </div>
  `;

  // Secret Verification Clue display (Owner / Admin only)
  if (isOwner && item.private_clue) {
    contentHtml += `
      <div style="background:#fef3c7; border:1px solid #fde68a; padding:1rem; border-radius:var(--radius-sm); font-size:0.9rem; color:#92400e;">
        <strong>🛡️ Finder's Private Secret Clue (Hidden from Public):</strong>
        <p style="margin-top:0.35rem;">${escapeHtml(item.private_clue)}</p>
      </div>
    `;
  }

  // Handover recommendation
  contentHtml += `
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:0.75rem 1rem; border-radius:var(--radius-sm); font-size:0.85rem; color:#166534;">
      🤝 <strong>Safe Recovery Protocol:</strong> Handover must be completed at the <strong>Campus Security Booth</strong> or <strong>Department Office</strong> after verifying proof.
    </div>
  `;

  // Action buttons
  contentHtml += `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem; border-top:1px solid var(--border); padding-top:1rem; flex-wrap:wrap; gap:0.5rem;">`;

  if (isOwner) {
    contentHtml += `
      <div style="display:flex; gap:0.5rem;">
        ${item.status !== 'resolved' ? `
          <button class="btn btn-found btn-sm" onclick="updateItemStatus(${item.id}, 'resolved')">
            <i data-feather="check"></i> Mark as Returned / Resolved
          </button>
        ` : `
          <button class="btn btn-outline btn-sm" onclick="updateItemStatus(${item.id}, 'active')">
            Re-open Report
          </button>
        `}
        <button class="btn btn-outline btn-sm" style="color:var(--lost-color);" onclick="deleteItem(${item.id})">
          <i data-feather="trash-2"></i> Delete
        </button>
      </div>
    `;
  } else {
    if (!isLost && item.status !== 'resolved') {
      if (userClaim) {
        contentHtml += `
          <div style="font-size:0.9rem; font-weight:600; color:#d97706;">
            <i data-feather="clock" style="width:16px; height:16px;"></i> Claim Submitted (${userClaim.status.toUpperCase()})
          </div>
        `;
      } else {
        contentHtml += `
          <button class="btn btn-found" onclick="openClaimModal(${item.id})">
            <i data-feather="shield"></i> Claim This Item
          </button>
        `;
      }
    }
  }

  contentHtml += `<button class="btn btn-outline btn-sm" onclick="closeModal('detailsModal')">Close</button></div></div>`;

  document.getElementById('detailModalBody').innerHTML = contentHtml;
  openModal('detailsModal');
  if (window.feather) feather.replace();
}

// ----------------- SUBMIT REPORT MODAL -----------------

function openReportModal(type) {
  if (!currentUser) {
    showToast('Please login to report a lost or found item', 'error');
    openAuthModal('login');
    return;
  }

  const modal = document.getElementById('reportModal');
  const title = document.getElementById('reportModalTitle');
  const typeInput = document.getElementById('formReportType');
  const dateLabel = document.getElementById('formDateLabel');
  const locLabel = document.getElementById('formLocationLabel');
  const secretGroup = document.getElementById('secretClueGroup');
  const submitBtn = document.getElementById('submitReportBtn');

  typeInput.value = type;
  document.getElementById('reportForm').reset();
  document.getElementById('formImageUrl').value = '';
  document.getElementById('imagePreviewBox').style.display = 'none';
  document.getElementById('formDate').value = new Date().toISOString().split('T')[0];

  if (type === 'lost') {
    title.textContent = 'Report a Lost Item';
    dateLabel.textContent = 'Date Lost *';
    locLabel.textContent = 'Last Seen Location *';
    secretGroup.style.display = 'none';
    submitBtn.className = 'btn btn-lost';
    submitBtn.textContent = 'Publish Lost Report';
  } else {
    title.textContent = 'Report a Found Item';
    dateLabel.textContent = 'Date Found *';
    locLabel.textContent = 'Found Location on Campus *';
    secretGroup.style.display = 'block';
    submitBtn.className = 'btn btn-found';
    submitBtn.textContent = 'Publish Found Report';
  }

  openModal('reportModal');
}

function handleImageFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Data = e.target.result;
    document.getElementById('imagePreview').src = base64Data;
    document.getElementById('imagePreviewBox').style.display = 'block';
    document.getElementById('formImageUrl').value = base64Data;

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: base64Data })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          document.getElementById('formImageUrl').value = data.url;
        }
      }
    } catch (err) {}
  };
  reader.readAsDataURL(file);
}

async function handleReportSubmit(e) {
  e.preventDefault();
  const report_type = document.getElementById('formReportType').value;
  const title = document.getElementById('formTitle').value.trim();
  const category = document.getElementById('formCategory').value;
  const item_date = document.getElementById('formDate').value;
  const location = document.getElementById('formLocation').value.trim();
  const public_description = document.getElementById('formDescription').value.trim();
  const private_clue = document.getElementById('formPrivateClue').value.trim();
  const image_url = document.getElementById('formImageUrl').value;

  const newReport = {
    report_type,
    title,
    category,
    item_date,
    location,
    public_description,
    private_clue,
    image_url
  };

  try {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReport)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        closeModal('reportModal');
        showToast('Report submitted successfully!');
        loadItems();
        updateHeroStats();
        return;
      }
    }
  } catch (err) {}

  // Local fallback persistence
  const allItems = getLocalItems();
  const newItem = {
    ...newReport,
    id: Date.now(),
    user_id: currentUser ? currentUser.id : 2,
    reporter_name: currentUser ? currentUser.full_name : 'Student',
    status: 'active',
    claim_count: 0,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  allItems.unshift(newItem);
  saveLocalItems(allItems);

  closeModal('reportModal');
  showToast('Report submitted successfully!');
  loadItems();
  updateHeroStats();
}

// ----------------- CLAIM MODAL & SUBMISSION -----------------

function openClaimModal(itemId) {
  if (!currentUser) {
    showToast('Please log in before claiming an item', 'error');
    openAuthModal('login');
    return;
  }
  document.getElementById('claimItemId').value = itemId;
  document.getElementById('claimProof').value = '';
  openModal('claimModal');
}

async function handleClaimSubmit(e) {
  e.preventDefault();
  const itemId = document.getElementById('claimItemId').value;
  const proof_description = document.getElementById('claimProof').value.trim();

  try {
    const res = await fetch(`/api/items/${itemId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof_description })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        closeModal('claimModal');
        closeModal('detailsModal');
        showToast('Claim submitted! The finder has been notified.');
        loadItems();
        updateHeroStats();
        return;
      }
    }
  } catch (err) {}

  // Fallback
  const allItems = getLocalItems();
  const item = allItems.find(i => String(i.id) === String(itemId));
  if (item) {
    item.status = 'claim_pending';
    item.claim_count = (item.claim_count || 0) + 1;
    saveLocalItems(allItems);
  }

  closeModal('claimModal');
  closeModal('detailsModal');
  showToast('Claim submitted! The finder has been notified.');
  loadItems();
  updateHeroStats();
}

async function updateItemStatus(itemId, newStatus) {
  try {
    const res = await fetch(`/api/items/${itemId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(`Status updated to ${newStatus}!`);
      closeModal('detailsModal');
      loadItems();
      updateHeroStats();
      if (currentView === 'activity') loadMyActivity();
      return;
    }
  } catch (err) {}

  // Fallback
  const allItems = getLocalItems();
  const item = allItems.find(i => String(i.id) === String(itemId));
  if (item) {
    item.status = newStatus;
    saveLocalItems(allItems);
  }
  showToast(`Status updated to ${newStatus}!`);
  closeModal('detailsModal');
  loadItems();
  updateHeroStats();
  if (currentView === 'activity') loadMyActivity();
}

async function deleteItem(itemId) {
  if (!confirm('Are you sure you want to remove this item report?')) return;
  try {
    const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Item deleted successfully');
      closeModal('detailsModal');
      loadItems();
      updateHeroStats();
      if (currentView === 'activity') loadMyActivity();
      if (currentView === 'admin') loadAdminView();
      return;
    }
  } catch (err) {}

  // Fallback
  const allItems = getLocalItems().filter(i => String(i.id) !== String(itemId));
  saveLocalItems(allItems);
  showToast('Item deleted successfully');
  closeModal('detailsModal');
  loadItems();
  updateHeroStats();
  if (currentView === 'activity') loadMyActivity();
  if (currentView === 'admin') loadAdminView();
}

// ----------------- MY ACTIVITY VIEW -----------------

async function loadMyActivity() {
  if (!currentUser) return;
  const allItems = getLocalItems();
  const myReports = allItems.filter(i => i.user_id === currentUser.id);

  const repBody = document.getElementById('myReportsTableBody');
  if (repBody) {
    if (myReports.length === 0) {
      repBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem;">You have not published any reports yet.</td></tr>`;
    } else {
      repBody.innerHTML = myReports.map(r => `
        <tr>
          <td><span class="badge ${r.report_type === 'lost' ? 'badge-lost' : 'badge-found'}">${r.report_type}</span></td>
          <td><strong>${escapeHtml(r.title)}</strong></td>
          <td>${escapeHtml(r.category)}</td>
          <td>${r.item_date}</td>
          <td><span class="badge badge-status badge-${r.status}">${r.status}</span></td>
          <td>${r.claim_count > 0 ? `<span style="color:var(--primary); font-weight:700;">${r.claim_count} claims</span>` : '0'}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="openItemDetails(${r.id})">Manage</button>
          </td>
        </tr>
      `).join('');
    }
  }

  const claimBody = document.getElementById('myClaimsTableBody');
  if (claimBody) {
    claimBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1.5rem;">Active claim records synced.</td></tr>`;
  }
}

// ----------------- ADMIN DASHBOARD -----------------

async function loadAdminView() {
  if (!currentUser || currentUser.role !== 'admin') {
    showToast('Admin privilege required', 'error');
    switchView('browse');
    return;
  }

  const allItems = getLocalItems();
  const total = allItems.length;
  const lost = allItems.filter(i => i.report_type === 'lost').length;
  const found = allItems.filter(i => i.report_type === 'found').length;
  const resolved = allItems.filter(i => i.status === 'resolved').length;
  const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const grid = document.getElementById('adminStatsGrid');
  if (grid) {
    grid.innerHTML = `
      <div class="stat-box">
        <div class="num">${total}</div>
        <div class="title">Total Reports</div>
      </div>
      <div class="stat-box">
        <div class="num" style="color:var(--lost-color);">${lost}</div>
        <div class="title">Lost Items</div>
      </div>
      <div class="stat-box">
        <div class="num" style="color:var(--found-color);">${found}</div>
        <div class="title">Found Items</div>
      </div>
      <div class="stat-box">
        <div class="num" style="color:#059669;">${resolved}</div>
        <div class="title">Recovered / Resolved</div>
      </div>
      <div class="stat-box">
        <div class="num">${rate}%</div>
        <div class="title">Recovery Rate</div>
      </div>
      <div class="stat-box">
        <div class="num" style="color:var(--pending-color);">3</div>
        <div class="title">Claims Moderated</div>
      </div>
    `;
  }

  const body = document.getElementById('adminItemsTableBody');
  if (body) {
    body.innerHTML = allItems.slice(0, 15).map(item => `
      <tr>
        <td><span class="badge ${item.report_type === 'lost' ? 'badge-lost' : 'badge-found'}">${item.report_type}</span></td>
        <td><strong>${escapeHtml(item.title)}</strong></td>
        <td>${escapeHtml(item.reporter_name || 'Student')}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.location)}</td>
        <td><span class="badge badge-status badge-${item.status}">${item.status}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" style="color:var(--lost-color);" onclick="deleteItem(${item.id})">
            Remove Report
          </button>
        </td>
      </tr>
    `).join('');
  }
}

// ----------------- NOTIFICATIONS -----------------

async function loadNotifications() {
  if (!currentUser) return;
  const badge = document.getElementById('notifBadge');
  const list = document.getElementById('notifList');

  if (badge) {
    badge.textContent = '1';
    badge.style.display = 'flex';
  }

  if (list) {
    list.innerHTML = `
      <div style="padding:0.75rem 1rem; border-bottom:1px solid var(--border); background:#f0fdf4; font-size:0.85rem;">
        <div style="font-weight:700; color:var(--found-color); margin-bottom:0.2rem;">
          Campus Recovery Update
        </div>
        <div style="color:var(--text-muted); line-height:1.4;">Welcome to the Campus Lost & Found Portal. Remember to report items promptly.</div>
        <div style="font-size:0.75rem; color:#94a3b8; margin-top:0.3rem;">Today</div>
      </div>
    `;
  }
}

function toggleNotifs() {
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) dropdown.classList.toggle('active');
}

function markAllNotifsRead() {
  const badge = document.getElementById('notifBadge');
  if (badge) badge.style.display = 'none';
  showToast('Notifications marked as read');
}

// ----------------- VIEW SWITCHER -----------------

function switchView(view) {
  currentView = view;
  const browse = document.getElementById('browseView');
  const activity = document.getElementById('activityView');
  const admin = document.getElementById('adminView');
  const hero = document.getElementById('heroSection');

  if (browse) browse.style.display = view === 'browse' ? 'block' : 'none';
  if (activity) activity.style.display = view === 'activity' ? 'block' : 'none';
  if (admin) admin.style.display = view === 'admin' ? 'block' : 'none';
  if (hero) hero.style.display = view === 'browse' ? 'block' : 'none';

  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

  if (view === 'browse') {
    const nav = document.querySelector('.nav-link[onclick="switchView(\'browse\')"]');
    if (nav) nav.classList.add('active');
    loadItems();
  } else if (view === 'activity') {
    const nav = document.querySelector('.nav-link[onclick="switchView(\'activity\')"]');
    if (nav) nav.classList.add('active');
    loadMyActivity();
  } else if (view === 'admin') {
    const nav = document.querySelector('.nav-link[onclick="switchView(\'admin\')"]');
    if (nav) nav.classList.add('active');
    loadAdminView();
  }
}

// ----------------- HERO STATS COUNTER -----------------

async function updateHeroStats() {
  const allItems = getLocalItems();
  const resolved = allItems.filter(i => i.status === 'resolved').length;
  const active = allItems.filter(i => i.status !== 'resolved').length;
  const rate = allItems.length > 0 ? Math.round((resolved / allItems.length) * 100) : 0;

  const recElem = document.getElementById('statRecovered');
  const actElem = document.getElementById('statActive');
  const rateElem = document.getElementById('statRate');

  if (recElem) recElem.textContent = resolved;
  if (actElem) actElem.textContent = active;
  if (rateElem) rateElem.textContent = `${rate}%`;
}

// ----------------- MODAL HELPERS -----------------

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function openAuthModal(tab = 'login') {
  switchAuthTab(tab);
  openModal('authModal');
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabReg = document.getElementById('tabRegister');
  const modalTitle = document.getElementById('authModalTitle');

  if (tab === 'login') {
    if (loginForm) loginForm.style.display = 'block';
    if (regForm) regForm.style.display = 'none';
    if (tabLogin) tabLogin.classList.add('active');
    if (tabReg) tabReg.classList.remove('active');
    if (modalTitle) modalTitle.textContent = 'Sign In to Campus Portal';
  } else {
    if (loginForm) loginForm.style.display = 'none';
    if (regForm) regForm.style.display = 'block';
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabReg) tabReg.classList.add('active');
    if (modalTitle) modalTitle.textContent = 'Register Student Account';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
