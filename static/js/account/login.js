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
            showAlertMessage("Login successful!", "success");
            btn.prop('disabled',false).html(`Login`);
            window.location.href = "/";
        },
        error: function(xhr) {
            btn.prop('disabled',false).html(`Login`);
            showAlertMessage(xhr.responseJSON.error ? Object.values(xhr.responseJSON.error)[0][0] : 'Login failed.', 'danger')
        }
    });
});
