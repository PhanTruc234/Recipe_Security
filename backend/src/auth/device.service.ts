import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface DeviceInfo {
  deviceId: string;
  label: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeen: string;
  current: boolean;
}

interface SessRow {
  sess: unknown;
}

interface SessionShape {
  userId?: string;
  device?: {
    deviceId?: string;
    label?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    createdAt?: string;
    lastSeen?: string;
  };
}

// Truy vấn trực tiếp bảng phiên của connect-pg-simple để liệt kê / đổi tên / thu
// hồi các thiết bị (phiên) của 1 user. Lộ ra ngoài bằng deviceId ngẫu nhiên,
// KHÔNG bao giờ lộ sid (vì sid chính là token phiên).
@Injectable()
export class DeviceService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listForUser(
    userId: string,
    currentDeviceId: string | undefined,
  ): Promise<DeviceInfo[]> {
    const rows = await this.dataSource.query<SessRow[]>(
      `SELECT sess FROM session WHERE expire > now() AND sess->>'userId' = $1`,
      [userId],
    );

    const out: DeviceInfo[] = [];
    for (const row of rows) {
      const sess = row.sess as SessionShape;
      const d = sess.device;
      if (!d?.deviceId) {
        continue;
      }
      out.push({
        deviceId: d.deviceId,
        label: d.label ?? null,
        ip: d.ip ?? null,
        userAgent: d.userAgent ?? null,
        createdAt: d.createdAt ?? '',
        lastSeen: d.lastSeen ?? '',
        current: d.deviceId === currentDeviceId,
      });
    }
    // Thiết bị hiện tại lên đầu, còn lại mới tạo trước
    out.sort((a, b) => {
      if (a.current !== b.current) {
        return a.current ? -1 : 1;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
    return out;
  }

  async revoke(userId: string, deviceId: string): Promise<boolean> {
    const deleted = await this.dataSource.query<unknown[]>(
      `DELETE FROM session
       WHERE sess->>'userId' = $1 AND sess->'device'->>'deviceId' = $2
       RETURNING sid`,
      [userId, deviceId],
    );
    return deleted.length > 0;
  }

  async rename(
    userId: string,
    deviceId: string,
    label: string,
  ): Promise<boolean> {
    const updated = await this.dataSource.query<unknown[]>(
      `UPDATE session
       SET sess = jsonb_set(sess::jsonb, '{device,label}', to_jsonb($3::text), true)::json
       WHERE sess->>'userId' = $1 AND sess->'device'->>'deviceId' = $2
       RETURNING sid`,
      [userId, deviceId, label],
    );
    return updated.length > 0;
  }
}
