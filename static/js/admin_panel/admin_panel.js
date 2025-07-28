const CURRENCY_HTML_CODES = {
    "USD": "&#36;",
    "INR": "&#8377;"
}
 const shipping_status_code = {
    "Payment Pending" : "PAYMENT_PENDING",
    "Order Placed" : "PLACED",
    "Processing" : "PROCESSING",
    "Shipped" : "SHIPPED",
    "Out for Delivery" : "OUT_FOR_DELIVERY",
    "Delivered" : "DELIVERED",
    "Delayed" : "DELAYED",
    "Returned" : "RETURNED",
    "Cancelled" : "CANCELLED"
 }

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function isLoggedIn() {
    return getCookie("access_token");
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

$(document).ready(function () {
    // Auto refresh access token on interval of 29 minutes if user already logged in
    if (getCookie("access_token")) {
        refreshAccessToken();
        setInterval(() => {
            console.log("Auto update token successfully.");
            refreshAccessToken();
        }, 29 * 60 * 60 * 1000);  // 29 minutes
    }
    $('#toggleSidebar').click(function () {
        $('#sidebar').toggleClass('collapsed');
        $('#mainContent').toggleClass('collapsed');
    });
});