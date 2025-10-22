const config = {
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  plugins: ['@ianvs/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],
  importOrder: [
    '^react$',
    '^next',
    '',
    '^@/shared/(.*)$',
    '^@/modules/(.*)$',
    '^@/(.*)$',
    '',
    '^[./]'
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};

export default config;
