// user-script.js
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from './firebase-config.js';

// --- DOM Elements ---
// Auth
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authNameInput = document.getElementById('authName');
const authEmailInput = document.getElementById('authEmail');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authModalTitle = document.getElementById('authModalTitle');
const authModalSubtitle = document.getElementById('authModalSubtitle');
const switchAuthText = document.getElementById('switchAuthText');
const switchAuthLink = document.getElementById('switchAuthLink');
const authToast = document.getElementById('authToast');
const logoutBtn = document.getElementById('logoutBtn');
const userNameDisplay = document.getElementById('userNameDisplay');

// App Content
const thoughtDisplay = document.getElementById('thought-display');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const downloadBtn = document.getElementById('downloadBtn');
const categoryFilter = document.getElementById('categoryFilter');
const filteredThoughts = document.getElementById('filteredThoughts');
const tabs = document.querySelectorAll('.bottom-nav a');
const tabContents = document.querySelectorAll('.tab-content');
const thoughtCounter = document.getElementById('thoughtCounter');
const userBar = document.getElementById('userBar'); // User Info Bar

// --- State ---
let thoughts = [];
let index = 0;
let toastInterval;
let toastData = [];
let toastIndex = 0;
let currentTheme = '';
let userViewedCount = 0;
let currentUser = null; // Will hold user data { id, name, email }

// --- Auth State ---
let isLoginMode = true; // Toggle between Login and Signup

// =============== AUTH FUNCTIONS ===============
function showAuthToast(message, isSuccess = true) {
    authToast.textContent = message;
    authToast.style.background = isSuccess ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)';
    authToast.classList.add('show');
    setTimeout(() => {
        authToast.classList.remove('show');
    }, 3000);
}

function switchAuthMode() {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authModalTitle.textContent = 'Welcome Back!';
        authModalSubtitle.textContent = 'Please log in to continue.';
        authSubmitBtn.textContent = 'Log In';
        switchAuthText.innerHTML = `Don't have an account? `;
        switchAuthLink.textContent = 'Sign Up';
    } else {
        authModalTitle.textContent = 'Join Us!';
        authModalSubtitle.textContent = 'Create an account to get started.';
        authSubmitBtn.textContent = 'Sign Up';
        switchAuthText.innerHTML = `Already have an account? `;
        switchAuthLink.textContent = 'Log In';
    }
    // Clear form for signup
    if (!isLoginMode) {
        authForm.reset();
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const name = authNameInput.value.trim();
    const email = authEmailInput.value.trim().toLowerCase(); // Normalize email

    if (!name || !email) {
        showAuthToast('Please fill in all fields.', false);
        return;
    }

    try {
        if (isLoginMode) {
            // --- LOGIN LOGIC ---
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', email), where('name', '==', name), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                currentUser = {
                    id: userDoc.id,
                    name: userData.name,
                    email: userData.email
                };
                saveUserToLocalStorage(currentUser);
                userNameDisplay.textContent = currentUser.name; // Update display name
                userBar.style.display = 'flex'; // SHOW the user bar on successful login
                showAuthToast('Login Success! Now, you can use the App.');
                authModal.style.display = 'none';
                await initApp(); // Load app content
            } else {
                showAuthToast('No account found with that name and email.', false);
            }
        } else {
            // --- SIGNUP LOGIC ---
            // Check if user already exists
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', email), where('name', '==', name), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                 // User exists, treat as login
                 const userDoc = querySnapshot.docs[0];
                 const userData = userDoc.data();
                 currentUser = {
                     id: userDoc.id,
                     name: userData.name,
                     email: userData.email
                 };
                 saveUserToLocalStorage(currentUser);
                 userNameDisplay.textContent = currentUser.name; // Update display name
                 userBar.style.display = 'flex'; // SHOW the user bar on successful "login after signup"
                 showAuthToast('Account found! Welcome back.');
                 authModal.style.display = 'none';
                 await initApp();
            } else {
                // Create new user
                const newUserRef = await addDoc(collection(db, 'users'), { name, email });
                currentUser = { id: newUserRef.id, name, email };
                saveUserToLocalStorage(currentUser);
                userNameDisplay.textContent = currentUser.name; // Update display name
                userBar.style.display = 'flex'; // SHOW the user bar on successful signup
                showAuthToast('Sign Up Successful! Welcome!');
                authModal.style.display = 'none';
                await initApp();
            }
        }
    } catch (err) {
        console.error('Auth Error:', err);
        showAuthToast(`Auth failed: ${err.message}`, false);
    }
}

