import antfu from '@antfu/eslint-config'

export default antfu(
    {
        ignores: ['src/static'],
        formatters: true,
        lessOpinionated: true,
        stylistic: {
            indent: 4,
            overrides: {
                'style/max-statements-per-line': 'off',
                'style/arrow-parens': ['error', 'always'],
                'style/quote-props': ['error', 'as-needed'],
                'style/brace-style': [
                    'error',
                    '1tbs',
                    {
                        allowSingleLine: true,
                    },
                ],
                'style/indent': [
                    'error',
                    4,
                    {
                        ignoredNodes: ['ConditionalExpression'],
                        SwitchCase: 1,
                    },
                ],
                'style/member-delimiter-style': [
                    'error',
                    {
                        multiline: {
                            delimiter: 'comma',
                        },
                        singleline: {
                            delimiter: 'comma',
                        },
                    },
                ],
            },
        },
        typescript: {
            tsconfigPath: './tsconfig.json',
            overrides: {
                'ts/no-unused-expressions': 'off',
                'ts/ban-ts-comment': [
                    'error',
                    {
                        'ts-expect-error': 'allow-with-description',
                        'ts-ignore': 'allow-with-description',
                        'ts-nocheck': 'allow-with-description',
                        'ts-check': 'allow-with-description',
                    },
                ],
            },
            overridesTypeAware: {
                'ts/strict-boolean-expressions': 'off',
            },
        },
        vue: {
            overrides: {
                'vue/no-v-text-v-html-on-component': 'off',
                'vue/prefer-separate-static-class': 'off',
                'vue/quote-props': 'off',
                'vue/attribute-hyphenation': ['error', 'never'],
                'vue/html-self-closing': [
                    'error',
                    {
                        html: {
                            void: 'always',
                        },
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
            },
        },
        rules: {
            curly: ['error', 'multi-line', 'consistent'],
            'no-cond-assign': 'off',
            'no-sequences': 'off',
            'switch-colon-spacing': [
                'error',
                {
                    after: true,
                },
            ],
            'perfectionist/sort-imports': 'off',
            'perfectionist/sort-named-imports': 'off',
        },
    },
)
