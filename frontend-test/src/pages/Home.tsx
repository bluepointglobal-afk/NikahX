import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Profile {
    id: string;
    display_name: string;
    age?: number; // derived from dob
    bio: string;
    gender: string;
    location?: any;
}

export default function Home() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        // Simple logic: fetch any profile that is NOT me.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
            .from('profile') // Check table name: 'profile' or 'profiles'? Architecture says 'profile' (singular) in 0001_init.sql
            .select('*')
            .neq('id', session.user.id)
            .limit(1)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
        } else {
            setProfile(data);
        }
        setLoading(false);
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>;

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden max-w-md mx-auto shadow-2xl bg-background-dark border-x border-slate-900">
            {/* Header */}
            <header className="flex items-center justify-between px-6 pt-12 pb-2 bg-background-dark/80 backdrop-blur-md z-30 sticky top-0 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-900/40 ring-1 ring-white/10">
                        <span className="material-symbols-outlined text-white text-[20px] font-bold">favorite</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-white">Nikah<span className="text-emerald-500">Plus</span></h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex px-3 py-1.5 rounded-full bg-slate-900 border border-amber-500/20 items-center gap-1.5 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Premium</span>
                    </div>
                    <button className="relative p-2.5 rounded-full hover:bg-slate-800 transition-colors text-slate-400 border border-slate-800 hover:border-slate-700">
                        <span className="material-symbols-outlined text-[24px]">tune</span>
                    </button>
                </div>
            </header>

            {/* Main Card */}
            <main className="flex-1 relative w-full px-4 pb-4 flex flex-col justify-end overflow-hidden">
                {profile ? (
                    <>
                        <div className="absolute inset-0 top-0 px-4 flex flex-col items-center justify-center pointer-events-none">
                            <div className="absolute top-[8%] w-[90%] h-[80%] bg-slate-800/50 rounded-[2.5rem] shadow-sm border border-slate-800 opacity-60 scale-95 translate-y-6"></div>
                            <div className="relative pointer-events-auto w-full h-[84%] bg-slate-900 rounded-[2.5rem] shadow-card overflow-hidden group border border-slate-700/50 ring-1 ring-white/5 z-10">
                                <div className="absolute inset-0 w-full h-full">
                                    {/* Placeholder Image because we don't have storage URL logic yet */}
                                    <img alt="Profile" className="w-full h-full object-cover opacity-90" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=774&q=80" />
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent via-40% to-black/95"></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90"></div>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-7 pb-8">
                                    <div className="flex items-end justify-between mb-5">
                                        <div>
                                            <div className="flex items-baseline gap-2 mb-1.5">
                                                <h2 className="text-[2rem] font-bold text-white tracking-tight drop-shadow-md">
                                                    {profile.display_name || 'Anonymous'}, <span className="font-light text-2xl text-slate-300">25</span>
                                                </h2>
                                                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-black/30 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Online"></span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-300 text-sm font-medium">
                                                <span className="material-symbols-outlined text-[18px] text-slate-400">location_on</span>
                                                <span>Jakarta, ID</span>
                                            </div>
                                        </div>
                                        <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/20">
                                            <span className="material-symbols-outlined text-[22px]">info</span>
                                        </button>
                                    </div>

                                    <p className="text-slate-300 text-sm line-clamp-2 font-normal leading-relaxed opacity-90 drop-shadow-sm border-l-2 border-emerald-500/50 pl-3">
                                        {profile.bio || 'No bio provided.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="relative w-full flex items-center justify-center gap-8 z-20 pb-4 pt-4">
                            <button onClick={fetchProfile} className="group w-16 h-16 rounded-full bg-slate-800 shadow-soft flex items-center justify-center border border-slate-700 transition-all active:scale-90 hover:bg-slate-700 hover:shadow-lg hover:border-red-500/30">
                                <span className="material-symbols-outlined text-3xl text-slate-500 group-hover:text-red-500 transition-colors">close</span>
                            </button>
                            <button className="group w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-glow flex items-center justify-center transition-all hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-emerald-500/20 border-4 border-background-dark z-10 -mt-2 ring-1 ring-white/10">
                                <span className="material-symbols-outlined text-4xl text-white drop-shadow-sm group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                            </button>
                            <button className="group w-16 h-16 rounded-full bg-slate-800 shadow-soft flex items-center justify-center border border-slate-700 transition-all active:scale-90 hover:bg-slate-700 hover:shadow-lg hover:border-amber-500/30">
                                <span className="material-symbols-outlined text-3xl text-slate-500 group-hover:text-amber-400 transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500">
                        No profiles found.
                    </div>
                )}
            </main>

            {/* Nav */}
            <nav className="bg-background-dark border-t border-white/5 px-8 py-5 flex justify-between items-center z-40">
                <button className="flex flex-col items-center gap-1.5 text-primary relative">
                    <span className="material-symbols-outlined text-[28px] drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>grid_view</span>
                    <span className="w-1 h-1 rounded-full bg-primary absolute -bottom-2 shadow-[0_0_5px_#10b981]"></span>
                </button>
                <button className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors">
                    <span className="material-symbols-outlined text-[28px]">search</span>
                </button>
                <button className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors relative">
                    <div className="relative">
                        <span className="material-symbols-outlined text-[28px]">chat_bubble</span>
                    </div>
                </button>
                <button className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors">
                    <span className="material-symbols-outlined text-[28px]">person</span>
                </button>
            </nav>
        </div>
    );
}
