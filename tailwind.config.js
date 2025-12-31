// 파일 경로: tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#FFFFFF",
                foreground: "#171717",
                silver: {
                    orange: "#FF6B35",
                    "orange-hover": "#E55A2B",
                    "orange-light": "#FFE4D6",
                    black: "#1A1A1A",
                    gray: "#4A4A4A",
                    "gray-light": "#717171",
                    white: "#FFFFFF",
                    "bg-light": "#F8F9FA",
                    green: "#2E7D32",
                    red: "#D32F2F",
                    blue: "#1976D2",
                    border: "#E0E0E0",
                },
            },
            fontSize: {
                xs: ["1rem", { lineHeight: "1.5rem" }],
                sm: ["1.125rem", { lineHeight: "1.75rem" }],
                base: ["1.25rem", { lineHeight: "1.875rem" }],
                lg: ["1.5rem", { lineHeight: "2.125rem" }],
                xl: ["1.75rem", { lineHeight: "2.375rem" }],
                "2xl": ["2rem", { lineHeight: "2.5rem" }],
                "3xl": ["2.5rem", { lineHeight: "3rem" }],
                "4xl": ["3rem", { lineHeight: "3.5rem" }],
                "5xl": ["3.75rem", { lineHeight: "4rem" }],
            },
            spacing: {
                touch: "3.5rem",
                "touch-lg": "4rem",
                "touch-xl": "5rem",
            },
            borderRadius: {
                silver: "1rem",
                "silver-lg": "1.5rem",
                "silver-xl": "2rem",
            },
        },
    },
    plugins: [],
};
