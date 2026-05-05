import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, onSnapshot, getDoc, setDoc } from './firebase-config.js';

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const serviceDetailScreen = document.getElementById('service-detail-screen');
const mainHeader = document.getElementById('main-header');

const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userNameEl = document.getElementById('user-name');

const searchBar = document.getElementById('search-bar');
const servicesList = document.getElementById('services-list');
const addServiceBtn = document.getElementById('add-service-btn');
const backBtn = document.getElementById('back-btn');
const deleteServiceBtn = document.getElementById('delete-service-btn');
const detailServiceName = document.getElementById('detail-service-name');

// Tab Interface Elements
const tabsList = document.getElementById('tabs-list');
const createTabBtn = document.getElementById('create-tab-btn');
const activeTabEditor = document.getElementById('active-tab-editor');
const emptyTabState = document.getElementById('empty-tab-state');
const editTabName = document.getElementById('edit-tab-name');
const editTabContent = document.getElementById('edit-tab-content');
const saveTabBtn = document.getElementById('save-tab-btn');
const deleteTabBtn = document.getElementById('delete-tab-btn');
const saveStatus = document.getElementById('save-status');

// Modals
const newServiceModal = document.getElementById('new-service-modal');
const closeServiceModal = document.getElementById('close-service-modal');
const createServiceBtn = document.getElementById('create-service-btn');
const newServiceNameInput = document.getElementById('new-service-name');

const newTabModal = document.getElementById('new-tab-modal');
const closeTabModal = document.getElementById('close-tab-modal');
const addNewTabBtn = document.getElementById('add-new-tab-btn');
const newTabNameInput = document.getElementById('new-tab-name');

// Recovery Setup Elements
const recoveryMethodSelect = document.getElementById('recovery-method-select');
const recoveryGoogleInfo = document.getElementById('recovery-google-info');
const recoveryQuestionInfo = document.getElementById('recovery-question-info');
const securityQuestionSelect = document.getElementById('security-question-select');
const securityAnswerInput = document.getElementById('security-answer-input');
const changeRecoveryTrigger = document.getElementById('change-recovery-trigger');
const toggleRecoverySetupBtn = document.getElementById('toggle-recovery-setup-btn');

// Verify Identity Elements
const verifyIdentityModal = document.getElementById('verify-identity-modal');
const closeVerifyModal = document.getElementById('close-verify-modal');
const submitVerifyBtn = document.getElementById('submit-verify-btn');
const verifyGoogleSection = document.getElementById('verify-google-section');
const verifyQuestionSection = document.getElementById('verify-question-section');
const verifyEmailInput = document.getElementById('verify-email-input');
const verifyAnswerInput = document.getElementById('verify-answer-input');
const verifyQuestionLabel = document.getElementById('verify-question-label');
const verifyError = document.getElementById('verify-error');

// State
let currentUser = null;
let servicesData = [];
let activeService = null;
let activeTabIndex = -1;
let isEditMode = false;
let masterPassword = null;
let recoveryData = null; // { method: 'google'|'question', answer?: string, questionKey?: string }

// Settings DOM Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsModal = document.getElementById('close-settings-modal');
const editModeToggle = document.getElementById('edit-mode-toggle');
const setPasswordBtn = document.getElementById('set-password-btn');
const passwordStatusMsg = document.getElementById('password-status-msg');

// Password Prompt Modal
const passwordPromptModal = document.getElementById('password-prompt-modal');
const closePasswordPrompt = document.getElementById('close-password-prompt');
const confirmPasswordBtn = document.getElementById('confirm-password-btn');
const promptPasswordInput = document.getElementById('prompt-password-input');
const passwordError = document.getElementById('password-error');
const passwordPromptTitle = document.getElementById('password-prompt-title');

