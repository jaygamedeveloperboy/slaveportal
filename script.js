import { notes } from './data/notes.js';
import { rewards } from './data/rewards.js';
import { punishments } from './data/punishments.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";
// Remove Firebase import
// import { db, ref, set, get, onValue, push, update } from './firebase.js';

let totalPoints = 0;
let showAddPunishments = false;

const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'login.html';
  }
  // else: user is logged in, continue loading the page
});

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
  const today = new Date();
  const todayDay = today.getDay(); // 0=Sun, 1=Mon, ...
  tasks.filter(task => {
    if (!task.frequency || task.frequency === 'daily') return true;
    if (task.frequency.startsWith('weekly')) {
      const days = (task.frequency.split(':')[1] || '').split(',').map(Number);
      return days.includes(todayDay);
    }
    return true;
  }).forEach((task, idx) => {
    const card = document.createElement('div');
    card.className = 'task-card' + (task.inactive ? ' inactive' : '');
    // Progress circles
    let circles = '';
    for (let i = 0; i < (task.max || task.points || 1); i++) {
      circles += `<div class=\"progress-circle${i < (task.completedCount || 0) ? ' filled' : ''}\"></div>`;
    }
    // Latest proof
    let latestProof = (task.proofs && task.proofs.length) ? task.proofs[task.proofs.length - 1] : null;
    card.innerHTML = `
      <div style=\"display:flex; align-items:center; justify-content:space-between;\">\n        <div class=\"task-card-title\">${task.icon ? `<span style='font-size:1.7em; margin-right:0.4em;'>${task.icon}</span>` : ''}${task.name}</div>\n        <button class=\"task-edit-btn\" title=\"Edit Task\">&#8942;</button>\n      </div>
      <div class=\"task-card-desc\">${task.description || ''}</div>
      <div class=\"task-card-progress-row\">\n        <div class=\"task-card-circles\">${circles}</div>\n        <div class=\"task-card-progress\">\n          ${(task.completedCount || 0)}/${task.max || task.points || 1}\n          <button class=\"task-card-plus-btn\">+</button>\n        </div>\n      </div>
      <div class=\"task-card-streak\" style=\"margin-top:0.5rem; color:#e09c3d; font-weight:bold; font-size:1.05rem;\">\n        <span title=\"Current streak\">🔥 ${task.streak || 0}d</span>\n      </div>
      ${task.note ? `<div class='task-card-note' style='margin-top:0.7em; color:#fff; background:#232323; border-radius:7px; padding:0.7em 1em; font-size:1em;'>📝 ${task.note}</div>` : ''}
      ${task.linkedReward ? `<div class='task-card-reward' style='margin-top:0.5em; color:#e09c3d; font-size:1em;'>🎁 Reward: ${task.linkedReward}</div>` : ''}
      ${task.linkedPunishment ? `<div class='task-card-punishment' style='margin-top:0.2em; color:#bf730b; font-size:1em;'>🔨 Punishment: ${task.linkedPunishment}</div>` : ''}
      ${latestProof ? `<div class='task-card-proof' style='margin-top:0.7em; color:#b3e09c; background:#232323; border-radius:7px; padding:0.7em 1em; font-size:1em;'>📸 Proof: ${latestProof.note ? latestProof.note : ''}${latestProof.photo ? `<br><img src='${latestProof.photo}' alt='Proof Photo' style='max-width:100px; max-height:100px; border-radius:6px; margin-top:0.5em;' />` : ''}</div>` : ''}
    `;
    // Plus button logic (now opens proof modal)
    card.querySelector('.task-card-plus-btn').onclick = () => {
      openProofModal(task.id);
    };
    // Edit button logic
    card.querySelector('.task-edit-btn').onclick = () => {
      openModal('habits', task);
    };
    taskList.appendChild(card);
  });
  updateObedienceStats();
}

// Complete a task
function completeTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task && !task.completed) {
    const today = new Date().toISOString().slice(0, 10);
    // Calculate streak
    if (task.lastCompletedDate) {
      const last = new Date(task.lastCompletedDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const lastStr = last.toISOString().slice(0, 10);
      const yestStr = yesterday.toISOString().slice(0, 10);
      if (lastStr === yestStr) {
        task.streak = (task.streak || 0) + 1;
      } else if (lastStr === today) {
        // Already completed today, do not increment
      } else {
        task.streak = 1;
      }
    } else {
      task.streak = 1;
    }
    task.lastCompletedDate = today;
    task.completed = true;
    task.completedDate = today;
    totalPoints += task.points;
    savePoints();
    saveTasks(tasks);
    updatePointsDisplay();
    displayTasks();
    updateObedienceStats();
  }
}

// --- Intensity button group logic ---
let selectedIntensity = 1;
function setIntensity(intensity) {
  selectedIntensity = intensity;
  // Update button styles
  document.querySelectorAll('.intensity-btn').forEach(btn => {
    btn.classList.toggle('selected', parseInt(btn.dataset.intensity) === intensity);
  });
  showAddPunishments = true;
  renderAddPunishments();
}
// Attach event listeners after DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.intensity-btn').forEach(btn => {
    btn.addEventListener('click', () => setIntensity(parseInt(btn.dataset.intensity)));
  });
  // Set initial selected
  setIntensity(1);
});

// Generate punishment
function generatePunishment() {
  showAddPunishments = true;
  renderAddPunishments();
  const result = document.getElementById("punishment-result");
  let data = loadPunishments();
  const intensity = selectedIntensity;
  const filtered = data.filter(p => typeof p === 'object' ? p.intensity === intensity : (typeof p === 'string' && intensity === 1));
  if (filtered.length === 0) {
    if (result) result.textContent = 'No punishments for this intensity.';
    return;
  }
  const punishment = filtered[Math.floor(Math.random() * filtered.length)];
  if (result) result.textContent = punishment.name || punishment;
  // Deduct points for punishment
  totalPoints -= 10;
  savePoints();
  updatePointsDisplay();
}

