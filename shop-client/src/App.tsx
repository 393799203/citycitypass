import { useState, useEffect } from 'react';
import { Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';
import ProductList from './pages/ProductList';
import ProductDetailPage from './pages/ProductDetailPage';
import ShoppingCartPage from './pages/ShoppingCartPage';
import OrderDetail from './pages/OrderDetail';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import { shopApi, getSessionId } from './api/shop';

export default function App() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ownerId = searchParams.get('ownerId');
  const [showCheckout, setShowCheckout] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    updateCartCount();
  }, []);

  const updateCartCount = async () => {
    try {
      const sessionId = getSessionId();
      const res = await shopApi.getCart(sessionId);
      if (res.data.success) {
        const items = res.data.data || [];
        setCartCount(items.length);
      }
    } catch (error) {
      console.error('Failed to update cart count:', error);
    }
  };

  const handleViewCart = () => {
    navigate(`/shop/cart?ownerId=${ownerId || ''}`);
  };

  const handleOrderSuccess = (newOrderNo: string) => {
    setOrderNo(newOrderNo);
    setShowCheckout(false);
    setShowPayment(true);
    updateCartCount();
  };

  const handleClosePayment = () => {
    setShowPayment(false);
    setOrderNo(null);
    updateCartCount();
    navigate(`/shop?ownerId=${ownerId || ''}`);
  };

  const handleGoToOrder = (orderNo: string) => {
    navigate(`/shop/order/${orderNo}?ownerId=${ownerId || ''}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route
          path="/shop"
          element={
            <>
              <ProductList
                ownerId={ownerId}
                onViewCart={handleViewCart}
                cartCount={cartCount}
              />
              <Checkout
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                onSuccess={handleOrderSuccess}
              />
              {showPayment && orderNo && (
                <Payment
                  orderNo={orderNo}
                  onClose={handleClosePayment}
                  onGoToOrder={handleGoToOrder}
                />
              )}
            </>
          }
        />
        <Route path="/shop/product" element={<ProductDetailPage />} />
        <Route path="/shop/cart" element={<ShoppingCartPage />} />
        <Route path="/shop/order/:orderNo" element={<OrderDetail />} />
      </Routes>
    </div>
  );
}
