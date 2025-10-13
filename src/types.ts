import { CLOUD_PROVIDERS } from "./providers"

/**
 *
 * Data URLs, URLs prefixed with the data: scheme, allow content creators to embed small files inline in documents. They were formerly known as "data URIs" until that name was retired by the WHATWG.
 *
 *
 * Data URLs are composed of four parts: a prefix (data:), a MIME type indicating the type of data, an optional base64 token if non-textual, and the data itself:
 *
 * Example:
 * `"data:[<mediatype>][;base64],<data>"`
 *
 * Learn more here: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
 */
export type DataURL = string;

export type S3RequestOptions = {
    provider: CLOUD_PROVIDERS,
    accessKeyId: string,
    secretAccessKey: string,
    region?: string,
    bucket: string,
    headers?: {
        [k: string]: string
    }
    /**
     * Only relevant for MinIO
     */
    host?: string,
}

export type S3UploadOptions = {
    filename: string,
    directory?: string,
    public?: boolean
} & S3RequestOptions

export type S3UploadDataUrlOptions = {
    file: string,
} & S3UploadOptions

export type S3UploadBufferOptions = {
    file: Buffer,
} & S3UploadOptions


export type S3GetOptions = {
    filename: string,
    directory?: string
} & S3RequestOptions

export type S3PresignedUploadOptions = {
    filename: string,
    directory?: string,
    /**
     * Expiration time in seconds. Defaults to 3600 (1 hour)
     */
    expiresIn?: number,
    /**
     * Content-Type header for the upload
     */
    contentType?: string,
} & S3RequestOptions

export type SERVICE_PROVIDER_CONFIG = {
    host: (x: S3RequestOptions) => string,
    url: (x: S3GetOptions | S3RequestOptions) => string,
    res: (x: S3GetOptions | S3RequestOptions) => string,
    // The key (aka direcory+filename+fileextension)
    key?: (x: S3GetOptions | S3RequestOptions) => string,
}
