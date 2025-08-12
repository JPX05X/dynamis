// Custom loading overlay for The Great Recovery
(function() {
  // Create and inject custom loading overlay
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'custom-loading-overlay';
  loadingOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    font-family: 'degular-display', sans-serif;
    font-weight: 700;
    font-size: 2.5rem;
    color: #0055AA;
    flex-direction: column;
    text-align: center;
  `;
  
  // Add the loading text
  const loadingText = document.createElement('div');
  loadingText.textContent = 'The Great Recovery';
  loadingOverlay.appendChild(loadingText);
  
  // Add to body immediately
  document.body.appendChild(loadingOverlay);

  // Only run this once the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Target only the most common loading elements
    const loadingSelectors = [
      '#loader-wrapper',
      '#loading',
      '.loading',
      '.sqs-block-spinner',
      '.sqs-spin',
      '.sqs-block-image .image-loading-outer',
      '.sqs-block-image .image-loading',
      '.sqs-block-image .intrinsic',
      '.loader',
      '.loading-animation'
    ];

    // Function to safely remove elements and hide our custom overlay
    function safelyRemoveElements() {
      loadingSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            if (element && element.parentNode) {
              element.style.display = 'none';
              element.style.visibility = 'hidden';
            }
          });
        } catch (e) {
          console.warn('Error processing selector:', selector, e);
        }
      });

      // Make sure the body is visible
      if (document.body) {
        document.body.style.visibility = 'visible';
        document.body.style.opacity = '1';
      }
    }

    // Function to remove the custom overlay
    function removeCustomOverlay() {
      const overlay = document.getElementById('custom-loading-overlay');
      if (overlay) {
        // Add fade out effect
        overlay.style.transition = 'opacity 0.5s ease-out';
        overlay.style.opacity = '0';
        // Remove after animation completes
        setTimeout(() => {
          overlay.remove();
        }, 500);
      }
    }

    // When everything is loaded, remove loading elements and our overlay
    window.addEventListener('load', function() {
      safelyRemoveElements();
      // Slight delay to ensure smooth transition
      setTimeout(removeCustomOverlay, 300);
    });
    
    // Also set a maximum timeout to ensure overlay is removed
    setTimeout(function() {
      safelyRemoveElements();
      removeCustomOverlay();
    }, 5000); // 5 second max
  });
})();
