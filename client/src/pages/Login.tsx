import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { authApi } from '../api';
import { Truck, Package, Warehouse, Route, Eye, EyeOff, Loader2, Bot, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';

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

    const urlUsername = searchParams.get('username');
    if (urlUsername) {
      setUsername(urlUsername);
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
        const { token, user } = res.data.data;
        setAuth(token, user);

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
      
      {/* 左侧品牌区域 */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-900 to-primary-700">
        <div className="relative z-10 flex flex-col justify-center items-center w-full text-white p-12">
          <Bot className="w-20 h-20 mb-6" />
          <h1 className="text-4xl font-bold mb-3">智链云AI</h1>
          <p className="text-lg text-primary-200">进销存AI智能体</p>
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-10">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <Warehouse className="w-8 h-8 mx-auto mb-2 text-primary-300" />
              <span className="text-sm">智能仓储</span>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <Truck className="w-8 h-8 mx-auto mb-2 text-primary-300" />
              <span className="text-sm">高效运输</span>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-primary-300" />
              <span className="text-sm">精准库存</span>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <Route className="w-8 h-8 mx-auto mb-2 text-primary-300" />
              <span className="text-sm">全程追踪</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* 移动端Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-12">
            <Bot className="w-10 h-10 text-primary-600" />
            <span className="text-3xl font-bold text-primary-600">智链AI</span>
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
