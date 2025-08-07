// script.js
import { addDoc, collection, doc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from './firebase-config.js';

const userModal = document.getElementById('userModal');
const userForm = document.getElementById('userForm');
const thoughtDisplay = document.getElementById('thought-display');
const nextBtn = document.getElementById('nextBtn');
const downloadBtn = document.getElementById('downloadBtn');
const categoryFilter = document.getElementById('categoryFilter');
const filteredThoughts = document.getElementById('filteredThoughts');

// Tabs
const tabs = document.querySelectorAll('.bottom-nav a');
const tabContents = document.querySelectorAll('.tab-content');
const pageTitle = document.getElementById('pageTitle');

let thoughtsList = [];
let currentIndex = 0;

// Check if user already exists in localStorage
window.addEventListener('DOMContentLoaded', async () => {
  if (!localStorage.getItem('userSubmitted')) {
    userModal.style.display = 'flex';
  } else {
    await loadThoughts();
    displayThought(currentIndex);
    loadAppInfo();
  }
});

// Save user to Firestore and localStorage
userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;

  try {
    await addDoc(collection(db, 'users'), { name, email });
    localStorage.setItem('userSubmitted', 'true');
    userModal.style.display = 'none';
    await loadThoughts();
    displayThought(currentIndex);
    loadAppInfo();
  } catch (err) {
    alert('Error saving user: ' + err.message);
  }
});

// Load all thoughts
async function loadThoughts() {
  const querySnapshot = await getDocs(collection(db, 'thoughts'));
  thoughtsList = [];
  querySnapshot.forEach((doc) => {
    thoughtsList.push({ id: doc.id, ...doc.data() });
  });
}

// Display current thought
function displayThought(index) {
  const thought = thoughtsList[index];
  if (!thought) return;

  thoughtDisplay.innerHTML = '';
  downloadBtn.style.display = 'none';

  if (thought.type === 'image') {
    const img = document.createElement('img');
    img.src = thought.content;
    img.alt = "Daily Image Thought";
    thoughtDisplay.appendChild(img);
  } else {
    const p = document.createElement('p');
    p.textContent = thought.content;
    p.style.fontSize = '18px';
    thoughtDisplay.appendChild(p);
  }

  if (thought.downloadable) {
    downloadBtn.style.display = 'inline-block';
    downloadBtn.onclick = () => downloadThought(thought);
  }
}

// Download thought
function downloadThought(thought) {
  const blob = new Blob([thought.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = thought.type === 'image' ? thought.content : url;
  a.download = `thought-${Date.now()}.${thought.type === 'image' ? 'jpg' : 'txt'}`;
  a.click();
  URL.revokeObjectURL(url);
}

// Next button
nextBtn.addEventListener('click', () => {
  if (thoughtsList.length === 0) return;
  currentIndex = (currentIndex + 1) % thoughtsList.length;
  displayThought(currentIndex);
});

// Tab Navigation
tabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    e.preventDefault();
    const target = e.target.closest('a').dataset.tab;

    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(target).classList.add('active');

    pageTitle.textContent = tab.querySelector('i').classList.contains('fa-home')
      ? 'Home 🏠'
      : tab.querySelector('i').classList.contains('fa-folder')
        ? 'Category 📁'
        : 'About ℹ️';

    if (target === 'categoryTab') renderFilteredThoughts();
  });
});

// Filter thoughts
categoryFilter.addEventListener('change', renderFilteredThoughts);

function renderFilteredThoughts() {
  const filter = categoryFilter.value;
  filteredThoughts.innerHTML = '<p>Loading...</p>';

  let filtered = thoughtsList;
  if (filter) {
    filtered = thoughtsList.filter(t => t.category === filter);
  }

  filteredThoughts.innerHTML = '';
  if (filtered.length === 0) {
    filteredThoughts.innerHTML = '<p>No thoughts available.</p>';
    return;
  }

  filtered.forEach(t => {
    const div = document.createElement('div');
    div.style.margin = '15px 0'; 
    div.style.padding = '10px';
    div.style.border = '1px solid #eee';
    div.style.borderRadius = '8px';

    if (t.type === 'image') {
      const img = document.createElement('img');
      img.src = t.content;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '200px';
      div.appendChild(img);
    } else {
      const p = document.createElement('p');
      p.textContent = t.content;
      div.appendChild(p);
    }

    if (t.downloadable) {
      const btn = document.createElement('button');
      btn.textContent = 'Download';
      btn.onclick = () => downloadThought(t);
      div.appendChild(btn);
    }

    filteredThoughts.appendChild(div);
  });
}

// Load About Info
async function loadAppInfo() {
  const docRef = doc(db, 'app_info', 'details');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    document.getElementById('devDetail').textContent = data.developer || 'N/A';
    document.getElementById('version').textContent = data.version || 'N/A';
    document.getElementById('buildNumber').textContent = data.buildNumber || 'N/A';
    document.getElementById('minOS').textContent = data.minOS || 'N/A';
  }
}