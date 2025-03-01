document.addEventListener("DOMContentLoaded", async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        window.location.href = "login.html";
        return;
    }

    const usernameSpan = document.getElementById("username");
    const emailSpan = document.getElementById("user-email");
    const bioSpan = document.getElementById("user-bio");
    const profilePic = document.getElementById("profile-pic");
    const updateForm = document.getElementById("update-profile-form");

    try {
        const response = await fetch(`http://127.0.0.1:5000/user/${userId}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        const userData = await response.json();

        usernameSpan.textContent = userData.username;
        emailSpan.textContent = userData.email;
        bioSpan.textContent = userData.bio || "No bio yet";
        profilePic.src = userData.profile_picture || "default-profile.png";
    } catch (error) {
        console.error("Error fetching user data:", error);
    }

    updateForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newBio = document.getElementById("bio").value.trim();
        const profilePicture = document.getElementById("profile-picture").files[0];

        const formData = new FormData();
        if (newBio) formData.append("bio", newBio);
        if (profilePicture) formData.append("profile_picture", profilePicture);

        try {
            const response = await fetch(`http://127.0.0.1:5000/user/${userId}`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
                body: formData
            });

            if (response.ok) {
                alert("Profile updated!");
                location.reload();
            } else {
                const errorData = await response.json();
                alert("Error: " + errorData.error);
            }
        } catch (error) {
            console.error("Error updating profile:", error);
        }
    });

    // Logout function
    document.getElementById("logout-btn").addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        window.location.href = "login.html";
    });
});
