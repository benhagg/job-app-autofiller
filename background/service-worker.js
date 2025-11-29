// Background Service Worker - Coordinates extension actions

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Send message to content script to perform autofill
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'autofill' });
    
    if (response && response.success) {
      console.log('[Job Autofill] Autofill successful:', response.message);
    } else {
      console.log('[Job Autofill] Autofill failed:', response?.message || 'Unknown error');
      
      // Show error notification
      if (response?.message) {
        showNotificationBadge(tab.id, '!');
      }
    }
  } catch (error) {
    console.error('[Job Autofill] Error communicating with content script:', error);
    // Content script might not be loaded yet - try injecting it
    await injectContentScript(tab.id);
  }
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'autofill') {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'autofill' });
        
        if (response && response.success) {
          console.log('[Job Autofill] Keyboard shortcut autofill successful');
        }
      } catch (error) {
        console.error('[Job Autofill] Error with keyboard shortcut:', error);
        await injectContentScript(tab.id);
      }
    }
  }
});

// Inject content script if it's not already loaded
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['utils/storage-manager.js', 'utils/form-filler.js', 'content/content-script.js']
    });
    
    console.log('[Job Autofill] Content script injected successfully');
    
    // Try autofill again after a short delay
    setTimeout(async () => {
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'autofill' });
      } catch (error) {
        console.error('[Job Autofill] Error after injection:', error);
      }
    }, 100);
  } catch (error) {
    console.error('[Job Autofill] Error injecting content script:', error);
  }
}

// Show badge on extension icon
function showNotificationBadge(tabId, text) {
  chrome.action.setBadgeText({ text: text, tabId: tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#dc3545', tabId: tabId });
  
  // Clear badge after 3 seconds
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '', tabId: tabId });
  }, 3000);
}

// Listen for tab updates to clear badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.action.setBadgeText({ text: '', tabId: tabId });
  }
});

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Job Autofill] Extension installed successfully');
    
    // Open popup to set up profile
    chrome.action.openPopup();
  } else if (details.reason === 'update') {
    console.log('[Job Autofill] Extension updated to version', chrome.runtime.getManifest().version);
  }
});

console.log('[Job Autofill] Background service worker initialized');
