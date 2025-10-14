import { AxiosRequestConfig, default as axios } from 'axios'
import aws4 from 'aws4';
import { AxiosResponse } from 'axios';
const db = require('debug')('pico-s3')
const err = require('debug')('pico-s3:error')
import crypto from 'crypto';
import { import_ } from '@brillout/import'
import { PROVIDERS, CLOUD_PROVIDERS } from './providers';
import { S3RequestOptions, SERVICE_PROVIDER_CONFIG, S3UploadBufferOptions, S3UploadDataUrlOptions, S3GetOptions, DataURL, S3PresignedUploadOptions } from './types';
import { resolvePath } from './utils';

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


export const getCloudUrl: (options: S3RequestOptions) => string = (options: S3RequestOptions) => PROVIDERS[options.provider].res(options);

export const getFileKey: (options: S3RequestOptions) => string = (options: S3RequestOptions) => PROVIDERS[options.provider].key && PROVIDERS[options.provider].key(options).replace("//","/");

export const getProviderConfig: (provider : CLOUD_PROVIDERS) => SERVICE_PROVIDER_CONFIG = (provider) => PROVIDERS[provider]

export const getS3RequestObject = (options: S3RequestOptions, extendedRequestOptions?: {
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
    const signedReq = aws4.sign(toSign,
        {
            accessKeyId,
            secretAccessKey
        })
        return signedReq
}

export const s3Request = async (options: S3RequestOptions, extendedRequestOptions?: {
    method: "GET" | "PUT" | "POST" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH" | "TRACE"
    [k: string]: any
}) => {
    const signedReq = getS3RequestObject(options,extendedRequestOptions)
        //@ts-ignore
    return axios({
        ...signedReq
    })
}

export const uploadBuffer: (options: S3UploadBufferOptions) => Promise<string> = async (options: S3UploadBufferOptions) => {
    const { provider, file } = options;
    const _ = PROVIDERS[provider];
    if (!file || file === null) throw new Error("File isnull or undefined")
    const path = getFileKey(options) || `/${resolvePath(options)}`
    const _ftResult = await (await ft()).fileTypeFromBuffer(file);
    const { mime } = _ftResult || {}
    const filebuf = file;
    /**
     * Infer data type from filename
     */
    const headers = {
        'Content-Type': mime || "application/octet-stream",
        'Content-length': filebuf.length,
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
        const res = await s3Request(options, {
            method: 'PUT',
            path,
            data: filebuf,
            headers
        });
        const END = Date.now() - START;
        db(`${path} uploaded to ${provider} in ${END}ms with code ${res.status}`);
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
    const path = getFileKey(options) || `/${resolvePath(options)}`
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

export const getPresignedUrl: (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => Promise<string> = async (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => {
    const { provider, accessKeyId, secretAccessKey } = options;
    const path = getFileKey(options) || `/${resolvePath(options)}`
    const region = provider === CLOUD_PROVIDERS.GCP ? 'region' : options.region;
    const _ = PROVIDERS[provider];
    const _host = _.host(options)
    const host = _host.replace("https://", "").replace("http://", "");
    if (!_) throw new Error(`Invalid provider ${provider}. Valid providers: ${Object.keys(PROVIDERS)}`);
    const res = aws4.sign({
        host,
        path,
        service: 's3',
        region,
        signQuery: true,
    },
        {
            accessKeyId,
            secretAccessKey
        })
    const signedUrl = _host + res.path
    return signedUrl;
}

export const getPresignedUploadUrl: (options: S3PresignedUploadOptions) => Promise<string> = async (options: S3PresignedUploadOptions) => {
    const { provider, accessKeyId, secretAccessKey, expiresIn = 3600, contentType } = options;
    const path = getFileKey(options) || `/${resolvePath(options)}`
    const region = provider === CLOUD_PROVIDERS.GCP ? 'region' : options.region;
    const _ = PROVIDERS[provider];
    if (!_) throw new Error(`Invalid provider ${provider}. Valid providers: ${Object.keys(PROVIDERS)}`);

    const _host = _.host(options)
    const host = _host.replace("https://", "").replace("http://", "");

    // Determine protocol (http or https)
    const protocol = _host.startsWith('https://') ? 'https:' : 'http:';

    try {
        db(`Generating presigned upload URL for ${path} on ${provider}`);

        const urlOptions: any = {
            host,
            path,
            method: 'PUT',
            service: 's3',
            region,
            signQuery: true,
            expires: expiresIn,
            protocol
        };

        // Add Content-Type header if specified
        if (contentType) {
            urlOptions.headers = {
                'Content-Type': contentType
            };
        }

      if (options.public) {
        urlOptions.headers = {
          ...(urlOptions.headers || {}),
          'x-amz-acl': 'public-read'
        }
      }

        // Sign the request
        const signedRequest = aws4.sign(urlOptions, {
            accessKeyId,
            secretAccessKey
        });

        // Construct the final presigned URL
        const presignedUrl = `${protocol}//${signedRequest.host}${signedRequest.path}`;

        db(`Presigned upload URL generated for ${path} on ${provider}, expires in ${expiresIn}s`);

        return presignedUrl;
    } catch (error) {
        err("PRESIGNED UPLOAD URL ERROR", path, provider, error.message);
        throw error;
    }
}

export const deleteObject: (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => Promise<boolean> = async (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => {
    const { provider } = options;
    const path = getFileKey(options) || `/${resolvePath(options)}`
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

//@ts-ignore
export const getObjectMetadata: (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => Promise<{
    [k: string]: string
}> = async (options: S3GetOptions, axiosOverride?: AxiosRequestConfig) => {
    const { provider } = options;
    const path = getFileKey(options) || `/${resolvePath(options)}`
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
