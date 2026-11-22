import { customAlphabet } from 'nanoid';

const nano = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12);
export const newPlayerId = () => `pl_${nano()}`;
export const newJourneyId = () => `jr_${nano()}`;
export const nowIso = () => new Date().toISOString();
