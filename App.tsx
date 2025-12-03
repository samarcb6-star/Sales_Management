import React, { useState, useEffect } from 'react';
import { getCurrentUser, loginUser, registerUser, setCurrentUser } from './services/storage';
import { User, Role, UserStatus } from './types';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Input } from './components/Input';
import { Button } from './components/Button';
import { LayoutDashboard, LogOut } from 'lucide-react';

// Converted Google Drive View Link to Direct Image Link
const LOGO_URL = "https://drive.google.com/uc?export=view&id=1hPG8Y8NVMmLdBbN4XOCzkADbrbow47dL";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    // Check session on load
    const stored = getCurrentUser();
    if (stored) {
      // Refresh user data from "DB" to get latest status
      const freshUser = loginUser(stored.username); 
      if (freshUser) setUser(freshUser);
    }
  }, []);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        if (!fullName) throw new Error("Full Name is required");
        const newUser = registerUser(username, fullName);
        setUser(newUser);
        setCurrentUser(newUser);
      } else {
        const existingUser = loginUser(username);
        if (!existingUser) throw new Error("User not found. Please register.");
        setUser(existingUser);
        setCurrentUser(existingUser);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUser(null);
    setUsername('');
    setFullName('');
  };

  const LogoComponent = ({ className = "h-16" }: { className?: string }) => {
    if (logoError) {
      // Fallback stylized text logo if image fails
      return (
        <div className={`flex flex-col items-center justify-center font-black tracking-tighter leading-none select-none ${className === "h-8" ? "scale-75 origin-left" : ""}`}>
          <div className="flex gap-1">
            <span className="text-red-600 text-3xl">SML</span>
            <span className="text-black text-3xl">ISUZU</span>
          </div>
          <span className="text-[0.6rem] text-slate-500 font-normal tracking-normal uppercase">Formerly SML Isuzu</span>
        </div>
      );
    }
    return (
      <img 
        src={LOGO_URL} 
        alt="SML Isuzu" 
        className={`${className} object-contain`}
        onError={() => setLogoError(true)}
      />
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md flex flex-col items-center">
          
          {/* Logo Section */}
          <div className="mb-2 flex justify-center w-full">
            <LogoComponent className="h-24" />
          </div>

          <h1 className="text-2xl font-bold text-center text-blue-600 mb-2">Sales Management System</h1>
          <p className="text-center text-slate-500 mb-6">{isRegistering ? "Create an account" : "Sign in to your account"}</p>
          
          <form onSubmit={handleAuth} className="space-y-4 w-full">
            <Input 
              label="Username" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="sidhant@1111"
              required
            />
            {isRegistering && (
              <Input 
                label="Full Name" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                placeholder="Sidhant Singh"
                required
              />
            )}
            
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            
            <Button type="submit" className="w-full">
              {isRegistering ? "Register" : "Login"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-blue-600 hover:underline"
            >
              {isRegistering ? "Already have an account? Login" : "New here? Register"}
            </button>
          </div>

          {/* Watermark */}
          <div className="mt-8 text-xs text-slate-300 font-medium select-none">
            Created by Sidhant Singh
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoComponent className="h-10" />
            <span className="font-bold text-xl text-slate-800 hidden sm:block ml-2 border-l pl-3 border-slate-300">Sales Management System</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{user.fullName}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-red-600">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.status === UserStatus.PENDING ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-lg text-center">
            <h2 className="text-lg font-bold mb-2">Account Pending Approval</h2>
            <p>Your account is waiting for administrator approval. Please contact the owner.</p>
          </div>
        ) : user.status === UserStatus.REJECTED ? (
          <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg text-center">
            <h2 className="text-lg font-bold mb-2">Account Rejected</h2>
            <p>Your access has been denied by the administrator.</p>
          </div>
        ) : (
          <>
            {user.role === Role.OWNER ? <AdminDashboard /> : <UserDashboard currentUser={user} />}
          </>
        )}
      </main>
    </div>
  );
};

export default App;