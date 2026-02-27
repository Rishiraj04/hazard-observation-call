import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Plus, 
  LogOut, 
  Filter, 
  Search,
  Camera,
  X,
  ChevronRight,
  LayoutDashboard,
  FileText,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import { cn } from './lib/utils';
import { User, Hazard, HazardStatus, WSMessage } from './types';

// --- Components ---

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'low' | 'medium' | 'high' | 'open' | 'in progress' | 'closed' }) => {
  const variants = {
    default: 'bg-zinc-100 text-zinc-800',
    low: 'bg-emerald-100 text-emerald-800',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-rose-100 text-rose-800',
    open: 'bg-blue-100 text-blue-800',
    'in progress': 'bg-indigo-100 text-indigo-800',
    closed: 'bg-zinc-100 text-zinc-500',
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", variants[variant as keyof typeof variants])}>
      {children}
    </span>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'login' | 'register' | 'dashboard'>('login');
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [filters, setFilters] = useState({ status: 'all', risk: 'all', search: '' });
  
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchHazards();
      setupWebSocket();
    }
    return () => ws.current?.close();
  }, [user]);

  const setupWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws.current = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.current.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);
      if (msg.type === 'NEW_HAZARD') {
        setHazards(prev => [msg.payload, ...prev]);
        if (user?.role === 'admin') {
          toast.success(`New hazard reported at ${msg.payload.location}`, { icon: '🔔' });
        }
      } else if (msg.type === 'STATUS_UPDATE') {
        setHazards(prev => prev.map(h => h.id === msg.payload.id ? msg.payload : h));
        if (user?.id === msg.payload.userId || user?.role === 'admin') {
          toast(`Hazard status updated to ${msg.payload.status}`, { icon: 'ℹ️' });
        }
      }
    };
  };

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setView('dashboard');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHazards = async () => {
    const res = await fetch('/api/hazards');
    if (res.ok) {
      const data = await res.json();
      setHazards(data);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setView('login');
  };

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-zinc-50">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Shield className="w-8 h-8 text-zinc-400" />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 font-sans selection:bg-zinc-900 selection:text-white">
      <Toaster position="top-right" />
      
      {view === 'dashboard' && user ? (
        <Dashboard 
          user={user} 
          hazards={hazards} 
          onLogout={handleLogout}
          showReportForm={showReportForm}
          setShowReportForm={setShowReportForm}
          selectedHazard={selectedHazard}
          setSelectedHazard={setSelectedHazard}
          filters={filters}
          setFilters={setFilters}
          refreshHazards={fetchHazards}
        />
      ) : (
        <Auth view={view} setView={setView} onLogin={setUser} />
      )}
    </div>
  );
}

// --- Auth Component ---