// Set Password Modal
const setPasswordModal = document.getElementById('set-password-modal');
const closeSetPasswordModal = document.getElementById('close-set-password-modal');
const savePasswordBtn = document.getElementById('save-password-btn');
const newPasswordInput = document.getElementById('new-password');
const confirmNewPasswordInput = document.getElementById('confirm-new-password');
const setPasswordError = document.getElementById('set-password-error');

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    userNameEl.textContent = `${user.displayName}`;
    loginScreen.classList.add('hidden');
    mainHeader.classList.remove('hidden');
    
    // Load Settings
    await loadUserSettings();
    
    showDashboard();
    loadServices();
  } else {
    currentUser = null;
    isEditMode = false;
    masterPassword = null;
    document.body.classList.remove('edit-mode-off');
    loginScreen.classList.remove('hidden');
    mainHeader.classList.add('hidden');
    dashboardScreen.classList.add('hidden');
    serviceDetailScreen.classList.add('hidden');
  }
});

// Settings Management
async function loadUserSettings() {
  if (!currentUser) return;
  try {
    const settingsDoc = await getDoc(doc(db, `users/${currentUser.uid}/settings`, 'app'));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      masterPassword = data.password || null;
      recoveryData = data.recovery || null;
      
      // We start with edit mode OFF by default for safety
      isEditMode = false;
      editModeToggle.checked = false;
      updateEditModeUI();
      
      if (masterPassword) {
        passwordStatusMsg.textContent = "Master password is set.";
        setPasswordBtn.textContent = "Change Master Password";
      } else {
        passwordStatusMsg.textContent = "No password set. Set a password to protect edit mode.";
        setPasswordBtn.textContent = "Set Master Password";
      }
    } else {
      // Default settings
      isEditMode = false;
      masterPassword = null;
      recoveryData = null;
      updateEditModeUI();
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

function updateEditModeUI() {
  if (isEditMode) {
    document.body.classList.remove('edit-mode-off');
    detailServiceName.readOnly = false;
    editTabName.readOnly = false;
    editTabContent.readOnly = false;
  } else {
    document.body.classList.add('edit-mode-off');
    detailServiceName.readOnly = true;
    editTabName.readOnly = true;
    editTabContent.readOnly = true;
  }
}

// Settings Event Listeners
settingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('hidden');
});

closeSettingsModal.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

editModeToggle.addEventListener('click', (e) => {
  // Prevent immediate toggle, we want to verify password first
  e.preventDefault();
  
  if (!masterPassword) {
    // If no password, force set one first
    alert("Please set a master password first to use this feature.");
    openSetPasswordModal(true); // true means it's a first-time set
    return;
  }
  
  // Ask for password
  const targetState = !isEditMode;
  openPasswordPrompt(targetState);
});

setPasswordBtn.addEventListener('click', () => {
  if (masterPassword) {
    openVerifyIdentityModal();
  } else {
    openSetPasswordModal(true);
  }
});

// Recovery Method Toggle
recoveryMethodSelect.addEventListener('change', (e) => {
  if (e.target.value === 'google') {
    recoveryGoogleInfo.classList.remove('hidden');
    recoveryQuestionInfo.classList.add('hidden');
  } else {
    recoveryGoogleInfo.classList.add('hidden');
    recoveryQuestionInfo.classList.remove('hidden');
  }
});

toggleRecoverySetupBtn.addEventListener('click', () => {
  const recoverySection = document.querySelector('.recovery-setup-section');
  recoverySection.classList.toggle('hidden');
  changeRecoveryTrigger.classList.add('hidden'); // Hide the trigger once clicked
});

// Identity Verification Logic
function openVerifyIdentityModal() {
  if (!recoveryData) {
    // Fallback if recovery wasn't set (shouldn't happen with new logic)
    openSetPasswordModal(false);
    return;
  }

  verifyIdentityModal.classList.remove('hidden');
  verifyError.classList.add('hidden');
  verifyEmailInput.value = '';
  verifyAnswerInput.value = '';

  if (recoveryData.method === 'google') {
    verifyGoogleSection.classList.remove('hidden');
    verifyQuestionSection.classList.add('hidden');
  } else {
    verifyGoogleSection.classList.add('hidden');
    verifyQuestionSection.classList.remove('hidden');
    const questionText = securityQuestionSelect.querySelector(`option[value="${recoveryData.questionKey}"]`).textContent;
    verifyQuestionLabel.textContent = questionText;
  }
}

