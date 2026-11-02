import { bootstrapMicroservice } from '@app/common';
import { CatalogModule } from './catalog.module';

bootstrapMicroservice(CatalogModule, 'CATALOG', 8002);
