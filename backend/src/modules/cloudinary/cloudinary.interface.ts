export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  format?: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface UploadOptions {
  folder?: string;
  resource_type?: 'auto' | 'image' | 'video' | 'raw';
  filename?: string;
}
