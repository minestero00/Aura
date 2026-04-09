module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: ['.ios.ts', '.android.ts', '.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@': './src',
          '@src': './src',
          '@config': './src/config',
          '@lib': './src/lib',
          '@features': './src/features',
          '@components': './src/features/app/components'
        }
      }
    ],
    [
      "module:react-native-dotenv",
      {
        moduleName: "@env",
        path: ".env",
      },
    ],
  ],
};
