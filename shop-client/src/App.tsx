import { useState, useEffect } from 'react';
import { Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';
import ProductList from './pages/ProductList';
import ProductDetailPage from './pages/ProductDetailPage';
import ShoppingCartPage from './pages/ShoppingCartPage';
import OrderDetail from './pages/OrderDetail';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import UserCenter from './pages/UserCenter';
import { shopApi, getSessionId, getShopUser } from './api/shop';

export default function App() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ownerId = searchParams.get('ownerId');
  const [showCheckout, setShowCheckout] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showUserCenter, setShowUserCenter] = useState(false);

  useEffect(() => {
    updateCartCount();
  }, []);

  const updateCartCount = async () => {
    try {
      const sessionId = getSessionId();
      const user = getShopUser();
      const res = await shopApi.getCart(sessionId, user?.userId);
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
  
  const handleViewUserCenter = () => {
    console.log('App handleViewUserCenter called, showUserCenter:', showUserCenter);
    setShowUserCenter(true);
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
                onViewUserCenter={handleViewUserCenter}
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
              {showUserCenter && (
                <UserCenter onClose={() => setShowUserCenter(false)} />
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
