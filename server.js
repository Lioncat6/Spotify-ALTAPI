const http = require("http");
const axios = require("axios");
const { secret, id } = require("./config.json");

var token = "";

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
			// Use the token as needed
			console.log("Refreshed Access token:", token);
		} else {
			throw new Error("Error fetching access token:", response.statusText);
			//console.error('Error fetching access token:', response.statusText);
		}
	} catch (error){
        throw new Error("Error fetching access token:", error);
    }
	return token;
}


const server = http.createServer(async (request, response) => {
	try {
		try {
			const urlPath = request.url;

			const targetUrl = `https://api.spotify.com${urlPath}`;

			let targetResponse = await axios.get(targetUrl, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			if (response.status == 400 || response.status == 401) {
				await refreshToken();
                targetResponse = await axios.get(targetUrl, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
			}
			response.writeHead(targetResponse.status, targetResponse.headers);
			response.write(JSON.stringify(targetResponse.data));
		} catch (error) {
            if (error.response.status != 401 && error.response.status != 400){
            //console.error("Error forwarding request:", error.message);
			response.writeHead(error.response.status, error.response.headers);
			response.write(JSON.stringify(error.response.data));
            } else {
                response.writeHead(500);
			    response.write(JSON.stringify({"error":"Spotify Authentication Issue", "reason": "This was caused due to an authentication issue with spotify. This error was returned by ALT-API and NOT Spotify!", "rawError": JSON.stringify(error.response.data)}));
            }
		}
	} catch (error) {
		console.error("Error forwarding request:", error);
	}

	response.end();
});

async function startServer(){
    await refreshToken();
    const PORT = 3000;
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}

startServer()

