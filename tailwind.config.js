/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#08090b",
        surface: {
          DEFAULT: "#0c0d10",
          raised: "#121317",
          high: "#1a1b20",
        },
        line: {
          DEFAULT: "rgba(255,255,255,0.07)",
          bright: "rgba(255,255,255,0.13)",
        },
        ink: {
          DEFAULT: "#e8e8ec",
          dim: "#9a9aa2",
          faint: "#5c5c64",
        },
        accent: {
          DEFAULT: "#46e08b",
          bright: "#7dffb8",
          dim: "rgba(70,224,139,0.12)",
        },
        hot: "#fb6f6f",
        warm: "#e8b552",
        cool: "#74a4d8",
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
        sans: ["ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(70,224,139,0.18)",
        panel: "0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 40px rgba(0,0,0,0.45)",
      },
      letterSpacing: {
        widest2: "0.22em",
      },
    },
  },
  plugins: [],
}
