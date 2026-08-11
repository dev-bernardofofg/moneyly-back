import { z } from 'zod';

// FID (Firebase Installation ID) tem 22 caracteres, mas o formato é definido
// pelo Firebase — validamos só o intervalo, sem travar em um tamanho exato.
const fid = z.string().min(8, 'FID inválido').max(512, 'FID inválido');

export const registerDeviceSchema = z.object({ fid });

export const deviceFidParamSchema = z.object({ fid });

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
