import { validateContactForm } from '../shared/validators/contactForm.schema';

export class FormHandler {
  constructor(formId, options = {}) {
    this.form = document.getElementById(formId);
    if (!this.form) {
      console.error(`Form with ID "${formId}" not found`);
      return;
    }

    // Default options with overrides
    this.options = {
      endpoint: '/api/messages',
      method: 'POST',
      successMessage: 'Thank you! Your message has been sent successfully.',
      errorMessage: 'There was an error sending your message. Please try again later.',
      validationError: 'Please fix the form errors below.',
      ...options
    };

    // Initialize CSRF token
    this.csrfToken = this.getCSRFToken();
    
    // Bind methods
    this.handleSubmit = this.handleSubmit.bind(this);
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.form.addEventListener('submit', this.handleSubmit);
    
    // Add input event listeners for real-time validation
    const inputs = this.form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('blur', this.validateField.bind(this, input));
      input.addEventListener('input', this.clearFieldError.bind(this, input));
    });
  }

  async handleSubmit(event) {
    event.preventDefault();
    
    // Prevent multiple submissions
    if (this.isSubmitting) return;
    
    try {
      this.setLoading(true);
      this.clearMessages();
      
      // Validate form
      const formData = this.getFormData();
      const { error } = validateContactForm(formData);
      
      if (error) {
        this.displayValidationErrors(error.details);
        return;
      }
      
      // Submit form
      const response = await this.submitForm(formData);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.showSuccess(this.options.successMessage);
          this.form.reset();
        } else {
          this.showError(result.message || this.options.errorMessage);
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

  async submitForm(data) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Add CSRF token if available
    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }
    
    return fetch(this.options.endpoint, {
      method: this.options.method,
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(data)
    });
  }

  getFormData() {
    const formData = new FormData(this.form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value.trim();
    }
    
    return data;
  }

  validateField(field) {
    const { error } = validateContactForm({ [field.name]: field.value });
    if (error) {
      this.displayFieldError(field, error.details[0].message);
      return false;
    }
    this.clearFieldError(field);
    return true;
  }

  displayValidationErrors(errors) {
    errors.forEach(error => {
      const field = this.form.querySelector(`[name="${error.context.key}"]`);
      if (field) {
        this.displayFieldError(field, error.message);
      }
    });
    this.showError(this.options.validationError);
  }

  displayFieldError(field, message) {
    const fieldContainer = field.closest('.form-group') || field.parentElement;
    let errorElement = fieldContainer.querySelector('.field-error');
    
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'field-error text-red-500 text-sm mt-1';
      fieldContainer.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    field.setAttribute('aria-invalid', 'true');
    field.classList.add('border-red-500');
  }

  clearFieldError(field) {
    const fieldContainer = field.closest('.form-group') || field.parentElement;
    const errorElement = fieldContainer?.querySelector('.field-error');
    
    if (errorElement) {
      errorElement.remove();
    }
    
    field.removeAttribute('aria-invalid');
    field.classList.remove('border-red-500');
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showMessage(message, type) {
    // Remove existing messages
    const existingMessages = this.form.querySelectorAll('.form-message');
    existingMessages.forEach(el => el.remove());
    
    // Create new message
    const messageElement = document.createElement('div');
    messageElement.className = `form-message p-4 mb-4 rounded ${
      type === 'error' 
        ? 'bg-red-100 text-red-700 border border-red-200' 
        : 'bg-green-100 text-green-700 border border-green-200'
    }`;
    messageElement.textContent = message;
    messageElement.setAttribute('role', 'alert');
    
    // Insert message at the top of the form
    this.form.insertBefore(messageElement, this.form.firstChild);
    
    // Auto-hide after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        messageElement.remove();
      }, 5000);
    }
  }

  setLoading(isLoading) {
    this.isSubmitting = isLoading;
    const submitButton = this.form.querySelector('button[type="submit"]');
    
    if (!submitButton) return;
    
    if (isLoading) {
      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
      submitButton.innerHTML = submitButton.dataset.loadingText || 'Sending...';
    } else {
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
      submitButton.innerHTML = submitButton.dataset.originalText || 'Send Message';
    }
  }

  clearMessages() {
    const messages = this.form.querySelectorAll('.form-message, .field-error');
    messages.forEach(el => el.remove());
    
    // Clear all field errors
    const invalidFields = this.form.querySelectorAll('[aria-invalid="true"]');
    invalidFields.forEach(field => {
      field.removeAttribute('aria-invalid');
      field.classList.remove('border-red-500');
    });
  }

  getCSRFToken() {
    // Try to get CSRF token from meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag ? metaTag.getAttribute('content') : null;
  }
}

// Auto-initialize forms with data-form-handle attribute
document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('[data-form-handle]');
  forms.forEach(form => {
    const formId = form.id || `form-${Date.now()}`;
    if (!form.id) form.id = formId;
    
    new FormHandler(formId, {
      endpoint: form.dataset.endpoint,
      successMessage: form.dataset.successMessage,
      errorMessage: form.dataset.errorMessage,
      validationError: form.dataset.validationError
    });
  });
});
