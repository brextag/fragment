import React, { useState } from 'react';
import { useDiscord } from '../../context/DiscordContext';
import { AlertCircle, User, Lock, Smile, Sparkles } from 'lucide-react';

const AVATAR_COLORS = [
  '#5865F2', // Blurple
  '#23A55A', // Green
  '#F0B232', // Yellow
  '#F23F43', // Red
  '#9B59B6', // Purple
  '#00BCD4', // Teal
  '#E91E63'  // Pink
];

export default function AuthModal() {
  const { login, register } = useDiscord();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem('fragment_saved_username') || '';
    } catch {
      return '';
    }
  });
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [rememberCredentials, setRememberCredentials] = useState(true);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const cleanUser = username.trim();
      if (rememberCredentials && cleanUser) {
        localStorage.setItem('fragment_saved_username', cleanUser);
      } else {
        localStorage.removeItem('fragment_saved_username');
      }

      if (isRegisterMode) {
        if (cleanUser.length < 2) {
          throw new Error('Username must be at least 2 characters.');
        }
        if (password.length < 4) {
          throw new Error('Password must be at least 4 characters.');
        }
        const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUser)}`;
        await register({
          username: cleanUser,
          displayName: displayName.trim() || cleanUser,
          password,
          avatar,
          color: selectedColor
        });
      } else {
        await login({
          username: cleanUser,
          password
        });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e1f22]/95 backdrop-blur-md select-none overflow-y-auto">
      {/* Background Graphic Accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#5865f2] rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#23a55a] rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-[480px] bg-[#313338] rounded-xl p-8 shadow-2xl border border-[#2b2d31] relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Fragment Logo & Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#5865f2] text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1.5L3 7L7 21.5L17 21.5L21 7L12 1.5ZM12 4.2L17.5 7.6L12 10.5L6.5 7.6L12 4.2ZM5.2 9.2L10.8 11.9L6.5 19.5L5.2 9.2ZM13.2 11.9L18.8 9.2L17.5 19.5L13.2 11.9ZM12 13.5L15.6 19.5H8.4L12 13.5Z" />
            </svg>
          </div>
          <div className="text-xs font-bold text-[#5865f2] tracking-widest uppercase mb-1">
            FRAGMENT
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isRegisterMode ? 'Create an account' : 'Welcome back!'}
          </h1>
          <p className="text-sm text-[#949ba4] mt-1">
            {isRegisterMode
              ? 'Join Fragment and start chatting with real people'
              : "We're so excited to see you again on Fragment!"}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-[#f23f43]/15 border border-[#f23f43]/50 text-[#f23f43] p-3 rounded-lg text-xs font-semibold flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form id="fragment_auth_form" name="fragment_auth_form" onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label htmlFor="username" className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-2">
              Username <span className="text-[#f23f43]">*</span>
            </label>
            <div className="relative flex items-center bg-[#1e1f22] border border-[#232428] rounded-md focus-within:border-[#5865f2] transition">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder-[#949ba4] outline-none"
              />
            </div>
          </div>

          {/* Display Name (Only in Register mode) */}
          {isRegisterMode && (
            <div>
              <label htmlFor="displayName" className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-2">
                Display Name <span className="text-[#949ba4] font-normal normal-case">(optional)</span>
              </label>
              <div className="relative flex items-center bg-[#1e1f22] border border-[#232428] rounded-md focus-within:border-[#5865f2] transition">
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="nickname"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How friends will see you"
                  className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder-[#949ba4] outline-none"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label htmlFor="password" className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-2">
              Password <span className="text-[#f23f43]">*</span>
            </label>
            <div className="relative flex items-center bg-[#1e1f22] border border-[#232428] rounded-md focus-within:border-[#5865f2] transition">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isRegisterMode ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder-[#949ba4] outline-none"
              />
            </div>
          </div>

          {/* Remember Credentials Checkbox */}
          <div className="flex items-center gap-2 pt-1 pb-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-[#b5bac1] hover:text-white transition">
              <input
                type="checkbox"
                checked={rememberCredentials}
                onChange={(e) => setRememberCredentials(e.target.checked)}
                className="w-4 h-4 rounded border-[#232428] bg-[#1e1f22] text-[#5865f2] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#5865f2]"
              />
              <span>Remember my credentials on this device</span>
            </label>
          </div>

          {/* Color Picker (Only in Register mode) */}
          {isRegisterMode && (
            <div>
              <label className="text-xs font-bold text-[#b5bac1] uppercase tracking-wider block mb-2">
                Profile Theme Color
              </label>
              <div className="flex items-center gap-2.5">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      selectedColor === color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#313338]' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            id="auth_submit"
            disabled={isSubmitting || !username.trim() || !password}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white font-semibold py-2.5 rounded text-sm transition shadow-lg mt-2"
          >
            {isSubmitting
              ? 'Please wait...'
              : isRegisterMode
              ? 'Create Account'
              : 'Log In'}
          </button>

          {/* Toggle between Login and Register */}
          <div className="text-xs text-[#949ba4] pt-2">
            {isRegisterMode ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setError('');
                  }}
                  className="text-[#5865f2] hover:underline font-semibold"
                >
                  Log In
                </button>
              </span>
            ) : (
              <span>
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true);
                    setError('');
                  }}
                  className="text-[#5865f2] hover:underline font-semibold"
                >
                  Register
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
