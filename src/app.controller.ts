import { Controller, Get, Post, Req, Body } from '@nestjs/common';
import { AppService } from './app.service';
import axios from 'axios';
import * as NodeRSA from 'node-rsa';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
    private configService: ConfigService) {}

    encrypt(payload) {
      const rsaKey = new NodeRSA(
        `-----BEGIN PUBLIC KEY-----\n${this.configService.get<string>('TELEBIRR_PUBLIC_KEY')}\n-----END PUBLIC KEY-----`,
        'public',
        {
          encryptionScheme: 'pkcs1',
        },
      );
      const dataToEncrypt = Buffer.from(JSON.stringify(payload));
      return rsaKey.encrypt(dataToEncrypt, 'base64', 'utf8');
    }
  
    signData(fields) {
      const encodedFields = Object.keys(fields)
        .sort()
        .map((key) => `${key}=${fields[key]}`)
        .join('&');
  
      return crypto.createHash('sha256').update(encodedFields).digest('hex');
    }
  
    decryptPublic(dataToDecrypt) {
      const rsaKey = new NodeRSA(
        `-----BEGIN PUBLIC KEY-----\n${this.configService.get<string>('TELEBIRR_PUBLIC_KEY')}\n-----END PUBLIC KEY-----`,
        'public',
        {
          encryptionScheme: 'pkcs1',
        },
      );
      return rsaKey.decryptPublic(dataToDecrypt, 'utf8');
    }


    @Post('telebirr')
    // @Roles(RoleType.Parent)
    // @UseGuards(JwtGuard)
    async createOne(@Req() req: Request, @Body() createDto): Promise<any> {

      const ussd = {
        shortCode: this.configService.get<string>('TELEBIRR_SHORTCODE'),
        appId: this.configService.get<string>('TELEBIRR_APPID'),
        appKey:this.configService.get<string>('TELEBIRR_APP_KEY'),
        nonce: this.generateRandom(16),
        //tx_ref for chapa
        outTradeNo: this.generateRandom(16),
        //-- urls
        notifyUrl: 'https://edit-f72r.onrender.com/SubscriptionPayments/teleBirrHook',
        returnUrl: 'google.com',
        receiveName: 'Edit Educational Services',
        subject: 'Testing Tele Birr',
        timeoutExpress: '30',
        timestamp: `${Date.now()}`,
        totalAmount: '100',
      };

      console.log('Tele App id--->>', this.configService.get<string>('TELEBIRR_APPID'));
  

  
      let encryptedData;
      let hash;
  
      try {
        const encryptedData = this.encrypt(ussd);

        console.log('encrypted', encryptedData);
        hash = this.signData(ussd);
        console.log('hash', hash);

        const reqBody = {
          appid: this.configService.get<string>('TELEBIRR_APPID'),
          sigh: hash,
          ussd: encryptedData,
        };
        const res = await axios.post(
          'http://196.188.120.3:11443/service-openup/toTradeWebPay',
          reqBody,
        );
        console.log('response =', res.data);
        return res.data;
      } catch (e) {
        console.log('request errro', e.message);
        console.log('request errro===>', e);
        return e.message;
      }
  

    }
  
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  generateRandom(len: number) {
    let pass = '';
    const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz0123456789';
  
    for (let i = 1; i <= len; i++) {
      const char = Math.floor(Math.random() * str.length + 1);
      pass += str.charAt(char);
    }
    return pass;
  }
}