submitVerifyBtn.addEventListener('click', () => {
  let success = false;
  if (recoveryData.method === 'google') {
    success = verifyEmailInput.value.trim().toLowerCase() === currentUser.email.toLowerCase();
  } else {
    success = verifyAnswerInput.value.trim().toLowerCase() === recoveryData.answer.toLowerCase();
  }

  if (success) {
    verifyIdentityModal.classList.add('hidden');
    openSetPasswordModal(false); // Open change password modal
  } else {
    verifyError.classList.remove('hidden');
  }
});

closeVerifyModal.addEventListener('click', () => {
  verifyIdentityModal.classList.add('hidden');
});

// Password Prompt Logic
let passwordConfirmCallback = null;

function openPasswordPrompt(targetState) {
  passwordPromptTitle.textContent = targetState ? "Enable Edit Mode" : "Disable Edit Mode";
  passwordPromptModal.classList.remove('hidden');
  promptPasswordInput.value = '';
  promptPasswordInput.type = 'password';
  const toggleBtn = promptPasswordInput.parentElement.querySelector('.toggle-password-btn .eye-icon');
  if (toggleBtn) toggleBtn.innerHTML = eyeIconSvg;
  
  promptPasswordInput.focus();
  passwordError.classList.add('hidden');
  
  passwordConfirmCallback = (pass) => {
    if (pass === masterPassword) {
      isEditMode = targetState;
      editModeToggle.checked = isEditMode;
      updateEditModeUI();
      passwordPromptModal.classList.add('hidden');
    } else {
      passwordError.classList.remove('hidden');
    }
  };
}

confirmPasswordBtn.addEventListener('click', () => {
  if (passwordConfirmCallback) {
    passwordConfirmCallback(promptPasswordInput.value);
  }
});

promptPasswordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && passwordConfirmCallback) {
    passwordConfirmCallback(promptPasswordInput.value);
  }
});

closePasswordPrompt.addEventListener('click', () => {
  passwordPromptModal.classList.add('hidden');
});

// Set Password Logic
function openSetPasswordModal(isFirstTime = false) {
  setPasswordModal.classList.remove('hidden');
  document.querySelector('#set-password-modal h3').textContent = isFirstTime ? "Set Master Password" : "Update Master Password";
  
  newPasswordInput.value = '';
  newPasswordInput.type = 'password';
  confirmNewPasswordInput.value = '';
  confirmNewPasswordInput.type = 'password';
  
  // Recovery setup shown if it's the first time OR if recovery hasn't been set yet
  const recoverySection = document.querySelector('.recovery-setup-section');
  if (isFirstTime || !recoveryData) {
    recoverySection.classList.remove('hidden');
    changeRecoveryTrigger.classList.add('hidden');
  } else {
    recoverySection.classList.add('hidden');
    changeRecoveryTrigger.classList.remove('hidden'); // Show option to change it
  }
  
  // Reset icons
  const icons = setPasswordModal.querySelectorAll('.eye-icon');
  icons.forEach(icon => icon.innerHTML = eyeIconSvg);
  
  setPasswordError.classList.add('hidden');
}

