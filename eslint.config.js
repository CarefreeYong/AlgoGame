import jsLint from '@eslint/js'
import tsLint from 'typescript-eslint'
import vueLint from 'eslint-plugin-vue'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'

export default tsLint.config(
    jsLint.configs.recommended,
    ...tsLint.configs.recommended,
    ...vueLint.configs['flat/recommended'],
    {
        ignores: ['dist', 'src/static'], // 该项要单独放才生效
    },
    {
        files: ['**/*.{js,jsx,ts,tsx,d.ts,vue}'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsParser,
                sourceType: 'module',
                ecmaVersion: 2020,
                ecmaFeatures: {
                    jsx: true,
                    globalReturn: false,
                },
            },
            globals: {
                uni: 'readonly',
            },
        },
        rules: {
            indent: [
                'error',
                4,
                {
                    SwitchCase: 1,
                },
            ],
            quotes: ['error', 'single'],
            semi: ['error', 'never'],
            'comma-dangle': ['error', 'always-multiline'],
            'arrow-spacing': [
                'error',
                {
                    before: true,
                    after: true,
                },
            ],
            'keyword-spacing': [
                'error',
                {
                    before: true,
                    after: true,
                },
            ],
            'switch-colon-spacing': [
                'error',
                {
                    after: true,
                },
            ],
            'space-before-blocks': ['error', 'always'],
            '@typescript-eslint/ban-ts-comment': [
                'error',
                {
                    'ts-ignore': false,
                },
            ],
            '@typescript-eslint/no-empty-object-type': [
                'error',
                {
                    allowInterfaces: 'with-single-extends',
                },
            ],
            '@typescript-eslint/no-unused-expressions': 'off',
            'vue/html-indent': ['error', 4],
            'vue/html-self-closing': [
                'error',
                {
                    html: {
                        void: 'always',
                    },
                },
            ],
            'vue/no-v-text-v-html-on-component': 'off',
            'vue/attribute-hyphenation': ['error', 'never'],
            'vue/multi-word-component-names': [
                'error',
                {
                    ignores: ['index', 'Dropdown'],
                },
            ],
            'vue/no-bare-strings-in-template': [
                'error',
                {
                    allowlist: [],
                    attributes: {},
                    directives: [],
                },
            ],
            'vue/singleline-html-element-content-newline': [
                'error',
                {
                    ignoreWhenNoAttributes: false,
                },
            ],
        },
    },
)
