/** Contrato REST de backend-api. */
export interface RoomWire {
  id: string;
  name: string;
  ownerUid: string;
  role: 'OWNER' | 'MEMBER';
  status: string;
  createdAt: string;
  updatedAt: string;
}