// Update FAB icon and action based on active page
function updateFab(page) {
  const fab = document.getElementById('fab');
  const fabIcon = document.getElementById('fab-icon');
  fab.style.display = 'flex'; // Always show FAB unless default case
  
  // For notes page, check which tab is active
  if (page === 'notes-page') {
    const activeTab = document.querySelector('.notes-tab.active');
    if (activeTab) {
      const tabType = activeTab.dataset.tab;
      switch(tabType) {
        case 'rules':
          fabIcon.textContent = '📜';
          fab.title = 'Add Rule';
          break;
        case 'limits':
          fabIcon.textContent = '⚠️';
          fab.title = 'Add Limit';
          break;
        case 'ideas':
          fabIcon.textContent = '💡';
          fab.title = 'Add Idea';
          break;
        case 'notes':
          fabIcon.textContent = '📝';
          fab.title = 'Add Note';
          break;
      }
      return;
    }
  }
  
  // Handle other pages with custom icons
  switch (page) {
    case 'rewards':
      fabIcon.textContent = '🎁';
      fab.title = 'Add Reward';
      break;
    case 'punishments':
      fabIcon.textContent = '🔨';
      fab.title = 'Add Punishment';
      break;
    case 'habits':
      fabIcon.textContent = '✅';
      fab.title = 'Add Task';
      break;
    default:
      fab.style.display = 'none';
  }
}

