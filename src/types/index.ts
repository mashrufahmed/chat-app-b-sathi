import type { IUser } from '../models/user.model';

export interface IGithubUser {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}
