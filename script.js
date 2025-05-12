let totalPoints = 0;
let showAddPunishments = false;

// Initialize the app
function init() {
  loadPoints();
  displayTasks();
  updatePointsDisplay();
}

// Load points from localStorage
function loadPoints() {
  const savedPoints = localStorage.getItem('totalPoints');
  totalPoints = savedPoints ? parseInt(savedPoints) : 0;
}

// Save points to localStorage
function savePoints() {
  localStorage.setItem('totalPoints', totalPoints);
}

// Update points display
function updatePointsDisplay() {
  const pointsDisplay = document.getElementById('points-display');
  if (pointsDisplay) {
    pointsDisplay.textContent = `Total Points: ${totalPoints}`;
  }
}

// Display tasks
function displayTasks() {
  const taskList = document.getElementById('task-list');
  taskList.innerHTML = '';
  tasks.forEach(task => {
    const taskElement = document.createElement('div');
    taskElement.className = 'task-card';
    taskElement.innerHTML = `
      <div>
        <div class="task-card-title">${task.name}</div>
        <div class="task-card-desc">${task.description || ''}</div>
      </div>
      <div class="task-card-points">${task.points}</div>
    `;
    taskList.appendChild(taskElement);
  });
}

// Complete a task
function completeTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task && !task.completed) {
    task.completed = true;
    totalPoints += task.points;
    savePoints();
    updatePointsDisplay();
    displayTasks();
  }
}

// Generate punishment
function generatePunishment() {
  showAddPunishments = true;
  renderAddPunishments();
  const result = document.getElementById("punishment-result");
  let data = loadPunishments();
  const intensity = parseInt(document.getElementById('intensity').value);
  const filtered = data.filter(p => typeof p === 'object' ? p.intensity === intensity : (typeof p === 'string' && intensity === 1));
  if (filtered.length === 0) {
    result.textContent = 'No punishments for this intensity.';
    return;
  }
  const punishment = filtered[Math.floor(Math.random() * filtered.length)];
  result.textContent = punishment.name || punishment;
  // Deduct points for punishment
  totalPoints -= 10;
  savePoints();
  updatePointsDisplay();
}

// Update FAB icon and action based on active page
function updateFab(page) {
  const fab = document.getElementById('fab');
  const fabIcon = document.getElementById('fab-icon');
  fab.style.display = 'flex';
  switch (page) {
    case 'rewards':
      fabIcon.textContent = '+'; // Add reward
      fab.title = 'Add Reward';
      break;
    case 'punishments':
      fabIcon.textContent = '+'; // Add punishment
      fab.title = 'Add Punishment';
      break;
    case 'habits':
      fabIcon.textContent = '+'; // Add habit/task
      fab.title = 'Add Task';
      break;
    case 'notes':
      fabIcon.textContent = '+'; // Add note
      fab.title = 'Add Note';
      break;
    default:
      fab.style.display = 'none';
  }
}

// --- Modal Logic ---
let modalType = null;
function openModal(type) {
  modalType = type;
  document.getElementById('modal-overlay').style.display = 'flex';
  const title = {
    rewards: 'Add Reward',
    punishments: 'Add Punishment',
    habits: 'Add Task',
    notes: 'Add Note'
  }[type];
  document.getElementById('modal-title').textContent = title;
  const fields = document.getElementById('modal-fields');
  if (type === 'rewards') {
    fields.innerHTML = `
      <input name="name" placeholder="Reward Name" required />
      <textarea name="description" placeholder="Description" required></textarea>
      <input name="cost" type="number" min="0" placeholder="Cost" required />
    `;
  } else if (type === 'punishments') {
    fields.innerHTML = `
      <input name="name" placeholder="Punishment Name" required />
      <textarea name="description" placeholder="Description" required></textarea>
      <input name="intensity" type="number" min="1" max="5" placeholder="Intensity (1-5)" required />
    `;
  } else if (type === 'habits') {
    fields.innerHTML = `
      <input name="name" placeholder="Task Name" required />
      <input name="points" type="number" min="1" placeholder="Points" required />
    `;
  } else if (type === 'notes') {
    fields.innerHTML = `
      <textarea name="text" placeholder="Note text" required></textarea>
    `;
  }
}
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  modalType = null;
}
function submitModal(event) {
  event.preventDefault();
  const form = event.target;
  if (modalType === 'rewards') {
    let data = loadRewards();
    const id = Date.now();
    data.push({
      id,
      name: form.name.value,
      description: form.description.value,
      cost: parseInt(form.cost.value)
    });
    saveRewards(data);
    renderRewards();
  } else if (modalType === 'punishments') {
    let data = loadPunishments();
    const id = Date.now();
    data.push({
      id,
      name: form.name.value,
      description: form.description.value,
      intensity: parseInt(form.intensity.value)
    });
    savePunishments(data);
    renderPunishments();
  } else if (modalType === 'habits') {
    let data = loadTasks();
    const id = Date.now();
    data.push({
      id,
      name: form.name.value,
      points: parseInt(form.points.value),
      completed: false
    });
    saveTasks(data);
    displayTasks();
  } else if (modalType === 'notes') {
    let data = loadNotes();
    const id = Date.now();
    data.push({
      id,
      text: form.text.value
    });
    saveNotes(data);
    renderNotes();
  }
  closeModal();
}

