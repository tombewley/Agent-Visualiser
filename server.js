const express = require('express'),
app = express(),
port = 8080;

// Express Middleware for serving static files
app.use(express.static('public'));

// Middleware for parsing requests.
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.get('/', function(req, res) {
    res.redirect('index.html');
});

app.listen(port);

// Log that the servers running
console.log("Server running on port: " + port);

const opn = require('opn');
opn('http://localhost:8080');

// Child process for Python script
// From https://stackoverflow.com/a/48748103
const { spawn } = require('child_process')

app.post("/python_child_process", function(request, response) {
    console.log("Hello")
    const scriptPath = 'python/test.py'
    const python = spawn('python3', [scriptPath, request.body.filename])
    python.stdout.on('data', (data) => {
        console.log(JSON.parse(data.toString()));
        response.json(JSON.parse(data));
    })
    python.on('exit', (code) => {
        console.log(`Python exited with code ${code}`);
    })
})