function saveUserToLocalStorage(user) {
    localStorage.setItem('dailyThoughtUser', JSON.stringify(user));
}

function loadUserFromLocalStorage() {
    const userStr = localStorage.getItem('dailyThoughtUser');
    return userStr ? JSON.parse(userStr) : null;
}

function logout() {
    currentUser = null;
    localStorage.removeItem('dailyThoughtUser');
    // Ensure the user bar is hidden on logout
    userBar.style.display = 'none';
    authForm.reset();
    isLoginMode = true; // Reset to login mode
    switchAuthMode(); // Ensure UI reflects login mode
    authModal.style.display = 'flex'; // Show auth modal again
    // Stop any running intervals/toasts
    clearInterval(toastInterval);
    document.getElementById('dailyToast')?.remove();
    // Reset UI content
    thoughtDisplay.innerHTML = '<p class="placeholder">Please log in to see thoughts.</p>';
    thoughtCounter.textContent = '0 of 0';
    nextBtn.disabled = true;
    prevBtn.disabled = true;
    downloadBtn.style.display = 'none';
    filteredThoughts.innerHTML = '<p>Please log in to see filtered thoughts.</p>';
    document.getElementById('devDetail').textContent = 'Loading...';
    document.getElementById('version').textContent = 'Loading...';
    document.getElementById('buildNumber').textContent = 'Loading...';
    document.getElementById('minOS').textContent = 'Loading...';
    // Reset viewed count for next session
    userViewedCount = 0;
}


// =============== APP INIT & CONTENT FUNCTIONS ===============
// (Most of these functions remain similar, but now use `currentUser` and check auth state)

window.addEventListener('DOMContentLoaded', async () => {
    // Check for existing session
    currentUser = loadUserFromLocalStorage();
    if (currentUser) {
        userNameDisplay.textContent = currentUser.name;
        // Ensure the user bar is visible if user data is found in localStorage
        userBar.style.display = 'flex';
        await initApp();
    } else {
        // No session, show auth modal
        // Ensure the user bar is hidden if no user is found
        userBar.style.display = 'none';
        switchAuthMode(); // Set initial mode (login)
        authModal.style.display = 'flex';
    }
});

authForm.addEventListener('submit', handleAuthSubmit);
switchAuthLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthMode();
});
logoutBtn.addEventListener('click', logout);

async function initApp() {
  if (!currentUser) return; // Safety check
  await loadThoughts();
  await loadAppInfo();
  await loadDailyContent(); // For toast data and theme
  if (thoughts.length > 0) {
    displayThought(index);
    updateCounter();
  } else {
      thoughtCounter.textContent = '0 of 0';
  }
  startToastRotation();
}

async function loadThoughts() {
  try {
    const snapshot = await getDocs(collection(db, 'thoughts'));
    thoughts = [];
    snapshot.forEach(doc => {
      thoughts.push({ id: doc.id, ...doc.data() });
    });
    if (thoughts.length === 0) {
      thoughtDisplay.innerHTML = '<p>No thoughts available yet.</p>';
    }
    // Enable/disable buttons based on content
    nextBtn.disabled = thoughts.length === 0;
    prevBtn.disabled = thoughts.length === 0;
    // If thoughts were loaded, ensure buttons are enabled if there are thoughts
    // The disable logic in displayThought/updateCounter handles the count aspect
  } catch (err) {
    console.error("Load thoughts error:", err);
    thoughtDisplay.innerHTML = '<p>Failed to load thoughts.</p>';
    nextBtn.disabled = true;
    prevBtn.disabled = true;
  }
}

