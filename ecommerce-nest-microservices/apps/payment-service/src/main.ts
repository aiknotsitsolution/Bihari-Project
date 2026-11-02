import { bootstrapMicroservice } from '@app/common';
import { PaymentModule } from './payment.module';

bootstrapMicroservice(PaymentModule, 'PAYMENT', 8004);
