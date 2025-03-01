// Utility functions for profile management
const profileUtils = {
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
    
    // Check if user is authenticated
    requireAuth: () => {
        const token = localStorage.getItem("token");
        if (!token) {
            profileUtils.showNotification('Please log in to view your profile', 'error');
            window.location.href = "login.html";
            return false;
        }
        return true;
    },
    
    // Validate file size for profile picture
    validateFileSize: (file, maxSizeMB = 5) => {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        return file.size <= maxSizeBytes;
    },
    
    // Validate file type for profile picture
    validateFileType: (file) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        return allowedTypes.includes(file.type);
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Check if user is authenticated
        if (!profileUtils.requireAuth()) {
            return;
        }
        
        // Get DOM elements
        const usernameSpan = document.getElementById("username");
        const emailSpan = document.getElementById("user-email");
        const bioSpan = document.getElementById("user-bio");
        const profilePic = document.getElementById("profile-pic");
        const updateForm = document.getElementById("update-profile-form");
        const bioInput = document.getElementById("bio");
        
        // Show loading state
        usernameSpan.textContent = "Loading...";
        emailSpan.textContent = "Loading...";
        
        // Get auth token
        const token = localStorage.getItem("token");
        
        // Fetch user profile data
        const response = await fetch('http://127.0.0.1:5000/profile', {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const userData = await response.json();
        
        // Update UI with user data
        usernameSpan.textContent = userData.username;
        emailSpan.textContent = userData.email;
        bioSpan.textContent = userData.bio || "No bio yet";
        profilePic.src = userData.profile_picture || "default-profile.png";
        
        // Pre-fill the bio input
        bioInput.value = userData.bio || "";
        
        // Handle profile update form submission
        updateForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            try {
                const submitButton = updateForm.querySelector("button[type='submit']");
                const originalButtonText = submitButton.textContent;
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner"></span> Updating...';
                
                const newBio = bioInput.value.trim();
                const profilePictureInput = document.getElementById("profile-picture");
                const profilePicture = profilePictureInput.files[0];
                
                // Validate profile picture if selected
                if (profilePicture) {
                    if (!profileUtils.validateFileType(profilePicture)) {
                        profileUtils.showNotification('Please select a valid image file (JPEG, PNG, GIF, WebP)', 'error');
                        submitButton.disabled = false;
                        submitButton.textContent = originalButtonText;
                        return;
                    }
                    
                    if (!profileUtils.validateFileSize(profilePicture, 5)) {
                        profileUtils.showNotification('Profile picture must be less than 5MB', 'error');
                        submitButton.disabled = false;
                        submitButton.textContent = originalButtonText;
                        return;
                    }
                }
                
                const formData = new FormData();
                if (newBio) formData.append("bio", newBio);
                if (profilePicture) formData.append("profile_picture", profilePicture);
                
                const response = await fetch('http://127.0.0.1:5000/profile', {
                    method: "PUT",
                    headers: { "Authorization": `Bearer ${token}` },
                    body: formData
                });
                
                if (response.ok) {
                    const updatedData = await response.json();
                    profileUtils.showNotification('Profile updated successfully!', 'success');
                    
                    // Update the UI with new data
                    bioSpan.textContent = updatedData.user.bio || "No bio yet";
                    if (updatedData.user.profile_picture) {
                        profilePic.src = updatedData.user.profile_picture + '?t=' + new Date().getTime();
                    }
                    
                    // Clear file input
                    profilePictureInput.value = '';
                } else {
                    const errorData = await response.json();
                    profileUtils.showNotification("Error: " + (errorData.error || "Failed to update profile"), 'error');
                }
                
                // Reset button state
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            } catch (error) {
                console.error("Error updating profile:", error);
                profileUtils.showNotification('An error occurred while updating your profile', 'error');
                submitButton.disabled = false;
                submitButton.textContent = 'Update Profile';
            }
        });
        
        // Setup logout button
        document.getElementById("logout-btn").addEventListener("click", () => {
            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            profileUtils.showNotification('Logged out successfully', 'info');
            window.location.href = "login.html";
        });
    } catch (error) {
        console.error("Error in profile.js initialization:", error);
        profileUtils.showNotification('Failed to load profile data', 'error');
    }
});