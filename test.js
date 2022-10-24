require('dotenv').config()
const test = require('ava');
const { FileNotFoundError, CLOUD_PROVIDERS, resolvePath, PicoS3} = require("./dist");
const file = "data:image/jpeg;base64,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"
const filename = `${Date.now()}.jpg`

const s3RequestOptions = {
    provider: process.env.PICO_S3_CLOUD_PROVIDER,
    region: process.env.PICO_S3_REGION,
    bucket: process.env.PICO_S3_BUCKET,
    accessKeyId: process.env.PICO_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.PICO_S3_SECRET_ACCESS_KEY,
    host: process.env.PICO_S3_HOST,
}

const options = {
    ...s3RequestOptions,
    filename,
    directory: "/TESTFILES/new/"
}

const p3 = new PicoS3(s3RequestOptions);

test.serial('Upload a DataURL, check if it uploaded correctly', async t => {
        const link = await p3.upload({
            ...options,
            file,
            public: true
        })
	    t.is(link,  p3.getProviderConfig().res(options));
});

test.serial('Get the uploaded file', async t => {
    const downloadedDataURL = await p3.getObjectDataUrl(options)
	t.is(downloadedDataURL , file);
})

test.serial(`Get the file's metadata`, async t => {
    const objectMetadata = await p3.getObjectMetadata(options)
	t.is(typeof objectMetadata , 'object');
})

test.serial(`The file exists`, async t => {
    const exists = await p3.objectExists(options)
	t.is(exists , true);
})

test.serial(`Get the file etag`, async t => {
    const etag = await p3.getObjectEtag(options)
	t.is(typeof etag , 'string');
})

test.serial(`Delete the file`, async t => {
    const fileDeleted = await p3.deleteObject(options)
	t.is(fileDeleted , true);
})

test.serial('Make sure non existent file throws FileNotFoundError', async t => {
	const error = await t.throwsAsync(async () => {
        return await p3.getObjectDataUrl(options)
	}, {instanceOf: FileNotFoundError});
	t.is(error.message, `File /${resolvePath(options)} not found in ${p3.getProvider()}`);
});


test('Upload a Text File, check if it uploaded correctly', async t => {
    const link = await p3.upload({
        ...options,
        filename: 'text.data.json',
        file: `data:text/plain;base64,${Buffer.from('SGVsbG8sIFdvcmxkIQ==').toString('base64')}`,
        public: true
    })
	t.is(link, p3.getProviderConfig().res({
        ...options,
        filename: 'text.data.json'
    }));
});