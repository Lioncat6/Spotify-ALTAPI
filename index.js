const http = require("http");
const https = require("https");
const express = require('express');
const app = express();
const { secret, id, httpPort, httpsPort } = require("./config.json");
const fs = require('fs'); 
const axios = require("axios");

var token = "";
const serverStartTime = Date.now(); // Record server start time

const authOptions = {
	url: "https://accounts.spotify.com/api/token",
	method: "post",
	headers: {
		Authorization: "Basic " + Buffer.from(id + ":" + secret).toString("base64"),
	},
	data: "grant_type=client_credentials",
};

async function refreshToken() {
	try {
		const response = await axios(authOptions);
		if (response.status === 200) {
			token = response.data.access_token;
			console.log("Refreshed Access token:", token);
		} else {
			throw new Error("Error fetching access token:", response.statusText);
		}
	} catch (error){
        throw new Error("Error fetching access token:", error);
    }
	return token;
}

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// /ping endpoint
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// /uptime endpoint
app.get('/uptime', (req, res) => {
    const uptimeMilliseconds = Date.now() - serverStartTime;
    const uptimeSeconds = Math.floor(uptimeMilliseconds / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    
    const uptimeData = {
        human_readable: `${hours}h ${minutes}m ${seconds}s`,
        milliseconds: uptimeMilliseconds,
        seconds: uptimeSeconds,
        minutes: uptimeSeconds / 60,
        hours: uptimeSeconds / 3600,
        days: uptimeSeconds / 86400
    };
    
    res.status(200).json(uptimeData);
});

app.get('*', async (request, response) => {    
    let startTime = Date.now();    
    try {        
        const urlPath = request.url;        
        const targetUrl = `https://api.spotify.com${urlPath}`;        
        let targetResponse = await axios.get(targetUrl, {            
            headers: {                
                Authorization: `Bearer ${token}`,            
            },        
        });        
        if (targetResponse.status === 400 || targetResponse.status === 401) {            
            await refreshToken();            
            targetResponse = await axios.get(targetUrl, {                
                headers: {                    
                    Authorization: `Bearer ${token}`,                
                },            
            });        
        }        
        const ipAddress = request.headers['x-forwarded-for'] || request.connection.remoteAddress;        
        console.log(`Served Request ${(new Date(Date.now()).toLocaleString())} (${Date.now()-startTime}ms) from IP: ${ipAddress}`);        
        response.writeHead(targetResponse.status, targetResponse.headers);        
        response.write(JSON.stringify(targetResponse.data));    
    } catch (error) {        
        if (error.response && (error.response.status !== 401 && error.response.status !== 400)) {            
            response.writeHead(error.response.status, error.response.headers);            
            response.write(JSON.stringify(error.response.data));        
        } else if (error.response && error.response.status === 401) {            
            await refreshToken();            
            try {                
                const targetUrl = `https://api.spotify.com${request.url}`;                
                const targetResponse = await axios.get(targetUrl, {                    
                    headers: {                        
                        Authorization: `Bearer ${token}`,                    
                    },                
                });                
                response.writeHead(targetResponse.status, targetResponse.headers);                
                response.write(JSON.stringify(targetResponse.data));            
            } catch (retryError) {                
                response.writeHead(retryError.response.status, retryError.response.headers);                
                response.write(JSON.stringify(retryError.response.data));            
            }        
        } else {            
            response.writeHead(500);            
            response.write(JSON.stringify({                
                "error": "Spotify Authentication Issue",                
                "reason": "This was caused due to an authentication issue with Spotify. This error was returned by ALT-API and NOT Spotify!",                
                "rawError": JSON.stringify(error.response ? error.response.data : error.message)            
            }));            
            console.error(error.response ? error.response.data : error.message)        
        }    
    }    
    response.end();
});

async function startServer(){
    await refreshToken();
	const options = {
		key: fs.readFileSync('domain.key'),
        cert: fs.readFileSync('domain.crt'),
        ca: [
            fs.readFileSync('ca_bundle.crt')
        ]
	};
	https.createServer(options, app).listen(httpsPort, () => {
		console.log(`Server is running at port ${httpsPort} (HTTPS)`);
	});
}

startServer();