savePasswordBtn.addEventListener('click', async () => {
  const newPass = newPasswordInput.value;
  const confirmPass = confirmNewPasswordInput.value;
  const isFirstTime = !masterPassword;
  const isRecoveryMissing = !recoveryData;
  
  if (newPass.length < 4) {
    setPasswordError.textContent = "Password must be at least 4 characters long.";
    setPasswordError.classList.remove('hidden');
    return;
  }
  
  if (newPass !== confirmPass) {
    setPasswordError.textContent = "Passwords do not match.";
    setPasswordError.classList.remove('hidden');
    return;
  }

  let recoveryToSave = recoveryData;
  const recoverySection = document.querySelector('.recovery-setup-section');
  const isRecoverySectionVisible = !recoverySection.classList.contains('hidden');

  // If the recovery section is visible, the user is either setting it for the first time
  // or choosing to change their existing method.
  if (isRecoverySectionVisible) {
    const method = recoveryMethodSelect.value;
    if (method === 'google') {
      recoveryToSave = { method: 'google' };
    } else {
      const answer = securityAnswerInput.value.trim();
      if (!answer) {
        setPasswordError.textContent = "Please provide an answer to the security question.";
        setPasswordError.classList.remove('hidden');
        return;
      }
      recoveryToSave = { 
        method: 'question', 
        questionKey: securityQuestionSelect.value,
        answer: answer 
      };
    }
  }
  
  try {
    savePasswordBtn.textContent = 'Saving...';
    savePasswordBtn.disabled = true;
    
    const settingsUpdate = {
      password: newPass,
      recovery: recoveryToSave
    };
    
    await setDoc(doc(db, `users/${currentUser.uid}/settings`, 'app'), settingsUpdate, { merge: true });
    
    masterPassword = newPass;
    recoveryData = recoveryToSave;
    passwordStatusMsg.textContent = "Master password is set.";
    setPasswordBtn.textContent = "Change Master Password";
    setPasswordModal.classList.add('hidden');
    alert("Password saved successfully!");
  } catch (error) {
    console.error("Error saving password:", error);
    alert("Error saving password");
  } finally {
    savePasswordBtn.textContent = 'Save Password';
    savePasswordBtn.disabled = false;
  }
});

closeSetPasswordModal.addEventListener('click', () => {
  setPasswordModal.classList.add('hidden');
});

// Password Visibility Toggle Logic
const eyeIconSvg = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
const eyeOffIconSvg = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;

function initPasswordToggles() {
  const toggleBtns = document.querySelectorAll('.toggle-password-btn');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const icon = btn.querySelector('.eye-icon');
      
      if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = eyeOffIconSvg;
      } else {
        input.type = 'password';
        icon.innerHTML = eyeIconSvg;
      }
    });
  });
}

// Initialize toggles
initPasswordToggles();

// Login
googleLoginBtn.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Error signing in", error);
    alert("Failed to sign in. See console for details.");
  }
});

// Logout
logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

// Screen Navigation
function showDashboard() {
  dashboardScreen.classList.remove('hidden');
  serviceDetailScreen.classList.add('hidden');
  activeService = null;
  activeTabIndex = -1;
}

function showServiceDetail(serviceId) {
  activeService = servicesData.find(s => s.id === serviceId);
  if (!activeService) return;
  
  dashboardScreen.classList.add('hidden');
  serviceDetailScreen.classList.remove('hidden');
  
  detailServiceName.value = activeService.name;
  document.getElementById('save-service-name-btn').classList.add('hidden');
  activeTabIndex = -1;
  renderTabsSidebar();
  showEmptyTabState();
}

backBtn.addEventListener('click', showDashboard);

// Load Services
function loadServices() {
  if (!currentUser) return;
  const q = query(collection(db, `users/${currentUser.uid}/services`));
  
  onSnapshot(q, (snapshot) => {
    servicesData = [];
    snapshot.forEach((doc) => {
      servicesData.push({ id: doc.id, ...doc.data() });
    });
    
    // If we are currently viewing a service, update its state
    if (activeService) {
      const updatedActiveService = servicesData.find(s => s.id === activeService.id);
      if (updatedActiveService) {
        activeService = updatedActiveService;
        
        // Only update service name if user isn't currently editing it
        if (document.activeElement !== detailServiceName) {
          detailServiceName.value = activeService.name;
        }
        
        renderTabsSidebar();
        // If the active tab still exists, update the editor view
        if (activeTabIndex >= 0 && activeService.tabs && activeTabIndex < activeService.tabs.length) {
            // Only update if we aren't currently typing (to prevent losing focus/cursor pos)
            if (document.activeElement !== editTabName && document.activeElement !== editTabContent) {
                openTabInEditor(activeTabIndex);
            }
        } else {
            showEmptyTabState();
        }
      } else {
        // Service was deleted
        showDashboard();
      }
    }
    
    renderServicesList(servicesData);
  }, (error) => {
      console.error("Firestore Error:", error);
      if(error.code === 'permission-denied') {
          alert("Firebase Permission Denied!\n\nPlease go to your Firebase Console -> Firestore Database -> Rules and set them to allow read/write.\n\nExample:\nallow read, write: if true;");
      }
  });
}

