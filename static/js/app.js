/**
 * College Lost & Found Portal - Frontend Application Engine
 * VTU Societal Project Implementation
 */

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
    const data = await res.json();
    if (data.success && data.user) {
      setUserSession(data.user);
    } else {
      clearUserSession();
    }
  } catch (err) {
    clearUserSession();
  }
}

function setUserSession(user) {
  currentUser = user;
  const authContainer = document.getElementById('authContainer');
  const myActivityNav = document.getElementById('myActivityNav');
  const adminNav = document.getElementById('adminNav');

  myActivityNav.style.display = 'block';
  if (user.role === 'admin') {
    adminNav.style.display = 'block';
  } else {
    adminNav.style.display = 'none';
  }

  authContainer.innerHTML = `
    <div style="display:flex; align-items:center; gap:0.5rem;">
      <span style="font-size:0.85rem; font-weight:600; color:var(--text-main); display:none; @media(min-width:600px){display:inline;}">
        ${user.full_name.split(' ')[0]} ${user.role === 'admin' ? '(Admin)' : ''}
      </span>
      <button class="btn btn-outline btn-sm" onclick="logout()" title="Logout">
        <i data-feather="log-out"></i> Logout
      </button>
    </div>
  `;
  loadNotifications();
  if (window.feather) feather.replace();
}

function clearUserSession() {
  currentUser = null;
  document.getElementById('myActivityNav').style.display = 'none';
  document.getElementById('adminNav').style.display = 'none';
  document.getElementById('authContainer').innerHTML = `
    <button class="btn btn-primary btn-sm" onclick="openAuthModal('login')">
      <i data-feather="log-in"></i> Login / Register
    </button>
  `;
  document.getElementById('notifBadge').style.display = 'none';
  if (window.feather) feather.replace();
}

