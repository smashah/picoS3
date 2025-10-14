import { SERVICE_PROVIDER_CONFIG } from "./types"
import { resolvePath } from "./utils"

export enum CLOUD_PROVIDERS {
    GCP = "GCP",
    WASABI = "WASABI",
    AWS = "AWS",
    CONTABO = "CONTABO",
    DO = "DO",
    MINIO = "MINIO",
    R2 = "R2",
    R2_ALT = "R2_ALT"
}

/**
 * Please submit a new issue if you need another s3 compatible provider.
 */
export const PROVIDERS : {
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
        url: ({ bucket, filename, directory, region }: any) => `https://${bucket}.${region}.digitaloceanspaces.com/${resolvePath({filename, directory})}`,
        res: ({ bucket, filename, directory, region }: any) => `https://${bucket}.${region}.digitaloceanspaces.com/${resolvePath({filename, directory})}`
    },
    "CONTABO": {
        host: ({ region }: any) => `${region}.contabostorage.com`,
        url: ({ bucket, filename, directory, region }: any) => `https://${region}.contabostorage.com/${resolvePath({filename, directory: directory ? `${bucket}${directory}` : bucket})}`,
        res: ({ bucket, filename, directory, region }: any) => `https://${region}.contabostorage.com/${resolvePath({filename, directory: directory ? `${bucket}${directory}` : bucket})}`
    },
    "MINIO": {
        host: ({ host }: any) => `${host}`,
        url: ({ bucket, filename, directory, host }: any) => `${host}/${bucket}/${resolvePath({filename, directory})}`,
        key: ({ bucket, filename, directory, host }: any) => `/${bucket}/${resolvePath({filename, directory})}`,
        res: ({ bucket, filename, directory, host }: any) => `${host}/${bucket}/${resolvePath({filename, directory})}`
    },
    "SUPABASE": {
        host: ({ host }: any) => `${host}`,
        url: ({ bucket, filename, directory, host }: any) => `${host}/storage/v1/s3/${bucket}/${resolvePath({filename, directory})}`,
        res: ({ bucket, filename, directory, host }: any) => `${host}/storage/v1/s3/${bucket}/${resolvePath({filename, directory})}`
    },
    "R2": {
        host: ({ host, bucket }: any) => `https://${bucket}.${host.replace('https://',"")}`,
        url: ({ bucket, filename, directory, host }: any) => `https://${bucket}.${host.replace('https://',"")}/${resolvePath({filename, directory})}`,
        res: ({ bucket, filename, directory, host }: any) => `https://${bucket}.${host.replace('https://',"")}/${resolvePath({filename, directory})}`
    },
    "R2_ALT": {
        host: ({ host, bucket }: any) => `${host}/${bucket}`,
        url: ({ bucket, filename, directory, host }: any) => `https://${host.replace('https://',"")}/${bucket}/${resolvePath({filename, directory})}`,
        res: ({ bucket, filename, directory, host }: any) => `https://${host.replace('https://',"")}/${bucket}/${resolvePath({filename, directory})}`
    }
}
