document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Clear any previous error messages
            const errorElement = document.querySelector('.server-error');
            if (errorElement) {
                errorElement.remove();
            }
            
            try {
                const formData = new FormData(form);
                const data = {
                    firstName: formData.get('firstName'),
                    lastName: formData.get('lastName'),
                    email: formData.get('email'),
                    subject: formData.get('subject'),
                    message: formData.get('message')
                };
                
                const response = await fetch('/api/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                alert('Message sent successfully!');
                form.reset();
                
            } catch (error) {
                console.error('Submission error:', error);
                const errorDiv = document.createElement('div');
                errorDiv.className = 'server-error';
                errorDiv.textContent = 'Failed to send message. Please try again.';
                errorDiv.style.color = 'red';
                errorDiv.style.marginTop = '10px';
                form.appendChild(errorDiv);
            }
        });
    }
});
