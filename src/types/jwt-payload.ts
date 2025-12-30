export type JwtPayload = {
  id: string;
  type: 'access' | 'refresh';
  role?: string;
};
