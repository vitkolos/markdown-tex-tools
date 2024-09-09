function notFound(res, errorText = 'Page not found') {
    const plain = false;

    if (plain) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Error 404\n' + errorText);
    } else {
        const content = `<!DOCTYPE html>
<html lang="cs">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Stránka nenalezena (error 404)</title>
    <link rel="stylesheet" href="/node/static/style.css">
    <script src="/node/static/theme.js"></script>
</head>
<body>
	<h1>Stránka nebyla nalezena :(</h1>
    <code>Error 404<br>${errorText}</code>
	<p>Můžete se vrátit <a href="/">na úvodní stránku webu</a>, <a href=".">na úvodní stránku adresáře</a> nebo <a href="..">o úroveň výše</a>.</p>
</body>
</html>`;
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
    }
}

module.exports = {
    notFound
};
