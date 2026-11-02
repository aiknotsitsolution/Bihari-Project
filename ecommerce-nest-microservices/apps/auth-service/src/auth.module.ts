import { Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role, postgresRoot } from '@app/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Address, RefreshToken, Seller, User } from './entities';
import { UsersService } from './users.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    postgresRoot('AUTH_DB', 'auth_db', [User, Address, Seller, RefreshToken]),
    TypeOrmModule.forFeature([User, Address, Seller, RefreshToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret: c.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: c.get<string>('JWT_ACCESS_EXPIRES', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService],
})
export class AuthModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthModule.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  /** Seeds the first admin account from env (ADMIN_EMAIL / ADMIN_PASSWORD). */
  async onApplicationBootstrap() {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) return;
    if (await this.users.findOne({ where: { email: email.toLowerCase() } })) return;
    await this.users.save(
      this.users.create({
        fullName: 'Platform Admin',
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
        role: Role.ADMIN,
      }),
    );
    this.logger.log(`Seeded admin user ${email}`);
  }
}
