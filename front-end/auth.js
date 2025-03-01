// Utility functions for authentication
const authUtils = {
    // Display notification message to the user
    showNotification: (message, type = 'info') => {
        // Create notification area if it doesn't exist
        let notificationArea = document.getElementById('notification-area');
        if (!notificationArea) {
            notificationArea = document.createElement('div');
            notificationArea.id = 'notification-area';
            document.body.appendChild(notificationArea);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => notification.remove();
        notification.appendChild(closeBtn);
        
        notificationArea.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode === notificationArea) {
                notificationArea.removeChild(notification);
            }
        }, 5000);
    },
    
    // Validate email format
    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // Validate password (minimum requirements)
    validatePassword: (password) => {
        return password.length >= 6; // Minimum 6 characters
    },
    
    // Check if user is already logged in
    isLoggedIn: () => {
        return localStorage.getItem("token") !== null;
    }
};

document.addEventListener("DOMContentLoaded", () => {
    // If user is already logged in on the login page, redirect to home
    if (window.location.pathname.includes('login.html') && authUtils.isLoggedIn()) {
        window.location.href = "index.html";
        return;
    }
    
    // Create notification area if it doesn't exist
    if (!document.getElementById('notification-area')) {
        const notificationArea = document.createElement('div');
        notificationArea.id = 'notification-area';
        document.body.appendChild(notificationArea);
    }
    
    const loginContainer = document.getElementById("auth-container");
    const signupContainer = document.getElementById("signup-container");
    
    // Toggle between login and signup forms
    if (document.getElementById("show-signup")) {
        document.getElementById("show-signup").addEventListener("click", (e) => {
            e.preventDefault();
            loginContainer.style.display = "none";
            signupContainer.style.display = "block";
        });
    }
    
    if (document.getElementById("show-login")) {
        document.getElementById("show-login").addEventListener("click", (e) => {
            e.preventDefault();
            signupContainer.style.display = "none";
            loginContainer.style.display = "block";
        });
    }
    
    // Login form submission
    if (document.getElementById("login-btn")) {
        document.getElementById("login-btn").addEventListener("click", async () => {
            const emailInput = document.getElementById("login-email");
            const passwordInput = document.getElementById("login-password");
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            
            // Form validation
            if (!email) {
                authUtils.showNotification('Email is required', 'error');
                emailInput.classList.add('input-error');
                return;
            } else {
                emailInput.classList.remove('input-error');
            }
            
            if (!authUtils.validateEmail(email)) {
                authUtils.showNotification('Please enter a valid email address', 'error');
                emailInput.classList.add('input-error');
                return;
            } else {
                emailInput.classList.remove('input-error');
            }
            
            if (!password) {
                authUtils.showNotification('Password is required', 'error');
                passwordInput.classList.add('input-error');
                return;
            } else {
                passwordInput.classList.remove('input-error');
            }
            
            // Show loading state
            const loginBtn = document.getElementById("login-btn");
            const originalText = loginBtn.textContent;
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span class="spinner"></span> Logging in...';
            
            try {
                const response = await fetch("http://127.0.0.1:5000/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store token in localStorage
                    // Note: HttpOnly cookies would be more secure but require backend changes
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("userId", data.user.id);
                    authUtils.showNotification('Login successful!', 'success');
                    window.location.href = "index.html";
                } else {
                    authUtils.showNotification(data.error || 'Login failed', 'error');
                    loginBtn.disabled = false;
                    loginBtn.textContent = originalText;
                }
            } catch (error) {
                console.error('Login error:', error);
                authUtils.showNotification('Connection error. Please try again.', 'error');
                loginBtn.disabled = false;
                loginBtn.textContent = originalText;
            }
        });
    }
    
    // Signup form submission
    if (document.getElementById("signup-btn")) {
        document.getElementById("signup-btn").addEventListener("click", async () => {
            const usernameInput = document.getElementById("signup-username");
            const emailInput = document.getElementById("signup-email");
            const passwordInput = document.getElementById("signup-password");
            
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            
            // Form validation
            let isValid = true;
            
            if (!username) {
                authUtils.showNotification('Username is required', 'error');
                usernameInput.classList.add('input-error');
                isValid = false;
            } else {
                usernameInput.classList.remove('input-error');
            }
            
            if (!email) {
                authUtils.showNotification('Email is required', 'error');
                emailInput.classList.add('input-error');
                isValid = false;
            } else if (!authUtils.validateEmail(email)) {
                authUtils.showNotification('Please enter a valid email address', 'error');
                emailInput.classList.add('input-error');
                isValid = false;
            } else {
                emailInput.classList.remove('input-error');
            }
            
            if (!password) {
                authUtils.showNotification('Password is required', 'error');
                passwordInput.classList.add('input-error');
                isValid = false;
            } else if (!authUtils.validatePassword(password)) {
                authUtils.showNotification('Password must be at least 6 characters', 'error');
                passwordInput.classList.add('input-error');
                isValid = false;
            } else {
                passwordInput.classList.remove('input-error');
            }
            
            if (!isValid) {
                return;
            }
            
            // Show loading state
            const signupBtn = document.getElementById("signup-btn");
            const originalText = signupBtn.textContent;
            signupBtn.disabled = true;
            signupBtn.innerHTML = '<span class="spinner"></span> Signing up...';
            
            try {
                const response = await fetch("http://127.0.0.1:5000/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    authUtils.showNotification('Signup successful! You can now log in.', 'success');
                    signupContainer.style.display = "none";
                    loginContainer.style.display = "block";
                    
                    // Pre-fill login form with the email
                    document.getElementById("login-email").value = email;
                    document.getElementById("login-password").value = "";
                } else {
                    authUtils.showNotification(data.error || 'Signup failed', 'error');
                }
                
                // Reset button state
                signupBtn.disabled = false;
                signupBtn.textContent = originalText;
            } catch (error) {
                console.error('Signup error:', error);
                authUtils.showNotification('Connection error. Please try again.', 'error');
                signupBtn.disabled = false;
                signupBtn.textContent = originalText;
            }
        });
    }
    
    // Logout functionality
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            authUtils.showNotification('Logged out successfully', 'info');
            window.location.href = "login.html";
        });
    }
});