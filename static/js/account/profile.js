// Live Image Preview
function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function () {
        const output = document.getElementById('profilePreview');
        output.src = reader.result;
    };
    reader.readAsDataURL(event.target.files[0]);
}

function showErrorMessage(msg) {
    $('#editProfileForm #error-message').text(msg).show();
    setTimeout(() => {
        $('#editProfileForm #error-message').text("").hide();
    }, 5000);
}

$(document).ready(function () {
    const profile_api_url = '/api/profile/';
    const phoneNumber = document.querySelector("#phoneNumber");
    const iti = window.intlTelInput(phoneNumber, {
        separateDialCode: true,  // Show the country code separately
        preferredCountries: ["us", "in", "gb"], // Add your preferred countries
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.10/js/utils.js" // For validation and formatting
    });

    phoneNumber.addEventListener('countrychange', function () {
        document.getElementById("country_name").value = `${iti.getSelectedCountryData().name} - ${iti.getSelectedCountryData().iso2}`;
    });

    // Fetch data and auto-fill form
    $.ajax({
        url: profile_api_url,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getCookie('access_token')}`
        },
        success: function (data) {
            // Auto-fill the form
            for (const [key, value] of Object.entries(data)) {
                if (key === "profile_image" && value) {
                    let eg_user = localStorage.getItem('eg_user');
                    if (eg_user) {
                        eg_user = JSON.parse(atob(eg_user));
                        if (eg_user.profile !== value) {
                            eg_user.profile = value;
                            $('.authorized_user img').attr('src', eg_user.profile);
                            localStorage.setItem('eg_user', btoa(JSON.stringify(eg_user)));
                        }
                    }
                    $('#editProfileForm .profile-image img').attr('src', value);
                } else if (key === "country_name" && value) {
                    if (value.split(" - ").length > 1) iti.setCountry(value.split(" - ")[1]);            
                    document.getElementById("country_name").value = value;
                } else {
                    const field = $(`#editProfileForm [name="${key}"]`);
                    if (field.length) field.val(value);
                }
            }
        },
        error: function () {
            alert('Failed to load profile data.');
        }
    });

    $('#editProfileForm').on('submit', function (e) {
        e.preventDefault(); // Prevent default form submission
        
        if (phoneNumber.value !== "" && !iti.isValidNumber()) {
            showErrorMessage("Enter a valid phone number.");
            return;
        }

        let formData = new FormData(this);
        // Delete image key from api if not updating
        if (!$('#editProfileForm #profileImage').val()) formData.delete('profile_image');
        if (phoneNumber.value) formData.set('mobile_number', iti.getNumber());

        $.ajax({
            url: profile_api_url,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getCookie('access_token')}`
            },
            processData: false,
            contentType: false,
            data: formData,
            success: function () {
                alert('Profile updated successfully!');
            },
            error: function (xhr) {
                showErrorMessage(Object.values(xhr.responseJSON)[0]);
            }
        });
    });
});