// --- Modal Logic ---
let modalType = null;
function openModal(type, item = null) {
  modalType = type;
  document.getElementById('modal-overlay').style.display = 'flex';
  const title = {
    rules: item ? 'Edit Rule' : 'Add Rule',
    limits: item ? 'Edit Limit' : 'Add Limit',
    ideas: item ? 'Edit Idea' : 'Add Idea',
    notes: item ? 'Edit Note' : 'Add Note',
    habits: item ? 'Edit Task' : 'Add Task',
    rewards: item ? 'Edit Reward' : 'Add Reward'
  }[type];
  document.getElementById('modal-title').textContent = title;
  
  const fields = document.getElementById('modal-fields');
  if (type === 'rules') {
    fields.innerHTML = `
      <input name="title" placeholder="Rule Title" value="${item ? item.title : ''}" required />
      <textarea name="description" placeholder="Description" required>${item ? item.description : ''}</textarea>
      <div class="checkbox-field">
        <input type="checkbox" name="active" id="active" ${item && item.active ? 'checked' : ''} />
        <label for="active">Active</label>
      </div>
    `;
  } else if (type === 'limits') {
    fields.innerHTML = `
      <input name="title" placeholder="Limit Title" value="${item ? item.title : ''}" required />
      <textarea name="description" placeholder="Description" required>${item ? item.description : ''}</textarea>
      <div class="radio-field">
        <input type="radio" name="type" id="hard" value="hard" ${item && item.type === 'hard' ? 'checked' : ''} />
        <label for="hard">Hard Limit</label>
        <input type="radio" name="type" id="soft" value="soft" ${item && item.type === 'soft' ? 'checked' : ''} />
        <label for="soft">Soft Limit</label>
      </div>
    `;
  } else if (type === 'ideas') {
    fields.innerHTML = `
      <input name="title" placeholder="Idea Title" value="${item ? item.title : ''}" required />
      <textarea name="description" placeholder="Description" required>${item ? item.description : ''}</textarea>
      <div class="checkbox-field">
        <input type="checkbox" name="starred" id="starred" ${item && item.starred ? 'checked' : ''} />
        <label for="starred">Starred</label>
      </div>
    `;
  } else if (type === 'notes') {
    fields.innerHTML = `
      <input name="title" placeholder="Note Title" value="${item ? item.title : ''}" required />
      <textarea name="description" placeholder="Description" required>${item ? item.description : ''}</textarea>
      <textarea name="text" placeholder="Note text" required>${item ? item.text : ''}</textarea>
    `;
  } else if (type === 'habits') {
    // Build reward and punishment options
    let rewardOptions = rewards.map(r => `<option value="${r.name}">${r.name}</option>`).join('');
    let punishmentOptions = punishments.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    // Add custom option
    rewardOptions += '<option value="__custom__">Custom...</option>';
    punishmentOptions += '<option value="__custom__">Custom...</option>';
    // Determine selected values
    const selectedReward = item ? item.linkedReward || '' : '';
    const selectedPunishment = item ? item.linkedPunishment || '' : '';
    // Modal fields
    fields.innerHTML = `
      <input name="icon" placeholder="Emoji/Icon (e.g. 🏋️)" maxlength="2" value="${item ? item.icon || '' : ''}" style="width:4em; font-size:2rem; text-align:center;" />
      <input name="name" placeholder="Task Name" value="${item ? item.name : ''}" required />
      <textarea name="description" placeholder="Description" required>${item ? item.description : ''}</textarea>
      <input name="points" type="number" min="1" placeholder="Points" value="${item ? item.points : ''}" required />
      <textarea name="note" placeholder="Reflection/Note (optional)" style="margin-top:0.7em;">${item ? item.note || '' : ''}</textarea>
      <div style='margin-top:0.7em;'><label style='font-weight:bold;'>Frequency:</label><br>
        <label><input type='radio' name='frequency' value='daily' ${!item || item.frequency === 'daily' ? 'checked' : ''}/> Daily</label>
        <label style='margin-left:1.2em;'><input type='radio' name='frequency' value='weekly' ${item && item.frequency && item.frequency.startsWith('weekly') ? 'checked' : ''}/> Weekly</label>
        <span id='weekly-days-fields' style='display:${item && item.frequency && item.frequency.startsWith('weekly') ? 'inline' : 'none'}; margin-left:0.7em;'>
          <label><input type='checkbox' name='weekday' value='0'/> Sun</label>
          <label><input type='checkbox' name='weekday' value='1'/> Mon</label>
          <label><input type='checkbox' name='weekday' value='2'/> Tue</label>
          <label><input type='checkbox' name='weekday' value='3'/> Wed</label>
          <label><input type='checkbox' name='weekday' value='4'/> Thu</label>
          <label><input type='checkbox' name='weekday' value='5'/> Fri</label>
          <label><input type='checkbox' name='weekday' value='6'/> Sat</label>
        </span>
      </div>
      <div style='margin-top:0.7em;'>
        <label style='font-weight:bold;'>Reward for Completion:</label><br>
        <select name='linkedReward' id='linkedRewardSelect' style='width:100%; margin-bottom:0.5em;'>
          <option value=''>None</option>
          ${rewardOptions}
        </select>
        <input name='linkedRewardCustom' id='linkedRewardCustom' placeholder='Custom reward...' style='display:none; width:100%; margin-bottom:0.5em;' />
      </div>
      <div style='margin-top:0.7em;'>
        <label style='font-weight:bold;'>Punishment if Missed:</label><br>
        <select name='linkedPunishment' id='linkedPunishmentSelect' style='width:100%; margin-bottom:0.5em;'>
          <option value=''>None</option>
          ${punishmentOptions}
        </select>
        <input name='linkedPunishmentCustom' id='linkedPunishmentCustom' placeholder='Custom punishment...' style='display:none; width:100%; margin-bottom:0.5em;' />
      </div>
    `;
    // Show/hide weekly days fields
    setTimeout(() => {
      const freqRadios = fields.querySelectorAll('input[name="frequency"]');
      const weeklyFields = fields.querySelector('#weekly-days-fields');
      freqRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          if (radio.value === 'weekly') {
            weeklyFields.style.display = 'inline';
          } else {
            weeklyFields.style.display = 'none';
          }
        });
      });
      // Pre-check days if editing
      if (item && item.frequency && item.frequency.startsWith('weekly')) {
        const days = (item.frequency.split(':')[1] || '').split(',').map(Number);
        weeklyFields.querySelectorAll('input[name="weekday"]').forEach(cb => {
          if (days.includes(Number(cb.value))) cb.checked = true;
        });
      }
      // Dropdown logic for custom reward/punishment
      const rewardSelect = fields.querySelector('#linkedRewardSelect');
      const rewardCustom = fields.querySelector('#linkedRewardCustom');
      const punishmentSelect = fields.querySelector('#linkedPunishmentSelect');
      const punishmentCustom = fields.querySelector('#linkedPunishmentCustom');
      // Set initial value
      if (selectedReward && !rewards.some(r => r.name === selectedReward)) {
        rewardSelect.value = '__custom__';
        rewardCustom.style.display = 'block';
        rewardCustom.value = selectedReward;
      } else {
        rewardSelect.value = selectedReward;
        rewardCustom.style.display = 'none';
      }
      if (selectedPunishment && !punishments.some(p => p.name === selectedPunishment)) {
        punishmentSelect.value = '__custom__';
        punishmentCustom.style.display = 'block';
        punishmentCustom.value = selectedPunishment;
      } else {
        punishmentSelect.value = selectedPunishment;
        punishmentCustom.style.display = 'none';
      }
      rewardSelect.addEventListener('change', () => {
        if (rewardSelect.value === '__custom__') {
          rewardCustom.style.display = 'block';
        } else {
          rewardCustom.style.display = 'none';
        }
      });
      punishmentSelect.addEventListener('change', () => {
        if (punishmentSelect.value === '__custom__') {
          punishmentCustom.style.display = 'block';
        } else {
          punishmentCustom.style.display = 'none';
        }
      });
    }, 0);
  } else if (type === 'rewards') {
    fields.innerHTML = `
      <input name="name" placeholder="Reward Name" value="${item ? item.name : ''}" required />
      <textarea name="description" placeholder="Description" required>${item ? item.description : ''}</textarea>
      <input name="cost" type="number" min="0" placeholder="Cost" value="${item ? item.cost : ''}" required />
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
  const notesData = loadNotes();
  const id = form.dataset.id || Date.now();
  
  if (modalType === 'rules') {
    const rule = {
      id: parseInt(id),
      title: form.title.value,
      description: form.description.value,
      active: form.active.checked
    };
    if (form.dataset.id) {
      const index = notesData.rules.findIndex(r => r.id === parseInt(id));
      notesData.rules[index] = rule;
    } else {
      notesData.rules.push(rule);
    }
  } else if (modalType === 'limits') {
    const limit = {
      id: parseInt(id),
      title: form.title.value,
      description: form.description.value,
      type: form.type.value
    };
    if (form.dataset.id) {
      const index = notesData.limits.findIndex(l => l.id === parseInt(id));
      notesData.limits[index] = limit;
    } else {
      notesData.limits.push(limit);
    }
  } else if (modalType === 'ideas') {
    const idea = {
      id: parseInt(id),
      title: form.title.value,
      description: form.description.value,
      starred: form.starred.checked
    };
    if (form.dataset.id) {
      const index = notesData.ideas.findIndex(i => i.id === parseInt(id));
      notesData.ideas[index] = idea;
    } else {
      notesData.ideas.push(idea);
    }
  } else if (modalType === 'notes') {
    const note = {
      id: parseInt(id),
      title: form.title.value,
      description: form.description.value,
      text: form.text.value
    };
    if (form.dataset.id) {
      const index = notesData.notes.findIndex(n => n.id === parseInt(id));
      notesData.notes[index] = note;
    } else {
      notesData.notes.push(note);
    }
  } else if (modalType === 'habits') {
    let frequency = 'daily';
    if (form.frequency) {
      if (form.frequency.value === 'weekly') {
        // Collect checked days
        const days = Array.from(form.querySelectorAll('input[name="weekday"]:checked')).map(cb => cb.value).join(',');
        frequency = 'weekly:' + days;
      } else {
        frequency = form.frequency.value;
      }
    }
    // Linked reward
    let linkedReward = '';
    if (form.linkedReward) {
      if (form.linkedReward.value === '__custom__') {
        linkedReward = form.linkedRewardCustom.value;
      } else {
        linkedReward = form.linkedReward.value;
      }
    }
    // Linked punishment
    let linkedPunishment = '';
    if (form.linkedPunishment) {
      if (form.linkedPunishment.value === '__custom__') {
        linkedPunishment = form.linkedPunishmentCustom.value;
      } else {
        linkedPunishment = form.linkedPunishment.value;
      }
    }
    const task = {
      id: parseInt(id),
      icon: form.icon.value,
      name: form.name.value,
      description: form.description.value,
      points: parseInt(form.points.value),
      note: form.note.value,
      frequency,
      linkedReward,
      linkedPunishment,
      completed: false,
      streak: 0,
      lastCompletedDate: ""
    };
    let tasksData = loadTasks();
    if (form.dataset.id) {
      const index = tasksData.findIndex(t => t.id === parseInt(id));
      tasksData[index] = { ...tasksData[index], ...task };
    } else {
      tasksData.push(task);
    }
    saveTasks(tasksData);
    displayTasks();
    closeModal();
    return;
  } else if (modalType === 'rewards') {
    const reward = {
      id: parseInt(id),
      name: form.name.value,
      description: form.description.value,
      cost: parseInt(form.cost.value)
    };
    if (form.dataset.id) {
      const index = notesData.rewards.findIndex(r => r.id === parseInt(id));
      notesData.rewards[index] = reward;
    } else {
      notesData.rewards.push(reward);
    }
  }
  
  saveNotes(notesData);
  renderNotes();
  closeModal();
}

// --- FAB opens custom punishment modal on punishments page ---
function fabAction() {
  // Find the currently visible page-section
  let currentPageElem = Array.from(document.querySelectorAll('.page-section')).find(
    el => el.style.display !== 'none'
  );
  let currentPage = currentPageElem ? currentPageElem.id : 'habits-page';
  
  // For notes page, check which tab is active
  if (currentPage === 'notes-page') {
    const activeTab = document.querySelector('.notes-tab.active');
    if (activeTab) {
      const tabType = activeTab.dataset.tab;
      openModal(tabType);
      return;
    }
  }
  
  // Handle other pages
  switch(currentPage) {
    case 'habits-page':
      openModal('habits');
      break;
    case 'punishments-page':
      openCustomPunishmentModal();
      break;
    case 'rewards-page':
      openModal('rewards');
      break;
    default:
      // fallback: do nothing
      break;
  }
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
  const intensity = parseInt(form.intensity.value);
  // Add to active punishments
  let active = loadActivePunishments();
  active.push({ name: title, description, intensity, count: 1 });
  saveActivePunishments(active);
  // Add to available punishments for future selection
  let punishments = loadPunishments();
  punishments.push({ name: title, description, intensity });
  savePunishments(punishments);
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
  const notesData = loadNotes();
  
  // Render Rules
  const rulesList = document.getElementById('rules-list');
  rulesList.innerHTML = '';
  notesData.rules.forEach((rule, i) => {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = `
      <div class="note-title">
        <span class="note-number">${i + 1}.</span>
        ${rule.title}
        <span class="note-badge ${rule.active ? 'active' : 'archived'}">${rule.active ? 'Active' : 'Archived'}</span>
      </div>
      <div class="note-desc">${rule.description}</div>
      <div class="note-controls">
        <button class="note-btn" onclick="toggleRuleStatus(${rule.id})">${rule.active ? 'Archive' : 'Activate'}</button>
        <button class="note-btn secondary" onclick="editNote('rules', ${rule.id})">Edit</button>
        <button class="note-btn secondary" onclick="deleteNote('rules', ${rule.id})">Delete</button>
      </div>
    `;
    rulesList.appendChild(item);
  });

  // Render Limits
  const limitsList = document.getElementById('limits-list');
  limitsList.innerHTML = '';
  notesData.limits.forEach((limit, i) => {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = `
      <div class="note-title">
        <span class="note-number">${i + 1}.</span>
        ${limit.title}
        <span class="note-badge ${limit.type}">${limit.type.toUpperCase()}</span>
      </div>
      <div class="note-desc">${limit.description}</div>
      <div class="note-controls">
        <button class="note-btn" onclick="toggleLimitType(${limit.id})">Toggle Type</button>
        <button class="note-btn secondary" onclick="editNote('limits', ${limit.id})">Edit</button>
        <button class="note-btn secondary" onclick="deleteNote('limits', ${limit.id})">Delete</button>
      </div>
    `;
    limitsList.appendChild(item);
  });

  // Render Ideas
  const ideasList = document.getElementById('ideas-list');
  ideasList.innerHTML = '';
  notesData.ideas.forEach((idea, i) => {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = `
      <div class="note-title">
        <span class="note-number">${i + 1}.</span>
        ${idea.title}
        <span class="note-star" onclick="toggleStar('ideas', ${idea.id})">${idea.starred ? '★' : '☆'}</span>
      </div>
      <div class="note-desc">${idea.description}</div>
      <div class="note-controls">
        <button class="note-btn secondary" onclick="editNote('ideas', ${idea.id})">Edit</button>
        <button class="note-btn secondary" onclick="deleteNote('ideas', ${idea.id})">Delete</button>
      </div>
    `;
    ideasList.appendChild(item);
  });

  // Render Notes
  const notesList = document.getElementById('notes-list');
  notesList.innerHTML = '';
  notesData.notes.forEach((note, i) => {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = `
      <div class="note-title">
        <span class="note-number">${i + 1}.</span>
        ${note.title}
      </div>
      <div class="note-desc">${note.description}</div>
      <div class="note-text">${note.text.replace(/\n/g, '<br>')}</div>
      <div class="note-controls">
        <button class="note-btn secondary" onclick="editNote('notes', ${note.id})">Edit</button>
        <button class="note-btn secondary" onclick="deleteNote('notes', ${note.id})">Delete</button>
      </div>
    `;
    notesList.appendChild(item);
  });
  updateFab('notes-page'); // Ensure FAB is updated after rendering notes
}

function toggleRuleStatus(id) {
  const notesData = loadNotes();
  const rule = notesData.rules.find(r => r.id === id);
  if (rule) {
    rule.active = !rule.active;
    saveNotes(notesData);
    renderNotes();
  }
}

function toggleLimitType(id) {
  const notesData = loadNotes();
  const limit = notesData.limits.find(l => l.id === id);
  if (limit) {
    limit.type = limit.type === 'hard' ? 'soft' : 'hard';
    saveNotes(notesData);
    renderNotes();
  }
}

function toggleStar(type, id) {
  const notesData = loadNotes();
  const item = notesData[type].find(i => i.id === id);
  if (item) {
    item.starred = !item.starred;
    saveNotes(notesData);
    renderNotes();
  }
}

function deleteNote(type, id) {
  const notesData = loadNotes();
  notesData[type] = notesData[type].filter(n => n.id !== id);
  saveNotes(notesData);
  renderNotes();
}

function editNote(type, id) {
  const notesData = loadNotes();
  const item = notesData[type].find(n => n.id === id);
  if (item) {
    openModal(type, item);
  }
}

// Update tab switching
document.querySelectorAll('.notes-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // Update active tab
    document.querySelectorAll('.notes-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Show corresponding content
    const tabId = tab.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabId}-content`).classList.add('active');
    
    // Update FAB for the current tab
    updateFab('notes-page');
  });
});

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
    card.dataset.idx = i;
    card.innerHTML = `
      <div style="flex:1;">
        <div class="task-card-title">${p.name}</div>
        <div class="task-card-desc">${p.description || ''}</div>
      </div>
      <div class="punishment-controls">
        <div class="count-controls">
          <button class="count-btn count-minus" title="Decrease">-</button>
          <span class="punishment-count">${p.count || 1}</span>
          <button class="count-btn count-plus" title="Increase">+</button>
        </div>
        <button class="complete-btn">Complete</button>
      </div>
    `;
    list.appendChild(card);
  });
}