// Render Dashboard List
function renderServicesList(services) {
  servicesList.innerHTML = '';
  
  if (services.length === 0) {
    servicesList.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center; padding: 40px;">No services found. Create your first folder!</p>';
    return;
  }

  services.forEach(service => {
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.addEventListener('click', () => showServiceDetail(service.id));
    
    const count = service.tabs ? service.tabs.length : 0;
    
    card.innerHTML = `
      <div class="folder-icon">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
      </div>
      <div class="folder-info">
        <h3>${escapeHTML(service.name)}</h3>
        <p>${count} Option${count !== 1 ? 's' : ''}</p>
      </div>
    `;
    
    servicesList.appendChild(card);
  });
}

// Search Functionality
searchBar.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = servicesData.filter(s => s.name.toLowerCase().includes(query));
  renderServicesList(filtered);
});

// Modals - New Service
addServiceBtn.addEventListener('click', () => {
  newServiceModal.classList.remove('hidden');
  newServiceNameInput.value = '';
  newServiceNameInput.focus();
});

closeServiceModal.addEventListener('click', () => {
  newServiceModal.classList.add('hidden');
});

createServiceBtn.addEventListener('click', async () => {
  const name = newServiceNameInput.value.trim();
  if (!name) return;
  
  try {
    createServiceBtn.textContent = 'Creating...';
    createServiceBtn.disabled = true;
    
    const serviceData = {
      name,
      tabs: [],
      createdAt: new Date()
    };
    
    const docRef = await addDoc(collection(db, `users/${currentUser.uid}/services`), serviceData);
    newServiceModal.classList.add('hidden');
    
    // Automatically open the new service
    showServiceDetail(docRef.id);
  } catch (error) {
    console.error("Error creating service:", error);
    if(error.code === 'permission-denied') {
        alert("Permission Denied. Please update Firestore rules.");
    } else {
        alert('Error creating service');
    }
  } finally {
    createServiceBtn.textContent = 'Create';
    createServiceBtn.disabled = false;
  }
});

