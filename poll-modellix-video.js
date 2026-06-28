const https = require('https');
const fs = require('fs');

const API_KEY = 'mdlx-hVCG1tqofQFaCDys6NnleNuxbTeQN1282OQIaW5K4Nekb6Qk';
const TASK_ID = 'db26a2a3-c127-4b39-8684-96eec49330e9';
const OUTPUT_PATH = '/workspace/images/generated/nebula-trailer.mp4';

function requestJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        }, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8');
                try { resolve(JSON.parse(text)); }
                catch { resolve(text); }
            });
        });
        req.on('error', reject);
    });
}

function downloadFile(url, path) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(path);
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(downloadFile(res.headers.location, path));
            }
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(path);
            });
        }).on('error', reject);
    });
}

async function poll() {
    const url = `https://api.modellix.ai/api/v1/tasks/${TASK_ID}`;
    let attempts = 0;
    while (true) {
        attempts++;
        console.log(`[${new Date().toLocaleTimeString()}] Polling attempt ${attempts}...`);
        const result = await requestJson(url);
        console.log(JSON.stringify(result, null, 2).substring(0, 2000));

        const status = result?.data?.status || result?.status;
        if (status === 'completed' || status === 'success') {
            const videoUrl = result?.data?.result?.video_url || result?.data?.video_url || result?.data?.output?.video_url;
            if (videoUrl) {
                console.log('Video ready, downloading...', videoUrl);
                await downloadFile(videoUrl, OUTPUT_PATH);
                console.log('Saved to', OUTPUT_PATH);
                process.exit(0);
            } else {
                console.log('Task completed but no video URL found');
                process.exit(1);
            }
        }
        if (status === 'failed' || status === 'error') {
            console.error('Task failed:', result);
            process.exit(1);
        }

        await new Promise(r => setTimeout(r, 15000));
    }
}

poll().catch(err => {
    console.error(err);
    process.exit(1);
});
