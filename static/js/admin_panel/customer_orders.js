let SHIPPING_STATUS = ["Order Placed", "Processing", "Shipped", "Out for Delivery", "Delivered"]
let MAX_ALLOWED_PAGES_BUTTON = window.innerWidth >= 768 ? 6 : 3;


function changeSearchPlaceholder(selectElement) {
    const input = document.getElementById("searchOrder");
    const value = selectElement.value;
    const placeholderMap = {
        email: ["Enter Email Address", "email"],
        first_name: ["Enter Username", "text"],
        order_id: ["Enter Transaction ID", "text"]
    };
    input.placeholder = placeholderMap[value][0] || "Enter value";
    input.type = placeholderMap[value][1] || "text";
}

function applyOrderFilters(e) {
    e.preventDefault(); // Prevent actual form submission
    $('.filter-bar button[type="submit"]').prop('disabled', true);

    let filters = {};
    let search_val = $('.filter-bar #searchOrder').val().trim();
    if (search_val !== "") {
        filters[$('.filter-bar #updateSearchInput').val()] = search_val;
    }
    let status = $('.filter-bar #statusFilter').val();
    if (status !== "") {
        filters['shipping_status'] = status;
    }
    filters['ordering'] = $('.filter-bar #dateFilter').val();
    let page = $('#pagination li.active').data('page') || 1;
    fetchOrders(page, filters);
}


