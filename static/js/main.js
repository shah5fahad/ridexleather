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
            eg_user = JSON.parse(atob(eg_user))
            $('.authorized_user .user_name').text(eg_user.user_name);
            $('.authorized_user .user_email').text(eg_user.user_email);
            if (eg_user.profile) $('.authorized_user img').attr('src', eg_user.profile);
        }
    } else {
        $('.authorized_user').remove();
    }
}

function getDiscountPrice(original_price, discount_percent) {
    return (original_price * ((100 - discount_percent) / 100)).toFixed(2);
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
            // Redirect to login or home page
            window.location.href = "/";
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
    // Auto refresh access token on interval of 4.5 seconds if user already logged in
    if (getCookie("access_token")) {
        refreshAccessToken();
        setInterval(() => {
            console.log("Auto update token successfully.");
            refreshAccessToken();
        }, 4.5 * 60 * 1000);  // 4.5 minutes
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

function addProductToCart(btn, product_id, quantity = 1, main_product = false) {
    let accessToken = isLoggedIn();
    // Check access token for user login or not. Redirect to login page if not logged in.
    if (!accessToken) {
        // Remove user credentials on logout.
        if (localStorage.getItem('eg_user')) localStorage.removeItem('eg_user');
        window.location.href = '/login';
        return
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
            quantity: quantity // Default quantity is 1
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
    if (wishlist) wishlist = JSON.parse(atob(wishlist));
    else wishlist = {};

    product = JSON.parse(atob(product));
    if (!wishlist.hasOwnProperty(product.id)) {
        wishlist[product.id] = product
    }
    localStorage.setItem('wishlist', btoa(JSON.stringify(wishlist)));
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

function fetchFilterCategories(filters) {
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
            console.error("Error fetching Categories:", xhr.responseJSON);
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

$(document).ready(function () {
    fetchFilterCategories({});
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
});
