/**
 * Remove DynamisLLP Loading Animation
 * This script specifically targets and removes the DynamisLLP loading animation
 * that appears when the page loads.
 */

(function() {
    // Function to remove the loading animation
    function removeDynamisLoader() {
        // Target elements that might contain the loading animation
        const potentialLoaders = [
            // Check for elements with DynamisLLP in text content
            ...Array.from(document.querySelectorAll('*')).filter(el => 
                el.textContent && el.textContent.includes('dynamisLLP')
            ),
            // Check for common loader elements
            ...document.querySelectorAll('.loader, .loading, .sqs-block-spacer, [class*="loading"], [id*="loading"]')
        ];

        // Remove or hide each potential loader
        potentialLoaders.forEach(loader => {
            try {
                loader.style.display = 'none';
                loader.style.visibility = 'hidden';
                loader.style.opacity = '0';
                loader.remove();
            } catch (e) {
                console.log('Error removing loader:', e);
            }
        });

        // Force show the main content
        const mainContent = document.querySelector('main, .main, #main, .content, #content, .page, #page') || document.body;
        if (mainContent) {
            mainContent.style.opacity = '1';
            mainContent.style.visibility = 'visible';
            mainContent.style.display = 'block';
        }
    }

    // Run immediately
    removeDynamisLoader();

    // Run after DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeDynamisLoader);
    }

    // Run after all resources are loaded
    window.addEventListener('load', removeDynamisLoader);

    // Set up a mutation observer to catch dynamically added loaders
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                removeDynamisLoader();
            }
        });
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });
})();
