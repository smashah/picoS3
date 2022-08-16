import { S3RequestOptions, getTextFile, CLOUD_PROVIDERS, S3UploadOptions, upload, S3GetOptions, getObject, getObjectBuffer, getObjectDataUrl, getObjectBinary, deleteObject, objectExists, getObjectMetadata, getObjectEtag, getProviderConfig } from './api';

/**
 * A simple class wrapping of the pico s3 functions.
 */
export class PicoS3 {

    options: S3RequestOptions;

    /**
     * @param {S3RequestOptions} options The authentication details of the S3 bucket.
     * 
     * You can simple set this to `true` to get the library to infer the authentication deails of the bucket from the environment variables.
     * 
     * Here are the environment variables that need to be set:
     * ```
     * provider         = process.env.PICO_S3_CLOUD_PROVIDER
     * region           = process.env.PICO_S3_REGION
     * bucket           = process.env.PICO_S3_BUCKET
     * accessKeyId      = process.env.PICO_S3_ACCESS_KEY_ID
     * secretAccessKey  = process.env.PICO_S3_SECRET_ACCESS_KEY
     * ```
     */
    constructor(options: S3RequestOptions | true) {
        if(typeof options === "boolean" && options === true) {
            this.options = {
                provider: process.env.PICO_S3_CLOUD_PROVIDER as CLOUD_PROVIDERS,
                region: process.env.PICO_S3_REGION,
                bucket: process.env.PICO_S3_BUCKET,
                host: process.env.PICO_S3_HOST,
                accessKeyId: process.env.PICO_S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.PICO_S3_SECRET_ACCESS_KEY,
            }
        } else
        this.options = options;
    }
    public async upload(options: S3UploadOptions) {
        return await upload({
            ...this.options,
            ...options
        });
    }

    public async getObject(options: S3GetOptions) {
        return await getObject({
            ...this.options,
            ...options
        });
    }

    public getProviderConfig() {
        return getProviderConfig(this.options.provider);
    }

    public getProvider(){
        return this.options.provider;
    }

    public async getObjectBuffer(options: S3GetOptions) {
        return await getObjectBuffer({
            ...this.options,
            ...options
        });
    }

    public async getObjectDataUrl(options: S3GetOptions) {
        return await getObjectDataUrl({
            ...this.options,
            ...options
        });
    }

    public async getObjectBinary(options: S3GetOptions) {
        return await getObjectBinary({
            ...this.options,
            ...options
        });
    }

    public async deleteObject(options: S3GetOptions) {
        return await deleteObject({
            ...this.options,
            ...options
        });
    }

    public async objectExists(options: S3GetOptions) {
        return await objectExists({
            ...this.options,
            ...options
        });
    }

    public async getObjectMetadata(options: S3GetOptions) {
        return await getObjectMetadata({
            ...this.options,
            ...options
        });
    }

    public async getObjectEtag(options: S3GetOptions) {
        return await getObjectEtag({
            ...this.options,
            ...options
        });
    }

    public async getTextFile(options: S3GetOptions) {
        return await getTextFile({
            ...this.options,
            ...options
        });
    }
}