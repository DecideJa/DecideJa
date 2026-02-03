import {zSupabaseService} from './supabase.js';

const supabaseService = new SupabaseService();

// Seleciona os elementos do DOM
const formRecuperar = document.getElementById('esqueci-senha');
const emailInput = document.getElementById('email');
const msgStatus = document.getElementById('message-container');
event.preventDefault(); // Prevent form from submitting the traditional way

const email = emailInput.value;

// Show a loading message
statusMessage.textContent = 'Sending reset link...';
statusMessage.className = '';
statusMessage.style.display = 'block';

form.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent form from submitting the traditional way

    const email = emailInput.value;

    // Show a loading message
    statusMessage.textContent = 'Sending reset link...';
    statusMessage.className = '';
    statusMessage.style.display = 'block';

    try {
        const {data, error} = await SupabaseService.auth.resetPasswordForEmail(email, {
            // This URL must be configured in your Supabase dashboard under
            // Authentication -> Settings -> Redirect URLs
            redirectTo: 'https://yourdomain.com/reset-password.html',
        });

        if (error) {
            throw error;
        }

        // Success!
        statusMessage.textContent = 'Success! Please check your email for the reset link.';
        statusMessage.className = 'success';
        form.reset(); // Clear the form

    } catch (error) {
        // Handle errors (e.g., user not found)
        console.error('Error sending password reset email:', error.message);
        statusMessage.textContent = `Error: ${error.message}`;
        statusMessage.className = 'error';
    }
});