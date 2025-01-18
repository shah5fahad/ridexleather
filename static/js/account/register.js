// signup.js
$("#signupForm").submit(function(e) {
    e.preventDefault();

    const first_name = $("#first_name").val();
    const last_name = $("#last_name").val();
    const email = $("#email").val();
    const password = $("#password").val();
    const password1 = $("#password1").val();

    // Get CSRF token
    function getCSRFToken() {
        return document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1];
    }

    $.ajax({
        url: '/register',
        type: 'POST',
        data: JSON.stringify({
            first_name: first_name,
            last_name: last_name,
            email: email,
            password: password,
            password1: password1
        }),
        contentType: 'application/json',
        headers: {
            "X-CSRFToken": getCSRFToken()  // Add CSRF token
        },
        success: function(response) {
            alert('Signup successful!');
            window.location.href = '/login';  // Redirect to login page
        },
        error: function(xhr) { 
            $("#error-message").text(xhr.responseJSON.error ? Object.values(xhr.responseJSON.error)[0] : 'Signup failed.');
        }
    });
});
