/**
 * Form Handler for Dynamis Contact Form
 * Handles form submission, validation, and UI feedback
 */

class FormHandler {
  constructor(formId, options = {}) {
    this.form = document.getElementById(formId);
    if (!this.form) {
      console.error(`Form with ID "${formId}" not found`);
      return;
    }

    // Default options
    this.options = {
      endpoint: '/api/messages',
      successMessage: 'Thank you! Your message has been sent successfully.',
      errorMessage: 'There was an error sending your message. Please try again later.',
      validationError: 'Please fill in all required fields correctly.',
      ...options
    };

    // Initialize
    this.initialize();
  }

  initialize() {
    // Prevent multiple initializations
    if (this.initialized) return;
    this.initialized = true;

    // Add submit event listener
    this.form.addEventListener('submit', this.handleSubmit.bind(this));

    // Add input event listeners for real-time validation
    this.form.querySelectorAll('input, textarea, select').forEach(input => {
      input.addEventListener('input', this.clearFieldError.bind(this));
    });

    console.log('Form handler initialized');
  }

  async handleSubmit(event) {
    event.preventDefault();
    
    // Reset previous states
    this.clearMessages();
    this.setLoading(true);

    // Validate form
    if (!this.validateForm()) {
      this.setLoading(false);
      this.showError(this.options.validationError);
      return;
    }

    try {
      // Get form data
      const formData = this.getFormData();
      
      // Send to server
      const response = await this.sendFormData(formData);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.showSuccess(this.options.successMessage);
          this.form.reset();
        } else {
          this.showError(data.message || this.options.errorMessage);
        }
      } else {
        const error = await response.json().catch(() => ({}));
        this.showError(error.message || this.options.errorMessage);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      this.showError(this.options.errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  getFormData() {
    const formData = new FormData(this.form);
    const data = {};
    
    // Convert FormData to plain object
    for (const [key, value] of formData.entries()) {
      data[key] = value.trim();
    }
    
    return data;
  }

  validateForm() {
    let isValid = true;
    
    // Check required fields
    this.form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        this.showFieldError(field, 'This field is required');
        isValid = false;
      } else if (field.type === 'email' && !this.isValidEmail(field.value)) {
        this.showFieldError(field, 'Please enter a valid email address');
        isValid = false;
      }
    });
    
    return isValid;
  }

  async sendFormData(data) {
    return fetch(this.options.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }

  // Helper methods
  setLoading(isLoading) {
    const submitButton = this.form.querySelector('button[type="submit"]');
    if (!submitButton) return;
    
    if (isLoading) {
      submitButton.disabled = true;
      submitButton.innerHTML = 'Sending...';
    } else {
      submitButton.disabled = false;
      submitButton.innerHTML = submitButton.dataset.originalText || 'Send Message';
    }
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showMessage(message, type) {
    // Remove any existing messages
    this.clearMessages();
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `form-message ${type}`;
    messageEl.textContent = message;
    messageEl.setAttribute('role', 'alert');
    messageEl.setAttribute('aria-live', 'polite');
    
    // Insert message
    this.form.parentNode.insertBefore(messageEl, this.form.nextSibling);
    
    // Scroll to message
    messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  showFieldError(field, message) {
    const fieldContainer = field.closest('.form-group, .form-col') || field.parentNode;
    let errorEl = fieldContainer.querySelector('.field-error');
    
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'field-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.setAttribute('aria-live', 'polite');
      fieldContainer.appendChild(errorEl);
    }
    
    errorEl.textContent = message;
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', errorEl.id || (errorEl.id = `error-${Date.now()}`));
  }

  clearFieldError(event) {
    const field = event.target;
    const fieldContainer = field.closest('.form-group, .form-col') || field.parentNode;
    const errorEl = fieldContainer.querySelector('.field-error');
    
    if (errorEl) {
      errorEl.remove();
    }
    
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  }

  clearMessages() {
    // Remove form messages
    const existingMessages = this.form.parentNode.querySelectorAll('.form-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Clear field errors
    this.form.querySelectorAll('[aria-invalid]').forEach(field => {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    });
    
    const fieldErrors = this.form.querySelectorAll('.field-error');
    fieldErrors.forEach(error => error.remove());
  }

  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }
}

// Auto-initialize if data-form-handle is present
document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('[data-form-handle]');
  forms.forEach(form => {
    const formId = form.id || `form-${Date.now()}`;
    if (!form.id) form.id = formId;
    
    const options = {
      endpoint: form.dataset.endpoint || '/api/messages',
      successMessage: form.dataset.successMessage || 'Thank you! Your message has been sent successfully.',
      errorMessage: form.dataset.errorMessage || 'There was an error sending your message. Please try again later.'
    };
    
    new FormHandler(formId, options);
  });
});
