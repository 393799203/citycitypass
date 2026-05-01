import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api';
import { Truck, Package, Warehouse, Route, Eye, EyeOff, Loader2, ArrowLeft, Bot } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';

export default function Register() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    email: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password || !formData.name) {
      toast.error(t('register.inputRequired'));
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error(t('register.passwordMismatch'));
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error(t('register.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register({
        username: formData.username,
        password: formData.password,
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
      });
      if (res.data.success) {
        toast.success('注册成功，请登录');
        setTimeout(() => navigate(`/login?username=${encodeURIComponent(formData.username)}`), 1500);
      } else {
        toast.error(res.data.message || '注册失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      
      
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
            <Bot className="w-24 h-24" />
          </div>
          <h1 className="text-5xl font-bold mb-4 tracking-wider animate-fade-in">
            智链云AI
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

      {/* 右侧注册表单 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* 返回登录 */}
          <Link to="/login" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>返回登录</span>
          </Link>

          {/* 移动端Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Bot className="w-10 h-10 text-primary-600" />
            <span className="text-3xl font-bold text-primary-600">智链云AI</span>
          </div>

          {/* 欢迎文字 */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">创建账号</h2>
            <p className="text-gray-500">加入智链云AI，开启智能管理之旅</p>
          </div>

          {/* 注册表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 用户名 */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">用户名 <span className="text-red-500">*</span></label>
              <div className={`relative transition-all duration-300 ${focused === 'username' ? 'transform scale-105' : ''}`}>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  className={`w-full px-4 py-3 pl-12 border-2 rounded-xl transition-all duration-300 outline-none
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

            {/* 姓名 */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">姓名 <span className="text-red-500">*</span></label>
              <div className={`relative transition-all duration-300 ${focused === 'name' ? 'transform scale-105' : ''}`}>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  className={`w-full px-4 py-3 pl-12 border-2 rounded-xl transition-all duration-300 outline-none
                    ${focused === 'name' 
                      ? 'border-primary-500 shadow-lg shadow-primary-100' 
                      : 'border-gray-200 hover:border-gray-300'}`}
                  placeholder="请输入姓名"
                />
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300
                  ${focused === 'name' ? 'text-primary-500 transform -translate-y-1/2 scale-110' : 'text-gray-400'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 手机 */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">手机</label>
              <div className={`relative transition-all duration-300 ${focused === 'phone' ? 'transform scale-105' : ''}`}>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onFocus={() => setFocused('phone')}
                  onBlur={() => setFocused(null)}
                  className={`w-full px-4 py-3 pl-12 border-2 rounded-xl transition-all duration-300 outline-none
                    ${focused === 'phone' 
                      ? 'border-primary-500 shadow-lg shadow-primary-100' 
                      : 'border-gray-200 hover:border-gray-300'}`}
                  placeholder="请输入手机号"
                />
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300
                  ${focused === 'phone' ? 'text-primary-500 transform -translate-y-1/2 scale-110' : 'text-gray-400'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 邮箱 */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
              <div className={`relative transition-all duration-300 ${focused === 'email' ? 'transform scale-105' : ''}`}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  className={`w-full px-4 py-3 pl-12 border-2 rounded-xl transition-all duration-300 outline-none
                    ${focused === 'email' 
                      ? 'border-primary-500 shadow-lg shadow-primary-100' 
                      : 'border-gray-200 hover:border-gray-300'}`}
                  placeholder="请输入邮箱"
                />
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300
                  ${focused === 'email' ? 'text-primary-500 transform -translate-y-1/2 scale-110' : 'text-gray-400'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 密码 */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">密码 <span className="text-red-500">*</span></label>
              <div className={`relative transition-all duration-300 ${focused === 'password' ? 'transform scale-105' : ''}`}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  className={`w-full px-4 py-3 pl-12 pr-12 border-2 rounded-xl transition-all duration-300 outline-none
                    ${focused === 'password' 
                      ? 'border-primary-500 shadow-lg shadow-primary-100' 
                      : 'border-gray-200 hover:border-gray-300'}`}
                  placeholder="请输入密码（至少6位）"
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

            {/* 确认密码 */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">确认密码 <span className="text-red-500">*</span></label>
              <div className={`relative transition-all duration-300 ${focused === 'confirmPassword' ? 'transform scale-105' : ''}`}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setFocused('confirmPassword')}
                  onBlur={() => setFocused(null)}
                  className={`w-full px-4 py-3 pl-12 border-2 rounded-xl transition-all duration-300 outline-none
                    ${focused === 'confirmPassword' 
                      ? 'border-primary-500 shadow-lg shadow-primary-100' 
                      : 'border-gray-200 hover:border-gray-300'}`}
                  placeholder="请再次输入密码"
                />
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300
                  ${focused === 'confirmPassword' ? 'text-primary-500 transform -translate-y-1/2 scale-110' : 'text-gray-400'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 注册按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl
                hover:from-primary-700 hover:to-primary-800 transform hover:scale-[1.02] hover:shadow-lg
                active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>注册中...</span>
                </>
              ) : (
                <span>立即注册</span>
              )}
            </button>
          </form>

          {/* 已有账号 */}
          <div className="mt-8 text-center text-sm text-gray-500">
            已有账号？ <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">立即登录</Link>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
