// Form Filler - Core autofill logic
const FormFiller = {
  fieldMappings: null,

  // Load field mappings from config
  async loadFieldMappings() {
    if (this.fieldMappings) return this.fieldMappings;

    try {
      const response = await fetch(chrome.runtime.getURL('config/field-mappings.json'));
      this.fieldMappings = await response.json();
      return this.fieldMappings;
    } catch (error) {
      console.error('Error loading field mappings:', error);
      return {};
    }
  },

  // Detect all form fields on the page
  async detectFields() {
    await this.loadFieldMappings();
    const detectedFields = [];

    // Strategy 1: Get all input, select, and textarea elements from main document
    let formElements = document.querySelectorAll('input, select, textarea');
    console.log(`[FormFiller] Found ${formElements.length} form elements in main document`);

    // Strategy 2: Also check inside iframes (if accessible)
    try {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc) {
            const iframeElements = iframeDoc.querySelectorAll('input, select, textarea');
            console.log(`[FormFiller] Found ${iframeElements.length} form elements in iframe`);
            formElements = [...formElements, ...iframeElements];
          }
        } catch (e) {
          // Cross-origin iframe, can't access
          console.log('[FormFiller] Cannot access iframe (cross-origin):', e.message);
        }
      });
    } catch (e) {
      console.log('[FormFiller] Error checking iframes:', e.message);
    }

    // Strategy 3: Check shadow DOM elements
    try {
      const shadowHosts = document.querySelectorAll('*');
      shadowHosts.forEach(host => {
        if (host.shadowRoot) {
          const shadowElements = host.shadowRoot.querySelectorAll('input, select, textarea');
          if (shadowElements.length > 0) {
            console.log(`[FormFiller] Found ${shadowElements.length} form elements in shadow DOM`);
            formElements = [...formElements, ...shadowElements];
          }
        }
      });
    } catch (e) {
      console.log('[FormFiller] Error checking shadow DOM:', e.message);
    }

    console.log(`[FormFiller] Total elements to process: ${formElements.length}`);

    // Filter and match elements
    const processedRadioGroups = new Set(); // Track radio groups we've already processed
    
    formElements.forEach(element => {
      // Skip hidden elements
      if (element.offsetParent === null && element.type !== 'hidden') {
        return;
      }

      // For radio buttons, only process one per group (we'll handle the whole group at once)
      if (element.type === 'radio') {
        const groupKey = `${element.name}_${element.form?.id || 'noform'}`;
        if (processedRadioGroups.has(groupKey)) {
          return; // Already processed this radio group
        }
        processedRadioGroups.add(groupKey);
      }

      // Skip if already filled (unless it's a default value)
      if (element.value && element.value.trim() !== '' && !this.isDefaultValue(element.value)) {
        // Exception: radio buttons need special handling
        if (element.type !== 'radio') {
          return;
        }
      }

      // For radio buttons, check if any in the group is checked
      if (element.type === 'radio') {
        const radioGroup = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
        const isAnyChecked = Array.from(radioGroup).some(r => r.checked);
        if (isAnyChecked) {
          return; // Skip this group if already answered
        }
      }

      // Try to match this element to a profile field
      const matchedField = this.matchElement(element);
      if (matchedField) {
        detectedFields.push({
          element: element,
          profileField: matchedField.profileField,
          mappingKey: matchedField.mappingKey,
          confidence: matchedField.confidence
        });
      }
    });

    console.log(`[FormFiller] Matched ${detectedFields.length} fields to profile data`);
    return detectedFields;
  },

  // Check if value looks like a default/placeholder value
  isDefaultValue(value) {
    const defaultPatterns = [
      /^select/i,
      /^choose/i,
      /^please select/i,
      /^--/,
      /^\s*$/
    ];
    return defaultPatterns.some(pattern => pattern.test(value));
  },

  // Match an element to a profile field
  matchElement(element) {
    let bestMatch = null;
    let highestConfidence = 0;

    for (const [mappingKey, mapping] of Object.entries(this.fieldMappings)) {
      const confidence = this.calculateMatchConfidence(element, mapping);
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = {
          mappingKey: mappingKey,
          profileField: mapping.profileField,
          confidence: confidence
        };
      }
    }

    // Only return matches with reasonable confidence
    return highestConfidence > 0.3 ? bestMatch : null;
  },

  // Calculate how well an element matches a mapping
  calculateMatchConfidence(element, mapping) {
    let confidence = 0;

    // Check direct selectors
    if (mapping.selectors) {
      for (const selector of mapping.selectors) {
        try {
          if (element.matches(selector)) {
            confidence = Math.max(confidence, 0.9);
            break;
          }
        } catch (e) {
          // Invalid selector, skip
        }
      }
    }

    // Check keywords in various attributes
    if (mapping.keywords && mapping.fuzzyMatch) {
      const searchText = this.getElementSearchText(element).toLowerCase();
      
      for (const keyword of mapping.keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          confidence = Math.max(confidence, 0.7);
          break;
        }
      }
    }

    // Type matching bonus
    if (mapping.type) {
      if (mapping.type === 'select' && element.tagName === 'SELECT') {
        confidence += 0.1;
      } else if (mapping.type === 'textarea' && element.tagName === 'TEXTAREA') {
        confidence += 0.1;
      } else if (mapping.type === 'url' && element.type === 'url') {
        confidence += 0.1;
      } else if (mapping.type === 'date' && element.type === 'date') {
        confidence += 0.1;
      }
    }

    return Math.min(confidence, 1.0);
  },

  // Get searchable text from element and its context
  getElementSearchText(element) {
    const parts = [];

    // Element attributes
    if (element.name) parts.push(element.name);
    if (element.id) parts.push(element.id);
    if (element.placeholder) parts.push(element.placeholder);
    if (element.getAttribute('aria-label')) parts.push(element.getAttribute('aria-label'));

    // Associated label
    const label = this.findLabel(element);
    if (label) parts.push(label.textContent);

    // Nearby text (previous sibling, parent)
    const parent = element.parentElement;
    if (parent) {
      const previousText = this.getPreviousText(element);
      if (previousText) parts.push(previousText);
    }

    return parts.join(' ');
  },

  // Find associated label element
  findLabel(element) {
    // Check for label with for attribute
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label;
    }

    // Check if element is inside a label
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName === 'LABEL') return parent;
      parent = parent.parentElement;
    }

    return null;
  },

  // Get text before the element (for inline labels)
  getPreviousText(element) {
    const parent = element.parentElement;
    if (!parent) return '';

    let text = '';
    for (const child of parent.childNodes) {
      if (child === element) break;
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      } else if (child.tagName === 'LABEL' || child.tagName === 'SPAN') {
        text += child.textContent;
      }
    }

    return text.trim();
  },

  // Fill detected fields with profile data
  async fillFields(detectedFields, profile) {
    let filledCount = 0;

    for (const field of detectedFields) {
      const value = profile[field.profileField];
      if (!value && value !== false && value !== 0) continue;

      const success = await this.fillField(field.element, value, field.mappingKey);
      if (success) filledCount++;
    }

    return filledCount;
  },

  // Fill a single field
  async fillField(element, value, mappingKey) {
    try {
      const mapping = this.fieldMappings[mappingKey];

      if (element.tagName === 'SELECT') {
        return this.fillSelect(element, value, mapping);
      } else if (element.tagName === 'TEXTAREA') {
        return this.fillTextarea(element, value);
      } else if (element.type === 'radio') {
        return this.fillRadio(element, value, mapping);
      } else if (element.type === 'checkbox') {
        return this.fillCheckbox(element, value);
      } else {
        return this.fillInput(element, value);
      }
    } catch (error) {
      console.error('Error filling field:', error);
      return false;
    }
  },

  // Fill select dropdown
  fillSelect(select, value, mapping) {
    // Try direct value match first
    for (const option of select.options) {
      if (option.value.toLowerCase() === value.toLowerCase()) {
        select.value = option.value;
        this.triggerChange(select);
        return true;
      }
    }

    // Try value mapping
    if (mapping && mapping.valueMapping && mapping.valueMapping[value]) {
      const possibleValues = mapping.valueMapping[value];
      for (const option of select.options) {
        const optionText = option.textContent.toLowerCase().trim();
        const optionValue = option.value.toLowerCase();
        
        for (const possibleValue of possibleValues) {
          if (optionText.includes(possibleValue.toLowerCase()) || 
              optionValue.includes(possibleValue.toLowerCase())) {
            select.value = option.value;
            this.triggerChange(select);
            return true;
          }
        }
      }
    }
    return false;
  },

  // Fill textarea
  fillTextarea(textarea, value) {
    textarea.value = value;
    this.triggerChange(textarea);
    return true;
  },
  
  // Fill radio button
  fillRadio(radio, value, mapping) {
    // Find all radio buttons with the same name
    const radioGroup = document.querySelectorAll(`input[type="radio"][name="${radio.name}"]`);
    console.log(`[FormFiller] Trying to fill radio group "${radio.name}" with value "${value}"`);
    console.log(`[FormFiller] Radio group has ${radioGroup.length} buttons`);
    
    if (mapping && mapping.valueMapping && mapping.valueMapping[value]) {
      const possibleValues = mapping.valueMapping[value];
      console.log(`[FormFiller] Looking for values:`, possibleValues);
      
      for (const radioBtn of radioGroup) {
        const radioValue = radioBtn.value.toLowerCase().trim();
        const radioLabel = this.findLabel(radioBtn)?.textContent.toLowerCase().trim() || '';
        const radioId = radioBtn.id.toLowerCase();
        
        console.log(`[FormFiller] Checking radio: value="${radioValue}", label="${radioLabel}", id="${radioId}"`);
        
        for (const possibleValue of possibleValues) {
          const searchValue = possibleValue.toLowerCase().trim();
          
          // Check value, label, or ID for match
          if (radioValue.includes(searchValue) || 
              radioLabel.includes(searchValue) ||
              radioId.includes(searchValue) ||
              searchValue.includes(radioValue)) {
            console.log(`[FormFiller] ✓ Matched! Selecting radio button`);
            radioBtn.checked = true;
            this.triggerChange(radioBtn);
            return true;
          }
        }
      }
      console.log(`[FormFiller] ✗ No match found for radio group "${radio.name}"`);
    } else {
      console.log(`[FormFiller] No value mapping found for "${value}"`);
    }

    return false;
  },

  // Fill checkbox
  fillCheckbox(checkbox, value) {
    checkbox.checked = !!value;
    this.triggerChange(checkbox);
    return true;
  },

  // Fill regular input
  fillInput(input, value) {
    input.value = value;
    this.triggerChange(input);
    return true;
  },

  // Trigger change events (for React/Vue/Angular forms)
  triggerChange(element) {
    // Trigger multiple events to ensure compatibility
    const events = ['input', 'change', 'blur'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      element.dispatchEvent(event);
    });

    // Also trigger React-specific events
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    
    if (nativeInputValueSetter) {
      const reactEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(reactEvent);
    }
  }
};

// Make available to content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormFiller;
}
