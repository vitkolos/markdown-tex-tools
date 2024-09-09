function redirect(res, location, code = 302) {
    res.writeHead(302, {
        'Location': location
    });
    res.end();
}

module.exports = {
    redirect
};
