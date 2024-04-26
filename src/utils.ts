import { S3GetOptions, S3UploadOptions } from "./types";

export const resolvePath = (options: S3GetOptions | S3UploadOptions | {
    filename: string,
    directory?: string
}) => {
    //remove leading and trailing slash from options.directory
    const directory = options.directory ? options.directory.replace(/^\/|\/$/g, "") : "";
    return options.directory ? `${directory}/${options.filename}` : `${options.filename}`
}
