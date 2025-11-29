// Content Script - Runs on all web pages to detect and fill forms

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autofill') {
    performAutofill().then(result => {
      sendResponse(result);
    });
    return true; // Will respond asynchronously
  }
});

// Main autofill function
async function performAutofill() {
  try {
    console.log('[Job Autofill] Starting autofill process...');
    console.log('[Job Autofill] Current URL:', window.location.href);
    console.log('[Job Autofill] Document ready state:', document.readyState);

    // Get user profile from storage
    const profile = await StorageManager.getProfile();
    
    if (!profile || Object.keys(profile).length === 0) {
      return {
        success: false,
        message: 'No profile data found. Please set up your profile first.',
        filledCount: 0
      };
    }

    // Quick diagnostic: count total form elements
    const totalInputs = document.querySelectorAll('input').length;
    const totalSelects = document.querySelectorAll('select').length;
    const totalTextareas = document.querySelectorAll('textarea').length;
    console.log(`[Job Autofill] DOM contains: ${totalInputs} inputs, ${totalSelects} selects, ${totalTextareas} textareas`);

    // Ensure FormFiller is ready and detect form fields on the page
    let detectedFields = [];
    try {
      detectedFields = await FormFiller.detectFields();
    } catch (error) {
      console.error('[Job Autofill] Error detecting fields:', error);
      return {
        success: false,
        message: 'Error detecting form fields: ' + error.message,
        filledCount: 0
      };
    }
    
    if (detectedFields.length === 0) {
      console.log('[Job Autofill] No fillable fields detected on this page.');
      console.log('[Job Autofill] This could mean:');
      console.log('  - Fields are in an iframe (cross-origin)');
      console.log('  - Fields are in shadow DOM');
      console.log('  - Fields loaded after page load (try again in a moment)');
      console.log('  - All fields are already filled');
      console.log('  - Field selectors need adjustment');
      return {
        success: false,
        message: 'No fillable fields detected on this page.',
        filledCount: 0
      };
    }

    console.log(`[Job Autofill] Detected ${detectedFields.length} fields`);

    // Fill the detected fields
    const filledCount = await FormFiller.fillFields(detectedFields, profile);

    console.log(`[Job Autofill] Successfully filled ${filledCount} fields`);

    // Show notification to user
    showNotification(`Autofilled ${filledCount} field${filledCount !== 1 ? 's' : ''}!`);

    return {
      success: true,
      message: `Successfully filled ${filledCount} field${filledCount !== 1 ? 's' : ''}!`,
      filledCount: filledCount,
      detectedCount: detectedFields.length
    };

  } catch (error) {
    console.error('[Job Autofill] Error during autofill:', error);
    return {
      success: false,
      message: 'Error during autofill: ' + error.message,
      filledCount: 0
    };
  }
}

// Show a temporary notification on the page
function showNotification(message) {
  // Remove any existing notification
  const existingNotification = document.getElementById('job-autofill-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'job-autofill-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;

  notification.textContent = '✓ ' + message;

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Add to page
  document.body.appendChild(notification);

  // Remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 300);
  }, 4000);
}

// Auto-detect if this looks like a job application page
function isJobApplicationPage() {
  const indicators = [
    /apply/i,
    /application/i,
    /career/i,
    /job/i,
    /position/i,
    /resume/i,
    /workday/i,
    /greenhouse/i,
    /lever/i,
    /taleo/i
  ];

  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  const bodyText = document.body.innerText.toLowerCase().substring(0, 1000);

  return indicators.some(pattern => 
    pattern.test(url) || pattern.test(title) || pattern.test(bodyText)
  );
}

// Log if this appears to be a job application page
if (isJobApplicationPage()) {
  console.log('[Job Autofill] Job application page detected. Use Ctrl+Shift+F to autofill or click the extension icon.');
}