// --- FAB opens custom punishment modal on punishments page ---
function fabAction() {
  const active = document.querySelector('.circle-btn.active, .nav-btn.active');
  if (!active) return;
  const page = active.id.replace('nav-', '');
  if (page === 'punishments') {
    openCustomPunishmentModal();
    return;
  }
  openModal(page);
}

function openCustomPunishmentModal() {
  document.getElementById('custom-punishment-modal').style.display = 'flex';
  document.getElementById('custom-punishment-form').reset();
  document.getElementById('custom-intensity').value = document.getElementById('intensity').value;
}
function closeCustomPunishmentModal() {
  document.getElementById('custom-punishment-modal').style.display = 'none';
}
function submitCustomPunishment(event) {
  event.preventDefault();
  const form = event.target;
  const title = form.title.value.trim();
  const description = form.description.value.trim();
  let active = loadActivePunishments();
  active.push({ name: title, description, count: 1 });
  saveActivePunishments(active);
  closeCustomPunishmentModal();
  renderActivePunishments();
}

// --- Add helpers for tasks and punishments for modal logic ---
function loadTasks() {
  const saved = localStorage.getItem('tasks');
  if (saved) return JSON.parse(saved);
  return tasks;
}
function saveTasks(data) {
  localStorage.setItem('tasks', JSON.stringify(data));
}
// Punishments helpers (to be implemented next)
function loadPunishments() {
  const saved = localStorage.getItem('punishments');
  let base = typeof punishments !== 'undefined' ? punishments : [];
  if (saved) {
    // Merge: keep all custom, and add any base not already present by name
    let custom = JSON.parse(saved);
    let names = new Set(custom.map(p => typeof p === 'object' ? p.name : p));
    base.forEach(p => {
      let name = typeof p === 'object' ? p.name : p;
      if (!names.has(name)) custom.push(p);
    });
    return custom;
  }
  return base;
}
function savePunishments(data) {
  localStorage.setItem('punishments', JSON.stringify(data));
}
function renderPunishments() {
  const list = document.getElementById('punishments-list');
  list.innerHTML = '';
  let data = loadPunishments();
  const intensity = parseInt(document.getElementById('intensity').value);
  data.forEach(p => {
    if (p.intensity && p.intensity !== intensity) return;
    const card = document.createElement('div');
    card.className = 'task-card';
    card.innerHTML = `
      <div>
        <div class="task-card-title">${p.name || p}</div>
        <div class="task-card-desc">${p.description || ''}</div>
      </div>
      <div class="task-card-points">${p.intensity || ''}</div>
    `;
    list.appendChild(card);
  });
}
function deletePunishment(id) {
  let data = loadPunishments();
  data = data.filter(p => p.id !== id);
  savePunishments(data);
  renderPunishments();
}

// --- Rewards Logic ---
function loadRewards() {
  const saved = localStorage.getItem('rewards');
  if (saved) return JSON.parse(saved);
  return rewards;
}
function saveRewards(data) {
  localStorage.setItem('rewards', JSON.stringify(data));
}
function renderRewards() {
  const list = document.getElementById('rewards-list');
  list.innerHTML = '';
  let data = loadRewards();
  data.forEach(r => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.innerHTML = `
      <div>
        <div class="task-card-title">${r.name}</div>
        <div class="task-card-desc">${r.description}</div>
      </div>
      <div class="task-card-points">${r.cost}</div>
    `;
    list.appendChild(card);
  });
}
function buyReward(id) {
  alert('Buy reward (to be implemented)');
}
function redeemReward(id) {
  alert('Redeem reward (to be implemented)');
}

// --- Notes Logic ---
function loadNotes() {
  const saved = localStorage.getItem('notes');
  if (saved) return JSON.parse(saved);
  return notes;
}
function saveNotes(data) {
  localStorage.setItem('notes', JSON.stringify(data));
}
function renderNotes() {
  const list = document.getElementById('notes-list');
  list.innerHTML = '';
  let data = loadNotes();
  data.forEach(n => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.innerHTML = `
      <div>
        <div class="task-card-desc">${n.text.replace(/\n/g, '<br>')}</div>
      </div>
    `;
    list.appendChild(card);
  });
}
function deleteNote(id) {
  let data = loadNotes();
  data = data.filter(n => n.id !== id);
  saveNotes(data);
  renderNotes();
}

