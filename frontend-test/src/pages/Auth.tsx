import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('password123'); // Default for dev
    const [mode, setMode] = useState<'email' | 'phone'>('email');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            navigate('/home');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col justify-center py-8 sm:py-12 px-6">
            <div className="relative mx-auto w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-10 animate-enter">
                    <div className="relative mb-6 group">
                        <div className="relative h-20 w-20 flex items-center justify-center rounded-[24px] bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl ring-1 ring-white/10 transition-transform duration-500 hover:scale-105 group-hover:shadow-emerald-900/20">
                            <span className="material-symbols-outlined text-primary text-[38px] drop-shadow-md" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>favorite</span>
                        </div>
                        <div className="absolute inset-0 rounded-[24px] bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    </div>
                    <h1 className="font-serif text-white tracking-tight text-4xl font-bold leading-tight text-center mb-2">
                        Nikah<span className="text-primary italic font-serif">Plus</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium tracking-widest text-center uppercase opacity-80">
                        Halal matchmaking with dignity
                    </p>
                </div>

                {/* Toggle */}
                <div className="mb-8 animate-enter delay-100">
                    <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900/80 p-1.5 shadow-inner ring-1 ring-white/5 backdrop-blur-md">
                        <button
                            onClick={() => setMode('phone')}
                            className={`relative flex cursor-pointer h-full flex-1 items-center justify-center rounded-xl transition-all duration-300 ${mode === 'phone' ? 'bg-slate-800 shadow-lg ring-1 ring-white/10 text-primary' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <span className="material-symbols-outlined mr-2 text-[20px]">smartphone</span>
                            <span className="text-sm font-semibold tracking-wide">Phone</span>
                        </button>
                        <button
                            onClick={() => setMode('email')}
                            className={`relative flex cursor-pointer h-full flex-1 items-center justify-center rounded-xl transition-all duration-300 ${mode === 'email' ? 'bg-slate-800 shadow-lg ring-1 ring-white/10 text-primary' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <span className="material-symbols-outlined mr-2 text-[20px]">mail</span>
                            <span className="text-sm font-semibold tracking-wide">Email</span>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleLogin}>
                    {/* Input */}
                    <div className="mb-6 space-y-5 animate-enter delay-200">
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                {mode === 'email' ? 'Email Address' : 'Mobile Number'}
                            </label>
                            <div className="relative flex items-center group-focus-within:scale-[1.01] transition-transform duration-300">
                                <input
                                    type={mode === 'email' ? 'email' : 'tel'}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-2xl border-0 py-4 px-6 text-white shadow-lg ring-1 ring-inset ring-slate-800 placeholder:text-slate-600 focus:ring-2 focus:ring-inset focus:ring-primary focus:bg-slate-900/90 bg-slate-900/50 backdrop-blur-sm sm:text-base sm:leading-6 transition-all duration-300 ease-out"
                                    placeholder={mode === 'email' ? 'user@example.com' : '(555) 000-0000'}
                                />
                            </div>
                        </div>
                        {/* Password (Hidden in proto but needed) */}
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                Password
                            </label>
                            <div className="relative flex items-center group-focus-within:scale-[1.01] transition-transform duration-300">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-2xl border-0 py-4 px-6 text-white shadow-lg ring-1 ring-inset ring-slate-800 placeholder:text-slate-600 focus:ring-2 focus:ring-inset focus:ring-primary focus:bg-slate-900/90 bg-slate-900/50 backdrop-blur-sm sm:text-base sm:leading-6 transition-all duration-300 ease-out"
                                    placeholder="Password"
                                />
                            </div>
                        </div>
                    </div>

                    <button disabled={loading} className="group w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-4 px-4 text-center text-base font-bold text-white shadow-lg shadow-emerald-900/40 hover:shadow-emerald-600/30 hover:to-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-300 transform active:scale-[0.98] mb-8 flex items-center justify-center gap-2 animate-enter delay-300 ring-1 ring-white/10">
                        <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                    </button>
                </form>

            </div>
        </div>
    );
}
