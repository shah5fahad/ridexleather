const CURRENCY_HTML_CODES = {
    "USD": "&#36;",
    "INR": "&#8377;"
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function isLoggedIn() {
    return getCookie("access_token");
}

function setAuthLinks() {
    if (isLoggedIn()) {
        $('.anonymous_user').remove();
        let eg_user = localStorage.getItem('eg_user');
        if (eg_user) {
            eg_user = decodeStringToObject(eg_user);
            if (eg_user.is_admin !== true) {
                $('.admin_user').remove();
            }
            $('.authorized_user .user_name').text(eg_user.user_name);
            $('.authorized_user .user_email').text(eg_user.user_email);
            if (eg_user.profile) $('.authorized_user img').attr('src', eg_user.profile);
        }
    } else {
        $('.authorized_user, .admin_user').remove();
    }
}

function getDiscountPrice(original_price, discount_percent) {
    let decimal_val = 2
    if (getCookie('currency') === 'INR') decimal_val=0;
    return (original_price * ((100 - discount_percent) / 100)).toFixed(decimal_val);
}

function logout() {
    let accessToken = isLoggedIn();
    // Check access token for user login or not. Redirect to login page if not logged in.
    if (!accessToken) {
        // Remove user credentials on logout.
        if (localStorage.getItem('eg_user')) localStorage.removeItem('eg_user');
        window.location.href = '/login';
        return
    }
    $.ajax({
        url: "/logout",
        type: "POST",
        credentials: "include",  // Send cookies with request
        headers: {
            "Authorization": "Bearer " + accessToken, // Include the access token in the Authorization header
        },
        success: function (response) {
            // Clear local storage or any client-side data
            removeCookie("access_token");
            localStorage.removeItem('eg_user');

            showAlertMessage(response.message, "success");
            // Redirect to home page
            window.location.href = "/home";
        },
        error: function (xhr) {
            console.error("Error logging out:", xhr.responseJSON.error);
            showAlertMessage("Server side error.", "danger");
        }
    });
}

async function refreshAccessToken() {
    try {
        const response = await fetch("/api/token/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",  // Send cookies with request
        });
        if ([417, 401].includes(response.status)) {
            // Clear local storage or any client-side data
            removeCookie("access_token");
            localStorage.removeItem('eg_user');
            window.location.href = '/login';
        };
    } catch (error) {
        console.log("Error refreshing token ", error);
        alert("Server side error");
    }
}

function removeCookie(name, options = {}) {
    options = options || {};
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC;' +
        ' path=' + (options.path || '/') + ';' +
        (options.domain ? ' domain=' + options.domain + ';' : '');
};

document.addEventListener("DOMContentLoaded", function () {
    // Auto refresh access token on interval of 29 minutes if user already logged in
    if (getCookie("access_token")) {
        refreshAccessToken();
        setInterval(() => {
            console.log("Auto update token successfully.");
            refreshAccessToken();
        }, 29 * 60 * 60 * 1000);  // 29 minutes
    }

    setAuthLinks();
    // Logout button submit function
    $(".logoutBtn").click(function () {
        logout();
    });
});


function adjustVisibility() {
    const container = document.getElementById('categories-container');
    const items = container.querySelectorAll('.header-category');
    const containerWidth = container.offsetWidth;

    // Total width of items
    let totalWidth = 0;
    items.forEach((item) => {
        totalWidth += item.offsetWidth + parseInt(getComputedStyle(item).marginRight, 10);
        if (totalWidth > containerWidth) {
            item.style.opacity = '0';
            item.style.pointerEvents = 'none';
        } else {
            item.style.opacity = '1';
            item.style.pointerEvents = 'auto';
        }
    });
}


function selectProductSpec(curr) {
    $(curr).closest("ul").find("li").attr("selected", false).removeClass('spec_selected');
    $(curr).attr("selected", true).addClass('spec_selected');
}


function generateProductSpecHtml(product) {
    let product_spec_html = '';        
    let cart_product_spec = product.cart_items.length !== 0 && product.cart_items[0].cart_product_spec !== '' ? JSON.parse(product.cart_items[0].cart_product_spec) : {}
    product.product_spec.forEach((spec) => {
        const spec_detail = JSON.parse(spec.spec_detail);            
        let spec_detail_html = '';
        $.each(spec_detail, function (idx, spec_data) {
            let selected_condition = cart_product_spec[spec.spec_name] ? cart_product_spec[spec.spec_name] === spec_data : idx === 0;                
            spec_detail_html += `<li class="d-inline rounded-pill p-1 ${selected_condition ? `spec_selected" selected="selected"` : '"'} data-value="${spec_data}" onclick="selectProductSpec(this)"><span class="spec_button border-0 btn spec_${spec_data}" ${spec.spec_name === 'Colour' ? `style="background-color: ${spec_data}; margin-bottom: 2.5px; padding: 10px;"` : ''}>${spec.spec_name !== 'Colour' ? spec_data : ''}</span></li>`
        });
        product_spec_html += `
            <div class="mx-2 product_spec">
                <div class="d-inline product_spec_name">${spec.spec_name}</div>
                <ul class="d-inline p-0 fst-italic">${spec_detail_html}</ul>
            </div>
        `;
    });
    return product_spec_html
}


