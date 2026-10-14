const form = document.getElementById('generate-form');
const promptInput = document.getElementById('prompt');
const output = document.getElementById('output');
const status = document.getElementById('status');
const button = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const projectsList = document.getElementById('projects');
const previewBtn = document.getElementById('preview-btn');
const downloadBtn = document.getElementById('download-btn');
const progress = document.getElementById('progress');
const eta = document.getElementById('eta');

let currentController = null;
let estimatedSeconds = 12; // heuristic

function loadProjects() {
  try {
    const raw = localStorage.getItem('promptstudio:projects');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjects(list) {
  localStorage.setItem('promptstudio:projects', JSON.stringify(list));
  renderProjects();
}

function renderProjects() {
  const list = loadProjects();
  projectsList.innerHTML = '';
  if (list.length === 0) {
    projectsList.innerHTML = '<div class="muted">No saved projects</div>';
    return;
  }
  list.forEach((p, idx) => {
    const el = document.createElement('div');
    el.className = 'project-item';
    el.innerHTML = `
      <div class="project-meta">
        <strong>${escapeHtml(p.title || p.prompt.slice(0, 40))}</strong>
        <div class="muted small">${new Date(p.created).toLocaleString()}</div>
      </div>
      <div class="project-actions">
        <button data-action="open" data-idx="${idx}">Open</button>
        <button data-action="edit" data-idx="${idx}">Edit</button>
        <button data-action="delete" data-idx="${idx}">Delete</button>
      </div>
    `;

    projectsList.appendChild(el);
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

projectsList.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.action;
  const idx = Number(btn.dataset.idx);
  const list = loadProjects();
  const project = list[idx];
  if (action === 'open') {
    promptInput.value = project.prompt;
  } else if (action === 'edit') {
    promptInput.value = project.prompt;
  } else if (action === 'delete') {
    if (!confirm('Delete this project?')) return;
    list.splice(idx, 1);
    saveProjects(list);
  }
});

saveBtn.addEventListener('click', () => {
  const prompt = promptInput.value.trim();
  if (!prompt) return alert('Enter a prompt to save.');
  const list = loadProjects();
  list.unshift({ prompt, created: Date.now(), title: prompt.slice(0, 60) });
  saveProjects(list);
  status.textContent = 'Saved locally.';
});

downloadBtn.addEventListener('click', () => {
  const content = output.textContent || '';
  if (!content) return alert('Nothing to download.');
  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'generated-site.html';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

previewBtn.addEventListener('click', () => {
  const content = output.textContent || '';
  if (!content) return alert('Nothing to preview.');
  const win = window.open('', '_blank');
  win.document.open();
  win.document.write(content);
  win.document.close();
});

cancelBtn.addEventListener('click', () => {
  if (currentController) {
    currentController.abort();
    currentController = null;
    status.textContent = 'Cancelled.';
    progress.style.width = '0%';
    eta.textContent = '';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt) {
    status.textContent = 'Please enter a prompt first.';
    return;
  }

  button.disabled = true;
  cancelBtn.disabled = false;
  status.textContent = 'Generating...';
  output.textContent = '';
  progress.style.width = '4%';
  eta.textContent = `~${estimatedSeconds}s`;

  // simple visual progress
  let elapsed = 0;
  const tick = 500;
  const interval = setInterval(() => {
    elapsed += tick / 1000;
    const pct = Math.min(90, (elapsed / estimatedSeconds) * 100);
    progress.style.width = pct + '%';
    const remaining = Math.max(0, Math.round(estimatedSeconds - elapsed));
    eta.textContent = remaining > 0 ? `~${remaining}s` : '';
  }, tick);

  currentController = new AbortController();
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: currentController.signal,
    });

    clearInterval(interval);
    progress.style.width = '100%';
    eta.textContent = '';

    const data = await res.json().catch(() => ({ ok: false, error: 'Invalid JSON from server.' }));

    if (!res.ok) {
      status.textContent = data.error || `Server error (${res.status}).`;
      button.disabled = false;
      cancelBtn.disabled = true;
      currentController = null;
      return;
    }

    output.textContent = data.content || 'No content returned.';
    status.textContent = 'Generated successfully.';
  } catch (err) {
    clearInterval(interval);
    progress.style.width = '0%';
    eta.textContent = '';
    if (err.name === 'AbortError') {
      status.textContent = 'Request cancelled.';
    } else {
      status.textContent = err.message || 'Something went wrong.';
    }
  } finally {
    button.disabled = false;
    cancelBtn.disabled = true;
    currentController = null;
  }
});

// Initialize UI
renderProjects();

// Minimal accessibility: enable keyboard interaction for project list
projectsList.tabIndex = 0;
