import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY not set – translation will return original text');
    }
  }

  async translateArabicToHebrew(text: string): Promise<string> {
    if (!text || text.trim() === '') return '';
    if (!this.openai) return text;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'אתה מתרגם מקצועי המתמחה בתרגום תוכן שיווקי מערבית לעברית. תרגם את הטקסט לעברית שיווקית, תקנית וטבעית. החזר רק את הטקסט המתורגם ללא הסברים נוספים.',
          },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content?.trim() || text;
    } catch (error) {
      this.logger.error(`Translation failed: ${error.message}`);
      return text;
    }
  }

  async translateHebrewToArabic(text: string): Promise<string> {
    if (!text || text.trim() === '') return '';
    if (/[\u0600-\u06FF]/.test(text)) return text;
    if (!this.openai) return text;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'أنت مترجم محترف. ترجم النص التالي من العبرية إلى العربية. أعد النص المترجم فقط بدون أي شرح إضافي.',
          },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content?.trim() || text;
    } catch (error) {
      this.logger.error(`Hebrew→Arabic translation failed: ${error.message}`);
      return text;
    }
  }

  async translateProductContent(nameAr: string, descriptionAr: string) {
    const [nameHe, descriptionHe] = await Promise.all([
      this.translateArabicToHebrew(nameAr),
      this.translateArabicToHebrew(descriptionAr || ''),
    ]);

    return { nameHe, descriptionHe };
  }
}
