export interface AuthenticatedUser {
  oid: string;
  name?: string;
  preferred_username?: string;
  roles: string[];
}