async function quickLogin(role) {
  let email = "yashwanth@college.edu.in";
  let pwd = "student123";

  if (role === 'admin') {
    email = "admin@college.edu.in";
    pwd = "admin123";
  } else if (role === 'student2') {
    email = "rahul@college.edu.in";
    pwd = "student123";
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pwd })
    });
    const data = await res.json();
    if (data.success) {
      setUserSession(data.user);
      showToast(`Logged in as ${data.user.full_name} (${data.user.role})`);
      loadItems();
      updateHeroStats();
    } else {
      showToast(data.error || 'Login failed', 'error');
    }
  } catch (e) {
    showToast('Network error during quick login', 'error');
  }
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
    const data = await res.json();
    if (data.success) {
      setUserSession(data.user);
      closeModal('authModal');
      showToast(`Welcome back, ${data.user.full_name}!`);
      loadItems();
    } else {
      showToast(data.error || 'Invalid credentials', 'error');
    }
  } catch (err) {
    showToast('Error communicating with server', 'error');
  }
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
    const data = await res.json();
    if (data.success) {
      setUserSession(data.user);
      closeModal('authModal');
      showToast('Registration successful! Welcome to Campus Lost & Found.');
      loadItems();
    } else {
      showToast(data.error || 'Registration failed', 'error');
    }
  } catch (err) {
    showToast('Error registering account', 'error');
  }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
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
  const search = document.getElementById('searchInput').value.trim();
  const category = document.getElementById('categoryFilter').value;
  const location = document.getElementById('locationFilter').value;
  const sort = document.getElementById('sortFilter').value;

  let url = `/api/items?sort=${sort}`;
  if (currentTypeFilter === 'lost' || currentTypeFilter === 'found') {
    url += `&type=${currentTypeFilter}`;
  } else if (currentTypeFilter === 'resolved') {
    url += `&status=resolved`;
  } else {
    // 'all' items default to active/claim_pending for primary browsing
    url += `&status=all`;
  }

  if (category && category !== 'all') url += `&category=${encodeURIComponent(category)}`;
  if (location && location !== 'all') url += `&location=${encodeURIComponent(location)}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;

  const grid = document.getElementById('itemsGrid');
  const countDisplay = document.getElementById('itemCountDisplay');
  grid.innerHTML = `<div class="empty-state"><p>Loading campus reports...</p></div>`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    countDisplay.textContent = `Showing ${data.items.length} report${data.items.length === 1 ? '' : 's'}`;

    if (data.items.length === 0) {
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

    grid.innerHTML = data.items.map(item => renderItemCard(item)).join('');
    if (window.feather) feather.replace();
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><p style="color:var(--lost-color);">Failed to load items. Server may be starting.</p></div>`;
  }
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
        <img src="${displayImg}" alt="${item.title}" class="card-img" onerror="this.src='${defaultImg}'">
        <div class="card-badges">
          <span class="badge ${typeBadgeClass}">${typeLabel}</span>
          <span class="badge badge-status ${statusClass}">${statusLabel}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-category">${item.category}</div>
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
          By ${escapeHtml(item.reporter_name)}
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
  try {
    const res = await fetch(`/api/items/${itemId}`);
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Failed to load details', 'error');
      return;
    }

    const item = data.item;
    const isOwner = data.is_owner;
    const userClaim = data.user_claim;
    const claims = data.claims || [];

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
            Logged on ${item.created_at.split(' ')[0]}
          </span>
        </div>

        <div>
          <h4 style="font-size:1.15rem; margin-bottom:0.4rem;">${escapeHtml(item.title)}</h4>
          <p style="color:#475569; font-size:0.95rem; line-height:1.6;">${escapeHtml(item.public_description)}</p>
        </div>

        <div style="background:#f8fafc; border:1px solid var(--border); padding:1rem; border-radius:var(--radius-sm); font-size:0.9rem;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
            <div><strong>Category:</strong> ${item.category}</div>
            <div><strong>Date:</strong> ${item.item_date}</div>
            <div><strong>Location:</strong> ${escapeHtml(item.location)}</div>
            <div><strong>Reported By:</strong> ${escapeHtml(item.reporter_name)}</div>
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
      // Owner controls
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
      // Non-owner: can claim if it's a found item and not resolved
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

    contentHtml += `<button class="btn btn-outline btn-sm" onclick="closeModal('detailsModal')">Close</button></div>`;

    // If Finder or Admin, display all submitted claims with review controls
    if (isOwner && !isLost && claims.length > 0) {
      contentHtml += `
        <div class="claims-box">
          <h4 style="margin-bottom:0.75rem; font-size:1.05rem;">Submitted Ownership Claims (${claims.length})</h4>
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${claims.map(c => `
              <div class="claim-card">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.85rem;">
                  <strong>${escapeHtml(c.claimant_name)} (${escapeHtml(c.claimant_dept || 'Student')})</strong>
                  <span class="badge badge-status badge-${c.status}">${c.status}</span>
                </div>
                <p style="font-size:0.9rem; color:#334155; margin-bottom:0.5rem;">
                  <strong>Claimant's Proof:</strong> ${escapeHtml(c.proof_description)}
                </p>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.75rem;">
                  Email: ${escapeHtml(c.claimant_email)} &bull; USN: ${escapeHtml(c.claimant_usn || 'N/A')}
                </div>
                ${c.status === 'pending' ? `
                  <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-found btn-sm" onclick="reviewClaim(${c.id}, 'approved')">
                      Approve Claim
                    </button>
                    <button class="btn btn-outline btn-sm" style="color:var(--lost-color);" onclick="reviewClaim(${c.id}, 'rejected')">
                      Reject
                    </button>
                  </div>
                ` : `
                  <div style="font-size:0.8rem; font-style:italic; color:var(--text-muted);">
                    Claim resolved (${c.status})
                  </div>
                `}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    contentHtml += `</div>`;
    document.getElementById('detailModalBody').innerHTML = contentHtml;
    openModal('detailsModal');
    if (window.feather) feather.replace();
  } catch (err) {
    showToast('Failed to load item details', 'error');
  }
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

  // Set today's date default
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

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: base64Data })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('formImageUrl').value = data.url;
      }
    } catch (err) {
      console.warn("Local upload fallback to raw data url");
      document.getElementById('formImageUrl').value = base64Data;
    }
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

  try {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_type,
        title,
        category,
        item_date,
        location,
        public_description,
        private_clue,
        image_url
      })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('reportModal');
      showToast('Report submitted successfully!');
      loadItems();
      updateHeroStats();
    } else {
      showToast(data.error || 'Failed to submit report', 'error');
    }
  } catch (err) {
    showToast('Network error while submitting report', 'error');
  }
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
    const data = await res.json();
    if (data.success) {
      closeModal('claimModal');
      closeModal('detailsModal');
      showToast('Claim submitted! The finder has been notified.');
      loadItems();
      updateHeroStats();
    } else {
      showToast(data.error || 'Could not submit claim', 'error');
    }
  } catch (err) {
    showToast('Network error during claim submission', 'error');
  }
}

