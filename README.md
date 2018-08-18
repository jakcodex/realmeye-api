# Jakcodex / Realmeye API

NodeJS library for parsing Realmeye data for various endpoints.

Can be used as a library in NodeJS or ran as a REST API web app.

## Requirements

1. NodeJS
1. NPM
1. Yarn (optional but nice)

## Current Features

1. Player summary and character lookup
1. Top characters by class
1. Recent deaths with all options

## Development

This is a work in progress and will likely contain bugs. Please report any that you find.

## Installation

1. Extract package contents.
1. Install dependencies with npm.
   ```
   npm install
   ```

## Using RealmEye-API

### Node Module

```js
const reapi = require('./vendor/reapi.js');
reapi.get.player('MyIGN', function(result) {
    console.log(result);
});
```

### REST API

1. By default the web server runs on port 3000.
1. You can change this to 80 if desired to serve requests directly.
1. For added security you can run Apache w/ rewrite rules and ProxyPass over top.
1. Start the web server with:
   ```
   npm start
   //  or
   node server.js
   ```
1. See package.json if you need to change the path to node.exe.
1. Make requests to the API.
   ```
   curl http://localhost:3000/api/player/MyIGN
   ```

#### API Reference - Available Endpoints

##### GET /api/player/:username
Returns an object containing found player data for the specified user if any.

##### GET /api/class/:class[/:page]
Returns an object containing the top players from the specified class. If a page number is provided it will be displayed instead of page 1.

##### GET /api/recentdeaths[/:page]
Returns an object containing the most recent deaths in the game. If a page number is provided it will be displayed instead of page 1.

##### POST /api/recentdeaths
Same as GET but accepts the following POST parameters:

1. `bf` - Base Fame (valid: 0, 20, 150, 400, 800, 2000)
1. `ms` - Maxed Stats (valid: 0, 1, 2, 3, 4, 5, 6, 7, 8)
1. `page` - Specify a page number
1. `noPrivate` - Do not include private characters

## Jakcodex / Realmeye API License

Copyright 2018 [Jakcodex](https://github.com/jakcodex)

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
