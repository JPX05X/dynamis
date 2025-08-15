/**
 * Client-side URL routing for Dynamis website
 * Handles redirects from clean URLs to actual HTML files
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get the current path and remove leading/trailing slashes
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    
    // If we're at the root, no redirect needed
    if (!path) return;
    
    // Define the redirect mappings
    const redirects = {
        // Practice Areas
        'white-collar-criminal-and-regulatory-defense': '/practiceArea/white.html',
        'business-disputes-and-commercial-litigation': '/practiceArea/business.html',
        'crypto-blockchain-lawyers-analysis': '/practiceArea/crypto.html',
        'government-and-investigations': '/practiceArea/gov.html',
        'class-actions': '/practiceArea/class.html',
        'financial-services-and-securities': '/practiceArea/finance.html',
        'real-estate-litigation': '/practiceArea/real.html',
        'international-fcpa': '/practiceArea/inter.html',
        'whistleblower-lawsuits': '/practiceArea/whiz.html',
        'fintech-crypto-bankruptcy-litigation': '/practiceArea/fintech.html',
        
        // Main Navigation
        'dynamis-case-results': '/results.html',
        'talent': '/talents.html',
        'knowledge': '/knowledge.html',
        'dynamis-legal-resource-guides': '/legal.html',
        'media': '/media.html',
        'careers': '/careers.html',
        'contact': '/contact.html'
    };
    
    // Check if the current path matches any redirect
    if (redirects[path]) {
        // Use replace instead of assign to avoid adding to browser history
        window.location.replace(redirects[path]);
    }
});
