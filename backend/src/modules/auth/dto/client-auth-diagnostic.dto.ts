import { IsIn } from 'class-validator';

export class ClientAuthDiagnosticDto {
  @IsIn(['google', 'facebook'])
  provider!: 'google' | 'facebook';

  @IsIn([
    'auth/invalid-api-key',
    'auth/app-not-authorized',
    'auth/unauthorized-domain',
    'auth/operation-not-allowed',
    'auth/invalid-auth-domain',
  ])
  code!: string;
}
