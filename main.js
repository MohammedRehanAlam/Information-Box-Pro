import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, onSnapshot } from './firebase-config.js';

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

// State
let currentUser = null;
let servicesData = [];
let activeService = null;
let activeTabIndex = -1;

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    userNameEl.textContent = `${user.displayName}`;
    loginScreen.classList.add('hidden');
    mainHeader.classList.remove('hidden');
    showDashboard();
    loadServices();
  } else {
    currentUser = null;
    loginScreen.classList.remove('hidden');
    mainHeader.classList.add('hidden');
    dashboardScreen.classList.add('hidden');
    serviceDetailScreen.classList.add('hidden');
  }
});

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
