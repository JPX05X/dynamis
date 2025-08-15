// Careers Form Handler
(function() {
  'use strict';

  // Configuration
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000; // 1 second
  
  // State management
  let submissionInProgress = false;

  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('careerApplication');
    if (!form) return;

    // Add form submission handler
    form.addEventListener('submit', handleFormSubmit);
    
    console.log('Careers form handler initialized');
  });

  // Form submission handler with retry logic
  async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (submissionInProgress) {
      console.log('Submission already in progress');
      return;
    }
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const positionTitle = document.getElementById('positionTitle').value;
    
    // Validate form
    if (!validateForm(form)) {
      return;
    }
    
    // Prepare form data
    const formData = new FormData(form);
    const data = {
      firstName: formData.get('firstName') || '',
      lastName: formData.get('lastName') || '',
      email: formData.get('email'),
      phone: formData.get('phone') || '',
      position: positionTitle,
      message: formData.get('coverLetter'),
      source: 'contact-page',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`
    };
    
    // Handle file attachment if present
    const fileInput = form.querySelector('input[type="file"]');
    if (fileInput && fileInput.files.length > 0) {
      data.attachment = fileInput.files[0].name;
      data.attachmentCount = fileInput.files.length;
    }
    
    // Submit form with retry logic
    await submitFormWithRetry(form, data, submitButton);
  }
  
  // Validate form fields
  function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    // Clear all previous errors
    const previousErrors = form.querySelectorAll('.error-message');
    previousErrors.forEach(error => error.remove());
    
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.classList.remove('error');
      input.removeAttribute('aria-invalid');
    });
    
    // Validate required fields
    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        showFieldError(field, 'This field is required');
        isValid = false;
      } else if (field.type === 'email' && !isValidEmail(field.value)) {
        showFieldError(field, 'Please enter a valid email address');
        isValid = false;
      } else if (field.type === 'tel' && field.value && !isValidPhone(field.value)) {
        showFieldError(field, 'Please enter a valid phone number');
        isValid = false;
      } else if (field.type === 'url' && field.value && !isValidUrl(field.value)) {
        showFieldError(field, 'Please enter a valid URL');
        isValid = false;
      } else {
        clearFieldError(field);
      }
    });
    
    // Additional validation for message
    const messageInput = form.querySelector('textarea[name="coverLetter"]');
    if (!messageInput.value.trim()) {
      showFieldError(messageInput, 'Please provide your message');
      isValid = false;
    } else if (messageInput.value.trim().length < 10) {
      showFieldError(messageInput, 'Please provide more details in your message');
      isValid = false;
    }
    
    // Additional validation for file uploads
    const fileInput = form.querySelector('input[type="file"]');
    if (fileInput && fileInput.files.length > 0) {
      const files = Array.from(fileInput.files);
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      
      for (const file of files) {
        if (file.size > maxSize) {
          showFieldError(fileInput, `File '${file.name}' exceeds the 5MB size limit`);
          isValid = false;
          break;
        }
        if (!allowedTypes.includes(file.type)) {
          showFieldError(fileInput, `File type '${file.type}' is not allowed`);
          isValid = false;
          break;
        }
      }
    }
    
    return isValid;
  }
  
  // Show error for a specific field
  function showFieldError(field, message) {
    field.classList.add('error');
    field.setAttribute('aria-invalid', 'true');
    
    let errorElement = field.nextElementSibling;
    if (!errorElement || !errorElement.classList.contains('error-message')) {
      errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      errorElement.style.color = '#d32f2f';
      errorElement.style.fontSize = '0.875rem';
      errorElement.style.marginTop = '0.25rem';
      field.parentNode.insertBefore(errorElement, field.nextSibling);
    }
    
    errorElement.textContent = message;
    field.setAttribute('aria-describedby', `error-${field.id}`);
  }
  
  // Clear field error
  function clearFieldError(field) {
    field.classList.remove('error');
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
    
    const errorElement = field.nextElementSibling;
    if (errorElement && errorElement.classList.contains('error-message')) {
      errorElement.remove();
    }
  }
  
  // Submit form with retry logic
  async function submitFormWithRetry(form, formData, submitButton, attempt = 1) {
    submissionInProgress = true;
    const originalButtonText = submitButton.innerHTML;
    
    try {
      // Update UI for loading state
      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
      submitButton.innerHTML = `Submitting${'.'.repeat(attempt)}`;
      
      // Show loading state in the form status
      const formStatus = form.querySelector('.form-status');
      if (formStatus) {
        formStatus.textContent = 'Submitting your application...';
        formStatus.className = 'form-status';
      }
      
      // Make the API request
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(formData)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        const errorMsg = responseData.message || `Server responded with status ${response.status}`;
        throw new Error(errorMsg);
      }
      
      // Show success message
      showSuccess(form, 'Your application has been submitted successfully! We will review your information and get back to you soon.');
      
      // Track successful submission
      if (typeof gtag === 'function') {
        gtag('event', 'form_submission', {
          'event_category': 'careers',
          'event_label': 'success',
          'position': formData.position
        });
      }
      
    } catch (error) {
      console.error(`Form submission attempt ${attempt} failed:`, error);
      
      // Check if we should retry
      const isNetworkError = error.name === 'TypeError' || !navigator.onLine;
      const shouldRetry = isNetworkError && attempt < MAX_RETRIES;
      
      if (shouldRetry) {
        // Show retry message
        const formStatus = form.querySelector('.form-status');
        if (formStatus) {
          formStatus.textContent = `Connection issue. Retrying (${attempt}/${MAX_RETRIES})...`;
          formStatus.className = 'form-status warning';
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        
        // Retry
        return submitFormWithRetry(form, formData, submitButton, attempt + 1);
      }
      
      // Show error to user
      const errorMessage = isNetworkError 
        ? 'Network error. Please check your connection and try again.'
        : error.message || 'Sorry, there was a problem submitting your application. Please try again later.';
      
      const formStatus = form.querySelector('.form-status');
      if (formStatus) {
        formStatus.textContent = errorMessage;
        formStatus.className = 'form-status error';
      }
      
    } finally {
      submissionInProgress = false;
      
      // Reset button state if submission failed
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-busy');
        submitButton.innerHTML = originalButtonText;
      }
    }
  }
  
  // Show success message
  function showSuccess(form, message) {
    // Create success message
    const successDiv = document.createElement('div');
    successDiv.className = 'form-submission-success';
    successDiv.setAttribute('role', 'status');
    successDiv.setAttribute('aria-live', 'polite');
    successDiv.setAttribute('aria-atomic', 'true');
    successDiv.tabIndex = -1;
    
    successDiv.innerHTML = `
      <div style="padding: 1rem; background-color: #f0f8f0; border: 1px solid #c3e6c3; border-radius: 4px; margin: 1rem 0;">
        <p style="margin: 0; color: #2e7d32; font-weight: 500;">
          <span class="sr-only">Success: </span>✓ ${message}
        </p>
      </div>
    `;
    
    // Insert before the form
    form.parentNode.insertBefore(successDiv, form);
    
    // Focus the success message for screen readers
    setTimeout(() => {
      successDiv.focus();
    }, 100);
    
    // Clear the form
    form.reset();
    
    // Remove any existing error messages
    const errorMessages = form.querySelectorAll('.error-message');
    errorMessages.forEach(msg => msg.remove());
    
    // Remove error classes from inputs
    const errorInputs = form.querySelectorAll('.error');
    errorInputs.forEach(input => {
      input.classList.remove('error');
      input.removeAttribute('aria-invalid');
    });
  }
  
  // Helper function to validate email format
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }
  
  // Helper function to validate phone number format
  function isValidPhone(phone) {
    // Basic phone validation - allows numbers, spaces, +, -, (, )
    const re = /^[+]?[\s\d-()]{8,20}$/;
    return re.test(phone);
  }
  
  // Helper function to validate URL format
  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }
})();
