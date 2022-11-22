
# Yarr



## How it works

`npm run start`

The node.js code hosts an HTTPS proxy server that:
1. Encrypts all traffic
2. Answers special requests ( /networktime , /register )
3. Forwards all other traffic to PocketBase HTTP server
4. Runs an admin bot that monitors pocketbase and makes adjustments (adding player coins, banning players, etc)
5. Watches the pb_public directory for changes, and notifies the database (and by proxy clients subscribed to that data) for hot-reload on clients
6. Provides future expansion (discord integration, etc)

`npm run db` (or `pocketbase serve`)

The pocketbase server is responsible for:
1. Serving the client (via pb_public directory)
2. Hosting the database
3. Handles authentication
4. Direct connections from clients and pub/sub

The pocketbase admin panel can be used over HTTPS using the proxy server, aka:
`https://localhost:10209/_/`, this will be forwarded to unencrypted pocketbase HTTP admin dashboard

## Important info
### `./pb.auth.json`
This file provides an admin account for the yarr server to administrate the database<br/>
If this file is not present, or does not have correct credentials, the server will not start.

Please configure your instance of pocketbase with an admin user, then create/populate pb.auth.json like so:
```json
{
    "username": "adminbot@domain.io",
    "password": "youShouldProbablyLetYourBrowserGenerateAStrongOneForYou"
}
```

`./.gitignore` is setup in this repo to not publish this file.

The username does not have to be an email. I personally don't intend on using any valid emails.
<br/><br/>

### SSL Encryption
Fact: Encryption is awesome<br/>
Opinion: Certificate authorities are horrible

Either way, the server won't start without:
- `ssl.cert.pem`
- `ssl.key.pem`

`./.gitignore` is setup in this repo to not publish these files.

Assuming you have openssl installed,
You can generate self signed SSL certificates on windows with

`./gen-ssl-keys.bat`

And if you're on linux, look up `openssl generate ssl keys`


Encryption is vital. The registration process will happen in *plain text* if you turn it off.. Please have some kind of encryption..

Thank you for attending my TEDx talk.

### Helpful articles
https://pocketbase.io/docs/
https://pocketbase.io/docs/api-rules-and-filters/
https://stackoverflow.com/questions/8165570/https-proxy-server-in-node-js

### Dependencies
- [http-proxy](https://www.npmjs.com/package/http-proxy)
- [pocketbase/js-sdk](https://www.npmjs.com/package/pocketbase)
