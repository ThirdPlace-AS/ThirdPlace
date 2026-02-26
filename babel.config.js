module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // ... other plugins like 'nativewind/babel' if you have them
      "react-native-reanimated/plugin",
    ],
  };
};