// Event delegation for active punishments controls
const activePunishmentsList = document.getElementById('active-punishments-list');
if (activePunishmentsList) {
  activePunishmentsList.onclick = function(e) {
    const card = e.target.closest('.task-card');
    if (!card) return;
    const idx = parseInt(card.dataset.idx);
    if (e.target.classList.contains('count-plus')) {
      incrementPunishment(idx);
    } else if (e.target.classList.contains('count-minus')) {
      decrementPunishment(idx);
    } else if (e.target.classList.contains('complete-btn')) {
      completePunishment(idx);
    }
  };
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
    list.innerHTML = '<div style="color:#aaa;">Press an intensity to show options.</div>';
    return;
  }
  const intensity = selectedIntensity;
  list.innerHTML = '';
  let allPunishments = loadPunishments();
  let data = allPunishments.filter(p => (typeof p === 'object' && p.intensity === intensity) || (typeof p === 'string' && intensity === 1));
  if (data.length === 0) {
    list.innerHTML = '<div style="color:#aaa;">No punishments for this intensity.</div>';
    return;
  }
  data.forEach(p => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.innerHTML = `
      <div style="flex:1;">
        <div class="task-card-title">${typeof p === 'object' ? p.name : p}</div>
        <div class="task-card-desc">${p.description || ''}</div>
      </div>
      <div style="display:flex; flex-direction:row; justify-content:flex-end; align-items:center; gap:0.5rem; margin-top:0.7rem;">
        <button class="add-btn">Add</button>
        <button class="trash-btn" title="Delete">🗑️</button>
      </div>
    `;
    card.querySelector('.add-btn').onclick = () => addActivePunishment(p);
    card.querySelector('.trash-btn').onclick = () => deletePunishmentByNameAndIntensity(p.name || p, intensity);
    list.appendChild(card);
  });
}

