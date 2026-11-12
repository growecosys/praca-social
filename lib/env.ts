import { bucket, type Bucket } from "./blob-bucket";
import { getDatabase, type Database } from "./sql";

interface PracaEnv {
  readonly DB: Database;
  readonly BUCKET: Bucket | undefined;
  readonly OPENAI_API_KEY: string | undefined;
  readonly RESEND_API_KEY: string | undefined;
  readonly AUTH_EMAIL_FROM: string | undefined;
  readonly AUTH_EMAIL_ORIGIN: string | undefined;
}

/**
 * Runtime bindings. Lazy getters keep module import side-effect free, so build steps and
 * tests can load route modules without a database or storage token.
 */
export const env: PracaEnv = {
  get DB() {
    return getDatabase();
  },
  get BUCKET() {
    return process.env.BLOB_READ_WRITE_TOKEN ? bucket : undefined;
  },
  get OPENAI_API_KEY() {
    return process.env.OPENAI_API_KEY;
  },
  get RESEND_API_KEY() {
    return process.env.RESEND_API_KEY;
  },
  get AUTH_EMAIL_FROM() {
    return process.env.AUTH_EMAIL_FROM;
  },
  get AUTH_EMAIL_ORIGIN() {
    return process.env.AUTH_EMAIL_ORIGIN;
  },
};
