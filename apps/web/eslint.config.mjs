import next from "eslint-config-next";

// eslint-disable-next-line import/no-anonymous-default-export
export default [
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "tests/**", "next-env.d.ts"],
  },
  {
    // The following rules were added in React 19's react-hooks lint package and
    // surface pre-existing tech debt in components that predate this feature.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/globals": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/component-hook-factories": "warn",
    },
  },
];
