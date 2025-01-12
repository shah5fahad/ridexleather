function fetchUserWishlistData() {
    let wishlist = localStorage.getItem('wishlist');
    if (wishlist) wishlist =  JSON.parse(atob(wishlist));
    else wishlist = {};
    let itemsHtml = '';
    $.each(wishlist, function(id, item) {
        itemsHtml += `
            <div class="wishlist-item" data-id="${item.id}">
                <img src="${item.product_image.length > 0 ? item.product_image[0].product_image : "/static/images/default-product-image.png"}" alt="${item.name}">
                <div class="wishlist-item-details" data-price="${item.discount_percent > 0 ? getDiscountPrice(item.price, item.discount_percent) : item.price}">
                    <a class="text-decoration-none text-dark" href="/items/product/?pt_id=${item.id}">
                        <h5>${item.name}</h5>
                        <p class="mb-0">Product Price: <span class="text-success">${item.discount_percent && item.price ? `&#36;${getDiscountPrice(item.price, item.discount_percent)} <del class="text-danger">&#36;${item.price} </del>` : `&#36;${item.price}`}</span></p>
                    </a>
                </div>
                <div class="wishlist-item-controls">
                    <div class="wishlist_product_remove"><i class="fa fa-trash" aria-hidden="true"></i></div>
                </div>
            </div>`;
    });
    $('#wishlist-items').html(itemsHtml === '' ?
        `<div class="text-center text-secondary fs-5 my-3"><i class="fa fa-heart fs-1 py-2"></i><br>No products added in your Wishlist.</div>`
        : itemsHtml
    );
}


$(document).ready(function () {
    // Fetch the user wishlist data on page load.
    fetchUserWishlistData();
    // Functions to delete wishlist products.
    $(document).on('click', '.wishlist_product_remove', function () {
        let product_id = $(this).closest('.wishlist-item').data('id');
        console.log("product_id",product_id);
        
        let wishlist = localStorage.getItem('wishlist');
        if (wishlist) wishlist = JSON.parse(atob(wishlist));
        else wishlist = {};
        for (const key in wishlist) {
            if (wishlist[key].id == product_id) {
              delete wishlist[key];
            }
        }
        localStorage.setItem('wishlist', btoa(JSON.stringify(wishlist)));
        fetchUserWishlistData();
    });
});
