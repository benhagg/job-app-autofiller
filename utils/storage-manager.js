// Storage Manager - Wrapper for chrome.storage.sync API
const StorageManager = {
  // Get user profile data
  async getProfile() {
    try {
      const result = await chrome.storage.sync.get('userProfile');
      return result.userProfile || this.getDefaultProfile();
    } catch (error) {
      console.error('Error getting profile:', error);
      return this.getDefaultProfile();
    }
  },

  // Save user profile data
  async saveProfile(profile) {
    try {
      await chrome.storage.sync.set({ userProfile: profile });
      return { success: true };
    } catch (error) {
      console.error('Error saving profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Update specific field in profile
  async updateField(fieldName, value) {
    try {
      const profile = await this.getProfile();
      profile[fieldName] = value;
      await this.saveProfile(profile);
      return { success: true };
    } catch (error) {
      console.error('Error updating field:', error);
      return { success: false, error: error.message };
    }
  },

  // Get default/empty profile structure
  getDefaultProfile() {
    return {
      // Personal Information
      firstName: '',
      lastName: '',
      fullName: '',
      email: '',
      phone: '',
      
      // Address
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      
      // URLs and Links
      linkedin: '',
      website: '',
      github: '',

      // Status Questions
      veteranStatus: 'decline', // 'yes', 'no', 'decline'
      disabilityStatus: 'decline', // 'yes', 'no', 'decline'
      previouslyWorked: 'no', // 'yes', 'no'
      willingToRelocate: 'yes', // 'yes', 'no'

      // Demographics
      gender: 'decline', // 'male', 'female', 'non-binary', 'decline'
      race: 'decline', // 'american-indian', 'asian', 'black', 'hispanic', 'pacific-islander', 'white', 'two-or-more', 'decline'
      sexuality: 'decline', // 'yes', 'no', 'decline'
      hispanic: 'decline', // 'yes', 'no', 'decline'
      
      // Education
      school: '',
      degree: '',
      major: '',
      gpa: '',
      graduationDate: '',

      // Work Authorization
      sponsorship: 'no', // 'yes', 'no'
      clearance: '', // Free text or specific clearance level

      // Other Common Fields
      referralSource: '', // How you heard about the job
      desiredSalary: '', // Expected salary
      startDate: '', // YYYY-MM-DD format
      coverLetter: '', // Default cover letter text
      additionalInfo: '' // Any additional information
    };
  },

  // Export profile as JSON
  async exportProfile() {
    const profile = await this.getProfile();
    return JSON.stringify(profile, null, 2);
  },

  // Import profile from JSON
  async importProfile(jsonString) {
    try {
      const profile = JSON.parse(jsonString);
      await this.saveProfile(profile);
      return { success: true };
    } catch (error) {
      console.error('Error importing profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Clear all profile data
  async clearProfile() {
    try {
      await chrome.storage.sync.remove('userProfile');
      return { success: true };
    } catch (error) {
      console.error('Error clearing profile:', error);
      return { success: false, error: error.message };
    }
  }
};

// Make available to content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
