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
      <h3>${task.name}</h3>
      <p>Points: ${task.points}</p>
      <button onclick="completeTask(${task.id})" ${task.completed ? 'disabled' : ''}>
        ${task.completed ? 'Completed' : 'Complete Task'}
      </button>
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
    card.style.background = '#a02929';
    card.innerHTML = `
      <h3>${p.name || p}</h3>
      <p>${p.description || ''}</p>
      ${p.intensity ? `<span>Intensity: ${p.intensity}</span><br>` : ''}
      <button onclick="deletePunishment(${p.id})">Delete</button>
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
    card.style.background = '#a02929';
    card.innerHTML = `
      <h3>${r.name}</h3>
      <p>${r.description}</p>
      <div class="reward-actions">
        <span>Cost: ${r.cost}</span>
        <button onclick="buyReward(${r.id})">BUY</button>
        <button onclick="redeemReward(${r.id})">REDEEM</button>
      </div>
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
    card.style.background = '#333';
    card.innerHTML = `
      <p>${n.text.replace(/\n/g, '<br>')}</p>
      <button onclick="deleteNote(${n.id})">Delete</button>
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
      <div style="flex:1;">
        <span style="font-weight:600;">${p.name}</span>
        ${p.description ? `<div style='font-size:0.98em;color:#ccc;margin-top:2px;'>${p.description}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <span class="icon-btn" onclick="decrementPunishment(${i})" title="Decrease">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </span>
        <span style="min-width:1.5em;text-align:center;font-weight:600;">${count}</span>
        <span class="icon-btn" onclick="incrementPunishment(${i})" title="Increase">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </span>
        <button class="trash-btn" title="Remove" onclick="removeActivePunishment(${i})">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    `;
    // Attach event listeners for plus/minus/trash
    card.querySelectorAll('.icon-btn')[0].onclick = () => decrementPunishment(i);
    card.querySelectorAll('.icon-btn')[1].onclick = () => incrementPunishment(i);
    card.querySelector('.trash-btn').onclick = () => removeActivePunishment(i);
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
    card.innerHTML = `<span>${typeof p === 'object' ? p.name : p}</span><button>Add</button>`;
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