function displayThought(i) {
  const t = thoughts[i];
  if (!t) return;

  thoughtDisplay.innerHTML = '';
  downloadBtn.style.display = 'none';

  if (t.type === 'image') {
    const img = document.createElement('img');
    img.src = t.content;
    img.alt = "Daily Image";
    img.style.borderRadius = "12px";
    img.style.boxShadow = "0 6px 16px rgba(0,0,0,0.15)";
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    thoughtDisplay.appendChild(img);
  } else {
    const p = document.createElement('p');
    p.textContent = t.content;
    p.style.fontSize = "1.3rem";
    p.style.lineHeight = "1.7";
    p.style.maxWidth = "600px";
    thoughtDisplay.appendChild(p);
  }

  downloadBtn.style.display = 'inline-block';
  downloadBtn.onclick = () => {
    const a = document.createElement('a');
    a.href = t.type === 'image'
      ? t.content
      : 'text/plain;charset=utf-8,' + encodeURIComponent(t.content);
    a.download = `daily-thought-${Date.now()}.${t.type === 'image' ? 'jpg' : 'txt'}`;
    a.click();
  };

  userViewedCount++;
  updateCounter();
}

function updateCounter() {
  if (thoughts.length > 0) {
    thoughtCounter.textContent = `${index + 1} of ${thoughts.length}`;
  } else {
     thoughtCounter.textContent = `0 of 0`;
  }
}

nextBtn.addEventListener('click', () => {
  if (thoughts.length === 0) return;
  index = (index + 1) % thoughts.length;
  displayThought(index);
});

prevBtn.addEventListener('click', () => {
  if (thoughts.length === 0) return;
  index = (index - 1 + thoughts.length) % thoughts.length;
  displayThought(index);
});

tabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    e.preventDefault();
    const target = tab.dataset.tab;

    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(target).classList.add('active');

    if (target === 'categoryTab') renderFiltered();
  });
});

categoryFilter.addEventListener('change', renderFiltered);

function renderFiltered() {
    if (!currentUser) {
        filteredThoughts.innerHTML = '<p>Please log in to see filtered thoughts.</p>';
        return;
    }

  const filter = categoryFilter.value;
  filteredThoughts.innerHTML = '<p>Loading...</p>';

  // Corrected filtering logic based on type, as category in thoughts is 'text'/'images'
  let filtered = thoughts;
  if (filter === 'text') {
    filtered = thoughts.filter(t => t.type === 'text'); // Filter by type
  } else if (filter === 'images') {
    filtered = thoughts.filter(t => t.type === 'image'); // Filter by type
  }
  // Note: If you want to filter by the 'category' field instead (which mirrors type),
  // use `t.category === 'text'` or `t.category === 'images'`

  filteredThoughts.innerHTML = '';
  if (filtered.length === 0) {
    filteredThoughts.innerHTML = '<p>No thoughts match this filter.</p>';
    return;
  }

  filtered.forEach(t => {
    const div = document.createElement('div');
    div.className = 'filtered-item';

    if (t.type === 'image') {
      const img = document.createElement('img');
      img.src = t.content;
      img.alt = "Filtered Thought Image";
      img.style.maxWidth = '100%';
      img.style.maxHeight = '150px';
      img.style.borderRadius = '10px';
      img.style.marginBottom = '10px';
      div.appendChild(img);
    } else {
      const p = document.createElement('p');
      p.textContent = t.content;
      p.style.marginBottom = '10px';
      div.appendChild(p);
    }

    const btn = document.createElement('button');
    btn.innerHTML = '<i class="fas fa-download"></i> <span>Download</span>';
    btn.onclick = () => {
      const a = document.createElement('a');
      a.href = t.type === 'image' ? t.content : 'text/plain;charset=utf-8,' + encodeURIComponent(t.content);
      a.download = `thought-${Date.now()}.${t.type === 'image' ? 'jpg' : 'txt'}`;
      a.click();
    };
    div.appendChild(btn);

    filteredThoughts.appendChild(div);
  });
}

