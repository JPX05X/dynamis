// Self-executing function to prevent global scope pollution
(function() {
  'use strict';

  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Get the form element
    const form = document.getElementById('dynamisContactForm');
    
    // If form doesn't exist, exit
    if (!form) {
      console.warn('Dynamis contact form not found on this page');
      return;
    }
    
    console.log('Dynamis contact form initialized');
    
    // Add form submission handler
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      try {
        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
      
      try {
        // Get form data
        let formData = new FormData(form);
        let submitData = {
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          email: formData.get('email'),
          subject: formData.get('subject'),
          message: formData.get('message')
        };
      
      // Get form data
      const formData = new FormData(form);
      const data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });
      
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
          // Show success message
          const successDiv = document.createElement('div');
          successDiv.className = 'form-status success';
          successDiv.textContent = 'Thank you! Your message has been sent.';
          form.parentNode.insertBefore(successDiv, form.nextSibling);
          form.reset();
        } else {
          // Show error message
          const errorDiv = document.createElement('div');
          errorDiv.className = 'form-status error';
          errorDiv.textContent = result.message || 'Failed to send message. Please try again.';
          form.parentNode.insertBefore(errorDiv, form.nextSibling);
        }
      } catch (error) {
        console.error('Error:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-status error';
        errorDiv.textContent = 'An error occurred. Please try again later.';
        form.parentNode.insertBefore(errorDiv, form.nextSibling);
      }
    });
  });

  // Configuration
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000; // 1 second
  
  // State management
  let submissionInProgress = false;
  
  // Form submission handler with retry logic
  async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('Prevented default form submission');
    
    // Prevent multiple submissions
    if (submissionInProgress) {
      console.log('Submission already in progress');
      return;
    }
    
    // Get form elements
    const formElements = getFormElements(form);
    if (!formElements) return;
    
    const { firstNameField, lastNameField, emailField, messageField, submitButton } = formElements;
    
    // Validate form
    const validationError = validateForm(firstNameField, lastNameField, emailField, messageField);
    if (validationError) {
      showError(validationError);
      return;
    }
    
    // Prepare form data
    const formData = {
      name: `${firstNameField.value.trim()} ${lastNameField.value.trim()}`.trim(),
      email: emailField.value.trim(),
      phone: document.getElementById('phone')?.value?.trim() || '',
      subject: document.getElementById('subject')?.value?.trim() || 'New Contact Form Submission',
      message: messageField.value.trim(),
      website: document.getElementById('website')?.value || '', // Honeypot field
      source: 'website-contact-form',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`
    };
    
    // Submit form with retry logic
    await submitFormWithRetry(form, formData, submitButton);
  }
  
  // Submit form with retry logic
  async function submitFormWithRetry(form, formData, submitButton, attempt = 1) {
    submissionInProgress = true;
    const originalButtonText = submitButton.innerHTML;
    
    try {
      // Update UI for loading state
      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
      submitButton.innerHTML = `Sending${'.'.repeat(attempt)}`;
      
      // Log the form data being sent (sensitive data redacted in production)
      if (process.env.NODE_ENV !== 'production') {
        console.log('Submitting form data:', {
          ...formData,
          message: formData.message ? '[MESSAGE_CONTENT]' : ''
        });
      }
      
      // Prepare request
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      });
      
      // Use the form's action URL directly since it's now a full URL
      let url = new URL(form.action);
      // Add cache-busting for retries
      if (attempt > 1) {
        url.searchParams.append('_attempt', attempt);
        url.searchParams.append('_t', Date.now());
      }
      
      // Make the request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      console.log('Sending request to:', url.toString());
      console.log('Request data:', JSON.stringify(formData, null, 2));
      
      try {
        const response = await fetch(url.toString(), {
          method: form.method,
          headers: headers,
          credentials: 'same-origin',
          body: JSON.stringify(formData),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Got response, status:', response.status);
        
        // Handle response
        const responseData = await handleResponse(response);
        
        if (!response.ok) {
          const errorMsg = responseData.message || `Server responded with status ${response.status}`;
          console.error('Server error:', errorMsg);
          throw new Error(errorMsg);
        }
      
        // Track successful submission
        trackFormSubmission('success');
        
        // Show success message
        showSuccess(form);
      } catch (error) {
        throw error; // Re-throw to be caught by the outer catch
      }
      
    } catch (error) {
      console.error(`Form submission attempt ${attempt} failed:`, error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Check if we should retry
      const isNetworkError = error.name === 'AbortError' || !navigator.onLine;
      const shouldRetry = isNetworkError && attempt < MAX_RETRIES;
      
      console.log('Error details:', {
        isNetworkError,
        shouldRetry,
        attempt,
        MAX_RETRIES
      });
      
      if (shouldRetry) {
        // Show retry message
        showStatusMessage(`Connection issue. Retrying (${attempt}/${MAX_RETRIES})...`, 'warning');
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        
        // Retry
        return submitFormWithRetry(form, formData, submitButton, attempt + 1);
      }
      
      // Show error to user
      trackFormSubmission('error', error);
      
      const errorMessage = isNetworkError 
        ? 'Network error. Please check your connection and try again.'
        : error.message || 'Sorry, there was a problem sending your message. Please try again later.';
      
      showError(errorMessage);
      
      // Re-enable form for user to try again
      submitButton.disabled = false;
      submitButton.setAttribute('aria-busy', 'false');
      submitButton.innerHTML = originalButtonText;
      
    } finally {
      submissionInProgress = false;
    }
  }
  
  // Track form submission for analytics
  function trackFormSubmission(status, error = null) {
    if (typeof gtag === 'function') {
      gtag('event', 'form_submission', {
        'event_category': 'contact',
        'event_label': status,
        'value': status === 'success' ? 1 : 0,
        'non_interaction': false
      });
    }
    
    if (error) {
      console.error('Form submission error:', error);
      // Here you would typically send this to an error tracking service
      // e.g., Sentry.captureException(error);
    }
  }
  
  // Show status message (info, warning, error)
  function showStatusMessage(message, type = 'error') {
    // Remove any existing status messages
    const existingStatus = document.querySelector('.form-status-message');
    if (existingStatus) {
      existingStatus.remove();
    }
    
    // Create and show status message
    const statusDiv = document.createElement('div');
    statusDiv.className = `form-status-message form-status-${type}`;
    statusDiv.setAttribute('role', 'alert');
    statusDiv.setAttribute('aria-live', 'assertive');
    statusDiv.tabIndex = -1; // Make it focusable
    
    // Apply styles
    const styles = {
      error: {
        color: '#d32f2f',
        backgroundColor: '#ffebee',
        borderColor: '#d32f2f'
      },
      warning: {
        color: '#ed6c02',
        backgroundColor: '#fff3e0',
        borderColor: '#ffa726'
      },
      info: {
        color: '#0288d1',
        backgroundColor: '#e3f2fd',
        borderColor: '#4fc3f7'
      }
    };
    
    const style = styles[type] || styles.error;
    
    // Apply styles
    Object.assign(statusDiv.style, {
      margin: '1rem 0',
      padding: '0.75rem 1rem',
      borderLeft: `4px solid ${style.borderColor}`,
      backgroundColor: style.backgroundColor,
      color: style.color,
      borderRadius: '4px',
      fontSize: '0.9375rem',
      lineHeight: '1.5',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem'
    });
    
    // Add icon based on type
    const iconMap = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    statusDiv.innerHTML = `
      <span aria-hidden="true" style="font-size: 1.25em; line-height: 1;">${iconMap[type] || ''}</span>
      <div>
        <strong style="display: block; margin-bottom: 0.25em;">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
        <div>${message}</div>
      </div>
    `;
    
    // Insert after the form title or at the top of the form
    const formTitle = form.querySelector('h2, h1, .form-title');
    if (formTitle && formTitle.nextElementSibling) {
      formTitle.parentNode.insertBefore(statusDiv, formTitle.nextElementSibling);
    } else {
      form.prepend(statusDiv);
    }
    
    // Focus the status message for screen readers
    setTimeout(() => {
      statusDiv.focus();
    }, 100);
    
    return statusDiv;
  }
  
  // Show error message (wrapper for showStatusMessage)
  function showError(message) {
    return showStatusMessage(message, 'error');
  }
  
  // Helper function to get form elements with fallbacks
  function getFormElements(form) {
    // Try to find fields by name first (more reliable than IDs)
    let firstNameField = form.querySelector('[name="firstName"]');
    let lastNameField = form.querySelector('[name="lastName"]');
    let emailField = form.querySelector('[name="email"]');
    let messageField = form.querySelector('[name="message"]');
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Fallback to IDs if not found by name
    if (!firstNameField) firstNameField = document.getElementById('firstName');
    if (!lastNameField) lastNameField = document.getElementById('lastName');
    if (!emailField) emailField = document.getElementById('email');
    if (!messageField) messageField = document.getElementById('message');
    
    // Validate we found all required fields
    if (!firstNameField || !lastNameField || !emailField || !messageField || !submitButton) {
      console.error('Could not find all required form elements');
      return null;
    }
    
    return { firstNameField, lastNameField, emailField, messageField, submitButton };
  }
  
  // Form validation with field-specific error handling
  function validateForm(firstNameField, lastNameField, emailField, messageField) {
    // Clear previous error messages and states
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('input, textarea').forEach(el => {
      el.setAttribute('aria-invalid', 'false');
      el.removeAttribute('aria-describedby');
    });

    let isValid = true;

    // Validate first name
    if (!firstNameField.value.trim()) {
      showFieldError(firstNameField, 'First name is required');
      isValid = false;
    }

    // Validate last name
    if (!lastNameField.value.trim()) {
      showFieldError(lastNameField, 'Last name is required');
      isValid = false;
    }

    // Validate email
    if (!emailField.value.trim()) {
      showFieldError(emailField, 'Email is required');
      isValid = false;
    } else if (!isValidEmail(emailField.value.trim())) {
      showFieldError(emailField, 'Please enter a valid email address');
      isValid = false;
    }

    // Validate message
    if (!messageField.value.trim()) {
      showFieldError(messageField, 'Message is required');
      isValid = false;
    }

    return isValid ? null : 'Please fix the errors below';
  }

  // Show error for a specific field
  function showFieldError(field, message) {
    field.setAttribute('aria-invalid', 'true');
    const errorId = `${field.id}Error`;
    const errorElement = document.getElementById(errorId);
    
    if (errorElement) {
      errorElement.textContent = message;
      field.setAttribute('aria-describedby', errorId);
    } else {
      console.warn(`Error element not found for field: ${field.id}`);
    }
    
    // Focus the first field with error for better keyboard navigation
    if (!document.querySelector('[aria-invalid="true"]:focus')) {
      field.focus();
    }
  }
  
  // Handle API response
  async function handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      console.log('Non-JSON response:', text);
      return { message: text };
    }
  }
  
  // Show success message
  function showSuccess(form) {
    const formWrapper = form.closest('.form-wrapper') || form.closest('form') || form;
    const successId = 'form-submission-success';
    
    // Create success message with proper ARIA attributes
    const successDiv = document.createElement('div');
    successDiv.id = successId;
    successDiv.className = 'form-submission-success';
    successDiv.setAttribute('role', 'status');
    successDiv.setAttribute('aria-live', 'polite');
    successDiv.setAttribute('aria-atomic', 'true');
    successDiv.tabIndex = -1; // Make it focusable for screen readers
    
    successDiv.innerHTML = `
      <div class="success-message" style="padding: 20px; background-color: #f0f8f0; border: 1px solid #c3e6c3; border-radius: 4px; margin: 10px 0;">
        <h3 style="margin-top: 0; color: #2e7d32;">
          <span class="sr-only">Success: </span>Message Sent Successfully!
        </h3>
        <p>Thank you for contacting us. We'll get back to you as soon as possible.</p>
      </div>
    `;
    
    // Hide the form from screen readers when it's replaced
    form.setAttribute('aria-hidden', 'true');
    
    // Replace form with success message
    formWrapper.parentNode.replaceChild(successDiv, formWrapper);
    
    // Focus the success message for screen readers
    successDiv.focus();
    
    // Announce the success message to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = 'Your message has been sent successfully. Thank you for contacting us.';
    document.body.appendChild(announcement);
    
    // Remove the announcement after it's been read
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
  
  // Helper function to validate email format
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }
});
