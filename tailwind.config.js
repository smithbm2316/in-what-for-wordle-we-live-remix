const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Sansita Swashed", "display"],
        sans: ["Sansita", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        pl: {
          darkGray: "#242424",
          darkPurple: "#37003c",
          gray: "#6c6c6c",
          green: "#04ff87",
          lightGray: "#76766f",
          orange: "#ff6900",
          pink: "#ff2882",
          purple: "#963cff",
          white20: "hsla(0,0%,100%,.2)",
          // gradients
          greenToBlue: "linear-gradient(270deg,#05f0ff 30%,#00ff87) #00ff87",
          orangeToPink: "linear-gradient(270deg,#ff2882 30%,#ff6900) #ff6900",
          purpleToDark: "linear-gradient(270deg,#963cff,#37003c)",
          purpleToPink: "linear-gradient(270deg,#ff2882,#963cff)",
          purpleToPurple: "linear-gradient(90deg,#963cff,#a64dae)",
        },
      },
    },
  },
  plugins: [
    // https://stackoverflow.com/a/71795600/15089697
    // adds the ability to style all direct children
    function ({ addVariant }) {
      addVariant("desc", "& > *");
    },
  ],
};