async function reviewClaim(claimId, status) {
  try {
    const res = await fetch(`/api/claims/${claimId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Claim ${status}!`);
      closeModal('detailsModal');
      if (currentView === 'activity') loadMyActivity();
      loadItems();
    } else {
      showToast(data.error || 'Failed to update claim', 'error');
    }
  } catch (err) {
    showToast('Error reviewing claim', 'error');
  }
}

async function updateItemStatus(itemId, newStatus) {
  try {
    const res = await fetch(`/api/items/${itemId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Status updated to ${newStatus}!`);
      closeModal('detailsModal');
      loadItems();
      updateHeroStats();
      if (currentView === 'activity') loadMyActivity();
    } else {
      showToast(data.error || 'Update failed', 'error');
    }
  } catch (err) {
    showToast('Error updating status', 'error');
  }
}

async function deleteItem(itemId) {
  if (!confirm('Are you sure you want to remove this item report?')) return;
  try {
    const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Item deleted successfully');
      closeModal('detailsModal');
      loadItems();
      updateHeroStats();
      if (currentView === 'activity') loadMyActivity();
      if (currentView === 'admin') loadAdminView();
    } else {
      showToast(data.error || 'Delete failed', 'error');
    }
  } catch (err) {
    showToast('Error deleting item', 'error');
  }
}

// ----------------- MY ACTIVITY VIEW -----------------

