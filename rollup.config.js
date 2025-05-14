import babel from "@rollup/plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

const config = (input, output) => ({
  input,
  output: [
    {
      file: `lib/${output}.js`,
      format: "cjs",
    },
    {
      file: `lib/${output}.esm.js`,
      format: "es",
    },
  ],
  plugins: [babel({ babelHelpers: "bundled" }), resolve(), commonjs()],
  external:
    input === "src/react-native.js"
      ? [
          "react-native",
          "@react-native-async-storage/async-storage",
          "crypto-js",
          "axios",
        ]
      : ["crypto-js", "axios"],
});

export default [
  // config("src/web.js", "index.web"),
  config("src/react-native.js", "index.react-native"),
];
