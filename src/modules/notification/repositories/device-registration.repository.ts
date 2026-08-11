import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@infra/db';
import { deviceRegistrations, type DeviceRegistration } from '@infra/db/schema';
import type { IDeviceRegistrationRepository } from './interfaces';

export const deviceRegistrationRepository = {
  /**
   * Registra o device. Como `fid` é unique, um mesmo browser que troque de
   * usuário tem o registro transferido em vez de duplicado.
   */
  async upsert(userId: string, fid: string, userAgent?: string): Promise<DeviceRegistration> {
    const [saved] = await db
      .insert(deviceRegistrations)
      .values({ userId, fid, userAgent: userAgent ?? null })
      .onConflictDoUpdate({
        target: deviceRegistrations.fid,
        set: { userId, userAgent: userAgent ?? null, lastSeenAt: new Date() },
      })
      .returning();

    if (!saved) throw new Error('Falha ao registrar dispositivo');
    return saved;
  },

  async findByUser(userId: string): Promise<DeviceRegistration[]> {
    return db.select().from(deviceRegistrations).where(eq(deviceRegistrations.userId, userId));
  },

  /** Escopado por usuário: ninguém apaga o device de outro conhecendo o FID. */
  async deleteByFid(userId: string, fid: string): Promise<void> {
    await db
      .delete(deviceRegistrations)
      .where(and(eq(deviceRegistrations.userId, userId), eq(deviceRegistrations.fid, fid)));
  },

  async deleteMany(fids: string[]): Promise<void> {
    if (fids.length === 0) return;
    await db.delete(deviceRegistrations).where(inArray(deviceRegistrations.fid, fids));
  },
} satisfies IDeviceRegistrationRepository;

export type { IDeviceRegistrationRepository };
