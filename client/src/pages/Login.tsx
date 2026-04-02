import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { authApi } from '../api';
import { Truck, Package, Warehouse, Route, Eye, EyeOff, Loader2 } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'username' | 'password' | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const savedUsername = localStorage.getItem('savedUsername');
    const savedPassword = localStorage.getItem('savedPassword');
    if (savedUsername) {
      setUsername(savedUsername);
      setPassword(savedPassword || '');
      setRememberMe(!!savedPassword);
    }
    
    const username = searchParams.get('username');
    if (username) {
      setUsername(username);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login({ username, password });
      if (res.data.success) {
        setAuth(res.data.data.token, res.data.data.user);
        if (rememberMe) {
          localStorage.setItem('savedUsername', username);
          localStorage.setItem('savedPassword', password);
        } else {
          localStorage.removeItem('savedUsername');
          localStorage.removeItem('savedPassword');
        }
        toast.success('登录成功');
        navigate('/');
      } else {
        toast.error(res.data.message || '登录失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <ToastContainer />
      
      {/* 左侧视频/动画区域 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900">
        {/* 动态背景 */}
        <div className="absolute inset-0">
          {/* 网格背景 */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }} />
          
          {/* 浮动元素动画 */}
          <div className="absolute top-1/4 left-1/4 animate-float opacity-30">
            <Warehouse className="w-32 h-32 text-white" />
          </div>
          <div className="absolute top-1/3 right-1/4 animate-float-delayed opacity-30">
            <Package className="w-24 h-24 text-white" />
          </div>
          <div className="absolute bottom-1/3 left-1/3 animate-float opacity-30">
            <Truck className="w-28 h-28 text-white" />
          </div>
          <div className="absolute bottom-1/4 right-1/3 animate-float-delayed opacity-30">
            <Route className="w-20 h-20 text-white" />
          </div>
          
          {/* 光晕效果 */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/30 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow-delayed" />
        </div>

        {/* 内容 */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
          <div className="mb-8 animate-bounce-slow">
            <Truck className="w-24 h-24" />
          </div>
          <h1 className="text-5xl font-bold mb-4 tracking-wider animate-fade-in">
            企管通
          </h1>
          <p className="text-xl text-primary-200 mb-12 animate-fade-in-delayed">
            智慧物流管理系统
          </p>
          
          {/* 特性列表 */}
          <div className="grid grid-cols-2 gap-6 w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center animate-slide-up">
              <Warehouse className="w-8 h-8 mx-auto mb-2 text-primary-300" />
              <span className="text-sm">智能仓储</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center animate-slide-up-delayed">
              <Truck className="w-8 h-8 mx-auto mb-2 text-primary-300" />
              <span className="text-sm">高效运输</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center animate-slide-up-delayed-2">
              <Package className="w-8 h-8 mx-auto mb-2 text-primary-300" />
              <span className="text-sm">精准库存</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center animate-slide-up-delayed-3">
              <Route className="w-8 h-8 mx-auto mb-2 text-primary-300" />
              <span className="text-sm">全程追踪</span>
            </div>
          </div>
        </div>

        {/* CSS动画 */}
        <style>{`
          @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          @keyframes float-delayed {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(-5deg); }
          }
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.1); }
          }
          @keyframes pulse-slow-delayed {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.1); }
          }
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes fade-in {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-in-delayed {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes slide-up {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes slide-up-delayed {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes slide-up-delayed-2 {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes slide-up-delayed-3 {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-float { animation: float 6s ease-in-out infinite; }
          .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite; }
          .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
          .animate-pulse-slow-delayed { animation: pulse-slow-delayed 10s ease-in-out infinite; }
          .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
          .animate-fade-in { animation: fade-in 0.8s ease-out forwards; animation-delay: 0.2s; opacity: 0; }
          .animate-fade-in-delayed { animation: fade-in-delayed 0.8s ease-out forwards; animation-delay: 0.5s; opacity: 0; }
          .animate-slide-up { animation: slide-up 0.6s ease-out forwards; animation-delay: 0.8s; opacity: 0; }
          .animate-slide-up-delayed { animation: slide-up-delayed 0.6s ease-out forwards; animation-delay: 1s; opacity: 0; }
          .animate-slide-up-delayed-2 { animation: slide-up-delayed-2 0.6s ease-out forwards; animation-delay: 1.2s; opacity: 0; }
          .animate-slide-up-delayed-3 { animation: slide-up-delayed-3 0.6s ease-out forwards; animation-delay: 1.4s; opacity: 0; }
        `}</style>
      </div>

      {/* 右侧登录表单 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* 移动端Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-12">
            <Truck className="w-10 h-10 text-primary-600" />
            <span className="text-3xl font-bold text-primary-600">城城通</span>
          </div>

          {/* 欢迎文字 */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">欢迎回来</h2>
            <p className="text-gray-500">请登录您的账号继续</p>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 用户名输入框 */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
              <div className={`relative transition-all duration-300 ${focused === 'username' ? 'transform scale-105' : ''}`}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setPassword(''); }}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  className={`w-full px-4 py-4 pl-12 border-2 rounded-xl transition-all duration-300 outline-none
                    ${focused === 'username' 
                      ? 'border-primary-500 shadow-lg shadow-primary-100' 
                      : 'border-gray-200 hover:border-gray-300'}`}
                  placeholder="请输入用户名"
                />
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300
                  ${focused === 'username' ? 'text-primary-500 transform -translate-y-1/2 scale-110' : 'text-gray-400'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 密码输入框 */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
              <div className={`relative transition-all duration-300 ${focused === 'password' ? 'transform scale-105' : ''}`}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  className={`w-full px-4 py-4 pl-12 pr-12 border-2 rounded-xl transition-all duration-300 outline-none
                    ${focused === 'password' 
                      ? 'border-primary-500 shadow-lg shadow-primary-100' 
                      : 'border-gray-200 hover:border-gray-300'}`}
                  placeholder="请输入密码"
                />
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300
                  ${focused === 'password' ? 'text-primary-500 transform -translate-y-1/2 scale-110' : 'text-gray-400'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* 记住我和忘记密码 */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" 
                />
                <span className="ml-2 text-sm text-gray-600">记住我</span>
              </label>
              <a href="#" className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
                忘记密码？
              </a>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl
                hover:from-primary-700 hover:to-primary-800 transform hover:scale-[1.02] hover:shadow-lg
                active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>登录中...</span>
                </>
              ) : (
                <span>立即登录</span>
              )}
            </button>
          </form>

          {/* 注册链接 */}
          <div className="mt-6 text-center text-sm text-gray-500">
            没有账号？ <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">立即注册</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
