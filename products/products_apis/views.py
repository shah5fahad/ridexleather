from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.renderers import TemplateHTMLRenderer
from .serializers import CategoriesListSerializer, WebsiteBannersSerializer, ProductSerializer, CategorySerializer
from rest_framework.permissions import AllowAny
from products.models import Category, WebsiteBanner, Product
from django.db.models import Count
from django.core.exceptions import ValidationError
from ridexleather.common import RedirectJWTAuthentication, StandardResultsSetPagination
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

class CategoryProductsView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "category_products.html"

    def get(self, request):
        # Render the category Products page template on GET request
        return render(request, self.template_name)
    
    
class ProductDetailsView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "product_details.html"

    def get(self, request):
        # Render the category Products page template on GET request
        return render(request, self.template_name)


class categoriesList(APIView):
    authentication_classes = [RedirectJWTAuthentication]
    permission_classes = [AllowAny]

    def get(self, request):
        cat_limit = request.GET.get('cat_limit', 10)
        categories = Category.objects.annotate(product_count=Count("product")).filter(product_count__gt=0).order_by("-product_count","level")[:int(cat_limit)]
        serializer = CategoriesListSerializer(categories, many=True, context={"request": request})
        return Response(serializer.data)


class ProductsList(APIView):
    authentication_classes = [RedirectJWTAuthentication]
    permission_classes = [AllowAny]
    
    def get(self, request, ct_id):
        try:
            category = Category.objects.get(id=ct_id)
        except Product.DoesNotExist:
            return Response({"error": "Category doesn't exists."}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError:
            return Response({"error": "Invalid category ID"}, status=status.HTTP_400_BAD_REQUEST)
        serializer = CategoriesListSerializer(category, context={"request": request})
        return Response(serializer.data)
    
    
class ProductDetails(APIView):
    authentication_classes = [RedirectJWTAuthentication]
    permission_classes = [AllowAny]
    
    def get(self, request, pt_id):
        try:
            product = Product.objects.get(id=pt_id)
        except Product.DoesNotExist:
            return Response({"error": "Product doesn't exist"}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError:
            return Response({"error": "Invalid product ID"}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ProductSerializer(product, context={"image_limit": 6, "request": request})
        return Response(serializer.data)

    
class WebsiteBannersList(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        banners = WebsiteBanner.objects.filter(is_active=True).order_by('order')[:10]
        serializer = WebsiteBannersSerializer(banners, many=True)
        return Response(serializer.data)
    
    
class ProductSearchAPIView(ListAPIView):
    authentication_classes = [RedirectJWTAuthentication]
    permission_classes = [AllowAny]
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer
    filter_backends = [SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'description', 'category__name']
    filterset_fields = {
        'price': ['gte', 'lte'],
        'category': ['exact'],
        'discount_percent': ['gte', 'lte'],
    }
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        queryset = super().get_queryset()
        categories = self.request.query_params.get('categories', None)
        if categories:
            category_ids = [int(cat_id) for cat_id in categories.split(',')]
            queryset = queryset.filter(category__id__in=category_ids)
        return queryset
    
class CategorySearchAPIView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer
    filter_backends = [SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'description']
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        return Category.objects.annotate(product_count=Count("product")).filter(product_count__gt=0).order_by("-product_count","level")