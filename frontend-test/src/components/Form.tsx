import React from 'react';

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        'block w-full rounded-2xl border-0 py-4 px-6 text-white shadow-lg ring-1 ring-inset ring-slate-800 placeholder:text-slate-600 focus:ring-2 focus:ring-inset focus:ring-primary focus:bg-slate-900/90 bg-slate-900/50 backdrop-blur-sm sm:text-base sm:leading-6 transition-all duration-300 ease-out ' +
        (props.className ?? '')
      }
    />
  );
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={
        'block w-full rounded-2xl border-0 py-4 px-6 text-white shadow-lg ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-inset focus:ring-primary focus:bg-slate-900/90 bg-slate-900/50 backdrop-blur-sm sm:text-base sm:leading-6 transition-all duration-300 ease-out ' +
        (props.className ?? '')
      }
    />
  );
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        'group w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-4 px-4 text-center text-base font-bold text-white shadow-lg shadow-emerald-900/40 hover:shadow-emerald-600/30 hover:to-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2 ring-1 ring-white/10 disabled:opacity-60 disabled:cursor-not-allowed ' +
        (props.className ?? '')
      }
    >
      {children}
    </button>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-md rounded-3xl bg-slate-950/40 ring-1 ring-white/10 shadow-2xl p-6 sm:p-8 backdrop-blur">
      {children}
    </div>
  );
}
