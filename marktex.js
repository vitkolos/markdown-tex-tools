const marked = require('marked');
const katex = require('katex');

function markedKatex(options) {
    return {
        walkTokens,
        extensions: [
            blockKatex(options),
            inlineKatex(options)
        ]
    };
}

function walkTokens(token) {
    if (token.type === 'text') {
        // non-breaking space (nbsp)
        token.text = token.text.replace(/(?<=[\s(])([kvszaiou])\s/gi, '$1\u00A0');
    }
}

function inlineKatex(options) {
    return {
        name: 'inlineKatex',
        level: 'inline',
        start(src) { return src.indexOf('$'); },
        tokenizer(src, tokens) {
            const match = src.match(/^\$([^$\n]+?)\$/);
            if (match) {
                return {
                    type: 'inlineKatex',
                    raw: match[0],
                    text: match[1].trim()
                };
            }
        },
        renderer(token) {
            return katex.renderToString(token.text, options);
        }
    };
}

function blockKatex(options) {
    return {
        name: 'blockKatex',
        level: 'inline',
        start(src) { return src.indexOf('$$'); },
        tokenizer(src, tokens) {
            const match = src.match(/^\$\$+([^$]+?)\$\$+/);
            if (match) {
                return {
                    type: 'blockKatex',
                    raw: match[0],
                    text: match[1].trim()
                };
            }
        },
        renderer(token) {
            return katex.renderToString(token.text, { ...options, displayMode: true });
        }
    };
}

function processKatex(markdown, options = {}) {
    marked.use(markedKatex(options));
    return marked.parse(markdown);
}

module.exports = {
    processKatex
};