function addProductToCart(btn, product_id, quantity = 1, main_product = false) {
    let accessToken = isLoggedIn();
    // Check access token for user login or not. Redirect to login page if not logged in.
    if (!accessToken) {
        // Remove user credentials on logout.
        if (localStorage.getItem('eg_user')) localStorage.removeItem('eg_user');
        window.location.href = '/login';
        return
    }
    // Add product specification deatils with product cart value
    let spec_ele = $(btn).closest(".category-product-card").find(".product_spec");
    if (spec_ele.length === 0) {
        spec_ele = $(btn).closest(".product-details").find(".product_spec");
    }    
    let product_spec = {};
    if (spec_ele.length !== 0) {
        spec_ele.each(function (idx, ele) {
            let selected_spec_ele = $(ele).find("ul li[selected]");            
            if (selected_spec_ele.length > 0) {
                let spec_name = $(ele).find(".product_spec_name").text().trim(); // Trim in case of whitespace
                let spec_value = selected_spec_ele.data("value");
                if (spec_name && spec_value !== undefined) {
                    product_spec[spec_name] = spec_value;
                }
            }
        });
    }    
    $.ajax({
        url: "/orders/cart-items",
        type: "POST",
        dataType: 'json',
        headers: {
            "Authorization": "Bearer " + accessToken, // Include the access token in the Authorization header
        },
        contentType: 'application/json',
        data: JSON.stringify({
            product_id: product_id, // The product ID
            quantity: quantity, // Default quantity is 1
            cart_product_spec: JSON.stringify(product_spec)
        }),
        success: function (response) {
            if (main_product === false) {
                $(btn).parent().replaceWith(`
                    <div class="d-inline-block" data-toggle="tooltip" data-placement="top" title="Product already added in the cart.">
                        <button class="btn btn-secondary" disabled><i class="fa fa-shopping-cart" aria-hidden="true"></i></button>
                    </div>   
                `);
                $('[data-toggle="tooltip"]').tooltip();
            } else {
                $(btn).replaceWith(`
                    <div class="d-flex flex-direction-row">
                        <button class="btn btn-outline-primary" onclick="updateCartItemsQuantity(this, 'decrease', ${response.id})" disabled>-</button>
                        <div class="btn product_cart_quantity" style="cursor: auto; font-weight: bold;">${quantity}</div>
                        <button class="btn btn-outline-primary" onclick="updateCartItemsQuantity(this, 'increase', ${response.id})">+</button>
                    </div>  
                `);
            }
        },
        error: function (xhr) {
            console.error("Error adding to cart:", xhr.responseJSON);
            alert("Server side error.")
        }
    });
}

function addProductToWishList(btn, product) {
    let wishlist = localStorage.getItem('wishlist');
    if (wishlist) wishlist = decodeStringToObject(wishlist);
    else wishlist = {};

    product = decodeStringToObject(product);
    if (!wishlist.hasOwnProperty(product.id)) {
        wishlist[product.id] = product
    }
    localStorage.setItem('wishlist', encodeDataToString(wishlist));
    $(btn).parent().replaceWith(`
        <div class="d-inline-block" data-toggle="tooltip" data-placement="top" title="The Wishlist already have the product.">
            <button class="btn btn-danger" disabled><i class="fa fa-heart" aria-hidden="true"></i></button>
        </div>   
    `);
    $('[data-toggle="tooltip"]').tooltip();
}

function displayResults(products) {
    const resultsContainer = $(".dropdown-product-search");
    resultsContainer.empty(); // Clear previous results

    if (products.length === 0) {
        resultsContainer.html("<p class='px-3'>No products found.</p>").removeClass("d-none");
        return;
    }

    // Build dropdown items
    products.forEach((product) => {
        const productHTML = `
    <a class="text-decoration-none text-dark bg-light" href="/items/product?pt_id=${product.id}">
      <div class="dropdown-search-item">
          <strong>${product.name}</strong><br>
          <small class="text-muted">${product.description || "No description available."}</small><br>
          <span style="color: #1b05f0c4;">In ${product.category.name}</span>
      </div>
    </a>
    `;
        resultsContainer.append(productHTML);
    });

    resultsContainer.removeClass("d-none"); // Show dropdown
}

