const { Marked } = require('marked');
const { gfmHeadingId } = require('marked-gfm-heading-id');
const katex = require('katex');

function markedKatex(options, renderer) {
    return {
        renderer,
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

function setupMarkedInstance(options = {}, renderer = null) {
    const marked = new Marked();

    if (renderer == null) {
        renderer = new marked.Renderer();
    }

    // marked.use is very error prone when used with global marked object as it adds more and more functions to run
    marked.use(markedKatex(options, renderer));
    marked.use(gfmHeadingId());
    return marked;
}

function processKatex(markedInstance, markdown) {
    return markedInstance.parse(markdown);
}

module.exports = {
    setupMarkedInstance, processKatex
};
