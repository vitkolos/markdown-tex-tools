const https = require('https');
const marktex = require('./marktex')

function getMarktexWebsite(path, res) {
	if (path[0] == 'notes-ipp') {
		https.get('https://raw.githubusercontent.com/vitkolos/' + path.join('/'), res2 => {
			let data = [];

			if (res2.statusCode != 200) {
				notFound(res, 'not found :(');
			}

			res2.on('data', chunk => {
				data.push(chunk);
			});

			res2.on('end', () => {
				const suffix = path.at(-1).split('.').at(-1);

				if (['png', 'jpg', 'jpeg'].includes(suffix)) {
					if (suffix == 'jpg') {
						res.writeHead(200, { 'Content-Type': 'image/jpeg' });
					} else {
						res.writeHead(200, { 'Content-Type': 'image/' + suffix });
					}

					const content = Buffer.concat(data);
					res.end(content);
				} else {
					res.writeHead(200, { 'Content-Type': 'text/html' });
					const content = Buffer.concat(data).toString();
					res.end(pagify(content));
				}
			});
		}).on('error', err => {
			notFound(res, err.message);
		});
	} else {
		notFound(res);
	}
}

function pagify(markdown) {
	const options = { throwOnError: false };
	const titleMatch = markdown.match(/^# (.*)/);
	const title = (titleMatch && titleMatch.length == 2) ? titleMatch[1] : 'Markdown';
	return `<!DOCTYPE html>
<html lang="cs">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${title}</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css" integrity="sha384-vKruj+a13U8yHIkAyGgK1J3ArTLzrFGBbBc0tDp4ad/EyewESeXE/Iv67Aj8gKZ0" crossorigin="anonymous">
	<style>
	body {
		font-family: sans-serif;
		font-size: 1.1em;
		line-height: 1.5;
		max-width: 700px;
		margin: 5rem auto;
		padding: 0 1rem;
	}
	li {
		margin: 0.5rem 0;
	}
	table {
		border-collapse: collapse;
	}
	td {
		border: 1px solid #ccc;
		padding: 0.25rem 0.5rem;
	}
	</style>
</head>
<body>
${marktex.process(markdown, options)}
</body>
</html>
`;
}

function notFound(res, err = 'page not found') {
	res.writeHead(404);
	res.end(err);
}

module.exports = {
	getMarktexWebsite
}