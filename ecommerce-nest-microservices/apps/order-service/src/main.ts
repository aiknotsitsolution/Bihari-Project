import { bootstrapMicroservice } from '@app/common';
import { OrderModule } from './order.module';

bootstrapMicroservice(OrderModule, 'ORDER', 8003);
