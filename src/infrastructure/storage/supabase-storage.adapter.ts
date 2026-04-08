// Infrastructure Adapter: SupabaseStorageAdapter
// Implements IFileStorage port using Supabase Storage

import { SupabaseClient } from '@supabase/supabase-js';
import { IFileStorage } from '../../domain/ports/services/file-storage.port.js';

const BUCKET = 'imports';

export class SupabaseStorageAdapter implements IFileStorage {
  private bucketReady = false;

  constructor(private readonly supabase: SupabaseClient) {}

  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;

    const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
    if (listError) throw new Error(`Storage listBuckets failed: ${listError.message}`);

    const exists = buckets?.some(b => b.name === BUCKET);
    if (!exists) {
      const { error: createError } = await this.supabase.storage.createBucket(BUCKET, {
        public: false,
      });
      if (createError) throw new Error(`Storage createBucket failed: ${createError.message}`);
    }

    this.bucketReady = true;
  }

  async upload(path: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.ensureBucket();

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: false });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    return path;
  }
}
