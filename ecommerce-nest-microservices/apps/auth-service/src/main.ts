import { bootstrapMicroservice } from '@app/common';
import { AuthModule } from './auth.module';

bootstrapMicroservice(AuthModule, 'AUTH', 8001);