// Delete Service
deleteServiceBtn.addEventListener('click', async () => {
  if (!activeService) return;
  
  if (confirm(`Are you sure you want to delete the entire folder "${activeService.name}"?`)) {
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/services`, activeService.id));
      showDashboard();
    } catch (error) {
      console.error("Error deleting service:", error);
      alert('Error deleting service');
    }
  }
});

// Tab Management
function renderTabsSidebar() {
  tabsList.innerHTML = '';
  
  if (!activeService || !activeService.tabs) return;
  
  activeService.tabs.forEach((tab, index) => {
    const li = document.createElement('li');
    li.className = `tab-item ${index === activeTabIndex ? 'active' : ''}`;
    li.textContent = tab.name;
    li.addEventListener('click', () => {
      openTabInEditor(index);
    });
    tabsList.appendChild(li);
  });
}

function showEmptyTabState() {
  activeTabEditor.classList.add('hidden');
  emptyTabState.classList.remove('hidden');
  activeTabIndex = -1;
  // Remove active styling from list
  Array.from(tabsList.children).forEach(child => child.classList.remove('active'));
}

function openTabInEditor(index) {
  if (!activeService || !activeService.tabs || index >= activeService.tabs.length) return;
  
  activeTabIndex = index;
  const tab = activeService.tabs[index];
  
  emptyTabState.classList.add('hidden');
  activeTabEditor.classList.remove('hidden');
  
  editTabName.value = tab.name;
  editTabContent.value = tab.content || '';
  
  // Update sidebar active styling
  Array.from(tabsList.children).forEach((child, i) => {
    if (i === index) child.classList.add('active');
    else child.classList.remove('active');
  });
}

// Modals - New Tab
createTabBtn.addEventListener('click', () => {
  newTabModal.classList.remove('hidden');
  newTabNameInput.value = '';
  newTabNameInput.focus();
});

closeTabModal.addEventListener('click', () => {
  newTabModal.classList.add('hidden');
});

addNewTabBtn.addEventListener('click', async () => {
  const name = newTabNameInput.value.trim();
  if (!name || !activeService) return;
  
  const newTabs = [...(activeService.tabs || [])];
  newTabs.push({ name, content: '' });
  
  try {
    addNewTabBtn.textContent = 'Adding...';
    addNewTabBtn.disabled = true;
    
    await updateDoc(doc(db, `users/${currentUser.uid}/services`, activeService.id), {
      tabs: newTabs
    });
    
    newTabModal.classList.add('hidden');
    // Open the newly created tab automatically
    activeTabIndex = newTabs.length - 1;
  } catch (error) {
    console.error("Error adding tab:", error);
    alert('Error adding option');
  } finally {
    addNewTabBtn.textContent = 'Add Option';
    addNewTabBtn.disabled = false;
  }
});

// Tab Live Sync
editTabName.addEventListener('input', (e) => {
  if (activeTabIndex !== -1 && tabsList.children[activeTabIndex]) {
    tabsList.children[activeTabIndex].textContent = e.target.value || '(Unnamed)';
  }
});

// Save Tab Edit Logic
const handleSaveTab = async () => {
  if (!activeService || activeTabIndex === -1) return;
  
  const updatedName = editTabName.value.trim();
  const updatedContent = editTabContent.value;
  
  if (!updatedName) {
    alert('Option name cannot be empty');
    return;
  }
  
  const newTabs = [...activeService.tabs];
  newTabs[activeTabIndex] = { name: updatedName, content: updatedContent };
  
  try {
    saveTabBtn.textContent = 'Saving...';
    saveTabBtn.disabled = true;
    
    await updateDoc(doc(db, `users/${currentUser.uid}/services`, activeService.id), {
      tabs: newTabs
    });
    
    showSaveStatus('Saved successfully!');
  } catch (error) {
    console.error("Error updating tab:", error);
    alert('Error saving changes');
  } finally {
    saveTabBtn.textContent = 'Save Changes';
    saveTabBtn.disabled = false;
  }
};

saveTabBtn.addEventListener('click', handleSaveTab);

// Service Name Edit
const saveServiceNameBtn = document.getElementById('save-service-name-btn');

detailServiceName.addEventListener('input', () => {
  saveServiceNameBtn.classList.remove('hidden');
});

saveServiceNameBtn.addEventListener('click', async () => {
  if (!activeService) return;
  const newName = detailServiceName.value.trim();
  if (!newName) return;
  
  try {
    saveServiceNameBtn.textContent = 'Saving...';
    saveServiceNameBtn.disabled = true;
    
    await updateDoc(doc(db, `users/${currentUser.uid}/services`, activeService.id), {
      name: newName
    });
    
    saveServiceNameBtn.classList.add('hidden');
  } catch (error) {
    console.error("Error updating service name:", error);
    alert("Error updating name");
  } finally {
    saveServiceNameBtn.textContent = 'Save Name';
    saveServiceNameBtn.disabled = false;
  }
});

// Delete Tab
deleteTabBtn.addEventListener('click', async () => {
  if (!activeService || activeTabIndex === -1) return;
  
  if (confirm('Are you sure you want to delete this option?')) {
    const newTabs = [...activeService.tabs];
    newTabs.splice(activeTabIndex, 1);
    
    try {
      await updateDoc(doc(db, `users/${currentUser.uid}/services`, activeService.id), {
        tabs: newTabs
      });
      showEmptyTabState();
    } catch (error) {
      console.error("Error deleting tab:", error);
      alert('Error deleting option');
    }
  }
});

function showSaveStatus(message) {
  saveStatus.textContent = message;
  saveStatus.classList.add('show');
  setTimeout(() => {
    saveStatus.classList.remove('show');
  }, 3000);
}

// Utility
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag])
  );
}
