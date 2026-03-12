import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Increase body size limit for image uploads (base64 fallback can be large)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(require('express').json({ limit: '25mb' }));
  expressApp.use(require('express').urlencoded({ extended: true, limit: '25mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,  // allow extra fields in upload endpoints
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Q DOOR API')
    .setDescription('תיעוד API לפלטפורמת Q DOOR — חנות דלתות פרמיום')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth - אימות')
    .addTag('Products - מוצרים')
    .addTag('Categories - קטגוריות')
    .addTag('Vendors - ספקים')
    .addTag('Orders - הזמנות')
    .addTag('Uploads - העלאת קבצים')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Q DOOR Backend פועל על פורט ${port}`);
  console.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
}
bootstrap();