function Auth({ view, setView, onLogin }: { view: 'login' | 'register', setView: (v: 'login' | 'register' | 'dashboard') => void, onLogin: (u: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = view === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        if (view === 'login') {
          onLogin(data);
          setView('dashboard');
        } else {
          toast.success('Registration successful! Please login.');
          setView('login');
        }
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl border border-zinc-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">HOC System</h1>
          <p className="text-zinc-500 text-sm">Hazard Observation Call</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
              placeholder="••••••••"
            />
          </div>
          <button 
            disabled={loading}
            className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : view === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setView(view === 'login' ? 'register' : 'login')}
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {view === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// --- Dashboard Component ---

function Dashboard({ 
  user, 
  hazards, 
  onLogout, 
  showReportForm, 
  setShowReportForm,
  selectedHazard,
  setSelectedHazard,
  filters,
  setFilters,
  refreshHazards
}: { 
  user: User, 
  hazards: Hazard[], 
  onLogout: () => void,
  showReportForm: boolean,
  setShowReportForm: (v: boolean) => void,
  selectedHazard: Hazard | null,
  setSelectedHazard: (h: Hazard | null) => void,
  filters: any,
  setFilters: (f: any) => void,
  refreshHazards: () => void
}) {
  const filteredHazards = hazards.filter(h => {
    const matchesStatus = filters.status === 'all' || h.status === filters.status;
    const matchesRisk = filters.risk === 'all' || h.riskLevel === filters.risk;
    const matchesSearch = h.location.toLowerCase().includes(filters.search.toLowerCase()) || 
                         h.type.toLowerCase().includes(filters.search.toLowerCase());
    return matchesStatus && matchesRisk && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">
            {user.role === 'admin' ? 'Safety Command' : 'My Safety Portal'}
          </h2>
          <p className="text-zinc-500 flex items-center gap-2">
            Welcome back, <span className="font-semibold text-zinc-900">{user.username}</span>
            <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
            {user.role === 'admin' ? 'Administrator' : 'Employee'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user.role === 'user' && (
            <button 
              onClick={() => setShowReportForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
            >
              <Plus className="w-4 h-4" />
              Report Hazard
            </button>
          )}
          <button 
            onClick={onLogout}
            className="p-3 bg-white border border-zinc-200 rounded-2xl text-zinc-500 hover:text-rose-600 hover:border-rose-100 transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Stats / Quick Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label="Total Reports" 
          value={hazards.length} 
          icon={<FileText className="w-5 h-5" />} 
          color="zinc"
        />
        <StatCard 
          label="Open Issues" 
          value={hazards.filter(h => h.status === 'open').length} 
          icon={<AlertTriangle className="w-5 h-5" />} 
          color="rose"
        />
        <StatCard 
          label="In Progress" 
          value={hazards.filter(h => h.status === 'in progress').length} 
          icon={<Clock className="w-5 h-5" />} 
          color="amber"
        />
        <StatCard 
          label="Resolved" 
          value={hazards.filter(h => h.status === 'closed').length} 
          icon={<CheckCircle2 className="w-5 h-5" />} 
          color="emerald"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Filters & List */}
        <div className="lg:col-span-12 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search by location or type..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-11 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select 
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
                className="flex-1 md:flex-none px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-medium focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
              <select 
                value={filters.risk}
                onChange={e => setFilters({ ...filters, risk: e.target.value })}
                className="flex-1 md:flex-none px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-medium focus:outline-none"
              >
                <option value="all">All Risk</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredHazards.map((hazard) => (
                <div key={hazard.id}>
                  <HazardCard 
                    hazard={hazard} 
                    onClick={() => setSelectedHazard(hazard)}
                  />
                </div>
              ))}
            </AnimatePresence>
            {filteredHazards.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-zinc-200">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-zinc-300" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">No hazards found</h3>
                <p className="text-zinc-500">Try adjusting your filters or search terms.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showReportForm && (
          <ReportForm 
            onClose={() => setShowReportForm(false)} 
            onSuccess={() => {
              setShowReportForm(false);
              refreshHazards();
            }} 
          />
        )}
        {selectedHazard && (
          <HazardDetails 
            hazard={selectedHazard} 
            user={user}
            onClose={() => setSelectedHazard(null)} 
            onUpdate={refreshHazards}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

function StatCard({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) {
  const colors = {
    zinc: 'bg-zinc-100 text-zinc-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", colors[color as keyof typeof colors])}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</p>
        <p className="text-2xl font-bold text-zinc-900">{value}</p>
      </div>
    </div>
  );
}

function HazardCard({ hazard, onClick }: { hazard: Hazard, onClick: () => void }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className="group bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-xl hover:shadow-zinc-900/5 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <Badge variant={hazard.riskLevel}>{hazard.riskLevel} Risk</Badge>
        <Badge variant={hazard.status}>{hazard.status}</Badge>
      </div>
      
      <h3 className="text-lg font-bold text-zinc-900 mb-2 group-hover:text-zinc-700 transition-colors line-clamp-1">
        {hazard.type}
      </h3>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <MapPin className="w-4 h-4" />
          <span className="line-clamp-1">{hazard.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Clock className="w-4 h-4" />
          <span>{format(new Date(hazard.createdAt), 'MMM d, yyyy • HH:mm')}</span>
        </div>
      </div>

      {hazard.imageUrl && (
        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-zinc-100 mb-4">
          <img src={hazard.imageUrl} alt="Hazard" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-top border-zinc-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold">
            {hazard.reporter?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-xs text-zinc-500 font-medium">Reported by {hazard.reporter || 'Me'}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
      </div>
    </motion.div>
  );
}

function ReportForm({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    type: '',
    location: '',
    riskLevel: 'low' as const,
    description: '',
    imageUrl: ''
  });
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/hazards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success('Hazard reported successfully');
        onSuccess();
      } else {
        toast.error('Failed to report hazard');
      }
    } catch (e) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/20 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-zinc-100 overflow-hidden"
      >
        <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-zinc-900">Report New Hazard</h3>
            <p className="text-zinc-500 text-sm">Provide as much detail as possible for safety review.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
            <X className="w-6 h-6 text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Hazard Type</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Slippery Floor, Exposed Wires"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Location</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Warehouse B, Section 4"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Risk Level</label>
            <div className="flex gap-3">
              {(['low', 'medium', 'high'] as const).map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, riskLevel: level })}
                  className={cn(
                    "flex-1 py-3 rounded-xl border font-bold capitalize transition-all",
                    formData.riskLevel === level 
                      ? level === 'low' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                        level === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Description</label>
            <textarea 
              required
              rows={4}
              placeholder="Describe the hazard and any immediate actions taken..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Evidence Image</label>
            <div className="relative group">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                className="hidden" 
                id="hazard-image"
              />
              <label 
                htmlFor="hazard-image"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-zinc-200 rounded-2xl cursor-pointer hover:border-zinc-900/20 hover:bg-zinc-50 transition-all overflow-hidden"
              >
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="text-sm text-zinc-400 font-medium">Click to upload or take a photo</span>
                  </>
                )}
              </label>
              {formData.imageUrl && (
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, imageUrl: '' })}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:text-rose-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-[2] py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/10 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function HazardDetails({ hazard, user, onClose, onUpdate }: { hazard: Hazard, user: User, onClose: () => void, onUpdate: () => void }) {
  const [status, setStatus] = useState<HazardStatus>(hazard.status);
  const [remarks, setRemarks] = useState(hazard.remarks || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hazards/${hazard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks })
      });
      if (res.ok) {
        toast.success('Status updated successfully');
        onUpdate();
        onClose();
      } else {
        toast.error('Failed to update status');
      }
    } catch (e) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/20 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col md:flex-row"
      >
        {/* Left Side: Info */}
        <div className="flex-1 p-8 overflow-y-auto max-h-[80vh]">
          <div className="flex items-center justify-between mb-6">
            <Badge variant={hazard.riskLevel}>{hazard.riskLevel} Risk</Badge>
            <button onClick={onClose} className="md:hidden p-2 hover:bg-zinc-50 rounded-full">
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          <h3 className="text-2xl font-bold text-zinc-900 mb-2">{hazard.type}</h3>
          
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <MapPin className="w-4 h-4" />
              <span>{hazard.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Clock className="w-4 h-4" />
              <span>{format(new Date(hazard.createdAt), 'MMM d, yyyy • HH:mm')}</span>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Description</label>
            <p className="text-zinc-700 leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              {hazard.description}
            </p>
          </div>

          {hazard.imageUrl && (
            <div className="mb-8">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Evidence</label>
              <img src={hazard.imageUrl} alt="Evidence" className="w-full rounded-2xl shadow-sm" />
            </div>
          )}

          {hazard.remarks && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Admin Remarks</label>
              <p className="text-zinc-700 italic bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                "{hazard.remarks}"
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Admin Controls */}
        <div className="w-full md:w-80 bg-zinc-50 p-8 border-l border-zinc-100">
          <div className="hidden md:flex justify-end mb-8">
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Current Status</label>
              <div className="flex flex-col gap-2">
                {(['open', 'in progress', 'closed'] as const).map(s => (
                  <button
                    key={s}
                    disabled={user.role !== 'admin'}
                    onClick={() => setStatus(s)}
                    className={cn(
                      "w-full py-3 px-4 rounded-xl text-sm font-bold capitalize text-left transition-all flex items-center justify-between",
                      status === s 
                        ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/10" 
                        : "bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-300"
                    )}
                  >
                    {s}
                    {status === s && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {user.role === 'admin' && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Corrective Remarks</label>
                  <textarea 
                    rows={4}
                    placeholder="Add notes about actions taken..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 resize-none text-sm"
                  />
                </div>

                <button 
                  onClick={handleUpdate}
                  disabled={loading}
                  className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/10 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Save Changes'}
                </button>
              </>
            )}

            {user.role === 'user' && (
              <div className="pt-4">
                <p className="text-xs text-zinc-400 text-center">
                  Only administrators can update the status and remarks of this report.
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