function fetchOrders(page = 1, filters = {}) {
    let accessToken = getCookie("access_token");
    // Check access token for user login or not. Redirect to login page if not logged in.
    if (!accessToken) {
        // Remove user credentials on logout.
        if (localStorage.getItem('eg_user')) localStorage.removeItem('eg_user');
        window.location.href = '/login';
        return
    }
    filters['page'] = page
    $.ajax({
        url: '/admin_panel/cutomer_orders_filter',
        method: 'GET',
        data: filters,
        headers: {
            "Authorization": "Bearer " + accessToken, // Include the access token in the Authorization header
        },
        success: function (response) {
            updatePagination(response.count, 12, page);
            if (response.count === 0) {
                $('#orders-container').html(`
                    <div class="text-center text-secondary fs-5 my-5"><i class="fa-solid fa-box-open fs-1 py-2"></i><br>No order placed.</div>
                `);
            } else {
                displayOrders(response.results, page);
            }
            // Enable filter button
            $('.filter-bar button[type="submit"]').prop('disabled', false);
        },
        error: function (xhr) {
            showAlertMessage(Object.values(xhr.responseJSON)[0], "danger");
            $('.filter-bar button[type="submit"]').prop('disabled', false);
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
            <li class="page-item me-2 ${i === currentPage ? 'active' : ''}" data-page=${i}>
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
    text = $(btn).prev('span').text();
    navigator.clipboard.writeText(text);
    showAlertMessage("Transaction ID copied.", "success");
}

function updateOrderShippingStatus(btn, order_id, tran_id) {
    if (!confirm(`Do you want to update the shipping status of the order with transaction ID (${tran_id})?`)) {
        return;
    }
    let accessToken = getCookie("access_token");
    // Check access token for user login or not. Redirect to login page if not logged in.
    if (!accessToken) {
        // Remove user credentials on logout.
        if (localStorage.getItem('eg_user')) localStorage.removeItem('eg_user');
        window.location.href = '/login';
        return
    }
    $(btn).prop('disabled', true);
    const newStatus = $(`select.shipping_status_${order_id}`).val();
    $.ajax({
        url: `/orders/order/${order_id}`,
        type: 'PUT',
        headers: {
            "Authorization": "Bearer " + accessToken, // Include the access token in the Authorization header
        },
        data: JSON.stringify({ shipping_status: newStatus }),
        contentType: 'application/json',
        success: function () {
            showAlertMessage(`Shipping Status updated successfully for the order with transaction ID (${tran_id})!`, "success");
            $(btn).prop('disabled', false);
        },
        error: function (xhr) {
            showAlertMessage(Object.values(xhr.responseJSON)[0], "danger");
            $(btn).prop('disabled', false);
        }
    });
}

function displayOrders(orders) {
    let ordersHtml = orders.map(order => {
        breached_status_index = SHIPPING_STATUS.indexOf(order.ship_status)

        let itemsHtml = order.items.map(item => `
            <div class="p-3 col-sm-6 col-lg-4 col-xl-3">
                <div class="product-card">
                    <a href="/items/product?pt_id=${item.product.id}"><img class="product-image" src="${item.product.product_image.length > 0 ? item.product.product_image[0].product_image : "/static/images/default-product-image.png"}" alt="${item.product.name}"></a>
                    <h6 class="product-name">${item.product.name}</h6>
                    <p class="mb-1">Quantity: ${item.quantity}</p>
                    ${item.order_product_spec ? Object.entries(JSON.parse(item.order_product_spec)).map(([key, value]) => `
                        <p class="d-inline">
                            <span style="font-weight: 500;">${key}</span>
                            <span class="ms-1 fst-italic" style="font-size: 12px; ${key === 'Colour' ? `background: ${value}; color: ${value};` : ''}">
                                ${key === 'Colour' ? 'ooo' : value}
                            </span>
                        </p>
                    `).join(' & ') : ''}
                    <p class="mb-0">Price: ${CURRENCY_HTML_CODES[order.currency]}${parseFloat(item.price).toFixed(2)}</p>
                </div>
            </div>`).join('');

        let shipping_status_list = [];
        shipping_status_list.push(...SHIPPING_STATUS);
        shipping_status_list.push(...['Delayed', 'Returned', 'Cancelled']);
        const shippingOptions = shipping_status_list.map(status => `
            <option value="${shipping_status_code[status]}" ${order.ship_status === status ? 'selected' : ''}>${status.replace(/_/g, ' ')}</option>
        `).join('');

        return `
            <div class="order-card">
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="label">📦 Order ID</div>
                        <div class="value">OD${10000000000 + order.id}</div>
                    </div>
                    <div class="col-md-6">
                        <div class="label">💳 Transaction ID</div>
                        <div class="value"><span>${order.order_id}</span><button class="btn" onclick="copyPaymentOrderId(this)" data-toggle="tooltip" data-placement="top" title="Copy Transaction ID."><i class="fa-regular fa-copy"></i></button></div>
                    </div>
                    <div class="col-md-6">
                        <div class="label">👤 Username</div>
                        <div class="value">${order.first_name + ' ' + order.last_name}</div>
                    </div>
                    <div class="col-md-6">
                        <div class="label">👤 Customer Email</div>
                        <div class="value">${order.email}</div>
                    </div>
                    <div class="col-md-6">
                        <div class="label">📅 Order Date</div>
                        <div class="value">${new Date(order.payment_date).toDateString()}</div>
                    </div>
                    <div class="col-md-6">
                        <div class="label ${order.ship_status === 'Delivered' ? 'text-success' : breached_status_index === -1 ? 'text-danger' : 'text-info'} mb-1">🚚 Shipping Status</div>
                        <div class="d-flex align-items-center">
                            <select class="form-select w-auto me-2 shipping_status_${order.id}">
                                ${shippingOptions}
                            </select>
                            <button class="btn btn-sm btn-outline-primary update-status-btn" onclick="updateOrderShippingStatus(this, ${order.id}, '${order.order_id}')" title="Update Shipping Status">➡️</button>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="label">💰 Total Amount</div>
                        <div class="value text-success">${CURRENCY_HTML_CODES[order.currency]}${parseFloat(order.total_amount).toFixed(2)}</div>
                    </div>
                </div>
                <div class="text-center order_metadata" data-bs-toggle="collapse" data-bs-target="#order-${order.id}" aria-expanded="false" aria-controls="order-${order.id}"><span class="fs-5">Products</span><i class="fas fa-chevron-right arrow ms-2"></i></div>
                <div id="order-${order.id}" class="collapse">
                    ${order.shipping_details ? `<p class="text-center">Shipped With <strong>${order.shipping_details}</strong></p>` : ''}
                    <div class="products-grid row" style="font-family: cursive;">${itemsHtml}</div>
                </div>
            </div>`;
    }).join("");

    $('#orders-container').html(ordersHtml);
    $('[data-toggle="tooltip"]').tooltip();

    $('div.order_metadata').click(function () {
        $(this).find('.arrow').toggleClass('rotate');
    });
}

$(document).ready(function () {
    // Get order data
    fetchOrders();
});