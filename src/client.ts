import { AxiosRequestConfig, default as axios } from 'axios'
import aws4 from 'aws4';
import { AxiosResponse } from 'axios';
const db = require('debug')('pico-s3')
const err = require('debug')('pico-s3:error')

export class FileNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "FileNotFoundError";
    }
}

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

export enum CLOUD_PROVIDERS {
    GCP = "GCP",
    WASABI = "WASABI",
    AWS = "AWS"
}

export type S3RequestOptions = {
    provider: CLOUD_PROVIDERS,
    accessKeyId: string,
    secretAccessKey: string,
    region?: string,
    bucket: string
}

export type S3UploadOptions = {
    file: string,
    filename: string,
    directory?: string
} & S3RequestOptions


export type S3GetOptions = {
    filename: string,
    directory?: string
} & S3RequestOptions

export const resolvePath = (options: S3GetOptions | S3UploadOptions | {
    filename: string,
    directory?: string
}) => {
    //remove leading and trailing slash from options.directory
    const directory = options.directory ? options.directory.replace(/^\/|\/$/g, "") : "";
    return options.directory ? `${directory}/${options.filename}` : `${options.filename}`
}

/**
 * Please submit a new issue if you need another s3 compatible provider.
 */
 const PROVIDERS = {
    "GCP": {
        host: ({ bucket }: any) => `${bucket}.storage.googleapis.com`,
        url: ({ bucket, filename, directory }: any) => `https://${bucket}.storage.googleapis.com/${resolvePath({filename, directory})}`,
        res: ({ bucket, filename, directory }: any) => `https://storage.cloud.google.com/${bucket}/${resolvePath({filename, directory})}`
    },
    "AWS": {
        host: ({ bucket }: any) => `${bucket}.s3.amazonaws.com`,
        url: ({ bucket, filename, directory }: any) => `https://${bucket}.s3.amazonaws.com/${resolvePath({filename, directory})}`,
        res: ({ bucket, filename, directory, region }: any) => `https://${bucket}.s3.${region}.amazonaws.com/${resolvePath({filename, directory})}`
    },
    "WASABI": {
        host: ({ region, bucket }: any) => `${bucket}.s3.${region}.wasabisys.com`,
        url: ({ region, filename, directory, bucket }: any) => `https://${bucket}.s3.${region}.wasabisys.com/${resolvePath({filename, directory})}`,
        res: ({ bucket, filename, directory, region }: any) => `https://s3.${region}.wasabisys.com/${bucket}/${resolvePath({filename, directory})}`
    }
}


export const getCloudUrl: (options: S3RequestOptions) => string = (options: S3RequestOptions) => PROVIDERS[options.provider].res(options);


export const s3Request = (options: S3RequestOptions, extendedRequestOptions?: {
    method: "GET" | "PUT" | "POST" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH" | "TRACE"
    [k: string]: any
}) => {
    const { provider, accessKeyId, secretAccessKey } = options;
    const region = provider === CLOUD_PROVIDERS.GCP ? 'region' : options.region;
    const _ = PROVIDERS[provider];
    if (!_) throw new Error(`Invalid provider ${provider}. Valid providers: ${Object.keys(PROVIDERS)}`);
    const headers = {
        ...extendedRequestOptions?.headers || {},
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD'
    }
    delete extendedRequestOptions?.headers;
    return axios(aws4.sign({
        host: _.host(options),
        url: _.url(options),
        service: 's3',
        region,
        headers,
        ...extendedRequestOptions
    },
        {
            accessKeyId,
            secretAccessKey
        }))
}


export const upload: (options: S3UploadOptions) => Promise<string> = async (options: S3UploadOptions) => {
    const { provider, file } = options;
    const _ = PROVIDERS[provider];
    if (!file || file === null) throw new Error("File isnull or undefined")
    const path = `/${resolvePath(options)}`
    try {
        const START = Date.now();
        db(`Uploading ${path} to ${provider}`);
        await s3Request(options, {
            method: 'PUT',
            path,
            data: Buffer.from(file.split(',')[1] as string, 'base64'),
            headers: {
                'Content-Type': (file.match(/[^:\s*]\w+\/[\w-+\d.]+(?=[;| ])/) || ["application/octet-stream"])[0],
            },
        });
        const END = Date.now() - START;
        db(`${path} uploaded  to ${provider} in ${END}ms`);
        return _.res(options) || "";
    } catch (error) {
        err("UPLOAD ERROR", path, provider, error.message);
        throw error;
    }
};

export const getObjectBinary: (options: S3GetOptions) => Promise<any> = async (options: S3GetOptions) => {
    const res = await getObject(options, {
        responseType: 'arraybuffer'
    });
    return res.data
}

export const getObjectBuffer: (options: S3GetOptions) => Promise<Buffer> = async (options: S3GetOptions) => {
    const bin = await getObjectBinary(options)
    return Buffer.from(bin, 'binary');
}

export const getObjectDataUrl: (options: S3GetOptions) => Promise<string> = async (options: S3GetOptions) => {
    const res = await getObject(options, {
        responseType: 'arraybuffer'
    });
    const buff = Buffer.from(res.data, 'binary');
    const dUrl: DataURL = `data:${res.headers['content-type']};base64,${buff.toString('base64')}`;
    return dUrl;
}


export const getObject: (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => Promise<AxiosResponse> = async (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => {
    const { provider } = options;
    const path = `/${resolvePath(options)}`
    try {
        const START = Date.now();
        db(`Downloading ${path} from ${provider}`);
        const res = await s3Request(options, {
            method: 'GET',
            path,
            ...(axiosOverride as any || {})
        });
        const END = Date.now() - START;
        db(`${path} downloaded from ${provider} in ${END}ms`);
        return res;
    } catch (error) {
        err("GET ERROR", path, provider, error.message);
        if (error?.response.status === 404) throw new FileNotFoundError(`File ${path} not found in ${provider}`);
        else throw error;
    }
}

export const deleteObject: (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => Promise<boolean> = async (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => {
    const { provider } = options;
    const path = `/${resolvePath(options)}`
    try {
        const START = Date.now();
        db(`Deleting ${path} from ${provider}`);
        const res = await s3Request(options, {
            method: 'DELETE',
            path,
            ...(axiosOverride as any || {})
        });
        const END = Date.now() - START;
        db(`${path} deleted from ${provider} in ${END}ms`);
        return res.status === 204;
    } catch (error) {
        err("GET ERROR", path, provider, error.message);
        if (error?.response.status === 404) throw new FileNotFoundError(`File ${path} not found in ${provider}`);
        else throw error;
    }
}


export const getObjectMetadata: (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => Promise<{
    [k: string]: string
}> = async (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => {
    const { provider } = options;
    const path = `/${resolvePath(options)}`
    try {
        const START = Date.now();
        db(`Getting Metadata for ${path} from ${provider}`);
        const res = await s3Request(options, {
            method: 'HEAD',
            path,
            ...(axiosOverride as any || {})
        });
        const END = Date.now() - START;
        db(`${path} metadata downloaded from ${provider} in ${END}ms`);
        return res.headers;
    } catch (error) {
        err("GET ERROR", path, provider, error.message);
        if (error?.response.status === 404) throw new FileNotFoundError(`File ${path} not found in ${provider}`);
        else throw error;
    }
}

export const objectExists: (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => Promise<boolean> = async (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => getObjectMetadata(options, axiosOverride).then(res => !!res.etag);

export const getObjectEtag: (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => Promise<string> = async (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => getObjectMetadata(options, axiosOverride).then(res => res.etag);