// Delete any punishment by name and intensity
function deletePunishmentByNameAndIntensity(name, intensity) {
  let allPunishments = loadPunishments();
  let newList = allPunishments.filter(p => !(typeof p === 'object' ? (p.name === name && p.intensity === intensity) : (p === name && intensity === 1)));
  savePunishments(newList);
  renderAddPunishments();
}

// Clear all punishments for the selected intensity
const clearBtn = document.getElementById('clear-intensity-btn');
if (clearBtn) {
  clearBtn.onclick = function() {
    let allPunishments = loadPunishments();
    let newList = allPunishments.filter(p => !(typeof p === 'object' ? p.intensity === selectedIntensity : selectedIntensity === 1));
    savePunishments(newList);
    renderAddPunishments();
  };
}

// --- Render both sections on page switch ---
function switchPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page-section').forEach(page => {
    page.style.display = 'none';
  });
  // Show selected page
  document.getElementById(pageId).style.display = 'block';
  // Update active state in bottom nav
  document.querySelectorAll('.circle-btn').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[id^="nav-"][onclick*="${pageId}"]`).classList.add('active');
  updateFab(pageId.split('-')[0]);
  if (pageId === 'rewards-page') renderRewards();
  if (pageId === 'notes-page') {
    renderNotes();
    updateFab('notes-page');
  }
  if (pageId === 'habits-page') displayTasks();
  if (pageId === 'punishments-page') {
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
  // Existing profile info code...
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user && (user.name || user.username)) {
    // Update header profile
    document.getElementById('profile-name').textContent = user.name || user.username;
    document.getElementById('profile-role').textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
    const headerAvatar = document.getElementById('profile-avatar');
    if (user.avatar) {
      if (user.avatar.startsWith('http') || user.avatar.startsWith('data:image')) {
        headerAvatar.innerHTML = `<img src="${user.avatar}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      } else {
        headerAvatar.textContent = user.avatar;
      }
    } else {
      headerAvatar.textContent = (user.name || user.username).charAt(0).toUpperCase();
    }

    // Update drawer profile
    document.getElementById('drawer-profile-name').textContent = user.name || user.username;
    document.getElementById('drawer-profile-role').textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
    const drawerAvatar = document.getElementById('drawer-profile-avatar');
    if (user.avatar) {
      if (user.avatar.startsWith('http') || user.avatar.startsWith('data:image')) {
        drawerAvatar.innerHTML = `<img src="${user.avatar}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      } else {
        drawerAvatar.textContent = user.avatar;
      }
    } else {
      drawerAvatar.textContent = (user.name || user.username).charAt(0).toUpperCase();
    }
  }
  // Always hide drawer and overlay on load
  const drawerOverlay = document.getElementById('drawer-overlay');
  const sideDrawer = document.getElementById('side-drawer');
  if (drawerOverlay) drawerOverlay.classList.remove('open');
  if (sideDrawer) sideDrawer.classList.remove('open');
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

// --- Side Drawer Logic ---
function openDrawer() {
  document.getElementById('drawer-overlay').classList.add('open');
  document.getElementById('side-drawer').classList.add('open');
}

function closeDrawer() {
  document.getElementById('drawer-overlay').classList.remove('open');
  document.getElementById('side-drawer').classList.remove('open');
}

// Initialize drawer functionality
document.addEventListener('DOMContentLoaded', function() {
  // Menu button click handler
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) {
    menuBtn.onclick = openDrawer;
  }

  // Close drawer when clicking overlay
  const overlay = document.getElementById('drawer-overlay');
  if (overlay) {
    overlay.onclick = closeDrawer;
  }

  // Update profile display
  updateProfileDisplay();
});

function logout() {
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}
window.logout = logout;

// Update profile display in both header and drawer
function updateProfileDisplay() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user && (user.name || user.username)) {
    // Update header profile
    document.getElementById('profile-name').textContent = user.name || user.username;
    document.getElementById('profile-role').textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
    const headerAvatar = document.getElementById('profile-avatar');
    if (user.avatar) {
      if (user.avatar.startsWith('http') || user.avatar.startsWith('data:image')) {
        headerAvatar.innerHTML = `<img src="${user.avatar}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      } else {
        headerAvatar.textContent = user.avatar;
      }
    } else {
      headerAvatar.textContent = (user.name || user.username).charAt(0).toUpperCase();
    }

    // Update drawer profile
    document.getElementById('drawer-profile-name').textContent = user.name || user.username;
    document.getElementById('drawer-profile-role').textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
    const drawerAvatar = document.getElementById('drawer-profile-avatar');
    if (user.avatar) {
      if (user.avatar.startsWith('http') || user.avatar.startsWith('data:image')) {
        drawerAvatar.innerHTML = `<img src="${user.avatar}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      } else {
        drawerAvatar.textContent = user.avatar;
      }
    } else {
      drawerAvatar.textContent = (user.name || user.username).charAt(0).toUpperCase();
    }
  }
}

window.switchPage = switchPage;
window.fabAction = fabAction;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.generatePunishment = generatePunishment;
window.openModal = openModal;
window.closeModal = closeModal;
window.submitModal = submitModal;
window.openCustomPunishmentModal = openCustomPunishmentModal;
window.closeCustomPunishmentModal = closeCustomPunishmentModal;
window.submitCustomPunishment = submitCustomPunishment;
window.logout = logout;

// Add password change modal HTML to the body
document.body.insertAdjacentHTML('beforeend', `
  <div id="change-password-modal" class="modal-overlay" style="display:none;">
    <div class="modal">
      <button class="modal-close" onclick="closeChangePasswordModal()">&times;</button>
      <h2>Change Password</h2>
      <form id="change-password-form" onsubmit="submitChangePassword(event)">
        <input name="current-password" type="password" placeholder="Current Password" required />
        <input name="new-password" type="password" placeholder="New Password" required />
        <input name="confirm-password" type="password" placeholder="Confirm New Password" required />
        <div class="error" id="change-password-error"></div>
        <button type="submit" class="modal-submit">Change Password</button>
      </form>
    </div>
  </div>
`);

// Add change password link to drawer
document.getElementById('side-drawer').insertAdjacentHTML('beforeend', `
  <button class="drawer-link" onclick="openChangePasswordModal()">Change Password</button>
`);

function openChangePasswordModal() {
  document.getElementById('change-password-modal').style.display = 'flex';
  document.getElementById('change-password-form').reset();
  document.getElementById('change-password-error').textContent = '';
  closeDrawer();
}

function closeChangePasswordModal() {
  document.getElementById('change-password-modal').style.display = 'none';
}

function submitChangePassword(event) {
  event.preventDefault();
  const form = event.target;
  const currentPassword = form['current-password'].value;
  const newPassword = form['new-password'].value;
  const confirmPassword = form['confirm-password'].value;
  
  // Get current user
  const currentUser = JSON.parse(localStorage.getItem('user'));
  if (!currentUser) {
    window.location.href = 'login.html';
    return false;
  }

  // Verify current password
  if (currentPassword !== currentUser.password) {
    document.getElementById('change-password-error').textContent = 'Current password is incorrect.';
    return false;
  }

  // Check if new passwords match
  if (newPassword !== confirmPassword) {
    document.getElementById('change-password-error').textContent = 'New passwords do not match.';
    return false;
  }

  // Update password in accounts
  let accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
  const updatedAccounts = accounts.map(acc => {
    if (acc.username === currentUser.username) {
      return { ...acc, password: newPassword };
    }
    return acc;
  });
  localStorage.setItem('accounts', JSON.stringify(updatedAccounts));

  // Update current user
  currentUser.password = newPassword;
  localStorage.setItem('user', JSON.stringify(currentUser));

  // Show success message and close modal
  alert('Password has been changed successfully.');
  closeChangePasswordModal();
  return false;
}

// Add change avatar modal HTML to the body
if (!document.getElementById('change-avatar-modal')) {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="change-avatar-modal" class="modal-overlay" style="display:none;">
      <div class="modal">
        <button class="modal-close" onclick="closeChangeAvatarModal()">&times;</button>
        <h2>Change Avatar</h2>
        <form id="change-avatar-form" onsubmit="submitChangeAvatar(event)">
          <label for="new-avatar-input">Upload new photo:</label>
          <input type="file" id="new-avatar-input" accept="image/*" style="margin-bottom:0.5rem;" />
          <label for="new-avatar-emoji">Or enter emoji:</label>
          <input name="new-avatar-emoji" id="new-avatar-emoji" placeholder="Or emoji (e.g. 😈)" maxlength="2" style="margin-bottom:1.2rem;" />
          <div class="error" id="change-avatar-error"></div>
          <button type="submit" class="modal-submit">Change Avatar</button>
        </form>
      </div>
    </div>
  `);
}

