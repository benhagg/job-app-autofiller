// Popup UI Logic
document.addEventListener('DOMContentLoaded', async () => {
  // Load existing profile data
  await loadProfile();

  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;

      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });

  // Auto-save on any input change
  const formInputs = document.querySelectorAll('#profile-form input, #profile-form select, #profile-form textarea');
  formInputs.forEach(input => {
    input.addEventListener('input', debounce(async () => {
      await saveProfile(true); // true = silent save without message
    }, 500)); // Wait 500ms after user stops typing

    // For select dropdowns, save immediately
    if (input.tagName === 'SELECT') {
      input.addEventListener('change', async () => {
        await saveProfile(true);
      });
    }
  });

  // Form submission (still works but mainly for manual save button)
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProfile(false); // Show confirmation message
  });

  // Clear button
  document.getElementById('clear-btn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all profile data?')) {
      await clearProfile();
    }
  });

  // Export button
  document.getElementById('export-btn').addEventListener('click', async () => {
    await exportProfile();
  });

  // Import button
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  // Import file handler
  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      await importProfile(file);
    }
  });
});

// Load profile data from storage
async function loadProfile() {
  try {
    const result = await chrome.storage.sync.get('userProfile');
    const profile = result.userProfile || getDefaultProfile();

    // Populate form fields
    for (const [key, value] of Object.entries(profile)) {
      const field = document.getElementById(key);
      if (field) {
        field.value = value || '';
      }
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    showMessage('Error loading profile data', 'error');
  }
}

// Save profile data to storage
async function saveProfile(silent = false) {
  try {
    const form = document.getElementById('profile-form');
    const formData = new FormData(form);
    const profile = {};

    for (const [key, value] of formData.entries()) {
      profile[key] = value;
    }

    await chrome.storage.sync.set({ userProfile: profile });
    
    if (!silent) {
      showMessage('Profile saved successfully!', 'success');
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        hideMessage();
      }, 3000);
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    if (!silent) {
      showMessage('Error saving profile data', 'error');
    }
  }
}

// Clear all profile data
async function clearProfile() {
  try {
    await chrome.storage.sync.remove('userProfile');
    
    // Reset form to defaults
    const defaultProfile = getDefaultProfile();
    for (const [key, value] of Object.entries(defaultProfile)) {
      const field = document.getElementById(key);
      if (field) {
        field.value = value || '';
      }
    }

    showMessage('Profile cleared successfully', 'success');
    setTimeout(() => {
      hideMessage();
    }, 3000);
  } catch (error) {
    console.error('Error clearing profile:', error);
    showMessage('Error clearing profile data', 'error');
  }
}

// Export profile to JSON
async function exportProfile() {
  try {
    const result = await chrome.storage.sync.get('userProfile');
    const profile = result.userProfile || getDefaultProfile();
    
    const jsonStr = JSON.stringify(profile, null, 2);
    
    // Create download
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'job-autofill-profile.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showMessage('Profile exported successfully!', 'success');
    setTimeout(() => {
      hideMessage();
    }, 3000);
  } catch (error) {
    console.error('Error exporting profile:', error);
    showMessage('Error exporting profile data', 'error');
  }
}

// Import profile from JSON file
async function importProfile(file) {
  try {
    const text = await file.text();
    const profile = JSON.parse(text);

    // Validate profile structure
    if (typeof profile !== 'object') {
      throw new Error('Invalid profile format');
    }

    await chrome.storage.sync.set({ userProfile: profile });
    
    // Reload the form
    await loadProfile();

    showMessage('Profile imported successfully!', 'success');
    setTimeout(() => {
      hideMessage();
    }, 3000);

    // Reset file input
    document.getElementById('import-file').value = '';
  } catch (error) {
    console.error('Error importing profile:', error);
    showMessage('Error importing profile: ' + error.message, 'error');
  }
}

// Show message to user
function showMessage(text, type) {
  const messageEl = document.getElementById('save-message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

// Hide message
function hideMessage() {
  const messageEl = document.getElementById('save-message');
  messageEl.className = 'message';
}

// Get default profile structure
function getDefaultProfile() {
  return {
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    linkedin: '',
    website: '',
    github: '',
    willingToRelocate: 'yes',
    veteranStatus: 'decline',
    disabilityStatus: 'decline',
    previouslyWorked: 'no',
    hispanic: 'decline',
    gender: 'decline',
    race: 'decline',
    sexuality: 'decline',
    sponsorship: 'no',
    clearance: '',
    school: '',
    degree: '',
    major: '',
    gpa: '',
    graduationDate: '',
    referralSource: '',
    desiredSalary: '',
    startDate: '',
    coverLetter: '',
    additionalInfo: ''
  };
}

// Debounce helper function to limit how often auto-save runs
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
