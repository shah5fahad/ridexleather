let MAX_ALLOWED_PAGES_BUTTON = window.innerWidth >= 768 ? 6 : 3;


function updateSelectedCategories(btn, option) {
    if (option === 'all') $('.filter-categories input').prop("checked", $(btn).is(":checked"));
    else {
        let select_all_category = true;
        $('.filter-category-section .filter-categories').find('input').each(function () {
            if (!$(this).is(':checked')) {
                select_all_category = false;
            }
        });
        if (!select_all_category) $('.filter-categories-all input').prop('checked', select_all_category);
    }
}

function fetchFilterCategories(filters) {
    $.ajax({
        url: "/items/category/search",
        type: "GET",
        data: filters,
        success: function (response) {
            $('.filter-category-section .filter-categories').remove();
            response.results.forEach(category => {
                $('.filter-category-section').append(`
                    <div class="form-check filter-categories">
                    <input class="form-check-input" type="checkbox" value="${category.id}" id="category_${category.id}" onchange="updateSelectedCategories(this)">
                    <label class="form-check-label" for="category_${category.id}">${category.name}</label>
                    </div>
                `);
            });
            if ($('#categories-container').html() === "") {
                const categoriesContainer = $('#categories-container');
                if (response.count === 0) {
                    categoriesContainer.remove();
                    return;
                }

                categoriesContainer.empty(); // Clear previous categories
                categoriesContainer.append(
                    `<div class="header-category explore-category">Explore</div>`
                );
                $.each(response.results, (idx, category) => {
                    categoriesContainer.append(
                        `<a href="/items?ct_id=${category.id}" class="header-category">${category.name}</a>`
                    );
                });
                // Initial adjustment
                adjustVisibility();
            }
        },
        error: function (xhr) {
            console.error("Error fetching Categories:", xhr.responseJSON);
        },
    });
}

function fetchFilterProducts(filters, page = 1) {
    // Hide filter section on button click for mobile
    if (window.innerWidth < 768) $('.filter-section').hide();
    filters = JSON.parse(decodeURIComponent(filters))
    filters['page'] = page
    $.ajax({
        url: "/items/product/search",
        type: "GET",
        data: filters,
        success: function (response) {
            $('#products_list').empty();
            // Show empty products icon on filter products count 0.
            if (response.count === 0) {
                $('#products_list').append(`
                    <div class="d-flex justify-content-center align-items-center text-secondary fs-5 empty-product"><div class="text-center"><i class="fas fa-box-open fs-1 py-2"></i><br>No filter products available.</div></div>
                `);
                $('#pagination').parent().hide();
                $('#category_name').parent().hide();
                return;
            }
            let currency = getCookie('currency') || "USD";            
            let wishlist = localStorage.getItem('wishlist');
            if (wishlist) wishlist = decodeStringToObject(wishlist);
            else wishlist = [];
            // For single category selection, show category name otherwise hide it.
            if (filters.categories && filters.categories.split(",").length === 1) $('#category_name').text($(`#category_${filters.categories}`).next().text()).parent().show();
            else $('#category_name').parent().hide();
            $('#overall_filter_products_count').html(response.count);

            response.results.forEach(product => {
                $('#products_list').append(`
                    <div class="col col-sm-6 col-md-6 col-lg-4 col-xl-4 col-xxl-3 mb-5">
                        <div class="category-product-card">
                            ${product.discount_percent ? '<div class="discount-ribbon">' + product.discount_percent + '&#37; OFF</div>' : ''}
                            <a class="category-product-image" href="/items/product?pt_id=${product.id}">
                                <img src="${product.product_image.length > 0 ? product.product_image[0].product_image : "/static/images/default-product-image.png"}" alt="${product.name}">
                            </a>
                            <div class="category-product-name"><p>${product.name}</p></div>
                            <div class="category-product-footer">
                                <div class="category-product-price">${product.discount_percent && product.price ? `${CURRENCY_HTML_CODES[currency]}${getDiscountPrice(product.price, product.discount_percent)} <del>${CURRENCY_HTML_CODES[currency]}${product.price}</del>` : `${CURRENCY_HTML_CODES[currency]}${product.price}`}</div>
                                <div class="category-product-buttons">
                                    <div class="d-inline-block" ${product.cart_items.length === 0 ? '' : 'data-toggle="tooltip" data-placement="top" title="Product already added in the cart."'}>
                                        <button class="btn ${product.cart_items.length === 0 ? 'btn-outline-secondary' : 'btn-secondary'}" ${product.cart_items.length === 0 ? `onclick="addProductToCart(this, ${product.id})"` : 'disabled'}><i class="fa fa-shopping-cart" aria-hidden="true"></i></button>
                                    </div>
                                    <div class="d-inline-block" ${wishlist.hasOwnProperty(product.id) ? 'data-toggle="tooltip" data-placement="top" title="The Wishlist already have the product."' : ''}>
                                        <button class="btn ${wishlist.hasOwnProperty(product.id) ? 'btn-danger' : 'btn-outline-danger'}" ${wishlist.hasOwnProperty(product.id) ? 'disabled' : `onclick="addProductToWishList(this, '${encodeDataToString(product)}')"`}><i class="fa fa-heart" aria-hidden="true"></i></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `);
            });
            $('[data-toggle="tooltip"]').tooltip();
            // Update pagination
            updatePagination(response.count, 12, page, filters);
        },
        error: function (xhr) {
            console.error("Error fetching products:", xhr.responseJSON);
        },
    });
}

