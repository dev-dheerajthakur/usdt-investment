import { createClient } from "redis";
export const redis = createClient();

export async function connectRedis() {
  return await redis.connect();
}