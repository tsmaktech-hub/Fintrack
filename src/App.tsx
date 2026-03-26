/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Plus, 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  History, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User } from '@supabase/supabase-js';

// --- Types & Schemas ---

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  created_at: string;
}

const transactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

// --- Components ---

const ConfigWarning: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4] p-6">
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-white rounded-[32px] shadow-sm p-10 border border-orange-100 text-center"
    >
      <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="text-orange-500 w-8 h-8" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Configuration Required</h2>
      <p className="text-gray-600 mb-8 leading-relaxed">
        To use Supabase, you need to set your project credentials in the <strong>Settings &gt; Secrets</strong> panel.
      </p>
      
      <div className="space-y-3 text-left bg-gray-50 p-6 rounded-2xl mb-8 font-mono text-xs">
        <p className="text-gray-400 uppercase tracking-wider font-bold mb-2">Required Secrets:</p>
        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
          <span className="text-gray-700">VITE_SUPABASE_URL</span>
          <span className="text-red-400">Missing</span>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-gray-700">VITE_SUPABASE_ANON_KEY</span>
          <span className="text-red-400">Missing</span>
        </div>
      </div>

      <p className="text-sm text-gray-400">
        The app will automatically reload once the secrets are saved.
      </p>
    </motion.div>
  </div>
);

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setErrorDetails(event.error?.message || 'An unexpected error occurred.');
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{errorDetails}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const Auth: React.FC = () => {
  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-sm p-10 border border-gray-200"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
            <Wallet className="text-white w-8 h-8" />
          </div>
        </div>
        <h1 className="text-3xl font-semibold text-center text-gray-900 mb-2">FinTrack</h1>
        <p className="text-gray-500 text-center mb-10">Manage your wealth with precision.</p>
        
        <button 
          onClick={handleLogin}
          className="w-full py-4 bg-black text-white rounded-2xl font-medium flex items-center justify-center gap-3 hover:bg-gray-800 transition-all active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>
        
        <p className="mt-8 text-center text-xs text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
};

const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      setTransactions(data || []);
    }
  };

  useEffect(() => {
    fetchTransactions();

    // Set up real-time subscription
    const channel = supabase
      .channel('transactions_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const stats = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [transactions]);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      date: new Date().toISOString().split('T')[0]
    }
  });

  const currentType = watch('type');

  const onSubmit = async (data: TransactionFormData) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          ...data,
          user_id: user.id,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      setIsAdding(false);
      reset();
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f4] pb-20">
      {/* Header */}
      <header className="bg-white border-bottom border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <Wallet className="text-white w-5 h-5" />
            </div>
            <span className="font-semibold text-xl tracking-tight">FinTrack</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user.user_metadata.full_name || user.email}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-black text-white p-8 rounded-[32px] shadow-sm relative overflow-hidden"
          >
            <div className="relative z-10">
              <p className="text-gray-400 text-sm font-medium mb-1">Total Balance</p>
              <h2 className="text-4xl font-semibold tracking-tight">${stats.balance.toLocaleString()}</h2>
            </div>
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <Wallet className="w-12 h-12" />
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                <TrendingUp className="text-green-600 w-5 h-5" />
              </div>
              <p className="text-gray-500 text-sm font-medium">Income</p>
            </div>
            <h2 className="text-3xl font-semibold text-gray-900">${stats.income.toLocaleString()}</h2>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                <TrendingDown className="text-red-600 w-5 h-5" />
              </div>
              <p className="text-gray-500 text-sm font-medium">Expenses</p>
            </div>
            <h2 className="text-3xl font-semibold text-gray-900">${stats.expenses.toLocaleString()}</h2>
          </motion.div>
        </div>

        {/* Transactions Section */}
        <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Recent Transactions</h3>
              <p className="text-sm text-gray-500">Your financial activity at a glance</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['all', 'income', 'expense'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                      filter === type ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-black text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {transactions.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="text-gray-300 w-8 h-8" />
                </div>
                <p className="text-gray-500 font-medium">No transactions yet</p>
                <p className="text-sm text-gray-400">Start tracking your finances today</p>
              </div>
            ) : (
              transactions
                .filter(t => filter === 'all' || t.type === filter)
                .map((tx) => (
                <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      tx.type === 'income' ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      {tx.type === 'income' ? (
                        <ArrowUpRight className="text-green-600 w-6 h-6" />
                      ) : (
                        <ArrowDownRight className="text-red-600 w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{tx.category}</p>
                      <p className="text-sm text-gray-500">{tx.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${
                      tx.type === 'income' ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-10"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-semibold text-gray-900">New Transaction</h3>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-1 bg-gray-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => reset({ ...watch(), type: 'expense' })}
                    className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                      currentType === 'expense' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => reset({ ...watch(), type: 'income' })}
                    className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                      currentType === 'income' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Income
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      {...register('amount', { valueAsNumber: true })}
                      placeholder="0.00"
                      className="w-full pl-10 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all text-lg font-medium"
                    />
                  </div>
                  {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Category</label>
                    <select 
                      {...register('category')}
                      className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all appearance-none"
                    >
                      <option value="">Select</option>
                      <option value="Salary">Salary</option>
                      <option value="Food">Food</option>
                      <option value="Rent">Rent</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Transport">Transport</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Date</label>
                    <input 
                      type="date" 
                      {...register('date')}
                      className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
                    />
                    {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Description</label>
                  <input 
                    type="text" 
                    {...register('description')}
                    placeholder="What was this for?"
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-black text-white rounded-2xl font-semibold text-lg hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg shadow-black/10"
                >
                  Save Transaction
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return <ConfigWarning />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {user ? <Dashboard user={user} /> : <Auth />}
    </ErrorBoundary>
  );
}