function fetchFooterFilterCategories(filters) {
    $.ajax({
        url: "/items/category/search",
        type: "GET",
        data: filters,
        success: function (response) {
            $('.footer-category-section').html('');
            let index = 0;
            $.each(response.results, (idx, category) => {
                if (index > 5) {return}     // Used to show only 6 category at footer
                $('.footer-category-section').append(
                    `<li><a href="/items?ct_id=${category.id}" class="header-category1">${category.name}</a></li>`
                );
                index += 1;
            });
        },
        error: function (xhr) {
            console.error("Error fetching Categories:", Object.values(xhr.responseJSON)[0]);
        },
    });
}

function showAlertMessage(message, type) {
    let scrollY = $(window).scrollTop();
    let positionFromTop = scrollY + 80;

    $("#alertBox .message").html(message);
    $("#alertBox")
        .removeClass("alert-success alert-warning alert-danger alert-info")
        .addClass(`alert-${type}`)
        .css("top", positionFromTop + "px")
        .fadeIn();

    setTimeout(() => {
        $("#alertBox").fadeOut();
    }, 5000);
}

function encodeDataToString(customObject) {
    return btoa(new TextEncoder().encode(JSON.stringify(customObject)).reduce((data, byte) => data + String.fromCharCode(byte), ''));
}

function decodeStringToObject(str) {
    const bytes = new Uint8Array(atob(str).split('').map(char => char.charCodeAt(0)));
    return JSON.parse(new TextDecoder().decode(bytes));
}

function startTimer() {
    let countdown = 30;
    let timerInterval;
    $("#resend_otp_timer").show();
    timerInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            $("#resend_otp_timer").text(`Resend available in ${countdown} sec`);
        } else {
            clearInterval(timerInterval);
            $("#resendBtn").show();
            $("#resend_otp_timer").text("").hide();
            countdown = 30;
        }
    }, 1000);
}

function verifyPayment(paymentData) {
    // Show Loader on payment success
    $('#site-loader').fadeIn();
    $.ajax({
        url: "/orders/payment",
        type: "POST",
        data: JSON.stringify(paymentData),
        contentType: "application/json",
        success: function () {
            // Hide Loader on payment success
            $('#site-loader').fadeIn();
            window.location.href = '/orders/payment_success';
        },
        error: function () {
            // Hide Loader on payment success
            $('#site-loader').fadeIn();
            showAlertMessage("Payment Verification Failed", "danger");
        }
    });
}

function deleteDissmissedOrderData(order_id) {
    let accessToken = getCookie("access_token");
    // Check access token for user login or not. Redirect to login page if not logged in.
    if (!accessToken) {
        // Remove user credentials on logout.
        if (localStorage.getItem('eg_user')) localStorage.removeItem('eg_user');
        return
    }
    $.ajax({
        url: `/orders/order/${order_id}`,
        type: "DELETE",
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        contentType: "application/json",
        success: function (resp) {
            $('#phoneModal').removeData('order_id');
            console.log("Order has been cancelled.");
        },
        error: function (xhr) {
            console.error("Order doesn't found.");
        }
    });
}

function getUserPhoneNumber(options, order_id) {
    let phoneNumber = document.getElementById('phoneNumber');
    // Reset previous iti instance
    let check_iti = window.intlTelInputGlobals.getInstance(phoneNumber);
    if (check_iti) {
        check_iti.setCountry('us');
        check_iti.setNumber('');
        check_iti.destroy();
    }
    // Required phone number checker library to validate and provide with country code.
    let iti = window.intlTelInput(phoneNumber, {
        separateDialCode: true,  // Show the country code separately
        preferredCountries: ["us", "in", "gb"], // Add your preferred countries
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.10/js/utils.js" // For validation and formatting
    });

    // Show modal to get the user phone number and set order_id in model
    $('#phoneModal').data("order_id", order_id);
    $('#phoneModal').modal('show');

    $('#phoneNumberForm').on('submit', function(e) {
        let accessToken = getCookie("access_token");
        // Check access token for user login or not. Redirect to login page if not logged in.
        if (!accessToken) {
            // Remove user credentials on logout.
            if (localStorage.getItem('eg_user')) localStorage.removeItem('eg_user');
            window.location.href = '/login';
            return
        }
        e.preventDefault();
        let btn = $(this).find('button[type="submit"]');
        btn.prop('disabled',true).html(`<i class="fa fa-spinner fa-spin me-2"></i>Submit`);
        let phone_number = iti.getNumber();

        if (!iti.isValidNumber()) {
            $('#show-error-message').html("Enter a valid phone number.").show();
            setTimeout(() => {
                $('#show-error-message').empty().hide();
            }, 2500);
            btn.prop('disabled',false).html(`Submit`);
            return;
        }

        let formData = new FormData();
        formData.set('mobile_number', phone_number);
        formData.set('country_name', `${iti.getSelectedCountryData().name} - ${iti.getSelectedCountryData().iso2}`);
        $.ajax({
            url: '/api/profile',
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            processData: false,
            contentType: false,
            data: formData,
            success: function () {
                $('#phoneModal').removeData('order_id');
                btn.prop('disabled',false).html(`Submit`);
                $('#phoneModal').modal('hide');
                options.prefill['contact'] = phone_number;
                let rzp1 = new Razorpay(options);
                rzp1.open();
            },
            error: function (xhr) {
                btn.prop('disabled',false).html(`Submit`);
                $('#show-error-message').html(Object.values(xhr.responseJSON)[0]).show();
                setTimeout(() => {
                    $('#show-error-message').empty().hide();
                }, 2500);
            }
        });
    });
}

