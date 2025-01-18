from django.urls import path
from products.products_apis import views


urlpatterns = [
    path("", views.CategoryProductsView.as_view(), name="products_html"),
    path("/categories", views.categoriesList.as_view(), name="categories"),
    path("/banners", views.WebsiteBannersList.as_view(), name="websites_banners"),
    path("/<int:ct_id>/products", views.ProductsList.as_view(), name="products"),
    path("/product/<int:pt_id>", views.ProductDetails.as_view(), name="product_details"),
    path("/product", views.ProductDetailsView.as_view(), name="product_details_html"),
    path("/product/search", views.ProductSearchAPIView.as_view(), name="product_search"),
    path("/category/search", views.CategorySearchAPIView.as_view(), name="category_search"),
]
