/**
 * Custom Contact Form Handler for Dynamis LLP
 * Handles form validation, submission, and user feedback
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  if (!form) {
    console.warn('Contact form not found');
    return;
  }

  // Form elements and validation states
  const formElements = {
    firstName: {
      element: document.getElementById('firstName'),
      valid: false
    },
    lastName: {
      element: document.getElementById('lastName'),
      valid: false
    },
    email: {
      element: document.getElementById('email'),
      valid: false
    },
    subject: {
      element: document.getElementById('subject'),
      valid: false
    },
    message: {
      element: document.getElementById('message'),
      valid: false
    },
    submitBtn: document.getElementById('submitBtn'),
    formStatus: document.getElementById('formStatus'),
    buttonText: document.querySelector('#submitBtn .button-text'),
    buttonLoader: document.querySelector('#submitBtn .button-loader')
  };

  // API endpoint configuration - using relative URL to work in both dev and production
  const API_ENDPOINT = '/api/messages';
  
  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError('Please fill in all required fields correctly.');
      return;
    }
    
    try {
      setLoadingState(true);
      
      const formData = {
        firstName: formElements.firstName.element.value.trim(),
        lastName: formElements.lastName.element.value.trim(),
        email: formElements.email.element.value.trim(),
        subject: formElements.subject.element.value.trim(),
        message: formElements.message.element.value.trim()
      };
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Show success message and reset form
      showSuccess('Message sent successfully!');
      form.reset();
      resetValidationState();
      
    } catch (error) {
      console.error('Submission error:', error);
      showError('Failed to send message. Please try again.');
      
    } finally {
      setLoadingState(false);
    }
  });

  // Initialize form
  function initForm() {
    // Add event listeners for real-time validation
    const validationFields = [
      formElements.firstName,
      formElements.lastName,
      formElements.email,
      formElements.message
    ];

    validationFields.forEach(field => {
      if (field) {
        field.addEventListener('input', () => validateField(field));
        field.addEventListener('blur', () => validateField(field, true));
      }
    });

    // Add event listener for form submission
    form.addEventListener('submit', handleSubmit);
  }

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validate all required fields
    const requiredFields = [
      { field: formElements.firstName, name: 'First Name' },
      { field: formElements.lastName, name: 'Last Name' },
      { field: formElements.email, name: 'Email' },
      { field: formElements.message, name: 'Message' }
    ];

    // Validate each field and collect results
    const validationResults = requiredFields.map(({ field, name }) => ({
      valid: validateField(field, true),
      name
    }));

    // Check if all validations passed
    const isFormValid = validationResults.every(result => result.valid);

    if (!isFormValid) {
      const invalidFields = validationResults
        .filter(result => !result.valid)
        .map(result => result.name)
        .join(', ');
      
      showStatus(`Please complete the following required fields: ${invalidFields}`, 'error');
      
      // Focus on first invalid field
      const firstInvalid = validationResults.find(result => !result.valid);
      if (firstInvalid && firstInvalid.field) {
        firstInvalid.field.focus();
      }
      
      return;
    }

    // Prepare form data
    const formData = {
      firstName: formElements.firstName.value.trim(),
      lastName: formElements.lastName.value.trim(),
      email: formElements.email.value.trim(),
      phone: formElements.phone ? formElements.phone.value.trim() : '',
      subject: formElements.subject ? formElements.subject.value.trim() : '',
      message: formElements.message.value.trim(),
      timestamp: new Date().toISOString(),
      source: 'website-contact-form',
      pageUrl: window.location.href,
      userAgent: navigator.userAgent
    };

    // Submit the form
    try {
      // Update UI for submission state
      setFormState('submitting');
      
      // Show loading state
      showStatus('Sending your message...', 'info');
      
      // Send to backend API
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const responseData = await handleResponse(response);
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to send message. Please try again.');
      }
      
      // Show success message
      showStatus('Thank you! Your message has been sent. We\'ll get back to you soon!', 'success');
      
      // Reset form and scroll to success message
      form.reset();
      formElements.formStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Track successful submission
      if (window.gtag) {
        window.gtag('event', 'form_submit', {
          'event_category': 'Contact',
          'event_label': 'Contact Form Submission'
        });
      }
      
    } catch (error) {
      console.error('Form submission error:', error);
      showStatus(
        error.message || 'An error occurred while sending your message. Please try again later.', 
        'error'
      );
      
      // Ensure form status is visible
      formElements.formStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      // Reset form state
      setFormState('idle');
    }
  }

  // Set form state (submitting, idle, etc.)
  function setFormState(state) {
    switch (state) {
      case 'submitting':
        formElements.submitBtn.disabled = true;
        formElements.submitBtn.setAttribute('data-loading', 'true');
        formElements.buttonText.textContent = 'Sending...';
        formElements.buttonLoader.hidden = false;
        break;
        
      case 'idle':
      default:
        formElements.submitBtn.disabled = false;
        formElements.submitBtn.removeAttribute('data-loading');
        formElements.buttonText.textContent = 'Send Message';
        formElements.buttonLoader.hidden = true;
        break;
    }
  }

  // Field validation
  function validateField(field, showError = false) {
    if (!field) return false;
    
    const value = field.value.trim();
    const errorElement = document.getElementById(`${field.id}Error`);
    let isValid = true;
    let errorMessage = '';
    
    // Skip validation for optional fields if empty
    if (field.required || value !== '') {
      // Required field validation
      if (field.required && !value) {
        isValid = false;
        errorMessage = 'This field is required';
      } 
      // Email validation
      else if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          isValid = false;
          errorMessage = 'Please enter a valid email address';
        }
      }
      // Phone number validation (basic)
      else if (field.type === 'tel' && value) {
        const phoneRegex = /^[\+\d\s\(\)\-]+$/;
        if (!phoneRegex.test(value)) {
          isValid = false;
          errorMessage = 'Please enter a valid phone number';
        }
      }
    }
    
    // Update error message display
    if (errorElement) {
      if (showError && !isValid) {
        errorElement.textContent = errorMessage;
        field.setAttribute('aria-invalid', 'true');
        field.classList.add('error');
      } else if (isValid) {
        errorElement.textContent = '';
        field.setAttribute('aria-invalid', 'false');
        field.classList.remove('error');
      }
      
      // Update ARIA live region for screen readers
      if (showError) {
        errorElement.setAttribute('aria-live', 'assertive');
      }
    }
    
    return isValid;
  }
  
  // Handle API response
  async function handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return { message: await response.text() };
    } catch (error) {
      console.error('Error parsing response:', error);
      return { message: 'An error occurred while processing the response.' };
    }
  }
  
  // Show status message
  function showStatus(message, type = 'info') {
    if (!formElements.formStatus) return;
    
    // Clear previous status and classes
    formElements.formStatus.textContent = '';
    formElements.formStatus.className = 'form-status';
    
    // Set new status
    formElements.formStatus.textContent = message;
    formElements.formStatus.classList.add(type);
    formElements.formStatus.setAttribute('role', 'status');
    
    // Make sure it's visible
    formElements.formStatus.hidden = false;
    
    // Auto-hide success messages after 10 seconds
    if (type === 'success') {
      setTimeout(() => {
        if (formElements.formStatus.textContent === message) {
          formElements.formStatus.hidden = true;
        }
      }, 10000);
    }
    
    // Log to console for debugging
    console.log(`Form status (${type}):`, message);
  }
  
  // Initialize the form
  initForm();
})();
