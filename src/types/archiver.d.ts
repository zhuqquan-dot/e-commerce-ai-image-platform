declare module 'archiver' {
  import { Transform } from 'stream'

  export class Archiver extends Transform {
    constructor(options?: ArchiverOptions)
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T
    directory(dirpath: string, destpath: string | false, data?: EntryData | ((entry: EntryData) => boolean)): this
    file(filename: string, data: EntryData): this
    append(source: Buffer | string | NodeJS.ReadableStream, data?: EntryData): this
    finalize(): this
    pointer(): number
    symlink(filepath: string, target: string, mode?: number): this
  }

  export interface ArchiverOptions {
    zlib?: { level?: number }
    forceLocalTime?: boolean
    forceZip64?: boolean
    namePrependSlash?: boolean
    statConcurrency?: number
    store?: boolean
  }

  export interface EntryData {
    name?: string
    prefix?: string
    date?: Date | string
    mode?: number
    store?: boolean
  }

  export class ZipArchive extends Archiver {
    constructor(options?: ArchiverOptions)
  }

  export class TarArchive extends Archiver {
    constructor(options?: ArchiverOptions)
  }

  export class JsonArchive extends Archiver {
    constructor(options?: ArchiverOptions)
  }

  export function create(format: 'zip' | 'tar' | 'json', options?: ArchiverOptions): Archiver
}