async function loadAppInfo() {
  try {
    const snap = await getDoc(doc(db, 'app_info', 'details'));
    if (snap.exists()) {
      const data = snap.data();
      document.getElementById('devDetail').textContent = data.developer;
      document.getElementById('version').textContent = data.version;
      document.getElementById('buildNumber').textContent = data.buildNumber;
      document.getElementById('minOS').textContent = data.minOS;
    }
  } catch (err) {
    console.error('Failed to load app info:', err);
  }
}

// --- LOAD DAILY CONTENT (FOR TOAST) ---
async function loadDailyContent() {
  try {
    const snap = await getDoc(doc(db, 'daily_content', 'today'));
    if (!snap.exists()) {
        toastData = [];
        currentTheme = '';
        return;
    }

    const data = snap.data();
    currentTheme = data.theme || '';

    toastData = [];

    if (data.quote) {
      toastData.push({
        type: 'quote',
        icon: 'fas fa-quote-left quote-icon',
        label: 'Quote',
        content: data.quote
      });
    }

    if (data.tip) {
      toastData.push({
        type: 'tip',
        icon: 'fas fa-lightbulb tip-icon',
        label: 'Tip',
        content: data.tip
      });
    }

    if (data.achievement) {
      toastData.push({
        type: 'achievement',
        icon: 'fas fa-certificate achievement-icon',
        label: 'Achievement',
        content: data.achievement
      });
    }

     toastIndex = 0;

  } catch (err) {
    console.error('Error loading daily content (for toast):', err);
    toastData = [];
    currentTheme = '';
  }
}

// --- TOAST ROTATION ---
function startToastRotation() {
  clearInterval(toastInterval);

  if (toastData.length === 0) return;

  function showNextToast() {
    const toast = document.getElementById('dailyToast') || createToastElement();

    // Apply theme styles to the toast element itself
    let toastThemeStyle = '';
    if (currentTheme === 'soft') {
      toastThemeStyle = 'background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%); color: #2c3e50;';
    } else if (currentTheme === 'dark') {
      toastThemeStyle = 'background: #1a1a2e; color: white;';
    } else if (currentTheme === 'ocean') {
      toastThemeStyle = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;';
    } else if (currentTheme === 'sunset') {
      toastThemeStyle = 'background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: #2c3e50;';
    } else if (currentTheme === 'forest') {
      toastThemeStyle = 'background: linear-gradient(135deg, #1d976c 0%, #93f9b9 100%); color: white;';
    } else {
      // Default toast style
      toastThemeStyle = 'background: rgba(25, 24, 24, 0.95); color: white;';
    }

    // Apply the theme style
    toast.style.cssText = toastThemeStyle + ' backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);';

    const item = toastData[toastIndex];
    toast.innerHTML = `
      <p>
        <i class="${item.icon}" style="font-size: 1.1em;"></i>
        <span><strong>${item.label}:</strong> ${item.content}</span>
      </p>
    `;

    toast.classList.add('show');

    toastIndex = (toastIndex + 1) % toastData.length;
  }

  showNextToast(); // Show immediately on load/refresh
  toastInterval = setInterval(showNextToast, 10000); // Then every 10s
}

function createToastElement() {
  const toast = document.createElement('div');
  toast.id = 'dailyToast';
  // Apply base styles (these should ideally come from CSS, but setting via JS ensures they are applied)
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.left = '20px';
  toast.style.padding = '18px 16px';
  toast.style.borderRadius = '14px';
  toast.style.width = '270px';
  toast.style.zIndex = '9999';
  toast.style.fontSize = '0.88rem';
  toast.style.lineHeight = '1.5';
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(-20px)';
  toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  toast.style.pointerEvents = 'none'; // Allow clicking through
  document.body.appendChild(toast);
  return toast;
}