// Add change avatar link to drawer if not already present
if (!document.getElementById('change-avatar-btn')) {
  document.getElementById('side-drawer').insertAdjacentHTML('beforeend', `
    <button class="drawer-link" id="change-avatar-btn" onclick="openChangeAvatarModal()">Change Avatar</button>
  `);
}

function openChangeAvatarModal() {
  document.getElementById('change-avatar-modal').style.display = 'flex';
  document.getElementById('change-avatar-form').reset();
  document.getElementById('change-avatar-error').textContent = '';
  closeDrawer();
}

function closeChangeAvatarModal() {
  document.getElementById('change-avatar-modal').style.display = 'none';
}

async function submitChangeAvatar(event) {
  event.preventDefault();
  const form = event.target;
  const avatarInput = document.getElementById('new-avatar-input');
  const avatarEmoji = document.getElementById('new-avatar-emoji').value.trim();
  let newAvatar = '';
  if (avatarInput.files && avatarInput.files[0]) {
    // Convert image to data URL
    const file = avatarInput.files[0];
    newAvatar = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  } else if (avatarEmoji) {
    newAvatar = avatarEmoji;
  } else {
    document.getElementById('change-avatar-error').textContent = 'Please select an image or enter an emoji.';
    return false;
  }
  // Get current user
  let currentUser = JSON.parse(localStorage.getItem('user'));
  if (!currentUser) {
    window.location.href = 'login.html';
    return false;
  }
  // Update avatar in user and accounts
  currentUser.avatar = newAvatar;
  localStorage.setItem('user', JSON.stringify(currentUser));
  let accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
  accounts = accounts.map(acc => acc.username === currentUser.username ? { ...acc, avatar: newAvatar } : acc);
  localStorage.setItem('accounts', JSON.stringify(accounts));
  // Update UI
  updateProfileDisplay();
  alert('Avatar updated successfully!');
  closeChangeAvatarModal();
  return false;
}

