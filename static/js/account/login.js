$("#loginForm").submit(function(e) {
    e.preventDefault();
    let btn = $(this).find('button');
    btn.prop('disabled',true).html(`<i class="fa fa-spinner fa-spin me-2"></i>Login`);
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
            showAlertMessage("Logged in successful!", "success");
            btn.prop('disabled',false).html(`Login`);
            window.location.href = "/home";
        },
        error: function(xhr) {
            btn.prop('disabled',false).html(`Login`);
            showAlertMessage(xhr.responseJSON.error ? Object.values(xhr.responseJSON.error)[0][0] : 'Login failed.', 'danger')
        }
    });
});

$('.password-toggle-icon').on('click', function() {
    const inputField = $(this).parent().find('input');
    // Toggle the type attribute
    if (inputField.attr('type') === 'password') {
        inputField.attr('type', 'text');
        $(this).removeClass('fa-eye').addClass('fa-eye-slash');
    } else {
        inputField.attr('type', 'password');
        $(this).removeClass('fa-eye-slash').addClass('fa-eye');
    }
});