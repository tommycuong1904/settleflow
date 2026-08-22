export type Contributor = {
  id: string;
  name: string;
  walletAddress: string;
  email?: string;
  linkedUserId?: string | null;
  role?: string;
};
