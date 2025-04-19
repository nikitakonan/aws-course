import {config} from 'dotenv';
import express from 'express';
import https from 'node:https';
import http from 'node:http';

config();
const app = express();

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({extended: true}));


// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({status: 'OK'});
});

const serviceMap = {
    'product': process.env.PRODUCT_SERVICE_URL,
    'cart': process.env.CART_SERVICE_URL,
    'order': process.env.ORDER_SERVICE_URL,
    'import': process.env.IMPORT_SERVICE_URL,
}

app.all('/:recipientServiceName{/*splat}', async (req, res) => {
    const {recipientServiceName} = req.params;
    const originalUrl = req.originalUrl.replace(`/${recipientServiceName}`, '');
    const recipientURL = serviceMap[recipientServiceName];

    if (!recipientURL) {
        return res.status(502).json({error: 'Cannot process request'});
    }

    try {
        const url = new URL(recipientURL + originalUrl);

        if (/https/.test(url.protocol)) {
            const options = {
                hostname: url.hostname,
                port: 443,
                protocol: url.protocol,
                path: url.pathname,
                method: req.method,
                headers: req.headers, // Results => Error: write EPROTO 4088A80002000000:error:0A000410:SSL routines:ssl3_read_bytes:sslv3 alert handshake failure:../deps/openssl/openssl/ssl/record/rec_layer_s3.c:1605:SSL alert number 40
            }
            console.log(options, url.toString());
            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data = data + chunk.toString();
                });

                response.on('end', () => {
                    const body = JSON.parse(data);
                    res.status(response.statusCode).json(body);
                });
            });

            request.on('error', (error) => {
                console.error(error);
                res.status(500).json({error: 'Remote Server Error'});
            })

            request.end();
        } else {
            const options = {
                hostname: url.hostname,
                port: 80,
                protocol: url.protocol,
                path: url.pathname,
                method: req.method,
                headers: req.headers,
            }
            console.log(options, url.toString());
            const request = http.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data = data + chunk.toString();
                });

                response.on('end', () => {
                    const body = JSON.parse(data);
                    res.status(response.statusCode).json(body);
                });
            });

            request.on('error', (error) => {
                console.error(error);
                res.status(500).json({error: 'Remote Server Error'});
            })

            request.end();
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
})

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
