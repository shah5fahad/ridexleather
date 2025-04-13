let SHIPPING_STATUS = ["Order Placed", "Processing", "Shipped", "Out for Delivery", "Delivered"]
let MAX_ALLOWED_PAGES_BUTTON = window.innerWidth >= 768 ? 6 : 3;

function fetchOrders(page=1) {
    let accessToken = getCookie("access_token");
    // Check access token for user login or not. Redirect to login page if not logged in.
    if (!accessToken) {
        // Remove user credentials on logout.
        if (localStorage.getItem('eg_user')) localStorage.removeItem('eg_user');
        window.location.href = '/login';
        return
    }
    $.ajax({
        url: '/orders/order',
        method: 'GET',
        data: {page: page},
        headers: {
            "Authorization": "Bearer " + accessToken, // Include the access token in the Authorization header
        },
        success: function(response) {
            if (response.count === 0) {
                $('#orders-container').replaceWith(`
                    <div class="text-center text-secondary fs-5 my-5"><i class="fa-solid fa-box-open fs-1 py-2"></i><br>No order placed.</div>
                `);
                return;
            }
            updatePagination(response.count, 12, page)
            displayOrders(response.results, page);
        },
        error: function() {
            $('#error-message').html('Failed to load orders.').show();
        }
    });
}

function updatePagination(totalProducts, productsPerPage, currentPage) {
    const totalPages = Math.ceil(totalProducts / productsPerPage);
    const pagination = $('#pagination');
    pagination.empty();
    if (totalPages <= 1) pagination.parent().hide();
    else pagination.parent().show();

    let startPage = Math.max(1, currentPage - Math.floor(MAX_ALLOWED_PAGES_BUTTON / 2));
    let endPage = startPage + MAX_ALLOWED_PAGES_BUTTON - 1;
    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - MAX_ALLOWED_PAGES_BUTTON + 1);
    }
    // Previous button
    pagination.append(`
        <li class="page-item me-2 ${currentPage === 1 ? 'disabled' : ''}">
          <a class="btn page-link" onclick="changePage(${currentPage - 1}, ${totalPages})")'>PREVIOUS</a>
        </li>
    `);
    // Page buttons
    for (let i = startPage; i <= endPage; i++) {
        pagination.append(`
            <li class="page-item me-2 ${i === currentPage ? 'active' : ''}">
              <button class="page-link rounded-circle" onclick="changePage(${i}, ${totalPages})">${i}</button>
            </li>
        `);
    }
    // Next button
    pagination.append(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
          <a class="btn page-link" onclick="changePage(${currentPage + 1}, ${totalPages})">NEXT</a>
        </li>
    `);
}

function changePage(page, totalPages) {
    if (page < 1 || page > totalPages) return;
    // Call your API to fetch products here
    fetchOrders(page);
}

function copyPaymentOrderId(btn) {
    text = $(btn).prev('strong').text();
    navigator.clipboard.writeText(text);
    showAlertMessage("Transaction ID copied.", "success");
}

function displayOrders(orders) {
    let ordersHtml = orders.map(order => {
        breached_status_index = SHIPPING_STATUS.indexOf(order.ship_status)
        let shippingHtml;
        if (breached_status_index === -1) {
            shippingHtml = `
                <div class="text-danger">Your order has been ${order.ship_status}.</div>
            `;
        } else{
            shippingHtml = SHIPPING_STATUS.map((status, index) => {
                let isChecked = breached_status_index >= index;
                let checkpointClass = isChecked ? "checkpoint checked" : "checkpoint";
                let lineClass = isChecked ? "line active" : "line";
                return `
                    <div class="checkpoint-container">
                        <div class="${lineClass}"></div>
                        <div class="${checkpointClass}"></div>
                        <div style="line-height: normal; margin-top: 8px;">
                            <div>${status}</div>
                            ${index === 0 ? `<div class="text-nowrap" style="font-weight: 500; font-size: 12px; color: #40b535;">${new Date(order.payment_date).toDateString()}</div>` : index === breached_status_index ? `<div class="text-nowrap text-primary" style="font-weight: 500; font-size: 12px;">${new Date(order.updated_at).toDateString()}</div>` : ''}
                        </div>
                    </div>`;
            }).join("");
        }

        let itemsHtml = order.items.map(item => `
            <div class="p-3 col-sm-6 col-lg-4 col-xl-3">
                <div class="product-card">
                    <a href="/items/product?pt_id=${item.product.id}"><img class="product-image" src="${item.product.product_image.length > 0 ? item.product.product_image[0].product_image : "/static/images/default-product-image.png"}" alt="${item.product.name}"></a>
                    <h6 class="product-name">${item.product.name}</h6>
                    <p>Quantity: ${item.quantity}</p>
                    <p class="mb-0">Price: ${CURRENCY_HTML_CODES[order.currency]}${parseFloat(item.price).toFixed(2)}</p>
                </div>
            </div>`).join('');

        return `
            <div class="order-card">
                <div class="order-header" data-bs-toggle="collapse" data-bs-target="#order-${order.id}" aria-expanded="false" aria-controls="order-${order.id}">
                    <h5 class="text-center">Order ID - OD${10000000000 + order.id}</h5>
                    <p class="order-info text-center">Order placed at <strong>${new Date(order.payment_date).toDateString()}</strong> with <strong class="text-success">${CURRENCY_HTML_CODES[order.currency]}${parseFloat(order.total_amount).toFixed(2)}</strong></p>
                    <p class="order-info text-center">Transaction ID: <strong>${order.order_id}</strong><button class="btn" onclick="copyPaymentOrderId(this)" data-toggle="tooltip" data-placement="top" title="Copy Transaction ID."><i class="fa-regular fa-copy"></i></button></p>
                    <h6 class="text-center">Shipping Status - <strong class="text-nowrap ${order.ship_status === 'Delivered' ? 'text-success' : breached_status_index === -1 ? 'text-danger' : 'text-info'}">${order.ship_status}</strong><i class="fas fa-chevron-right arrow mx-2"></i></h6>
                </div>
                <div id="order-${order.id}" class="collapse">
                    ${order.shipping_details ? `<p class="text-center">Shipped With <strong>${order.shipping_details}</strong></p>` : ''}
                    <strong>Tracking</strong>
                    <div class="shipping-checkpoints">${shippingHtml}</div>
                    <strong>Products</strong>
                    <div class="products-grid row">${itemsHtml}</div>
                </div>
            </div>`;
    }).join("");
    $('#orders-container').html(ordersHtml);
    $('[data-toggle="tooltip"]').tooltip();

    $('div.order-header').click(function () {
        $(this).find('.arrow').toggleClass('rotate');
    });
}

$(document).ready(function () {
    // Get order data
    fetchOrders();
});