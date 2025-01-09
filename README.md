# Spotify-ALTAPI
So you take the spotify api and you remove the requirement to use an auth token and then you get the Spotify alternate API

Literally just forwards api calls but appends it's own API token for public facing applications

Docs:
https://developer.spotify.com/documentation/web-api

Just Replace `api.spotify.com` with whatever url this is hosted on and don't worry about providing an authorization header

config.json Template:

```
{
    "secret": "<Client Secret>",
    "id": "<Client ID>",
    "port": <server port>,
    "useHttps": <true or false>
}
```
