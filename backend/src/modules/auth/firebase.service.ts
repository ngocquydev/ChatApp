import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    // Dùng getApps() thay vì admin.apps
    if (!getApps().length) {
      const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
      let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

      if (projectId && clientEmail && privateKey) {
        if (
          (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
          (privateKey.startsWith("'") && privateKey.endsWith("'"))
        ) {
          privateKey = privateKey.slice(1, -1);
        }

        try {
          initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
          });
          console.log('[FirebaseService] Khởi tạo Firebase Admin SDK thành công.');
        } catch (err) {
          console.warn('[FirebaseService] Lỗi khởi tạo Firebase Admin SDK:', err);
        }
      } else {
        console.warn(
          '[FirebaseService] Thiếu biến môi trường FIREBASE_* — bỏ qua khởi tạo Firebase Admin SDK.',
        );
      }
    }
  }

  async verifyIdToken(idToken: string) {
    try {
      if (!getApps().length) {
        throw new UnauthorizedException(
          'Firebase Admin SDK chưa được cấu hình trên máy chủ',
        );
      }
      // Dùng getAuth() thay vì admin.auth()
      const decodedToken = await getAuth().verifyIdToken(idToken);
      return decodedToken;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException(
        'Firebase Token không hợp lệ hoặc đã hết hạn',
      );
    }
  }
}
