// Utility functions for common operations
const utils = {
    showNotification: (message, type = 'info') => {
        const notificationArea = document.getElementById('notification-area');
        if (!notificationArea) {
            console.error('Notification area not found in DOM');
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const closeBtn = document.createElement('span');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => notification.remove();
        notification.appendChild(closeBtn);
        
        notificationArea.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode === notificationArea) {
                notificationArea.removeChild(notification);
            }
        }, 5000);
    },
    
    validateToken: () => {
        const token = localStorage.getItem("token");
        if (!token) {
            return false;
        }
        return true;
    },
    
    requireAuth: () => {
        if (!utils.validateToken()) {
            utils.showNotification('Please log in to continue', 'error');
            window.location.href = "login.html";
            return false;
        }
        return true;
    }
};

window.onload = () => {
    console.log('app.js loaded');
    
    if (!utils.requireAuth()) {
        return;
    }
    
    const searchContainer = document.getElementById('search-container');
    const bookList = document.getElementById('book-list');
    const recentSection = document.getElementById('recent-searches');
    const submitButton = document.getElementById('submit-btn');
    const logoutButton = document.getElementById('logout-btn');
    
    if (!document.getElementById('notification-area')) {
        const notificationArea = document.createElement('div');
        notificationArea.id = 'notification-area';
        document.body.appendChild(notificationArea);
    }

    if (!searchContainer || !submitButton) {
        console.error("Required elements not found in the DOM!");
        utils.showNotification("Page elements missing. Please reload the page.", "error");
        return;
    }

    fetchRecentSearches();
    fetchUserProfile();

    submitButton.addEventListener('click', async () => {
        console.log('Get Recommendations button clicked');
        try {
            const genre = document.getElementById('genre').value.trim();
            const author = document.getElementById('author').value.trim();
            const year = document.getElementById('year').value.trim();
    
            // ADDED FOR DEBUGGING:
            console.log('[DEBUG] Genre:', JSON.stringify(genre));
            console.log('[DEBUG] Author:', JSON.stringify(author));
            console.log('[DEBUG] Year:', JSON.stringify(year));

            if (!genre) {
                utils.showNotification('Please enter a genre', 'error');
                bookList.innerHTML = '<li class="error-message">Please enter a genre</li>';
                return;
            }
    
            bookList.innerHTML = '<li class="loading"><div class="loader"></div>Loading recommendations...</li>';
            
            const requestBody = { 
                genre: genre,
                author: author,
                year: year
            };
            
            // ADDED FOR DEBUGGING:
            console.log('[DEBUG] Request body:', JSON.stringify(requestBody));
            
            const token = localStorage.getItem("token");
            if (!token) {
                utils.showNotification('Authentication required', 'error');
                throw new Error("User not authenticated");
            }
    
            console.log('Making API request to:', 'http://127.0.0.1:5000/recommend');
            
            const response = await fetch('http://127.0.0.1:5000/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            });
    
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                utils.showNotification(`Error: ${response.statusText}`, 'error');
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
    
            const data = await response.json();
            console.log('Response data:', data);
            
            if (!data.recommendations) {
                utils.showNotification('Invalid response from server', 'error');
                throw new Error('Invalid response format from server');
            }
    
            fetchRecentSearches();
            displayBooks(data.recommendations);
            utils.showNotification(`Found ${data.recommendations.length} recommendations`, 'success');
    
        } catch (error) {
            console.error('Error in search:', error);
            bookList.innerHTML = `<li class="error-message">${error.message}</li>`;
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            console.log('Logout button clicked');
            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            utils.showNotification('Logged out successfully', 'info');
            window.location.href = "login.html";
        });
    } else {
        console.error("Logout button not found");
    }

    async function fetchRecentSearches() {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                recentSection.innerHTML = '<p>Please log in to view recent searches</p>';
                return;
            }
            
            recentSection.innerHTML = '<h2>Recent Searches</h2><div class="loading-small"><div class="loader"></div>Loading...</div>';
            
            const response = await fetch('http://127.0.0.1:5000/recent-searches', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch recent searches: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (data && data.recent_searches && data.recent_searches.length > 0) {
                displayRecentSearches(data.recent_searches);
            } else {
                recentSection.innerHTML = '<h2>Recent Searches</h2><p>No recent searches</p>';
            }
        } catch (error) {
            console.error('Error fetching recent searches:', error);
            recentSection.innerHTML = '<h2>Recent Searches</h2><p>Error loading recent searches</p>';
        }
    }

    function displayBooks(books) {
        bookList.innerHTML = '';
        if (!Array.isArray(books)) {
            console.error('Books is not an array:', books);
            bookList.innerHTML = '<li class="error-message">Invalid response format</li>';
            return;
        }
        if (books.length === 0) {
            bookList.innerHTML = '<li class="error-message">No books found. Try different search criteria.</li>';
            return;
        }
        books.forEach((book, index) => {
            try {
                const li = document.createElement('li');
                li.className = 'book-card';

                const coverUrl = book.cover_url && book.cover_url !== 'None' ? book.cover_url : null;
                const coverImg = coverUrl
                    ? `<img src="${coverUrl}" alt="${encodeURIComponent(book.title || 'Book cover')}" class="book-cover" 
                         onerror="this.parentElement.innerHTML='<div class=&quot;no-cover&quot;>No Cover</div>';">`
                    : '<div class="no-cover">No Cover</div>';

                li.innerHTML = `
                    ${coverImg}
                    <div class="book-details">
                        <h3>${book.title || 'No Title'}</h3>
                        <p><strong>Author:</strong> ${book.author || 'Unknown'}</p>
                        <p><strong>Year:</strong> ${book.year || 'N/A'}</p>
                    </div>
                `;
                bookList.appendChild(li);
            } catch (error) {
                console.error(`Error processing book ${index}:`, error);
            }
        });
    }

    function displayRecentSearches(searches) {
        recentSection.innerHTML = '<h2>Recent Searches</h2>';
        const ul = document.createElement('ul');
        ul.className = 'recent-search-list';
        searches.forEach((s) => {
            const li = document.createElement('li');
            li.className = 'recent-search-item';
            li.innerHTML = `<span class="search-genre">Genre: ${s.genre}</span> | 
                           <span class="search-author">Author: ${s.author}</span> | 
                           <span class="search-year">Year: ${s.year}</span>`;
            
            // Repeat this search on click
            li.addEventListener('click', () => {
                document.getElementById('genre').value = s.genre === 'Any' ? '' : s.genre;
                document.getElementById('author').value = s.author === 'Any' ? '' : s.author;
                document.getElementById('year').value = s.year === 'Any' ? '' : s.year;
                document.getElementById('submit-btn').click();
            });
            
            ul.appendChild(li);
        });
        recentSection.appendChild(ul);
    }

    async function fetchUserProfile() {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                console.error("No token found. User might not be logged in.");
                return;
            }
            const response = await fetch('http://127.0.0.1:5000/profile', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            const usernameElem = document.getElementById("profile-username");
            const emailElem = document.getElementById("profile-email");
            const bioElem = document.getElementById("profile-bio");
            const picElem = document.getElementById("profile-pic");

            if (usernameElem) usernameElem.textContent = data.username;
            if (emailElem) emailElem.textContent = data.email;
            if (bioElem) bioElem.textContent = data.bio || "No bio yet";
            if (picElem) picElem.src = data.profile_picture || "default-profile.png";

        } catch (error) {
            console.error("Error fetching profile:", error);
            utils.showNotification('Failed to load profile information', 'error');
        }
    }
};