function placeOrderPayment(cartData) {    
    let accessToken = isLoggedIn();
    // Check access token for user login or not. Redirect to login page if not logged in.
    if (!accessToken) {
        // Remove user credentials on logout.
        if (localStorage.getItem('eg_user')) localStorage.removeItem('eg_user');
        window.location.href = '/login';
        return
    }
    let currency = getCookie("currency") || "USD";
    $('#proceed_to_pay').prop('disabled',true);
    $.ajax({
        url: "/orders/order",
        type: "POST",
        data: JSON.stringify({"order_items": cartData, "currency": currency}),
        headers: {
            "Authorization": "Bearer " + accessToken, // Include the access token in the Authorization header
        },
        contentType: "application/json",
        success: function (response) {
            let options = {
                key: response.api_key,
                amount: parseInt(response.amount * 100),
                currency: currency,
                order_id: response.razorpay_order_id,
                name: response.name,
                description: response.description,
                prefill: response.prefill,
                handler: (payment) => {                    
                    verifyPayment(payment);
                },
                modal: {
                    confirm_close: true,
                    ondismiss: function() {
                        deleteDissmissedOrderData(response.order_id)
                    }
                }
            };
            
            if (response.prefill.contact) {
                let rzp1 = new Razorpay(options);
                rzp1.open();
            } else {
                getUserPhoneNumber(options, response.order_id);
            }
            $('#proceed_to_pay').prop('disabled',false);
        },
        error: function (xhr) {
            $('#proceed_to_pay').prop('disabled',false);
            showAlertMessage(Object.values(xhr.responseJSON)[0],"danger");
        }
    });
}


$(document).ready(function () {
    fetchFooterFilterCategories({});
    let debounceTimeout;
    $(".product-search-bar").on("input", function () {
        const query = $(this).val().trim();

        // Clear results if input is empty
        if (query.length < 3) {
            $(".dropdown-product-search").empty().addClass("d-none");
            return;
        }
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            $.ajax({
                url: "/items/product/search",
                type: "GET",
                data: { search: query }, // Pass the search term
                success: function (response) {
                    displayResults(response.results);
                },
                error: function (xhr, status, error) {
                    console.error("Error:", error);
                    $(".dropdown-product-search").html("<p class='text-danger px-3'>An error occurred.</p>").removeClass("d-none");
                },
            });
        }, 300); // 300ms delay to prevent multiple api calls

    });
    // Apply filter on search products from header
    $('#header-search-products-button').on("click", function () {
        const query = $(this).parent().find('input').val().trim();

        // Clear results if input is empty
        if (query.length < 3) {
            return;
        }
        $(this).prop("disabled", true);
        window.location.href = `/items?search=${query}`;
    });
    // Close dropdown on clicking outside
    $(document).on("click", function (e) {
        if (!$(e.target).closest(".product-search-bar, .dropdown-product-search").length) {
            $(".dropdown-product-search").addClass("d-none");
        }
    });
    // Update selected currency data on change
    let selectedCurrency = getCookie("currency") || "USD";
    $("#currencySelector").val(selectedCurrency);

    $("#currencySelector").on("change", function () {
        let newCurrency = $(this).val();
        let date = new Date();
        date.setTime(date.getTime()+(60*60*1000));  // Cookies expire in 60 minutes
        document.cookie = `currency=${newCurrency}; expires=${date.toGMTString()};path=/`;
        location.reload();  // Reload page to apply changes
    });
    // Auto delete order data when user close phone number update modal
    $('#phoneModal').on('hidden.bs.modal', function () {
        let order_id = $('#phoneModal').data("order_id");
        if (order_id) {
            deleteDissmissedOrderData(order_id);
        }
    });
});
