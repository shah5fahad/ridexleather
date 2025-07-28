function fetchUserCartData() {
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
        type: "GET",
        headers: {
            "Authorization": "Bearer " + accessToken, // Include the access token in the Authorization header
        },
        success: function (response) {
            if (response.length === 0) {
                $('.cart-container .cart-footer').replaceWith(`
                    <div class="text-center text-secondary fs-5 my-5"><i class="fa-solid fa-cart-plus fs-1 py-2"></i><br>No products added in your Cart.</div>
                `);
                $('#cart-items').html("");
                return;
            }

            let itemsHtml = '';
            let total = 0;
            let currency = getCookie('currency') || "USD";          
            response.forEach(item => {
                let cart_product_spec_arr = [];
                let cart_product_spec = JSON.parse(item.cart_product_spec || '[]');
                $.each(cart_product_spec, function(key, value) {
                    cart_product_spec_arr.push(`<p class="d-inline"><span style="font-weight: 500;">${key}</span><span class="ms-2 fst-italic" style="font-size: 12px; ${key === 'Colour' ? `background: ${value}; color: ${value};` : ''}">${key === 'Colour' ? 'colour' : value}</span></p>`);
                });
                total += (item.product.discount_percent > 0 ? getDiscountPrice(item.product.price, item.product.discount_percent) : item.product.price) * item.quantity;
                itemsHtml += `
                    <div class="cart-item" data-details="${encodeDataToString([item.id, item.product.id, item.quantity, item.cart_product_spec])}">
                        <a class="text-decoration-none text-dark" href="/items/product?pt_id=${item.product.id}"><img src="${item.product.product_image.length > 0 ? item.product.product_image[0].product_image : "/static/images/default-product-image.png"}" alt="${item.product.name}"></a>
                        <div class="cart-item-details" data-price="${item.product.discount_percent > 0 ? getDiscountPrice(item.product.price, item.product.discount_percent) : item.product.price}" style="font-family: cursive;">
                            <a class="text-decoration-none text-dark" href="/items/product?pt_id=${item.product.id}"><h5>${item.product.name}</h5></a>
                            <p class="mb-0">Product Price<span class="ms-2 text-success">${item.product.discount_percent && item.product.price ? `${CURRENCY_HTML_CODES[currency]}${getDiscountPrice(item.product.price, item.product.discount_percent)} <del class="text-danger">${CURRENCY_HTML_CODES[currency]}${item.product.price} </del>` : `${CURRENCY_HTML_CODES[currency]}${item.product.price}`}</span></p>
                            <p class="fw-bold mb-0">Total Product Cost<span id="cart_product_total_cost" class="ms-2 text-success">${CURRENCY_HTML_CODES[currency]}${((item.product.discount_percent > 0 ? getDiscountPrice(item.product.price, item.product.discount_percent) : item.product.price) * item.quantity).toFixed(2)}</span></p>
                            ${cart_product_spec_arr.join(' & ')}    
                        </div>
                        <div class="cart-item-controls">
                            <button class="btn btn-outline-primary cart_product_count_decrease" ${item.quantity == 1 ? 'disabled' : ''}>-</button>
                            <span class="cart_product_count">${item.quantity}</span>
                            <button class="btn btn-outline-primary cart_product_count_increase">+</button>
                            <button class="btn btn-outline-danger cart_product_remove">Remove</button>
                        </div>
                    </div>`;
            });
            $('#cart-items').html(itemsHtml);
            $('#total-amount').html(`Total: ${CURRENCY_HTML_CODES[currency]}${total.toFixed(2)}`);
            $('.cart-container .cart-footer').css("display", "flex");
        },
        error: function (xhr) {
            showAlertMessage(Object.values(xhr.responseJSON)[0], "danger");
        }
    });
}

