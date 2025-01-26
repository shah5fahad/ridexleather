function fetchCategories() {
    const apiUrl = `/items/categories`; // Replace with your API URL

    $.ajax({
        url: apiUrl,
        method: 'GET',
        success: function (data) {
            const categoriesContainer = $('#categories-container');
            if (data.length === 0) {
                categoriesContainer.remove();
                return;
            }

            categoriesContainer.empty(); // Clear previous categories
            categoriesContainer.append(
                `<div class="header-category explore-category">Explore</div>`
            )
            $.each(data, (idx, category) => {
                categoriesContainer.append(
                    `<a href="/items?ct_id=${category.id}" class="header-category">${category.name}</a>`
                );
                // Update products category wise limit upto 5.
                if (idx < 5) updateCategoriesProducts(category.id, category.name, category.product);
            });
            // Initial adjustment
            adjustVisibility();
        },
        error: function (error) {
            console.error('Error fetching categories:', error);
            $('#categories-container').remove();
        },
    });
}

function updateBanners() {
    const apiUrl = '/items/banners'; // Replace with your API URL

    $.ajax({
        url: apiUrl,
        method: 'GET',
        success: function (data) {
            $.each(data, function (idx, banner) {
                // Appeding buttons of slider
                $('#bannerImageSlider .carousel-indicators').append(`
                    <button type="button" data-bs-target="#imageSlider" data-bs-slide-to="${idx}" ${idx === 0 ? 'class="active" aria-current="true"' : ''} aria-label="Slide ${idx + 1}"></button>
                `);
                let heading = banner.name ? `<h5>${banner.name}</h5>` : '';
                let description = banner.description ? `<p>${banner.description}</p>` : '';
                let shop_button = banner.product ? `<a href="/items/product?pt_id=${banner.product}" class="btn btn-primary">Shop Now</a>` : '';
                // Appending 
                $('#bannerImageSlider .carousel-inner').append(`
                    <div class="carousel-item ${idx === 0 ? "active" : ""}">
                        <img src="${banner.banner_image}" class="d-block w-100" alt="Slide ${idx + 1}">
                        ${banner.product ?
                            '<div class="carousel-caption">' + heading + description + shop_button + '</div>'
                            : ''}
                    </div>
                `);
            });
        },
        error: function (error) {
            console.error('Error fetching categories:', error);
            $('#categories-container').remove();
        },
    });
}


function updateCategoriesProducts(category_id, category_name, products) {
    if (products.length === 0) return;
    let products_html = ''
    let wishlist = localStorage.getItem('wishlist');
    if (wishlist) wishlist =  JSON.parse(atob(wishlist));
    else wishlist = {};
    products.forEach((product) => {
        products_html += `
            <swiper-slide>
                <div class="category-product-card">
                    ${product.discount_percent ? '<div class="discount-ribbon">' + product.discount_percent + '&#37; OFF</div>' : ''}
                    <a class="category-product-image" href="/items/product?pt_id=${product.id}">
                        <img src="${product.product_image.length > 0 ? product.product_image[0].product_image : "/static/images/default-product-image.png"}" alt="${product.name}">
                    </a>
                    <div class="category-product-name"><p>${product.name}</p></div>
                    <div class="category-product-footer">
                        <div class="category-product-price">${product.discount_percent && product.price ? `&#36;${getDiscountPrice(product.price, product.discount_percent)} <del>&#36;${product.price} </del>` : `&#36;${product.price}`}</div>
                        <div class="category-product-buttons">
                            <div class="d-inline-block" ${product.cart_items.length === 0 ? '' : 'data-toggle="tooltip" data-placement="top" title="Product already added in the cart."'}>
                                <button class="btn ${product.cart_items.length === 0 ? 'btn-outline-secondary' : 'btn-secondary'}" ${product.cart_items.length === 0 ? `onclick="addProductToCart(this, ${product.id})"` : 'disabled'}><i class="fa fa-shopping-cart" aria-hidden="true"></i></button>
                            </div>
                            <div class="d-inline-block" ${wishlist.hasOwnProperty(product.id) ? 'data-toggle="tooltip" data-placement="top" title="The Wishlist already have the product."' : ''}>
                                <button class="btn ${wishlist.hasOwnProperty(product.id) ? 'btn-danger' : 'btn-outline-danger'}" ${wishlist.hasOwnProperty(product.id) ? 'disabled' : `onclick="addProductToWishList(this, '${btoa(JSON.stringify(product))}')"`}><i class="fa fa-heart" aria-hidden="true"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </swiper-slide>
        `;
    });
    $('#home_categories_container').append(`
        <div class="category-products my-5 position-relative" id="category_${category_id}">
            <div class="d-flex justify-content-between align-items-center">
                <h2 class="my-4 text-bold">${category_name}</h2>
                <a href="/items?ct_id=${category_id}" class="see-all-button">SEE ALL</a>
            </div>
            <swiper-container id="product-row" navigation="true">
                ${products_html}   
            </swiper-container>
        </div>
    `);
    $('[data-toggle="tooltip"]').tooltip();

    const swiperEl = document.querySelector(`#category_${category_id} swiper-container`);
    const swiperParams = {
        slidesPerView: 4,
        spaceBetween: 30,
        breakpoints: {
            200: {
                slidesPerView: 1,
            },
            400: {
                slidesPerView: 1.25,
            },
            600: {
                slidesPerView: 1.5,
            },
            800: {
                slidesPerView: 2,
            },
            1000: {
                slidesPerView: 2.5,
            },
            1200: {
                slidesPerView: 3.5,
            },
            1600: {
                slidesPerView: 4,
            },
        }
    };
    Object.assign(swiperEl, swiperParams);
    swiperEl.initialize();
}

$(document).ready(function () {
    // Fetch categories on page load
    fetchCategories();
    // Update banners images 
    updateBanners();
    // Re-adjust on window resize
    window.addEventListener('resize', adjustVisibility);
});