// Export the new functions
export {
  switchPage,
  fabAction,
  openDrawer,
  closeDrawer,
  generatePunishment,
  openModal,
  closeModal,
  submitModal,
  openCustomPunishmentModal,
  closeCustomPunishmentModal,
  submitCustomPunishment,
  logout,
  openChangePasswordModal,
  closeChangePasswordModal,
  submitChangePassword,
  openChangeAvatarModal,
  closeChangeAvatarModal,
  submitChangeAvatar
};

// Store completed punishments in localStorage
function completePunishment(idx) {
  let active = loadActivePunishments();
  let completed = JSON.parse(localStorage.getItem('completedPunishments') || '[]');
  completed.push(active[idx]);
  localStorage.setItem('completedPunishments', JSON.stringify(completed));
  active.splice(idx, 1);
  saveActivePunishments(active);
  renderActivePunishments();
}

// --- Obedience Score & Streak Logic ---
function updateObedienceStats() {
  const tasks = loadTasks();
  const today = new Date().toISOString().slice(0, 10);
  let completedToday = 0;
  tasks.forEach(task => {
    if (task.completedDate === today) {
      completedToday++;
    }
  });
  // Persistent obedience score logic
  let obedience = parseFloat(localStorage.getItem('obedienceScore') || '100');
  let lastObedienceDate = localStorage.getItem('lastObedienceDate') || '';
  if (lastObedienceDate !== today) {
    // Only update once per day
    const missed = tasks.length - completedToday;
    if (tasks.length > 0) {
      if (missed === 0) {
        obedience = Math.min(100, obedience + 10);
      } else {
        obedience = Math.max(0, obedience - missed * 5);
      }
    }
    localStorage.setItem('obedienceScore', obedience);
    localStorage.setItem('lastObedienceDate', today);
  }
  const percent = Math.round(obedience);
  const bar = document.getElementById('obedience-bar');
  const percentText = document.getElementById('obedience-bar-percent');
  if (bar) bar.style.width = percent + '%';
  if (percentText) percentText.textContent = percent + '%';
  // Streak logic: store streak in localStorage, increment if all tasks completed today
  let streak = parseInt(localStorage.getItem('habitStreak') || '0');
  let lastStreakDate = localStorage.getItem('lastStreakDate') || '';
  const allCompleted = tasks.length > 0 && tasks.every(task => task.completedDate === today);
  if (allCompleted && lastStreakDate !== today) {
    if (lastStreakDate === getYesterday()) {
      streak++;
    } else {
      streak = 1;
    }
    localStorage.setItem('habitStreak', streak);
    localStorage.setItem('lastStreakDate', today);
  } else if (!allCompleted && lastStreakDate !== today) {
    // If not all completed and it's a new day, reset streak
    if (lastStreakDate !== today) {
      streak = 0;
      localStorage.setItem('habitStreak', streak);
    }
  }
  document.getElementById('habit-streak').textContent = `Streak: ${streak}d`;
}
function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
// Patch completeTask to mark completedDate
const originalCompleteTask = completeTask;
completeTask = function(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task && !task.completed) {
    const today = new Date().toISOString().slice(0, 10);
    // Calculate streak
    if (task.lastCompletedDate) {
      const last = new Date(task.lastCompletedDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const lastStr = last.toISOString().slice(0, 10);
      const yestStr = yesterday.toISOString().slice(0, 10);
      if (lastStr === yestStr) {
        task.streak = (task.streak || 0) + 1;
      } else if (lastStr === today) {
        // Already completed today, do not increment
      } else {
        task.streak = 1;
      }
    } else {
      task.streak = 1;
    }
    task.lastCompletedDate = today;
    task.completed = true;
    task.completedDate = today;
    totalPoints += task.points;
    savePoints();
    saveTasks(tasks);
    updatePointsDisplay();
    displayTasks();
    updateObedienceStats();
  }
};
// Patch displayTasks to update stats after rendering
const originalDisplayTasks = displayTasks;
displayTasks = function() {
  originalDisplayTasks();
  updateObedienceStats();
};
// On page load, update stats
if (document.getElementById('obedience-score')) {
  updateObedienceStats();
}

