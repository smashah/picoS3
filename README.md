# Pico S3

[![npm version](https://badge.fury.io/js/pico-s3.svg)](https://badge.fury.io/js/pico-s3)

A super lightweight S3 client that doesn't require the AWS SDK. Perfect for simple S3 operations without the overhead of the full AWS SDK. Be sure to 🌟 this repository for updates!

## Features

- 🪶 **Lightweight** - No AWS SDK dependency
- 🚀 **Simple API** - Easy to use, minimal configuration
- 🔐 **Presigned URLs** - Generate presigned URLs for uploads and downloads
- 🌐 **Multi-provider** - Support for AWS, MinIO, Wasabi, DigitalOcean, GCP, Contabo, Cloudflare R2, and Supabase
- 📦 **TypeScript** - Full TypeScript support with type definitions
- 🔧 **Flexible** - Upload from Data URLs, Buffers, or files

## Installation

```bash
npm i pico-s3
```

## Quick Start

```javascript
const { PicoS3 } = require('pico-s3');

const p3 = new PicoS3({
    provider: 'AWS', // or 'MINIO', 'WASABI', 'DO', 'GCP', 'CONTABO', 'R2', 'SUPABASE'
    region: 'us-east-1',
    bucket: 'my-bucket',
    accessKeyId: 'YOUR_ACCESS_KEY_ID',
    secretAccessKey: 'YOUR_SECRET_ACCESS_KEY'
});

// Upload a file
const url = await p3.upload({
    file: dataUrl, // Data URL or Buffer
    filename: "my-file.jpg"
});

console.log('File uploaded:', url);
```

## Configuration

### Basic Configuration

```javascript
const p3 = new PicoS3({
    provider: 'AWS',              // Required: Cloud provider
    region: 'us-east-1',          // Required for most providers
    bucket: 'my-bucket',          // Required: Bucket name
    accessKeyId: 'YOUR_KEY',      // Required: Access key
    secretAccessKey: 'YOUR_SECRET' // Required: Secret key
});
```

### MinIO Configuration

For MinIO or self-hosted S3-compatible services, include the `host` parameter:

```javascript
const p3 = new PicoS3({
    provider: 'MINIO',
    bucket: 'my-bucket',
    host: 'http://192.168.1.100:9000', // MinIO host (IP or domain)
    accessKeyId: 'YOUR_KEY',
    secretAccessKey: 'YOUR_SECRET'
});
```

### Environment Variables

You can also initialize with environment variables:

```javascript
const p3 = new PicoS3(true);
```

Set these environment variables:
```bash
PICO_S3_CLOUD_PROVIDER=MINIO
PICO_S3_REGION=us-east-1
PICO_S3_BUCKET=my-bucket
PICO_S3_HOST=http://192.168.1.100:9000
PICO_S3_ACCESS_KEY_ID=YOUR_KEY
PICO_S3_SECRET_ACCESS_KEY=YOUR_SECRET
```

## API Reference

### Upload Methods

#### `upload(options)`

Upload a file from a Data URL or Buffer.

```javascript
// Upload from Data URL
const url = await p3.upload({
    file: 'data:image/jpeg;base64,...',
    filename: 'photo.jpg',
    directory: '/photos', // Optional
    public: true          // Optional: Make file publicly accessible
});

// Upload from Buffer
const buffer = fs.readFileSync('file.pdf');
const url = await p3.upload({
    file: buffer,
    filename: 'document.pdf',
    directory: '/documents'
});
```

### Download Methods

#### `getObject(options)`

Get the full Axios response object.

```javascript
const response = await p3.getObject({
    filename: 'photo.jpg',
    directory: '/photos'
});
```

#### `getObjectBuffer(options)`

Download a file as a Buffer.

```javascript
const buffer = await p3.getObjectBuffer({
    filename: 'photo.jpg',
    directory: '/photos'
});
```

#### `getObjectDataUrl(options)`

Download a file as a Data URL.

```javascript
const dataUrl = await p3.getObjectDataUrl({
    filename: 'photo.jpg',
    directory: '/photos'
});
```

#### `getTextFile(options)`

Download a text file as a string.

```javascript
const text = await p3.getTextFile({
    filename: 'data.json',
    directory: '/config'
});
```

### Presigned URL Methods

#### `getPresignedUrl(options)`

Generate a presigned URL for downloading a file.

```javascript
const downloadUrl = await p3.getPresignedUrl({
    filename: 'photo.jpg',
    directory: '/photos'
});

// Share this URL - it's valid for 24 hours by default
console.log('Download URL:', downloadUrl);
```

#### `getPresignedUploadUrl(options)`

Generate a presigned URL for uploading a file directly from the browser or client.

```javascript
const uploadUrl = await p3.getPresignedUploadUrl({
    filename: 'document.pdf',
    directory: '/uploads',
    expiresIn: 3600,              // Optional: Expiration in seconds (default: 3600)
    contentType: 'application/pdf' // Optional: Content-Type for the upload
});

// Use this URL for direct uploads from browser
// Example with fetch:
const file = document.getElementById('fileInput').files[0];
await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
        'Content-Type': 'application/pdf'
    }
});
```

**Client-side upload example:**

```javascript
// Server-side: Generate presigned URL
app.post('/api/get-upload-url', async (req, res) => {
    const uploadUrl = await p3.getPresignedUploadUrl({
        filename: req.body.filename,
        directory: '/uploads',
        expiresIn: 3600,
        contentType: req.body.contentType
    });
    res.json({ uploadUrl });
});

// Client-side: Upload directly to S3/MinIO
const response = await fetch('/api/get-upload-url', {
    method: 'POST',
    body: JSON.stringify({
        filename: 'my-file.pdf',
        contentType: 'application/pdf'
    })
});

const { uploadUrl } = await response.json();

// Upload file directly to S3/MinIO
await fetch(uploadUrl, {
    method: 'PUT',
    body: fileBlob,
    headers: {
        'Content-Type': 'application/pdf'
    }
});
```

### File Management Methods

#### `deleteObject(options)`

Delete a file.

```javascript
const deleted = await p3.deleteObject({
    filename: 'old-file.jpg',
    directory: '/photos'
});
// Returns: true if successful
```

#### `objectExists(options)`

Check if a file exists.

```javascript
const exists = await p3.objectExists({
    filename: 'photo.jpg',
    directory: '/photos'
});
// Returns: true or false
```

#### `getObjectMetadata(options)`

Get file metadata (headers).

```javascript
const metadata = await p3.getObjectMetadata({
    filename: 'photo.jpg',
    directory: '/photos'
});
// Returns: { 'content-type': 'image/jpeg', 'content-length': '12345', ... }
```

#### `getObjectEtag(options)`

Get the ETag of a file.

```javascript
const etag = await p3.getObjectEtag({
    filename: 'photo.jpg',
    directory: '/photos'
});
// Returns: "abc123def456..."
```

### Utility Methods

#### `getProvider()`

Get the current provider name.

```javascript
const provider = p3.getProvider();
// Returns: 'MINIO', 'AWS', etc.
```

#### `getProviderConfig()`

Get the provider configuration object.

```javascript
const config = p3.getProviderConfig();
// Returns: { host: Function, url: Function, res: Function, ... }
```

## Supported Providers

| Provider | Code | Notes |
|----------|------|-------|
| AWS S3 | `AWS` | Amazon Web Services S3 |
| MinIO | `MINIO` | Requires `host` parameter |
| Wasabi | `WASABI` | S3-compatible cloud storage |
| DigitalOcean Spaces | `DO` | DigitalOcean's object storage |
| Google Cloud Storage | `GCP` | Google Cloud Platform |
| Contabo | `CONTABO` | Contabo object storage |
| Cloudflare R2 | `R2` or `R2_ALT` | Two configuration styles supported |
| Supabase | `SUPABASE` | Requires `host` parameter |

## Error Handling

```javascript
const { FileNotFoundError } = require('pico-s3');

try {
    const file = await p3.getObject({
        filename: 'non-existent.jpg'
    });
} catch (error) {
    if (error instanceof FileNotFoundError) {
        console.log('File not found');
    } else {
        console.error('Other error:', error.message);
    }
}
```

## Advanced Usage

### Custom Headers

```javascript
const url = await p3.upload({
    file: buffer,
    filename: 'file.pdf',
    headers: {
        'Cache-Control': 'max-age=3600',
        'x-amz-meta-custom': 'value'
    }
});
```

### Directory Structure

```javascript
// Upload to nested directories
await p3.upload({
    file: buffer,
    filename: 'report.pdf',
    directory: '/2024/january/reports'
});

// Directory slashes are normalized automatically
// These are equivalent:
directory: '/photos/'
directory: '/photos'
directory: 'photos/'
directory: 'photos'
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import { PicoS3, CLOUD_PROVIDERS, S3RequestOptions } from 'pico-s3';

const options: S3RequestOptions = {
    provider: CLOUD_PROVIDERS.MINIO,
    bucket: 'my-bucket',
    host: 'http://localhost:9000',
    accessKeyId: 'key',
    secretAccessKey: 'secret'
};

const p3 = new PicoS3(options);
```

## Debug Logging

Enable debug logging:

```bash
DEBUG=pico-s3 node your-script.js
```

For error logging only:

```bash
DEBUG=pico-s3:error node your-script.js
```

## License

MIT

## Contributing

Issues and pull requests are welcome! Please submit them at [https://github.com/smashah/picoS3/issues](https://github.com/smashah/picoS3/issues)