function applySlidingFilter(slider_id, max_filter_id, min_filter_id, max_val, min_val) {
    const slider = document.getElementById(slider_id);
    const minValue = document.getElementById(min_filter_id);
    const maxValue = document.getElementById(max_filter_id);

    noUiSlider.create(slider, {
        start: [min_val, max_val], // Initial values
        connect: true,   // Highlight range between handles
        range: {
            min: min_val,
            max: max_val,    // Maximum slider value
        },
        step: 1,         // Step size
    });

    // Update displayed values when slider changes
    slider.noUiSlider.on('update', function (values) {
        minValue.value = Math.round(values[0]);
        maxValue.value = Math.round(values[1]);
    });
    // Auto update slider value on change input
    minValue.addEventListener('input', (event) => updateFilterSlider(slider_id, max_filter_id, min_filter_id, max_val, min_val));
    maxValue.addEventListener('input', (event) => updateFilterSlider(slider_id, max_filter_id, min_filter_id, max_val, min_val));
}

function updateFilterSlider(slider_id, max_filter_id, min_filter_id, max_val, min_val) {
    const maxInput = document.getElementById(max_filter_id).value.trim();
    const minInput = document.getElementById(min_filter_id).value.trim();

    let maxPrice = maxInput === '' ? max_val : parseInt(maxInput, 10);
    let minPrice = minInput === '' ? min_val : parseInt(minInput, 10);

    document.getElementById(slider_id).noUiSlider.set([minPrice, maxPrice]);
}

function updatePagination(totalProducts, productsPerPage, currentPage, filters) {
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
          <a class="btn page-link" onclick="changePage('${encodeURIComponent(JSON.stringify(filters))}', ${currentPage - 1}, ${totalPages})")'>PREVIOUS</a>
        </li>
    `);
    // Page buttons
    for (let i = startPage; i <= endPage; i++) {
        pagination.append(`
            <li class="page-item me-2 ${i === currentPage ? 'active' : ''}">
              <button class="page-link rounded-circle" onclick="changePage('${encodeURIComponent(JSON.stringify(filters))}', ${i}, ${totalPages})">${i}</button>
            </li>
        `);
    }
    // Next button
    pagination.append(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
          <a class="btn page-link" onclick="changePage('${encodeURIComponent(JSON.stringify(filters))}', ${currentPage + 1}, ${totalPages})">NEXT</a>
        </li>
    `);
}

function changePage(filters, page, totalPages) {
    if (page < 1 || page > totalPages) return;
    // Call your API to fetch products here
    fetchFilterProducts(filters, page);
}


$(document).ready(function () {
    let debounceFilterTimeout;
    const searchParams = new URLSearchParams(window.location.search);
    if (!(searchParams.has('ct_id') || searchParams.has('search'))) {
        window.location.href = "/home";
    }
    // Fetch all products initially
    fetchFilterCategories({});
    // Select price range slider
    applySlidingFilter('price-slider', 'filter-max-price', 'filter-min-price', 1000, 1);
    // Select discount range slider
    applySlidingFilter('discount-slider', 'filter-max-discount', 'filter-min-discount', 100, 0);
    // Show filter section only for desktop view
    window.addEventListener('resize', (event) => {if (window.innerWidth >= 768) $('.filter-section').show(); else $('.filter-section').hide();});
    // Open filter on mobile
    $('#open-filter-btn').on('click', function () {
        $('#filter-section').show();

    });
    // Close filter on mobile
    $('#close-filter-btn').on('click', function () {
        $('#filter-section').hide();
    });
    // Search bar filter
    $('.filter-category-search-bar').on('input', function () {
        const query = $(this).val().trim();

        // Clear results if input is non-empty but less then 3
        if ([1, 2].includes(query.length)) {
            return;
        }
        clearTimeout(debounceFilterTimeout);
        debounceFilterTimeout = setTimeout(() => {
            fetchFilterCategories({
                "search": query
            });
        }, 300); // 300ms delay to prevent multiple api calls
    });
    // Apply filer using filter button
    $("#apply-products-filter").click(function () {
        const selectedCategories = [];
        let select_all_category = false;
        $(".filter-category-section").find("input[type=checkbox]:checked").each(function () {
            if ($(this).val() === "") select_all_category = true;
            selectedCategories.push($(this).val());
        });
        const filters = {
            price__gte: $("#filter-min-price").val(),
            price__lte: $("#filter-max-price").val(),
            discount_percent__gte: $("#filter-min-discount").val(),
            discount_percent__lte: $("#filter-max-discount").val(),
        };
        if (select_all_category) filters['category'] = "";
        else filters['categories'] = selectedCategories.join(",");
        // Search filter products
        fetchFilterProducts(encodeURIComponent(JSON.stringify(filters)));
    });
    fetchFilterProducts(encodeURIComponent(JSON.stringify({
        categories: searchParams.get('ct_id'),
        search: searchParams.get('search'),
    })));
    // Re-adjust on window resize
    window.addEventListener('resize', adjustVisibility);
})