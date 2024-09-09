function removePrefix(string, prefix) {
    if (string.startsWith(prefix)) {
        return string.slice(prefix.length);
    } else {
        return string;
    }
}

function removeSuffix(string, suffix) {
    if (string.endsWith(suffix)) {
        return string.slice(0, -suffix.length);
    } else {
        return string;
    }
}

function breakAt(string, item) {
    const index = string.indexOf(item);

    if (index > -1) {
        return [string.slice(0, index), string.slice(index + item.length)];
    } else {
        return [string, ''];
    }
}

module.exports = { removePrefix, removeSuffix, breakAt };
