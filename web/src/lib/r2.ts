import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET
  );
}

export function getR2Client() {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

export function getR2Bucket() {
  return requireEnv("R2_BUCKET");
}

/** Public base URL for objects (optional — e.g. custom domain or r2.dev). */
export function publicObjectUrl(key: string) {
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/${key}`;
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
) {
  const client = getR2Client();
  const bucket = getR2Bucket();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return publicObjectUrl(key);
}

export async function deleteFromR2(key: string) {
  const client = getR2Client();
  const bucket = getR2Bucket();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** Presigned URL for private bucket logo display (1 hour). */
export async function presignedGetUrl(key: string, expiresIn = 3600) {
  const client = getR2Client();
  const bucket = getR2Bucket();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  );
}

export function clinicLogoKey(clinicId: string, ext: string) {
  return `clinics/${clinicId}/logo.${ext}`;
}