async function loadMyActivity() {
  if (!currentUser) return;
  try {
    const [repRes, claimRes] = await Promise.all([
      fetch('/api/my/reports'),
      fetch('/api/my/claims')
    ]);
    const repData = await repRes.json();
    const claimData = await claimRes.json();

    // Render reports
    const repBody = document.getElementById('myReportsTableBody');
    if (repData.reports.length === 0) {
      repBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem;">You have not published any reports yet.</td></tr>`;
    } else {
      repBody.innerHTML = repData.reports.map(r => `
        <tr>
          <td><span class="badge ${r.report_type === 'lost' ? 'badge-lost' : 'badge-found'}">${r.report_type}</span></td>
          <td><strong>${escapeHtml(r.title)}</strong></td>
          <td>${r.category}</td>
          <td>${r.item_date}</td>
          <td><span class="badge badge-status badge-${r.status}">${r.status}</span></td>
          <td>${r.claim_count > 0 ? `<span style="color:var(--primary); font-weight:700;">${r.claim_count} claims (${r.pending_claims} pending)</span>` : '0'}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="openItemDetails(${r.id})">Manage</button>
          </td>
        </tr>
      `).join('');
    }

    // Render claims
    const claimBody = document.getElementById('myClaimsTableBody');
    if (claimData.claims.length === 0) {
      claimBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:2rem;">You have not submitted any claims yet.</td></tr>`;
    } else {
      claimBody.innerHTML = claimData.claims.map(c => `
        <tr>
          <td><strong>${escapeHtml(c.item_title)}</strong></td>
          <td>${c.category}</td>
          <td>${escapeHtml(c.finder_name)}</td>
          <td><span style="font-size:0.85rem; color:#475569;">${escapeHtml(c.proof_description.substring(0, 45))}...</span></td>
          <td><span class="badge badge-status badge-${c.status}">${c.status}</span></td>
          <td>${c.created_at.split(' ')[0]}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast('Failed to load activity', 'error');
  }
}

// ----------------- ADMIN DASHBOARD -----------------

async function loadAdminView() {
  if (!currentUser || currentUser.role !== 'admin') {
    showToast('Admin privilege required', 'error');
    switchView('browse');
    return;
  }

  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const stats = data.stats;
    const grid = document.getElementById('adminStatsGrid');
    grid.innerHTML = `
      <div class="stat-box">
        <div class="num">${stats.total_reports || stats.total_items}</div>
        <div class="title">Total Reports</div>
      </div>
      <div class="stat-box">
        <div class="num" style="color:var(--lost-color);">${stats.total_lost}</div>
        <div class="title">Lost Items</div>
      </div>
      <div class="stat-box">
        <div class="num" style="color:var(--found-color);">${stats.total_found}</div>
        <div class="title">Found Items</div>
      </div>
      <div class="stat-box">
        <div class="num" style="color:#059669;">${stats.total_resolved}</div>
        <div class="title">Recovered / Resolved</div>
      </div>
      <div class="stat-box">
        <div class="num">${stats.recovery_rate}%</div>
        <div class="title">Recovery Rate</div>
      </div>
      <div class="stat-box">
        <div class="num" style="color:var(--pending-color);">${stats.total_claims}</div>
        <div class="title">Claims Filed</div>
      </div>
    `;

    const body = document.getElementById('adminItemsTableBody');
    body.innerHTML = data.recent_items.map(item => `
      <tr>
        <td><span class="badge ${item.report_type === 'lost' ? 'badge-lost' : 'badge-found'}">${item.report_type}</span></td>
        <td><strong>${escapeHtml(item.title)}</strong></td>
        <td>${escapeHtml(item.reporter_name)} (${escapeHtml(item.reporter_email)})</td>
        <td>${item.category}</td>
        <td>${escapeHtml(item.location)}</td>
        <td><span class="badge badge-status badge-${item.status}">${item.status}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" style="color:var(--lost-color);" onclick="deleteItem(${item.id})">
            Remove Report
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Failed to load admin stats', 'error');
  }
}

// ----------------- NOTIFICATIONS -----------------

async function loadNotifications() {
  if (!currentUser) return;
  try {
    const res = await fetch('/api/notifications');
    const data = await res.json();
    if (!data.success) return;

    const badge = document.getElementById('notifBadge');
    if (data.unread_count > 0) {
      badge.textContent = data.unread_count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }

    const list = document.getElementById('notifList');
    if (data.notifications.length === 0) {
      list.innerHTML = `<div style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.85rem;">No notifications yet.</div>`;
      return;
    }

    list.innerHTML = data.notifications.map(n => `
      <div style="padding:0.75rem 1rem; border-bottom:1px solid var(--border); background:${n.is_read ? 'white' : '#f0fdf4'}; font-size:0.85rem; cursor:pointer;" onclick="readNotif(${n.id}, ${n.item_id})">
        <div style="font-weight:700; color:${n.is_read ? 'var(--text-main)' : 'var(--found-color)'}; margin-bottom:0.2rem;">
          ${escapeHtml(n.title)}
        </div>
        <div style="color:var(--text-muted); line-height:1.4;">${escapeHtml(n.message)}</div>
        <div style="font-size:0.75rem; color:#94a3b8; margin-top:0.3rem;">${n.created_at}</div>
      </div>
    `).join('');
  } catch (err) {
    console.warn("Could not load notifications", err);
  }
}

function toggleNotifs() {
  const dropdown = document.getElementById('notifDropdown');
  dropdown.classList.toggle('active');
  if (dropdown.classList.contains('active')) {
    loadNotifications();
  }
}

async function markAllNotifsRead() {
  await fetch('/api/notifications/read-all', { method: 'POST' });
  loadNotifications();
}

async function readNotif(notifId, itemId) {
  await fetch(`/api/notifications/${notifId}/read`, { method: 'POST' });
  loadNotifications();
  if (itemId) openItemDetails(itemId);
}

// ----------------- VIEW SWITCHER -----------------

function switchView(view) {
  currentView = view;
  document.getElementById('browseView').style.display = view === 'browse' ? 'block' : 'none';
  document.getElementById('activityView').style.display = view === 'activity' ? 'block' : 'none';
  document.getElementById('adminView').style.display = view === 'admin' ? 'block' : 'none';
  document.getElementById('heroSection').style.display = view === 'browse' ? 'block' : 'none';

  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

  if (view === 'browse') {
    document.querySelector('.nav-link[onclick="switchView(\'browse\')"]').classList.add('active');
    loadItems();
  } else if (view === 'activity') {
    document.querySelector('.nav-link[onclick="switchView(\'activity\')"]').classList.add('active');
    loadMyActivity();
  } else if (view === 'admin') {
    document.querySelector('.nav-link[onclick="switchView(\'admin\')"]').classList.add('active');
    loadAdminView();
  }
}

// ----------------- HERO STATS COUNTER -----------------

async function updateHeroStats() {
  try {
    const res = await fetch('/api/items?status=all');
    const data = await res.json();
    if (data.success) {
      const items = data.items;
      const resolved = items.filter(i => i.status === 'resolved').length;
      const active = items.filter(i => i.status !== 'resolved').length;
      const rate = items.length > 0 ? Math.round((resolved / items.length) * 100) : 0;

      document.getElementById('statRecovered').textContent = resolved;
      document.getElementById('statActive').textContent = active;
      document.getElementById('statRate').textContent = `${rate}%`;
    }
  } catch (err) {}
}

// ----------------- MODAL HELPERS -----------------

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
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
    loginForm.style.display = 'block';
    regForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
    modalTitle.textContent = 'Sign In to Campus Portal';
  } else {
    loginForm.style.display = 'none';
    regForm.style.display = 'block';
    tabLogin.classList.remove('active');
    tabReg.classList.add('active');
    modalTitle.textContent = 'Register Student Account';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
