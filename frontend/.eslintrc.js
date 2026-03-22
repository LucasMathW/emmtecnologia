const { default: plugin } = require("chartjs-plugin-datalabels");

module.exports = {
  plugins: ["react-hooks"],
  rules: {
    "no-unused-vars": "off",
    "react-hooks/exhaustive-deps": "off",
    "no-mixed-operators": "off",
    "max-len": [
      "warn",
      {
        code: 120, // ← Aumente este valor (padrão é 80)
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreComments: true,
      },
    ],
  },
};
