const https = require('https');

const API_KEY = 'mdlx-hVCG1tqofQFaCDys6NnleNuxbTeQN1282OQIaW5K4Nekb6Qk';
const MODEL_SLUG = 'google/veo-3.1-t2v';
const [provider, modelId] = MODEL_SLUG.split('/');

const body = JSON.stringify({
    prompt: 'A cinematic anime-style scene of glowing glass cards floating in a purple-blue nebula, soft starlight, elegant motion, 8 seconds, no text.',
    aspect_ratio: '16:9',
    duration: 8
});

function requestJson(path, method, bodyData) {
    return new Promise((resolve, reject) => {
        const url = new URL(`https://api.modellix.ai${path}`);
        const req = https.request(url, {
            method,
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyData || '')
            }
        }, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8');
                console.log('Status:', res.statusCode);
                console.log('Response:', text.substring(0, 2000));
                try {
                    resolve(JSON.parse(text));
                } catch {
                    resolve(text);
                }
            });
        });
        req.on('error', reject);
        if (bodyData) req.write(bodyData);
        req.end();
    });
}

(async () => {
    const path = `/api/v1/${encodeURIComponent(provider)}/${encodeURIComponent(modelId)}/async`;
    const result = await requestJson(path, 'POST', body);
    console.log('Full result:', JSON.stringify(result, null, 2));
})();
