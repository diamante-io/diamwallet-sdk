const path = require("path");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    library: "DIAMWalletConnectionSDK",
    libraryTarget: "umd",
    globalObject: "this",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            plugins: ["@babel/plugin-transform-object-assign"], // ensure compatibility with IE 11
          },
        },
      },
    ],
  },
  resolve: {
    fallback: {
      "react-native": false,
    },
  },
  externals: {
    "react-native": "react-native",
    bufferutil: "bufferutil",
    "utf-8-validate": "utf-8-validate",
  },
};
