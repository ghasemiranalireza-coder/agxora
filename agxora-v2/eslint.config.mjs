import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: [
      "app/components/AgxoraGlobe3D.tsx",
      "app/components/StarfieldBackground.tsx",
    ],
    rules: {
      // React Three Fiber mutates materials / transforms inside useFrame.
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