function updateOrDeleteCartItems(action, cart_container) {
    let accessToken = isLoggedIn();
    // Check access token for user login or not. Redirect to login page if not logged in.
    if (!accessToken) {
        if (localStorage.getItem('eg_user')) localStorage.removeItem('eg_user');        // Remove user credentials on logout.
        window.location.href = '/login';
        return;
    }

    // Get the cart ID
    let cart_details = cart_container.data('details');
    let id = null;
    if (cart_details) {
        id = decodeStringToObject(cart_details)[0];        
    }
    if (!id) {
        alert("Cart id is not found.");
        return;
    }

    let quantity = cart_container.find('.cart_product_count').text();
    if (action !== "delete") {
        // Get quantity to update
        if (quantity) {
            quantity = parseInt(quantity);
        } else {
            alert("quantity is not available.");
            return;
        }
        cart_container.find('.cart_product_count').text(`${action === "increase" ? quantity + 1 : quantity - 1}`);
    }

    cart_container.find('button').attr("disabled", true);
    let currency = getCookie('currency') || "USD";

    $.ajax({
        url: `/orders/cart-item/${id}`,
        type: `${action === "delete" ? "DELETE" : "PATCH"}`,
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        contentType: "application/json",
        data: JSON.stringify({ action: action }), // Send the action (e.g., "increase" or "decrease") to update quantity accordingly
        success: function (response) {
            if (action === "delete") {
                cart_container.remove();
                if ($('.cart-container .cart-item').length === 0) {
                    $('.cart-container .cart-footer').replaceWith(`
                        <div class="text-center text-secondary fs-5 my-5"><i class="fa-solid fa-cart-plus fs-1 py-2"></i><br>No products added in your Cart.</div>
                    `);
                    $('#cart-items').html("");
                    return;
                }
            } else {
                cart_container.find('button').attr("disabled", false);
                if (action === "decrease" && quantity <= 2) {
                    cart_container.find('.cart_product_count_decrease').attr("disabled", true);
                }          
                cart_container.find('#cart_product_total_cost').html(`${CURRENCY_HTML_CODES[currency]}${((parseFloat(cart_container.find('.cart-item-details').data('price')) || 0) * response.quantity).toFixed(2)}`);
            }
            let amount = 0
            $('.cart-container .cart-item').each(function() {
                let price = parseFloat($(this).find('.cart-item-details').data('price')) || 0;
                let quantity = parseInt($(this).find('.cart_product_count').text()) || 0;
                amount += price * quantity;
            });
            $('#total-amount').html(`Total: ${CURRENCY_HTML_CODES[currency]}${amount.toFixed(2)}`);
        },
        error: function (xhr) {
            cart_container.find('button').attr("disabled", false);
            if (quantity <= 1) {
                cart_container.find('.cart_product_count_decrease').attr("disabled", true);
            }
            if (action !== "delete") {
                cart_container.find('.cart_product_count').text(`${quantity}`);
            }
            showAlertMessage(Object.values(xhr.responseJSON)[0], "danger");
        },
    });
}


$(document).ready(function () {
    // Fetch the user cart data on page load.
    fetchUserCartData();
    // Function to update cart prpducts quantity.
    $(document).on('click', '.cart_product_count_increase', function () {
        updateOrDeleteCartItems("increase", $(this).closest('.cart-item'));
    });
    $(document).on('click', '.cart_product_count_decrease', function () {
        updateOrDeleteCartItems("decrease", $(this).closest('.cart-item'));
    });
    // Functions to delete cart products.
    $(document).on('click', '.cart_product_remove', function () {
        updateOrDeleteCartItems("delete", $(this).closest('.cart-item'));
    });

    $('#proceed_to_pay').click(function () {
        let order_items = []
        $(this).parent().parent().find('.cart-item').each((index, ele) => {            
            let cart_details = $(ele).data('details');
            let quantity = parseInt($(ele).find('.cart_product_count').text()) || 0;
            if (cart_details) {
                cart_details = decodeStringToObject(cart_details); 
                order_items.push({
                    cart_items_id: cart_details[0],
                    product_id: cart_details[1],
                    quantity: quantity,
                    order_product_spec: cart_details[3]
                });
            }
        });
        if (order_items.length === 0) {
            alert("No items in the cart.");
            return;
        }
        // Initialize the payment
        placeOrderPayment(order_items);
    });
});
