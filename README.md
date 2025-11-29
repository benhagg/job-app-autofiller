# Job Application Autofill - Browser Extension

Automatically fill job application forms with your information including LinkedIn profile, website, veteran status, disability status, demographics, and other commonly requested fields that Chrome's native autofill doesn't handle.

## Features

✅ **Autofills Extended Fields**
- LinkedIn profile URL
- Personal website / portfolio
- GitHub profile
- Veteran status
- Disability status
- Prior employment questions
- Gender identity
- Race/ethnicity
- LGBTQ+ identification
- Visa sponsorship requirements
- Security clearance
- Desired salary
- Start date availability
- Cover letter text
- Additional information

✅ **Smart Field Detection**
- Intelligent matching using selectors, keywords, and fuzzy matching
- Works across different job application platforms (Workday, Greenhouse, Lever, Taleo, etc.)
- Handles radio buttons, dropdowns, text inputs, and textareas

✅ **Privacy-Focused**
- All data stored locally in your browser
- Manual trigger required (no automatic filling)
- Import/export your profile for backup
- Clear all data anytime

✅ **Easy to Use**
- Simple popup interface to manage your information
- Click extension icon or use keyboard shortcut (Ctrl+Shift+F / Cmd+Shift+F)
- Visual confirmation when fields are filled

## Installation

### Load as Unpacked Extension (Chrome/Edge)

1. **Clone or download this repository**
   ```
   git clone <your-repo-url>
   ```
   Or download and extract the ZIP file.

2. **Open Chrome/Edge Extensions page**
   - Chrome: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the extension**
   - Click "Load unpacked"
   - Select the `job-app-browser-extension` folder
   - The extension should now appear in your extensions list

5. **Pin the extension** (optional but recommended)
   - Click the puzzle piece icon in your browser toolbar
   - Find "Job Application Autofill" and click the pin icon

## Setup Your Profile

1. **Click the extension icon** in your browser toolbar
2. **Fill in your information** in the popup form:
   - Add your LinkedIn, website, GitHub URLs
   - Set your preferences for status questions (veteran, disability, etc.)
   - Choose your demographic responses (or decline to answer)
   - Add any default text for cover letters or additional info
3. **Click "Save Profile"**

Your information is now ready to autofill job applications!

## Usage

### Method 1: Extension Icon
1. Navigate to a job application page
2. Click the Job Application Autofill extension icon
3. The extension will automatically detect and fill compatible fields
4. A notification will show how many fields were filled

### Method 2: Keyboard Shortcut
1. Navigate to a job application page
2. Press `Ctrl+Shift+F` (Windows/Linux) or `Cmd+Shift+F` (Mac)
3. Fields will be automatically filled

### Verification
Always review the filled information before submitting your application to ensure accuracy.

## Field Mappings Configuration

The extension uses `config/field-mappings.json` to detect form fields. This file contains:

- **selectors**: CSS selectors to match form elements
- **keywords**: Text patterns to search for in labels, placeholders, etc.
- **fuzzyMatch**: Enable intelligent text matching
- **valueMapping**: Map your profile values to form option values

### Example Field Mapping

```json
{
  "veteranStatus": {
    "profileField": "veteranStatus",
    "selectors": [
      "select[name*='veteran']",
      "input[name*='veteran'][type='radio']"
    ],
    "keywords": [
      "veteran status",
      "are you a veteran",
      "military veteran"
    ],
    "fuzzyMatch": true,
    "type": "select",
    "valueMapping": {
      "yes": ["yes", "i am a veteran", "veteran"],
      "no": ["no", "i am not a veteran"],
      "decline": ["decline", "prefer not to answer"]
    }
  }
}
```

### Customizing Field Mappings

You can edit `config/field-mappings.json` to:
- Add new field types
- Adjust detection patterns for specific job sites
- Add site-specific selectors you encounter

## Import/Export Profile

### Export
1. Click the extension icon
2. Go to the "Settings" tab
3. Click "Export Profile"
4. A JSON file will be downloaded

### Import
1. Click the extension icon
2. Go to the "Settings" tab
3. Click "Import Profile"
4. Select your previously exported JSON file

This is useful for:
- Backing up your data
- Transferring your profile to another browser/computer
- Sharing a template profile structure

## File Structure

```
job-app-browser-extension/
├── manifest.json                 # Extension configuration
├── background/
│   └── service-worker.js        # Background script
├── content/
│   └── content-script.js        # Runs on web pages
├── popup/
│   ├── popup.html               # UI for managing profile
│   ├── popup.css                # Styling
│   └── popup.js                 # UI logic
├── utils/
│   ├── storage-manager.js       # Chrome storage wrapper
│   └── form-filler.js           # Core autofill logic
├── config/
│   └── field-mappings.json      # Field detection rules
└── icons/
    └── icon.svg                 # Extension icon
```

## Privacy & Security

- **Local Storage Only**: All your data is stored in Chrome's sync storage and never sent to external servers
- **Manual Trigger**: The extension only fills forms when you explicitly trigger it
- **No Tracking**: No analytics, no telemetry, no data collection
- **Open Source**: All code is visible and auditable

## Troubleshooting

### Extension not filling fields
- Make sure you've saved your profile data
- Try clicking the extension icon again
- Check the browser console (F12) for any errors
- Some forms use custom JavaScript that may interfere

### Fields filled incorrectly
- Review your profile data in the popup
- Check if the field mapping needs adjustment in `config/field-mappings.json`
- Some sites use non-standard form elements

### Extension icon not visible
- Go to `chrome://extensions/` and ensure the extension is enabled
- Pin the extension to your toolbar (puzzle piece icon → pin)

### Keyboard shortcut not working
- Go to `chrome://extensions/shortcuts/` to verify or customize the shortcut
- Make sure no other extension is using the same shortcut

## Supported Platforms

This extension has been designed to work with common Applicant Tracking Systems (ATS):
- Workday
- Greenhouse
- Lever
- Taleo
- iCIMS
- And most standard HTML job application forms

## Contributing

Want to improve field detection for specific job sites?
1. Edit `config/field-mappings.json` to add new patterns
2. Test on various job application sites
3. Share your improvements!

## License

Free to use and modify for personal use.

## Version

Current version: 1.0.0

---

**Note**: Always review autofilled information before submitting job applications. This extension is a convenience tool to speed up the application process, but you are responsible for the accuracy of submitted information.
