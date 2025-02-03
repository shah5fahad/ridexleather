function fetchFooterFilterCategories() {
    $.ajax({
        url: "/items/category/search",
        type: "GET",
        data: {include_image: true},
        success: function (response) {
            if (response.count === 0) {
                $('.categories_swiper_section').remove();
            }
            $('.categories_swiper_section').html('');
            let categories = '';
            $.each(response.results, (idx, category) => {
                categories += `
                    <div class="swiper-slide">
                        <div class="category-product-image">
                            <img src="${category.product_image ? category.product_image : "/static/images/default-product-image.png"}" alt="${category.name}">
                        </div>
                        <a href="/items?ct_id=${category.id}" class="btn category-product-name">${category.name}</a>
                    </div>
                `;
            });
            $('.categories_swiper_section').html(`
                <div class="swiper-wrapper">${categories}</div>
                <div class="swiper-button-next"></div>
                <div class="swiper-button-prev"></div>
            `);
            var swiper = new Swiper(".categories_swiper_section", {
                effect: "coverflow",
                grabCursor: true,
                centeredSlides: true,
                slidesPerView: "auto",
                coverflowEffect: {
                    rotate: 50,
                    stretch: 0,
                    depth: 100,
                    modifier: 1,
                    slideShadows: true,
                },
                loop: true,
                autoplay: {
                    delay: 3000, /* Auto slide every 2 seconds */
                    disableOnInteraction: false, /* Keep autoplay running even after user interaction */
                },
                navigation: {
                    nextEl: ".swiper-button-next",
                    prevEl: ".swiper-button-prev",
                },
                pagination: {
                    el: ".swiper-pagination",
                    clickable: true,
                },
            });
        },
        error: function (xhr) {
            console.error("Error fetching Categories:", Object.values(xhr.responseJSON)[0]);
            $('.categories_swiper_section').remove();
        },
    });
}
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}
$(document).ready(function () {
    fetchFooterFilterCategories();
    $("#contactForm").submit(function (event) {
        event.preventDefault();
        let name = $("#contact_us #name").val().trim();
        let email = $("#contact_us #email").val().trim();
        let message = $("#contact_us #message").val().trim();
        if (!(name && email && message)) {
            alert("Please fill the required fields.");
            return;
        }
        let formData = {
            name: name,
            email: email,
            message: message,
        };

        $.ajax({
            url: "/enquiry",
            type: "POST",
            headers: { "X-CSRFToken": getCookie('csrftoken') },
            contentType: "application/json",
            data: JSON.stringify(formData),
            success: function (response) {
                alert("Your message has been successfully deliverd. We will process your enquiry and get back to you within 24 hours. Thank you!")
                $("#contactForm")[0].reset();
            },
            error: function (xhr) {
                let errorMsg = xhr.responseJSON?.detail || "An error occurred. Please try again.";
                alert(errorMsg);
            }
        });
    });
});