import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PasswordResetService } from './password-reset.service';
import { AuditService, UsersService } from '../users';
import { ResetTokenInvalidException } from '@/common/exceptions';

// Mock bcrypt at the module level. bcrypt@6 ships non-configurable getters
// for compare/hash, which makes jest.spyOn throw. A module mock gives us
// plain jest.fn() methods we can configure per test.
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
const bcrypt = jest.requireMock('bcrypt') as {
  compare: jest.Mock;
  hash: jest.Mock;
};

// Mock the prisma barrel so the real PrismaService class (which reads
// @/config at module-load time) is never evaluated in unit tests.
jest.mock('../prisma', () => ({
  PrismaService: class PrismaServiceMock {},
}));
const { PrismaService } = jest.requireMock('../prisma');

// Mock AuthService so the uuid ESM dependency chain doesn't load.
jest.mock('./auth.service', () => ({
  AuthService: class AuthServiceMock {},
  AuthTokens: class AuthTokensMock {},
}));
const { AuthService } = jest.requireMock('./auth.service');

type AnyMock = any;

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let users: jest.Mocked<UsersService>;
  let prisma: AnyMock;
  let event: jest.Mocked<EventEmitter2>;
  let audit: jest.Mocked<AuditService>;
  let auth: jest.Mocked<typeof AuthService>;

  beforeEach(async () => {
    bcrypt.compare.mockReset();
    bcrypt.hash.mockReset();

    const usersMock = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    const prismaMock = {
      passwordResetToken: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        updateMany: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const eventMock = { emit: jest.fn() };
    const auditMock = { logAction: jest.fn() };
    const authMock = { issueTokensFor: jest.fn() };
    const configMock = {
      get: jest.fn((key: string) => {
        const map: Record<string, number> = {
          BCRYPT_ROUNDS: 4, // low for test speed
          PASSWORD_RESET_TTL_SECONDS: 86400,
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: UsersService, useValue: usersMock },
        { provide: PrismaService, useValue: prismaMock },
        { provide: EventEmitter2, useValue: eventMock },
        { provide: AuditService, useValue: auditMock },
        { provide: AuthService, useValue: authMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get(PasswordResetService);
    users = module.get(UsersService);
    prisma = module.get(PrismaService);
    event = module.get(EventEmitter2);
    audit = module.get(AuditService);
    auth = module.get(AuthService);
  });

  describe('requestReset', () => {
    it('resolves silently when email is unknown', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.requestReset('unknown@test.com'),
      ).resolves.toBeUndefined();

      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(event.emit).not.toHaveBeenCalled();
      expect(audit.logAction).not.toHaveBeenCalled();
    });

    it('resolves silently when user is inactive', async () => {
      users.findByEmail.mockResolvedValue({
        id: 'usr_1',
        email: 'inactive@test.com',
        isActive: false,
      } as any);

      await expect(
        service.requestReset('inactive@test.com'),
      ).resolves.toBeUndefined();

      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('creates a reset token, audits, and emits the event for active users', async () => {
      users.findByEmail.mockResolvedValue({
        id: 'usr_1',
        email: 'active@test.com',
        isActive: true,
      } as any);
      prisma.passwordResetToken.create.mockResolvedValue({});

      await service.requestReset('active@test.com', 'agent', '1.2.3.4');

      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'usr_1',
            tokenHash: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        }),
      );
      expect(audit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PASSWORD_RESET_REQUESTED',
          entity: 'User',
          entityId: 'usr_1',
          payload: {
            email: 'active@test.com',
            userAgent: 'agent',
            ip: '1.2.3.4',
          },
        }),
      );
      expect(event.emit).toHaveBeenCalledWith(
        'password.reset.requested',
        expect.objectContaining({
          userId: 'usr_1',
          email: 'active@test.com',
          rawToken: expect.any(String),
        }),
      );
    });
  });

  describe('resetPassword', () => {
    const dto = { token: 'raw-token', newPassword: 'newSecret123' };

    it('throws ResetTokenInvalidException when no active tokens exist', async () => {
      prisma.passwordResetToken.findMany.mockResolvedValue([]);

      await expect(service.resetPassword(dto)).rejects.toBeInstanceOf(
        ResetTokenInvalidException,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(auth.issueTokensFor).not.toHaveBeenCalled();
    });

    it('throws when no token matches the bcrypt compare', async () => {
      prisma.passwordResetToken.findMany.mockResolvedValue([
        {
          id: 'prt_1',
          userId: 'usr_1',
          tokenHash: 'somerandomhash',
          expiresAt: new Date(Date.now() + 60_000),
          usedAt: null,
          createdAt: new Date(),
        },
      ]);

      await expect(service.resetPassword(dto)).rejects.toBeInstanceOf(
        ResetTokenInvalidException,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws when user has been deactivated between request and reset', async () => {
      prisma.passwordResetToken.findMany.mockResolvedValue([
        {
          id: 'prt_1',
          userId: 'usr_1',
          tokenHash: 'hash',
          expiresAt: new Date(Date.now() + 60_000),
          usedAt: null,
          createdAt: new Date(),
        },
      ]);

      bcrypt.compare.mockResolvedValueOnce(true);

      users.findById.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toBeInstanceOf(
        ResetTokenInvalidException,
      );

      expect(bcrypt.compare).toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('performs the transactional update and issues tokens on success', async () => {
      const matchedToken = {
        id: 'prt_1',
        userId: 'usr_1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
        createdAt: new Date(),
      };
      prisma.passwordResetToken.findMany.mockResolvedValue([matchedToken]);

      bcrypt.compare.mockResolvedValueOnce(true);
      bcrypt.hash.mockResolvedValueOnce('new-hash');

      users.findById.mockResolvedValue({
        id: 'usr_1',
        email: 'user@test.com',
        tenantId: 'tnt_1',
        isActive: true,
      } as any);
      prisma.$transaction.mockResolvedValue([{}, {}, {}]);
      auth.issueTokensFor.mockResolvedValue({
        accessToken: 'acc',
        refreshToken: 'ref',
        user: {} as any,
      });

      const result = await service.resetPassword(dto, 'agent', '1.2.3.4');

      expect(bcrypt.compare).toHaveBeenCalledWith('raw-token', 'hash');
      expect(bcrypt.hash).toHaveBeenCalledWith('newSecret123', 4);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'usr_1' },
          data: { password: 'new-hash' },
        }),
      );
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prt_1' },
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'usr_1', revokedAt: null },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
      expect(audit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PASSWORD_RESET_COMPLETED',
          entity: 'User',
          entityId: 'usr_1',
          payload: { userId: 'usr_1', userAgent: 'agent', ip: '1.2.3.4' },
        }),
      );
      expect(auth.issueTokensFor).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'usr_1' }),
        'agent',
        '1.2.3.4',
      );
      expect(result).toEqual({
        accessToken: 'acc',
        refreshToken: 'ref',
        user: {},
      });
    });

    it('scans the full active token list before declaring no match', async () => {
      // Three tokens, none match. Verifies the null-check is OUTSIDE the loop
      // by asserting bcrypt.compare was called against all three.
      prisma.passwordResetToken.findMany.mockResolvedValue([
        {
          id: 'a',
          userId: 'u',
          tokenHash: 'h1',
          expiresAt: new Date(),
          usedAt: null,
          createdAt: new Date(),
        },
        {
          id: 'b',
          userId: 'u',
          tokenHash: 'h2',
          expiresAt: new Date(),
          usedAt: null,
          createdAt: new Date(),
        },
        {
          id: 'c',
          userId: 'u',
          tokenHash: 'h3',
          expiresAt: new Date(),
          usedAt: null,
          createdAt: new Date(),
        },
      ]);

      bcrypt.compare.mockResolvedValue(false);

      await expect(service.resetPassword(dto)).rejects.toBeInstanceOf(
        ResetTokenInvalidException,
      );

      // Confirm we scanned all three, not just the first.
      expect(bcrypt.compare).toHaveBeenCalledTimes(3);
    });
  });
});
