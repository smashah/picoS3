import { AxiosRequestConfig, default as axios } from 'axios'
import aws4 from 'aws4';
import { AxiosResponse } from 'axios';
const db = require('debug')('pico-s3')
const err = require('debug')('pico-s3:error')
import crypto from 'crypto';
import { import_ } from '@brillout/import'

let _ft = null;

const ft = async () =>{
  if(!_ft) {
    const x = await import_('file-type');
    _ft = x
  }
  return _ft;
}

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
    AWS = "AWS",
    CONTABO = "CONTABO",
    DO = "DO",
    MINIO = "MINIO"
}

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

export const resolvePath = (options: S3GetOptions | S3UploadOptions | {
    filename: string,
    directory?: string
}) => {
    //remove leading and trailing slash from options.directory
    const directory = options.directory ? options.directory.replace(/^\/|\/$/g, "") : "";
    return options.directory ? `${directory}/${options.filename}` : `${options.filename}`
}

export type SERVICE_PROVIDER_CONFIG = {
    host: (x: S3RequestOptions) => string,
    url: (x: S3GetOptions | S3RequestOptions) => string,
    res: (x: S3GetOptions | S3RequestOptions) => string,
}

/**
 * Please submit a new issue if you need another s3 compatible provider.
 */
 const PROVIDERS : {
    [provierName: string]: SERVICE_PROVIDER_CONFIG
 } = {
    "GCP": {
        host: ({ bucket }: any) => `${bucket}.storage.googleapis.com`,
        url: ({ bucket, filename, directory }: any) => `https://${bucket}.storage.googleapis.com/${resolvePath({filename, directory})}`,
        res: ({ bucket, filename, directory }: any) => `https://storage.googleapis.com/${bucket}/${resolvePath({filename, directory})}`
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
    },
    "DO": {
        host: ({ region, bucket }: any) => `${bucket}.${region}.digitaloceanspaces.com`,
        url: ({ bucket, filename, directory, region }: any) => `https://${bucket}.${region}.digitaloceanspaces.com/${resolvePath({filename, directory: `${directory}`})}`,
        res: ({ bucket, filename, directory, region }: any) => `https://${bucket}.${region}.digitaloceanspaces.com/${resolvePath({filename, directory: `${directory}`})}`
    },
    "CONTABO": {
        host: ({ region }: any) => `${region}.contabostorage.com`,
        url: ({ bucket, filename, directory, region }: any) => `https://${region}.contabostorage.com/${resolvePath({filename, directory: `${bucket}${directory}`})}`,
        res: ({ bucket, filename, directory, region }: any) => `https://${region}.contabostorage.com/${resolvePath({filename, directory: `${bucket}${directory}`})}`
    },
    "MINIO": {
        host: ({ host }: any) => `${host}`,
        url: ({ bucket, filename, directory, host }: any) => `${host}/${bucket}/${resolvePath({filename, directory: `${directory}`})}`,
        res: ({ bucket, filename, directory, host }: any) => `${host}/${bucket}/${resolvePath({filename, directory: `${directory}`})}`
    }
}


export const getCloudUrl: (options: S3RequestOptions) => string = (options: S3RequestOptions) => PROVIDERS[options.provider].res(options);

export const getProviderConfig: (provider : CLOUD_PROVIDERS) => SERVICE_PROVIDER_CONFIG = (provider) => PROVIDERS[provider]

export const s3Request = (options: S3RequestOptions, extendedRequestOptions?: {
    method: "GET" | "PUT" | "POST" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH" | "TRACE"
    [k: string]: any
}) => {
    const { provider, accessKeyId, secretAccessKey } = options;
    const region = provider === CLOUD_PROVIDERS.GCP ? 'region' : options.region;
    const _ = PROVIDERS[provider];
    const _host = _.host(options)
    const host = _host.replace("https://", "").replace("http://", "");
    if (!_) throw new Error(`Invalid provider ${provider}. Valid providers: ${Object.keys(PROVIDERS)}`);
    const headers = {
        ...extendedRequestOptions?.headers || {}
    }
    if(_host.includes("https://") && !headers['x-amz-content-sha256'] ) {
        headers['x-amz-content-sha256'] = 'UNSIGNED-PAYLOAD'
    }
    delete extendedRequestOptions?.headers;
    const toSign = {
        host,
        url: _.url(options),
        service: 's3',
        region,
        headers,
        ...extendedRequestOptions,
    }
    if(provider === CLOUD_PROVIDERS.MINIO) toSign['path'] = _.url(options).replace(_host, "")
    return axios(aws4.sign(toSign,
        {
            accessKeyId,
            secretAccessKey
        }))
}

export const uploadBuffer: (options: S3UploadBufferOptions) => Promise<string> = async (options: S3UploadBufferOptions) => {
    const { provider, file } = options;
    const _ = PROVIDERS[provider];
    if (!file || file === null) throw new Error("File isnull or undefined")
    const path = `/${resolvePath(options)}`
    const _ftResult = await (await ft()).fileTypeFromBuffer(file);
    const { mime } = _ftResult || {}
    const filebuf = file;
    /**
     * Infer data type from filename
     */
    const headers = {
        'Content-Type': mime || "application/octet-stream",
        'x-amz-content-sha256' : crypto.createHash('sha256').update(filebuf).digest('hex') || 'UNSIGNED-PAYLOAD',
        ...(options.headers || {}),
        ...(options.public ? {
            'x-amz-acl': 'public-read'
        } : {})
    }
    try {
        const START = Date.now();
        db(`Uploading ${path} to ${provider}`);
        db(`Using Headers: ${JSON.stringify(headers)}`);
        await s3Request(options, {
            method: 'PUT',
            path,
            data: filebuf,
            headers
        });
        const END = Date.now() - START;
        db(`${path} uploaded  to ${provider} in ${END}ms`);
        return _.res(options) || "";
    } catch (error) {
        err("UPLOAD ERROR", path, provider, error.message);
        throw error;
    }
};

export const upload: (options: S3UploadDataUrlOptions) => Promise<string> = async (options: S3UploadDataUrlOptions) => {
    return uploadBuffer({
        ...options,
        file: Buffer.isBuffer(options.file) ? options.file : Buffer.from(options.file.split(',')[1] as string, 'base64'),
    })
};

export const getObjectBinary: (options: S3GetOptions) => Promise<any> = async (options: S3GetOptions) => {
    const res = await getObject(options, {
        responseType: 'arraybuffer'
    });
    return res.data
}

export const getTextFile : (options: S3GetOptions) => Promise<string> = async (options: S3GetOptions) => {
    const buff = await getObjectBuffer(options)
    return buff.toString();
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
