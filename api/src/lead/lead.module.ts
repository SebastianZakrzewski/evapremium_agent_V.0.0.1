import { Module } from '@nestjs/common';
import {
  BitrixLeadClient,
  FakeBitrixHttp,
  FetchBitrixHttp,
} from './fake-bitrix-http';
import { BITRIX_LEAD_CLIENT, LeadService } from './lead.service';

@Module({
  providers: [
    {
      provide: BITRIX_LEAD_CLIENT,
      useFactory: () => {
        const webhook = process.env.BITRIX_WEBHOOK_URL;
        const http = webhook ? new FetchBitrixHttp() : new FakeBitrixHttp();
        return new BitrixLeadClient(
          http,
          webhook ?? 'https://example.bitrix24.pl/rest/1/fake',
        );
      },
    },
    LeadService,
  ],
  exports: [LeadService],
})
export class LeadModule {}