// --- Active Punishments Logic ---
function loadActivePunishments() {
  return JSON.parse(localStorage.getItem('activePunishments') || '[]');
}
function saveActivePunishments(list) {
  localStorage.setItem('activePunishments', JSON.stringify(list));
}
function renderActivePunishments() {
  const list = document.getElementById('active-punishments-list');
  const data = loadActivePunishments();
  list.innerHTML = '';
  if (data.length === 0) {
    list.innerHTML = '<div style="color:#aaa;">No active punishments.</div>';
    return;
  }
  data.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'task-card';
    const count = p.count || 1;
    card.innerHTML = `
      <div>
        <div class="task-card-title">${p.name}</div>
        <div class="task-card-desc">${p.description || ''}</div>
      </div>
      <div class="task-card-points">${count}</div>
    `;
    list.appendChild(card);
  });
}
function incrementPunishment(idx) {
  let active = loadActivePunishments();
  active[idx].count = (active[idx].count || 1) + 1;
  saveActivePunishments(active);
  renderActivePunishments();
}
function decrementPunishment(idx) {
  let active = loadActivePunishments();
  if ((active[idx].count || 1) <= 1) {
    active.splice(idx, 1);
  } else {
    active[idx].count = (active[idx].count || 1) - 1;
  }
  saveActivePunishments(active);
  renderActivePunishments();
}
function removeActivePunishment(idx) {
  let active = loadActivePunishments();
  active.splice(idx, 1);
  saveActivePunishments(active);
  renderActivePunishments();
}
// --- Add Punishments Logic ---
function renderAddPunishments() {
  const list = document.getElementById('add-punishments-list');
  if (!showAddPunishments) {
    list.innerHTML = '<div style="color:#aaa;">Press Generate Punishment to show options.</div>';
    return;
  }
  const intensity = parseInt(document.getElementById('intensity').value);
  list.innerHTML = '';
  let data = loadPunishments().filter(p => (typeof p === 'object' && p.intensity === intensity) || (typeof p === 'string' && intensity === 1));
  if (data.length === 0) {
    list.innerHTML = '<div style="color:#aaa;">No punishments for this intensity.</div>';
    return;
  }
  data.forEach(p => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.innerHTML = `
      <div>
        <div class="task-card-title">${typeof p === 'object' ? p.name : p}</div>
        <div class="task-card-desc">${p.description || ''}</div>
      </div>
      <button>Add</button>
    `;
    card.querySelector('button').onclick = () => addActivePunishment(p);
    list.appendChild(card);
  });
}
// --- Intensity slider event ---
const intensitySlider = document.getElementById('intensity');
if (intensitySlider) {
  intensitySlider.addEventListener('input', () => {
    showAddPunishments = false;
    renderAddPunishments();
  });
}
// --- Render both sections on page switch ---
function switchPage(page) {
  const pages = ['rewards', 'punishments', 'habits', 'notes'];
  pages.forEach(p => {
    document.getElementById(`${p}-page`).style.display = (p === page) ? 'block' : 'none';
    document.getElementById(`nav-${p}`).classList.toggle('active', p === page);
  });
  updateFab(page);
  if (page === 'rewards') renderRewards();
  if (page === 'notes') renderNotes();
  if (page === 'habits') displayTasks();
  if (page === 'punishments') {
    renderActivePunishments();
    renderAddPunishments();
  }
}

// On load, set FAB for default page
window.onload = function() {
  init();
  updateFab('habits');
}

// --- Auth check on page load ---
if (!localStorage.getItem('user')) {
  window.location.href = 'login.html';
}

// --- Add logout button to header ---
window.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('header');
  if (header && !document.getElementById('logout-btn')) {
    const btn = document.createElement('button');
    btn.id = 'logout-btn';
    btn.textContent = 'Logout';
    btn.style.marginLeft = '1rem';
    btn.onclick = () => {
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    };
    header.appendChild(btn);
  }
});

function addActivePunishment(punishment) {
  let active = loadActivePunishments();
  // Prevent duplicates by name
  let name = typeof punishment === 'object' ? punishment.name : punishment;
  if (!active.some(ap => (typeof ap === 'object' ? ap.name : ap) === name)) {
    // Add with count 1
    if (typeof punishment === 'object') {
      active.push({ ...punishment, count: 1 });
    } else {
      active.push({ name: punishment, count: 1 });
    }
    saveActivePunishments(active);
    renderActivePunishments();
    // Remove from add list if present
    showAddPunishments = true;
    renderAddPunishments();
  }
}

// Set profile info in app-header from logged-in user
window.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user && user.username) {
    document.getElementById('profile-name').textContent = user.username;
    document.getElementById('profile-role').textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
    document.getElementById('profile-avatar').textContent = user.username.charAt(0).toUpperCase();
  }
}); 