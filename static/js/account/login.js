$("#loginForm").submit(function(e) {
    e.preventDefault();

    // Get form data
    const loginInput = $("#loginInput").val();
    const password = $("#password").val();

    $.ajax({
        url: "/login",
        type: "POST",
        headers: { "X-CSRFToken": getCookie('csrftoken') },
        data: JSON.stringify({
            user_cred: loginInput,
            password: password
        }),
        contentType: "application/json",
        success: function(response) {
            localStorage.setItem('eg_user', response.user)
            // Redirect to home or another protected page
            alert("Login successful!");
            window.location.href = "/";
        },
        error: function(xhr) {
            $("#error-message").text(xhr.responseJSON.error ? Object.values(xhr.responseJSON.error)[0] : 'Login failed.');
        }
    });
});
