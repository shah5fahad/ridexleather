let signupChart;
let paymentChart;

function renderChart(canvasId, chartRef, labels, data, labelText, color = '#0d6efd') {
    const canvas = document.getElementById(canvasId);
    if (chartRef && typeof chartRef.destroy === 'function') {
        chartRef.destroy();
    }
    canvas.height = null;
    canvas.width = null;
    const ctx = canvas.getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: labelText,
                data: data,
                borderColor: color,
                backgroundColor: color + '1a', // light fill
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Date' } },
                y: { title: { display: true, text: labelText }, beginAtZero: true }
            },
            plugins: { legend: { display: true } }
        }
    });
}

function fetchSignupData(params = {}) {
    let accessToken = getCookie("access_token");
    // Check access token for user login or not. Redirect to login page if not logged in.
    if (!accessToken) {
        // Remove user credentials on logout.
        if (localStorage.getItem('eg_user')) localStorage.removeItem('eg_user');
        window.location.href = '/login';
        return
    }
    $.ajax({
        url: '/admin_panel/user_signup_stats',
        data: params,
        headers: {
            "Authorization": "Bearer " + accessToken, // Include the access token in the Authorization header
        },
        success: function (response) {
            let total_user = response.data.reduce((partialSum, a) => partialSum + a, 0);
            $('#total_user_count').text(total_user ? total_user : 0);
            signupChart = renderChart('signupChart', signupChart, response.labels, response.data, 'User Signups');
        },
        error: function (xhr) {
            showAlertMessage(Object.values(xhr.responseJSON)[0], "danger");
        }
    });
}

function fetchPaymentData(params = {}) {
    let accessToken = getCookie("access_token");
    // Check access token for user login or not. Redirect to login page if not logged in.
    if (!accessToken) {
        // Remove user credentials on logout.
        if (localStorage.getItem('eg_user')) localStorage.removeItem('eg_user');
        window.location.href = '/login';
        return
    }
    $.ajax({
        url: '/admin_panel/payment_stats',
        data: params,
        headers: {
            "Authorization": "Bearer " + accessToken, // Include the access token in the Authorization header
        },
        success: function (response) {
            let total_amount = response.data.reduce((partialSum, a) => partialSum + a, 0);
            $('#total_amount').text(total_amount ? total_amount : 0);
            paymentChart = renderChart('paymentChart', paymentChart, response.labels, response.data, 'Payments ($)', '#198754');
        },
        error: function (xhr) {
            showAlertMessage(Object.values(xhr.responseJSON)[0], "danger");
        }
    });
}

$('.signup-filter-btn').click(function () {
    $('.signup-filter-btn').removeClass('active');
    $(this).addClass('active');
    const days = $(this).data('range');
    fetchSignupData({ range: days });
});

$('#customSignupFilter').click(function () {
    const start = $('#customSignupStart').val();
    const end = $('#customSignupEnd').val();
    fetchSignupData({ start_date: start, end_date: end });
});

$('.payment-filter-btn').click(function () {
    $('.payment-filter-btn').removeClass('active');
    $(this).addClass('active');
    const days = $(this).data('range');
    fetchPaymentData({ range: days });
});

$('#customPaymentFilter').click(function () {
    const start = $('#customPaymentStart').val();
    const end = $('#customPaymentEnd').val();
    fetchPaymentData({ start_date: start, end_date: end });
});

$(document).ready(function () {
    $('.default-user-filter-btn').click();
    $('.default-payment-filter-btn').click();
});