// --- Notepad Logic ---
window.addEventListener('DOMContentLoaded', () => {
  const notepad = document.getElementById('notepad');
  if (notepad) {
    // Load saved notepad content
    notepad.value = localStorage.getItem('notepadContent') || '';
    // Save on input
    notepad.addEventListener('input', () => {
      localStorage.setItem('notepadContent', notepad.value);
    });
  }
});

window.toggleRuleStatus = toggleRuleStatus;
window.toggleLimitType = toggleLimitType;
window.toggleStar = toggleStar;
window.editNote = editNote;
window.deleteNote = deleteNote;

// --- Proof Modal Logic ---
let proofTaskId = null;
function openProofModal(taskId) {
  proofTaskId = taskId;
  document.getElementById('proof-modal').style.display = 'flex';
  document.getElementById('proof-form').reset();
}
function closeProofModal() {
  document.getElementById('proof-modal').style.display = 'none';
  proofTaskId = null;
}
async function submitProof(event) {
  event.preventDefault();
  const form = event.target;
  const note = form.proofNote.value.trim();
  const photoInput = form.proofPhoto;
  let photoData = '';
  if (photoInput.files && photoInput.files[0]) {
    const file = photoInput.files[0];
    photoData = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
  // Save proof to the task
  let tasksData = loadTasks();
  const task = tasksData.find(t => t.id === proofTaskId);
  if (task) {
    if (!task.proofs) task.proofs = [];
    task.proofs.push({
      date: new Date().toISOString().slice(0, 10),
      note,
      photo: photoData
    });
    // Mark as completed
    task.completed = true;
    task.completedDate = new Date().toISOString().slice(0, 10);
    // Streak logic (reuse from completeTask)
    const today = new Date().toISOString().slice(0, 10);
    if (task.lastCompletedDate) {
      const last = new Date(task.lastCompletedDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const lastStr = last.toISOString().slice(0, 10);
      const yestStr = yesterday.toISOString().slice(0, 10);
      if (lastStr === yestStr) {
        task.streak = (task.streak || 0) + 1;
      } else if (lastStr === today) {
        // Already completed today, do not increment
      } else {
        task.streak = 1;
      }
    } else {
      task.streak = 1;
    }
    task.lastCompletedDate = today;
    saveTasks(tasksData);
    displayTasks();
    closeProofModal();
  }
}

window.closeProofModal = closeProofModal;
window.submitProof = submitProof;

document.addEventListener('DOMContentLoaded', () => {
  // Set initial page
  switchPage('habits-page');
}); 