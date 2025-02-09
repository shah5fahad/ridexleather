$(document).ready(function () {   
    $("#signupForm").submit(function(e) {
        e.preventDefault();
        let btn = $(this).find('button');
        btn.prop('disabled',true).html(`<i class="fa fa-spinner fa-spin me-2"></i>Signup`);
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
                btn.prop('disabled',false).html(`Signup`);
                $('#otp_email').text(email)
                $('.signup_container').addClass('signup_container_blur');
                $('.otp-container').show();
                let inputs = $(".otp-input");
                inputs.keyup(function (e) {
                    let index = inputs.index(this);                    
                    this.value = this.value.replace(/[^0-9]/g, '');                    
                    if (this.value && index < 5) {
                        inputs.eq(index + 1).focus();
                    }                    
                    if (e.key === "Backspace" && index > 0) {
                        inputs.eq(index - 1).focus();
                    }                    
                    let allFilled = inputs.toArray().every(input => input.value !== "");
                    $("#verify-otp-btn").prop("disabled", !allFilled);
                });
                // Show resend otp option
                startTimer();
            },
            error: function(xhr) { 
                btn.prop('disabled',false).html(`Signup`);
                showAlertMessage(xhr.responseJSON.error ? Object.values(xhr.responseJSON.error)[0][0] : 'Signup failed.', "danger");
            }
        });
    });
    $("#verify-otp-btn").on("click", () => {
        let btn = $(this).find('#verify-otp-btn');
        btn.prop('disabled',true).html(`<i class="fa fa-spinner fa-spin me-2"></i>Verify OTP`);
        const email = $("#email").val();
        const password = $("#password").val();
        let otp = "";
        $(".otp-input").each(function () {
            otp += $(this).val(); // Get the value of each input field and concatenate
        });
        if (otp.length < 6) {
            showAlertMessage("Enter 6 digit OTP","danger");
            btn.prop('disabled',false).html(`Verify OTP`);
            return;
        }
        $.ajax({
            url: '/api/verify_otp',
            type: 'POST',
            data: JSON.stringify({
                email: email,
                password: password,
                otp: parseInt(otp),
            }),
            contentType: 'application/json',
            success: function(response) {
                localStorage.setItem('eg_user', response.user);
                showAlertMessage('successful registered!', "success");
                btn.prop('disabled',false).html(`Verify OTP`);
                window.location.href = '/home';
            },
            error: function(xhr) { 
                btn.prop('disabled',false).html(`Verify OTP`);
                showAlertMessage(xhr.responseJSON.error ? xhr.responseJSON.error : 'OTP varification failed.', "danger");
            }
        });             
    });
    $("#resendBtn").on("click", () => {        
        $('#resendBtn').hide();
        $('#resend_otp_timer').html('<i class="fa fa-spinner fa-spin me-2"></i>Wait').show();
        $.ajax({
            url: "/api/send_otp",
            type: "POST",
            data: { 
                email:  $("#email").val().trim(),
                register_user: true
            },
            success: function(response) {   
                $('#resend_otp_timer').html('').hide();             
                showAlertMessage("OTP Resent Successfully!", "success");
                startTimer();
            },
            error: function(xhr) {
                $('#resend_otp_timer').html('').hide();
                $('#resendBtn').show();
                showAlertMessage("Error resending OTP. Please try again later.");
            }
        });
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
