const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

const server = http.createServer((request, response) => {
	const requestedPath = new URL(request.url, 'http://localhost').pathname;
	const requested = requestedPath === '/' ? '/index.html' : requestedPath;
	const filePath = path.normalize(path.join(root, requested));
	if (!filePath.startsWith(root)) { response.writeHead(403); response.end('Forbidden'); return; }
	fs.readFile(filePath, (error, content) => {
		if (error) { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Halaman tidak ditemukan'); return; }
		response.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
		response.end(content);
	});
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Padel Club dashboard running at http://localhost:${port}`));
