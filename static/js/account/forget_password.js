$(document).ready(function () {
    // Send OTP
    $("#step_generate_otp").submit(function (e) {
        e.preventDefault();
        let btn = $("#send_otp_btn");
        btn.prop('disabled',true).html(`<i class="fa fa-spinner fa-spin me-2"></i>Send OTP`);
        let email = $("#step_generate_otp #email").val().trim();
        if (!email) {
            showAlertMessage("Please enter a valid email.","danger");
            btn.prop('disabled',false).html(`Send OTP`);
            return;
        }
        $.ajax({
            url: "/api/send_otp",
            type: "POST",
            data: JSON.stringify({
                email: email
            }),
            contentType: "application/json",
            success: function(response) {
                btn.prop('disabled',false).html(`Send OTP`);
                $("#step_generate_otp").hide();
                $("#step_verify_otp").show();
                // Show resend otp option
                startTimer();
            },
            error: function(xhr) {
                btn.prop('disabled',false).html(`Send OTP`);
                showAlertMessage(xhr.responseJSON.error ? xhr.responseJSON.error : 'Failed to send OTP.', "danger")
            }
        });
    });

    // Handle OTP input fields navigation
    let inputs = $("#step_verify_otp .otp-input");
    inputs.keyup(function (e) {
        let index = inputs.index(this);
        this.value = this.value.replace(/[^0-9]/g, '');
        if (this.value && index < 5) {
            inputs.eq(index + 1).focus();
        }
        if (e.key === "Backspace" && index > 0) {
            inputs.eq(index - 1).focus();
        }

        let otp = inputs.map(function() { return this.value; }).get().join("");
        $("#verify_otp_btn").prop("disabled", otp.length !== 6);
    });

    // Verify OTP
    $("#verify_otp_btn").click(function () {
        let btn = $("#verify_otp_btn");
        btn.prop('disabled',true).html(`<i class="fa fa-spinner fa-spin me-2"></i>Verify OTP`);
        let otp = "";
        $("#step_verify_otp .otp-input").each(function () {
            otp += $(this).val(); // Get the value of each input field and concatenate
        });
        if (otp.length < 6) {
            showAlertMessage("Enter 6 digit OTP","danger");
            btn.prop('disabled',false).html(`Verify OTP`);
            return;
        }
        let email = $("#step_generate_otp #email").val().trim();
        if (!email) {
            showAlertMessage("Please enter a valid email.","danger");
            btn.prop('disabled',false).html(`Verify OTP`);
            return;
        }
        $.ajax({
            url: "/api/verify_otp",
            type: "POST",
            data: JSON.stringify({
                email: email,
                otp: otp
            }),
            contentType: "application/json",
            success: function(response) {
                btn.prop('disabled',false).html(`Verify OTP`);
                $("#step_verify_otp").hide();
                $("#step_reset_password").show();
            },
            error: function(xhr) {
                btn.prop('disabled',false).html(`Verify OTP`);
                showAlertMessage(xhr.responseJSON.error ? xhr.responseJSON.error : 'Invalid OTP',"danger");
            }
        });
    });

    // Reset Password
    $("#reset_password_btn").click(function () {
        let btn = $("#reset_password_btn");
        btn.prop('disabled',true).html(`<i class="fa fa-spinner fa-spin me-2"></i>Reset Password`);
        let password = $("#step_reset_password #new_password").val();
        let confirmPassword = $("#step_reset_password #confirm_password").val().trim();

        let email = $("#step_generate_otp #email").val().trim();
        if (!email) {
            showAlertMessage("Please enter a valid email.","danger");
            btn.prop('disabled',false).html(`Verify OTP`);
            return;
        }
        if (password.length < 6) {
            showAlertMessage("Password must be at least 6 characters long","danger");
            btn.prop('disabled',false).html(`Reset Password`);
            return;
        }
        if (password !== confirmPassword) {
            showAlertMessage("Passwords mismatch.","danger");
            btn.prop('disabled',false).html(`Reset Password`);
            return;
        }
        $.ajax({
            url: "/api/reset_password",
            type: "POST",
            data: JSON.stringify({
                email: email,
                password: password
            }),
            contentType: "application/json",
            success: function(response) {
                btn.prop('disabled',false).html(`Reset Password`);
                showAlertMessage("Password reset successfully!","success");
                window.location.href = "/login";
            },
            error: function(xhr) {
                btn.prop('disabled',false).html(`Reset Password`);
                showAlertMessage(xhr.responseJSON.error ? xhr.responseJSON.error : 'Failed to reset password', "danger");
            }
        });
    });

    // Resend OTP
    $("#resendBtn").on("click", () => {        
        $('#resendBtn').hide();
        $('#resend_otp_timer').html('<i class="fa fa-spinner fa-spin me-2"></i>Wait').show();
        $.ajax({
            url: "/api/send_otp",
            type: "POST",
            data: { 
                email:  $("#step_generate_otp #email").val().trim()
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

    // Toggle password
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
});