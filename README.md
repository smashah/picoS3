
# Pico S3

[![npm version](https://badge.fury.io/js/pico-s3.svg)](https://badge.fury.io/js/pico-s3)

A super lightweight S3 client that doesn't require the aws sdk. Be sure to 🌟 this repository for updates!

## Installation

```bash
> npm i pico-s3
```

## Example

```javascript
const p3 = new PicoS3({
    provider: process.env.PICO_S3_CLOUD_PROVIDER,
    region: process.env.PICO_S3_REGION,
    bucket: process.env.PICO_S3_BUCKET,
    accessKeyId: process.env.PICO_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.PICO_S3_SECRET_ACCESS_KEY,
    // With MiniIO, an API host must also be added. For example
    //host: "http://127.0.0.1:9000"
});

const URL = await p3.upload({
    file: dataUrl,
    filename: "cool new file"
})
```
