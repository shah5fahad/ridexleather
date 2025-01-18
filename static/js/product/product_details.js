function updateCategoriesProducts(category_id, product_id) {
    const apiURL = `/items/${category_id}/products/`;

    $.ajax({
        url: apiURL,
        method: 'GET',
        success: function(data) {
            let products = data.product;
            let products_html = ''
            let wishlist = localStorage.getItem('wishlist');
            if (wishlist) wishlist =  JSON.parse(atob(wishlist));
            else wishlist = [];
            products.forEach((product) => {
                if (product.id === product_id) {return}
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
            if (products_html === '') {return}
            $('#related_products_container').append(`
                <div class="category-products my-5 position-relative" id="category_${category_id}">
                    <h2 class="my-4 text-bold">Related Products</h2>
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
                        slidesPerView: 1.5,
                    },
                    400: {
                        slidesPerView: 2,
                    },
                    600: {
                        slidesPerView: 2.5,
                    },
                    800: {
                        slidesPerView: 3,
                    },
                    1000: {
                        slidesPerView: 3.5,
                    },
                    1200: {
                        slidesPerView: 4.5,
                    },
                }
            };
            Object.assign(swiperEl, swiperParams);
            swiperEl.initialize();
        },
        error: function(xhr) {
            console.error('Error fetching categories:', xhr.responseJSON);
        }
    });
}

function updateCartItemsQuantity(btn, action, cart_id) {
    let accessToken = isLoggedIn();
    // Check access token for user login or not. Redirect to login page if not logged in.
    if (!accessToken) {
        if (localStorage.getItem('eg_user')) localStorage.removeItem('eg_user');        // Remove user credentials on logout.
        window.location.href = '/login';
        return;
    }
    $.ajax({
        url: `/orders/cart-item/${cart_id}/`,
        type: "PATCH", // Use PATCH for partial updates
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        contentType: "application/json",
        data: JSON.stringify({ action: action }), // Send the action (e.g., "increase" or "decrease") to update quantity accordingly
        success: function (response) {
            $(btn).parent().find('.product_cart_quantity').html(response.quantity);
            if (response.quantity == 1) {
                $(btn).attr("disabled", true);
            } else {
                $(btn).parent().find('button').attr("disabled", false);
            }
        },
        error: function (xhr) {
            console.error(xhr.responseJSON);
        },
    });
}

function updateProductDetails(pt_id) {
    const apiURL = `/items/product/${pt_id}`;

    $.ajax({
        url: apiURL,
        method: "GET",
        success: function(data) {
            // Update related products
            updateCategoriesProducts(data.category.id, data.id);
            // Update main product    
            let image_html = ''
            let first_image = null;
            $.each(data.product_image, function(idx, image) {
                if (idx === 0) {
                    first_image = image.product_image;
                }
                image_html += `<img src="${image.product_image}" alt="${data.name + ' image ' + (idx +1)}">`
            });
            if (first_image === null) {
                first_image = '/static/images/default-product-image.png';
                image_html += `<img src="${first_image}" alt="${data.name + ' image ' + 1}">`
            }
            let wishlist = localStorage.getItem('wishlist');
            if (wishlist) wishlist =  JSON.parse(atob(wishlist));
            else wishlist = [];
            $('#product_image_container').append(`
                <div class="product-images">
                    <div class="product-mini-image-container">
                        <div class="product-mini-image-wrapper">
                            ${image_html}
                        </div>
                    </div>
                    <div class="main-image-container">
                        <div class="main-product-wishlist">
                            <div class="d-inline-block" ${wishlist.hasOwnProperty(data.id) ? 'data-toggle="tooltip" data-placement="top" title="The Wishlist already have the product."' : ''}>
                                <button class="btn ${wishlist.hasOwnProperty(data.id) ? 'btn-danger' : 'btn-outline-danger'}" ${wishlist.hasOwnProperty(data.id) ? 'disabled' : `onclick="addProductToWishList(this, '${btoa(JSON.stringify(data))}')"`}><i class="fa fa-heart" aria-hidden="true"></i></button>
                            </div>
                        </div>
                        <img 
                            id="mainImage" 
                            src="${first_image}" 
                            class="main-image" 
                            alt="${data.name} image">
                        <div class="zoom-box" id="zoomBox">
                            <img id="zoomImage" src="${first_image}" alt="${data.name} image">
                        </div>
                    </div>
                </div> 
            `);
            
            let product_details_html = "";
            if (data.description) {
                product_details_html += `
                    <div class="specifications-heading">Description</div>
                    <div class="specifications-description">${data.description}</div>
                `;
            }                
            $.each(data.specifications, function(key, value) {
                product_details_html += `
                    <div class="specifications-heading">${key}</div>
                    <div class="specifications-description">${value}</div>
                `;
            });
            $('#product_details_container').append(`
                <div class="product-details">
                    <div class="product-categorization">
                        <a class="me-1" href="">Home</a>&#47;
                        <a class="mx-1" href="/items?ct_id=${data.category.id}">${data.category.name}</a>&#47;
                        <small>${data.name}</small>
                    </div>
                    <div class="main-product-name">${data.name}</div>
                    <div><span class="fw-bold">${data.discount_percent && data.price ? `<span class="text-success fs-4">&#36;${getDiscountPrice(data.price, data.discount_percent)}</span> <del class="text-danger">&#36;${data.price} </del><span class="ps-2 fs-5 text-dark">(${data.discount_percent}&#37; OFF)</span>` : `<span class="fs-5 text-secondary">&#36;${data.price}`}</span></div>
                    <div class="d-flex justify-content-between mt-3">
                        ${data.cart_items.length === 0 
                            ? `<button class="btn btn-outline-primary" onclick="addProductToCart(this, ${data.id}, 1, true)">Add to Cart</button>` 
                            : `<div class="d-flex flex-direction-row">
                                    <button class="btn btn-outline-primary" onclick="updateCartItemsQuantity(this, 'decrease', ${data.cart_items[0].id})" ${data.cart_items[0].quantity > 1 ? '' : 'disabled'}>-</button>
                                    <div class="btn product_cart_quantity" style="cursor: auto; font-weight: bold;">${data.cart_items[0].quantity}</div>
                                    <button class="btn btn-outline-primary" onclick="updateCartItemsQuantity(this, 'increase', ${data.cart_items[0].id})">+</button>
                                </div>`
                        }
                        <button class="btn btn-outline-success">Buy Now</button>
                    </div>
                    ${product_details_html !== '' ?
                        `<div class="product-specification">Product Details</div>
                        ${product_details_html}`
                        : ''
                    }
                </div>
            `);

            const mainImage = $('#mainImage');
            // Initialize zoom functionality
            mainImage.on('mouseenter', function () {
                // Show the zoom box and set the zoom image source
                zoomBox.show();
                zoomImage.attr('src', mainImage.attr('src'));

                // Dynamically set the zoom image dimensions based on the natural size
                const img = new Image();
                img.src = mainImage.attr('src');
                img.onload = function () {
                    zoomImage.css({
                        width: img.width + 'px',
                        height: img.height + 'px'
                    });
                };
            });

            const zoomBox = $('#zoomBox');
            mainImage.on('mousemove', function (e) {
                const bounds = this.getBoundingClientRect();

                // Calculate cursor position relative to the image
                const x = e.pageX - bounds.left - window.scrollX;
                const y = e.pageY - bounds.top - window.scrollY;

                // Calculate zoom image position
                const zoomX = -(x / mainImage.width() * zoomImage.width()) + zoomBox.width() / 2;
                const zoomY = -(y / mainImage.height() * zoomImage.height()) + zoomBox.height() / 2;

                // Apply calculated positions to the zoomed image
                zoomImage.css({
                    left: `${zoomX}px`,
                    top: `${zoomY}px`
                });
            });

            const zoomImage = $('#zoomImage');
            // Hide zoom box when mouse leaves
            mainImage.on('mouseleave', function () {
                zoomBox.hide();
            });

            // Change main image and zoom on thumbnail click
            $('.product-mini-image-wrapper img').on('click', function () {
                const newSrc = $(this).attr('src');

                // Update main image and zoom image
                mainImage.attr('src', newSrc);
                zoomImage.attr('src', newSrc);
            });
        },
        error: function(xhr) {
            $('#product_image_container').parent().html(`
                <div class="text-danger text-center">${xhr.responseJSON.error}</div>
            `);
        }
    })
}

$(document).ready(function() {
    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.has('pt_id')) {
        window.location.href = "/";
    }
    // Fetch product details
    updateProductDetails(searchParams.get('pt_id'));
})