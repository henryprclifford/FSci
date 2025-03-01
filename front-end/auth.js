document.addEventListener("DOMContentLoaded", () => {
    const loginContainer = document.getElementById("auth-container");
    const signupContainer = document.getElementById("signup-container");

    document.getElementById("show-signup").addEventListener("click", (e) => {
        e.preventDefault();
        loginContainer.style.display = "none";
        signupContainer.style.display = "block";
    });

    document.getElementById("show-login").addEventListener("click", (e) => {
        e.preventDefault();
        signupContainer.style.display = "none";
        loginContainer.style.display = "block";
    });

    document.getElementById("login-btn").addEventListener("click", async () => {
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;

        const response = await fetch("http://127.0.0.1:5000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include"
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("userId", data.user.id);
            window.location.href = "index.html";  // Redirect to main search page
        } else {
            alert(data.error);
        }
    });

    document.getElementById("signup-btn").addEventListener("click", async () => {
        const username = document.getElementById("signup-username").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;

        const response = await fetch("http://127.0.0.1:5000/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password }),
            credentials: "include"
        });

        const data = await response.json();

        if (response.ok) {
            alert("Signup successful! You can now log in.");
            signupContainer.style.display = "none";
            loginContainer.style.display = "block";
        } else {
            alert(data.error);
        }
    });

    // Logout function
    document.getElementById("logout-btn")?.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        window.location.href = "login.html";
    });
});
