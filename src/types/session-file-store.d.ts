declare module "session-file-store" {
  import type session from "express-session";

  type FileStoreOptions = {
    path?: string;
    secret?: string;
    ttl?: number;
    logFn?: (...args: unknown[]) => void;
  };

  export default function createFileStore(
    sessionMiddleware: typeof session,
  ): new (options?: FileStoreOptions) => session.Store;
}
