import nextPlugin from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**"],
  },
  ...nextPlugin,
];

export default eslintConfig;
