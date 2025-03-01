window.onload = () => {
    console.log('app.js loaded'); // Confirm JS file is loaded

    const searchContainer = document.getElementById('search-container');
    const bookList = document.getElementById('book-list');
    const recentSection = document.getElementById('recent-searches');
    const submitButton = document.getElementById('submit-btn');
    const logoutButton = document.getElementById('logout-btn');
    const profileSection = document.getElementById('user-profile');

    // Check if elements are found
    if (!searchContainer || !submitButton) {
        console.error("Required elements not found in the DOM!");
        return;
    } else {
        console.log("Search container and submit button found:", searchContainer, submitButton);
    }

    console.log("Event listener is being added to the form...");
    
    // Fetch user profile on load
    fetchUserProfile();

    // Fetch recent searches on page load
    fetchRecentSearches();

    // Handle button click instead of form submit
    submitButton.addEventListener('click', async () => {
        console.log('Button clicked');

        const genre = document.getElementById('genre').value.trim();
        const author = document.getElementById('author').value.trim();
        const year = document.getElementById('year').value.trim();

        if (!genre) {
            bookList.innerHTML = '<li class="error-message">Please enter a genre</li>';
            return;
        }

        try {
            bookList.innerHTML = '<li class="loading">Loading recommendations...</li>';
            
            const requestBody = { genre, author, year };
            console.log('Request body:', requestBody);

            const response = await fetch('http://127.0.0.1:5000/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': 'http://127.0.0.1:5500'
                },
                credentials: 'omit',
                mode: 'cors',
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Server response:', data);

            if (!data.recommendations) {
                throw new Error('Invalid response format from server');
            }

            displayBooks(data.recommendations);
            await fetchRecentSearches();

        } catch (error) {
            console.error('Error:', error);
            bookList.innerHTML = `<li class="error-message">${error.message}</li>`;
        }
    });

    // Function to fetch recent searches
    async function fetchRecentSearches() {
        try {
            const response = await fetch('http://127.0.0.1:5000/recent-searches', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Origin': 'http://127.0.0.1:5500'
                },
                credentials: 'omit',
                mode: 'cors'
            });
            
            const data = await response.json();
            console.log('Recent Searches Response:', data);

            if (data && data.recent_searches) {
                displayRecentSearches(data.recent_searches);
            } else {
                console.error('Unexpected data format for recent searches:', data);
            }
        } catch (error) {
            console.error('Error fetching recent searches:', error);
            recentSection.innerHTML = '<p>Error loading recent searches</p>';
        }
    }

    // Function to display book recommendations
    function displayBooks(books) {
        console.log('Starting to display books:', books);
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
                console.log(`Processing book ${index}:`, book);
                const li = document.createElement('li');
                li.className = 'book-card';

                const coverUrl = book.cover_url && book.cover_url !== 'None' ? book.cover_url : null;
                const coverImg = coverUrl ?
                    `<img src="${coverUrl}" alt="${book.title} cover" class="book-cover" onerror="this.parentElement.innerHTML='<div class=\'no-cover\'>No Cover</div>'">` :
                    '<div class="no-cover">No Cover</div>';

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

    // Function to display recent searches
    function displayRecentSearches(searches) {
        if (!Array.isArray(searches)) {
            console.error('Recent searches data is not an array:', searches);
            return;
        }

        recentSection.innerHTML = '<h3>Recent Searches:</h3>';

        if (searches.length === 0) {
            recentSection.innerHTML += '<p>No recent searches</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'recent-searches-list';

        searches.forEach(search => {
            const li = document.createElement('li');
            li.textContent = `Genre: ${search.genre || 'None'} | Author: ${search.author || 'Any'} | Year: ${search.year || 'Any'}`;
            ul.appendChild(li);
        });

        recentSection.appendChild(ul);
        console.log('Recent searches displayed:', searches); // Debug log
    }

    // Function to fetch user profile
    async function fetchUserProfile() {
        console.log("Fetching user profile...");
        
        try {
            const response = await fetch('http://127.0.0.1:5000/profile', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("User Profile:", data);

            document.getElementById("profile-username").textContent = data.username;
            document.getElementById("profile-email").textContent = data.email;
            document.getElementById("profile-bio").textContent = data.bio;
            document.getElementById("profile-pic").src = data.profile_picture || "default.png";

        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    }

    // Function to handle logout
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try {
                const response = await fetch("http://127.0.0.1:5000/logout", {
                    method: "POST",
                    credentials: "include"
                });
                const data = await response.json();
                alert(data.message);
                localStorage.removeItem("token");
                window.location.href = "login.html"; // Redirect to login page
            } catch (error) {
                console.error("Logout error:", error);
            }
        });
    }

    // Function to update user profile
async function updateUserProfile() {
    const newBio = document.getElementById("edit-bio").value.trim();
    const profilePicInput = document.getElementById("edit-profile-pic");
    let profilePicUrl = null;

    // If a new profile picture is selected, upload it
    if (profilePicInput.files.length > 0) {
        const formData = new FormData();
        formData.append("profile_picture", profilePicInput.files[0]);

        try {
            const uploadResponse = await fetch("http://127.0.0.1:5000/upload-profile-pic", {
                method: "POST",
                body: formData
            });

            const uploadData = await uploadResponse.json();
            if (!uploadResponse.ok) throw new Error(uploadData.error);
            profilePicUrl = uploadData.profile_picture;
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            alert("Failed to upload profile picture.");
            return;
        }
    }

    // Send updated bio and profile picture URL
    try {
        const response = await fetch("http://127.0.0.1:5000/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                bio: newBio,
                profile_picture: profilePicUrl
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        alert("Profile updated successfully!");
        fetchUserProfile(); // Reload profile after update
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile.");
    }
}

// Add event listener to save button
document.getElementById("save-profile-btn").addEventListener("click", updateUserProfile);

};
