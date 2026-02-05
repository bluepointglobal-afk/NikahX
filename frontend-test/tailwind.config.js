/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#10b981", // Emerald 500
                "primary-hover": "#059669", // Emerald 600
                "primary-dark": "#047857",
                "background-dark": "#020617", // Slate 950
                "surface-dark": "#0f172a", // Slate 900
            },
            fontFamily: {
                "sans": ["Inter", "sans-serif"],
                "serif": ["Playfair Display", "serif"],
            },
            boxShadow: {
                "soft": "0 10px 40px -10px rgba(0,0,0,0.5)",
                "glow": "0 0 25px rgba(16, 185, 129, 0.2)"
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
            },
            animation: {
                enter: 'fadeUp 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
            },
            keyframes: {
                fadeUp: {
                    'from': { opacity: '0', transform: 'translateY(15px)' },
                    'to': { opacity: '1', transform: 'translateY(0)' },
                }
            }
        },
    },
    plugins: [],
}
